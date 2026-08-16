/**
 * @vitest-environment jsdom
 */

import { act } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RouletteGame } from "@/components/roulette/RouletteGame";
import type {
  RouletteAction,
  RouletteActionState,
} from "@/domain/roulette";

const rouletteProps = {
  initialCredits: 100,
  minimumBet: 1,
  maximumBet: 100,
};

describe("RouletteGame", () => {
  it("controls input, blocks duplicate pending submits, and shows server results", async () => {
    const user = userEvent.setup();
    let resolveAction: ((state: RouletteActionState) => void) | undefined;
    let submittedRequestId = "";
    const action = vi.fn<RouletteAction>(
      (_previousState, formData) =>
        new Promise<RouletteActionState>((resolve) => {
          submittedRequestId = String(formData.get("requestId"));
          resolveAction = resolve;
        }),
    );

    render(<RouletteGame {...rouletteProps} action={action} />);
    const bet = screen.getByLabelText("Einsatz in Credits");
    const blackSelection = screen.getByLabelText("Schwarz");

    await user.clear(bet);
    await user.type(bet, "10");
    await user.click(blackSelection);

    expect(bet).toHaveValue(10);
    expect(blackSelection).toBeChecked();

    await user.click(screen.getByRole("button", { name: "Spin" }));

    expect(submittedRequestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u,
    );
    expect(bet).toBeDisabled();
    expect(blackSelection).toBeDisabled();
    const pendingButton = screen.getByRole("button", {
      name: "Kugel läuft …",
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
          selection: "BLACK",
          result: 2,
          color: "BLACK",
          outcome: "win",
          netDelta: 10,
          finalCredits: 110,
        },
      });
    });

    expect(await screen.findByRole("heading", { name: "Treffer" })).toBeVisible();
    expect(screen.getByText("Ergebnis").nextElementSibling).toHaveTextContent(
      "2 (Schwarz)",
    );
    expect(screen.getByText("+10 Credits")).toBeVisible();
    expect(screen.getByText("110 Credits")).toBeVisible();
  });

  it("shows a safe accessible action error", async () => {
    const user = userEvent.setup();
    const action = vi.fn<RouletteAction>(() =>
      Promise.resolve({
        status: "error",
        message: "Für diesen Einsatz reichen deine Credits nicht aus.",
        fieldErrors: {},
      }),
    );

    render(<RouletteGame {...rouletteProps} action={action} />);
    await user.click(screen.getByRole("button", { name: "Spin" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Für diesen Einsatz reichen deine Credits nicht aus.",
    );
  });
});
