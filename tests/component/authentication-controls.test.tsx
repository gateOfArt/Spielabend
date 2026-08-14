/**
 * @vitest-environment jsdom
 */

import { act } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LoginForm } from "@/components/authentication/LoginForm";
import { LogoutControl } from "@/components/authentication/LogoutControl";
import type {
  LoginAction,
  LoginActionState,
  LogoutAction,
  LogoutActionState,
} from "@/domain/authentication";

describe("LoginForm", () => {
  it("controls credentials and prevents duplicate submission while pending", async () => {
    const user = userEvent.setup();
    let resolveAction: ((state: LoginActionState) => void) | undefined;
    const action = vi.fn<LoginAction>(
      () =>
        new Promise<LoginActionState>((resolve) => {
          resolveAction = resolve;
        }),
    );

    render(<LoginForm action={action} />);
    const email = screen.getByLabelText("E-Mail-Adresse");
    const password = screen.getByLabelText("Passwort");
    await user.type(email, "ada@example.com");
    await user.type(password, "correct horse battery staple");

    expect(email).toHaveValue("ada@example.com");
    expect(password).toHaveValue("correct horse battery staple");

    await user.click(screen.getByRole("button", { name: "Anmelden" }));

    expect(email).toBeDisabled();
    expect(password).toBeDisabled();
    const pendingButton = screen.getByRole("button", {
      name: "Anmeldung läuft …",
    });
    expect(pendingButton).toBeDisabled();
    await user.click(pendingButton);
    expect(action).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveAction?.({
        status: "error",
        message: "E-Mail-Adresse oder Passwort ist ungültig.",
      });
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "E-Mail-Adresse oder Passwort ist ungültig.",
    );
  });
});

describe("LogoutControl", () => {
  it("disables logout and prevents duplicate submission while pending", async () => {
    const user = userEvent.setup();
    let resolveAction: ((state: LogoutActionState) => void) | undefined;
    const action = vi.fn<LogoutAction>(
      () =>
        new Promise<LogoutActionState>((resolve) => {
          resolveAction = resolve;
        }),
    );

    render(<LogoutControl action={action} />);
    await user.click(screen.getByRole("button", { name: "Abmelden" }));

    const pendingButton = screen.getByRole("button", {
      name: "Abmeldung läuft …",
    });
    expect(pendingButton).toBeDisabled();
    await user.click(pendingButton);
    expect(action).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveAction?.({ status: "success" });
    });
  });
});
