/**
 * @vitest-environment jsdom
 */

import { act } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DiceGame } from "@/components/dice/DiceGame";
import type {
  DiceAction,
  DiceActionState,
} from "@/domain/dice";

const diceProps = {
  initialCredits: 100,
  minimumBet: 1,
  maximumBet: 100,
  minimumFace: 1,
  maximumFace: 6,
};

describe("DiceGame", () => {
  it("controls input, blocks duplicate pending submits, and shows server results", async () => {
    const user = userEvent.setup();
    let resolveAction: ((state: DiceActionState) => void) | undefined;
    let submittedRequestId = "";
    const action = vi.fn<DiceAction>(
      (_previousState, formData) =>
        new Promise<DiceActionState>((resolve) => {
          submittedRequestId = String(formData.get("requestId"));
          resolveAction = resolve;
        }),
    );

    render(<DiceGame {...diceProps} action={action} />);
    const bet = screen.getByLabelText("Einsatz in Credits");
    const prediction = screen.getByLabelText("Vorhergesagte Augenzahl");

    await user.clear(bet);
    await user.type(bet, "10");
    await user.selectOptions(prediction, "4");

    expect(bet).toHaveValue(10);
    expect(prediction).toHaveValue("4");

    await user.click(screen.getByRole("button", { name: "Würfeln" }));

    expect(submittedRequestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u,
    );
    expect(bet).toBeDisabled();
    expect(prediction).toBeDisabled();
    const pendingButton = screen.getByRole("button", {
      name: "Wurf läuft …",
    });
    expect(pendingButton).toBeDisabled();
    await user.click(pendingButton);
    expect(action).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveAction?.({
        status: "success",
        message: "Die Runde wurde abgerechnet.",
        replayed: false,
        round: {
          requestId: submittedRequestId,
          bet: 10,
          prediction: 4,
          result: 4,
          outcome: "win",
          netDelta: 50,
          finalCredits: 150,
        },
      });
    });

    expect(await screen.findByRole("heading", { name: "Treffer" })).toBeVisible();
    expect(screen.getByText("Ergebnis").nextElementSibling).toHaveTextContent(
      "4",
    );
    expect(screen.getByText("+50 Credits")).toBeVisible();
    expect(screen.getByText("150 Credits")).toBeVisible();
  });

  it("shows a safe accessible action error", async () => {
    const user = userEvent.setup();
    const action = vi.fn<DiceAction>(() =>
      Promise.resolve({
        status: "error",
        message: "Für diesen Einsatz reichen deine Credits nicht aus.",
        fieldErrors: {},
      }),
    );

    render(<DiceGame {...diceProps} action={action} />);
    await user.click(screen.getByRole("button", { name: "Würfeln" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Für diesen Einsatz reichen deine Credits nicht aus.",
    );
  });
});
