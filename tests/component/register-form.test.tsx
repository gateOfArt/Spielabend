/**
 * @vitest-environment jsdom
 */

import { act } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RegisterForm } from "@/components/registration/RegisterForm";
import type {
  RegistrationAction,
  RegistrationActionState,
} from "@/domain/registration";

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Anzeigename"), "Ada Spielerin");
  await user.type(
    screen.getByLabelText("E-Mail-Adresse"),
    "ada.component@example.com",
  );
  await user.type(
    screen.getByLabelText("Passwort"),
    "correct horse battery staple",
  );
}

describe("RegisterForm", () => {
  it("disables the pending submit and prevents a duplicate click", async () => {
    const user = userEvent.setup();
    let resolveAction: ((state: RegistrationActionState) => void) | undefined;
    const action = vi.fn<RegistrationAction>(
      () =>
        new Promise<RegistrationActionState>((resolve) => {
          resolveAction = resolve;
        }),
    );

    render(<RegisterForm action={action} />);
    await fillValidForm(user);

    const submitButton = screen.getByRole("button", {
      name: "Konto erstellen",
    });
    await user.click(submitButton);

    expect(
      screen.getByRole("button", { name: "Konto wird erstellt …" }),
    ).toBeDisabled();
    await user.click(
      screen.getByRole("button", { name: "Konto wird erstellt …" }),
    );
    expect(action).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveAction?.({
        status: "success",
        fieldErrors: {},
        message: "Konto erstellt.",
      });
    });

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Konto erstellt.",
    );
  });

  it("renders safe server field and general errors accessibly", async () => {
    const user = userEvent.setup();
    const action = vi.fn<RegistrationAction>(() =>
      Promise.resolve({
        status: "error",
        fieldErrors: {
          email: ["Bitte gib eine gültige E-Mail-Adresse ein."],
        },
        message: "Bitte prüfe deine Eingaben.",
      }),
    );

    render(<RegisterForm action={action} />);
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Konto erstellen" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Bitte prüfe deine Eingaben.",
    );
    expect(screen.getByLabelText("E-Mail-Adresse")).toHaveAccessibleDescription(
      "Bitte gib eine gültige E-Mail-Adresse ein.",
    );
  });
});
