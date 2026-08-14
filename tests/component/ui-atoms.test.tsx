/**
 * @vitest-environment jsdom
 */

import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

function ControlledInput() {
  const [value, setValue] = useState("");

  return (
    <Input
      id="email"
      name="email"
      label="E-Mail"
      value={value}
      onChange={(event) => setValue(event.target.value)}
      autoComplete="email"
      error="Bitte eine gültige E-Mail eingeben."
      required
    />
  );
}

describe("UI atom infrastructure", () => {
  it("renders native button variants and respects disabled behavior", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <>
        <Button variant="primary" onClick={onClick}>
          Primär
        </Button>
        <Button variant="secondary">Sekundär</Button>
        <Button variant="outlined" disabled onClick={onClick}>
          Umrandet
        </Button>
      </>,
    );

    const primaryButton = screen.getByRole("button", { name: "Primär" });
    const disabledButton = screen.getByRole("button", { name: "Umrandet" });

    expect(primaryButton).toHaveAttribute("type", "button");
    expect(disabledButton).toBeDisabled();

    await user.click(primaryButton);
    await user.click(disabledButton);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("links a visible label and safe error to a controlled input", async () => {
    const user = userEvent.setup();

    render(<ControlledInput />);

    const input = screen.getByRole("textbox", { name: "E-Mail" });

    expect(input).toBeRequired();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription(
      "Bitte eine gültige E-Mail eingeben.",
    );

    await user.type(input, "ada@example.com");

    expect(input).toHaveValue("ada@example.com");
  });

  it("supports a labelled semantic card container", () => {
    render(
      <Card as="article" aria-labelledby="card-heading">
        <h2 id="card-heading">Hinweis</h2>
        <p>Inhalt</p>
      </Card>,
    );

    expect(
      screen.getByRole("article", { name: "Hinweis" }),
    ).toBeInTheDocument();
  });
});
