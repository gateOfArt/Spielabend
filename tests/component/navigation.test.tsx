/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppNavigation } from "@/components/navigation/AppNavigation";

describe("AppNavigation", () => {
  it("links every implemented major area and shows current credits and real logout", () => {
    render(<AppNavigation displayName="Ada" credits={150} />);

    expect(screen.getByRole("link", { name: "Lobby" })).toHaveAttribute(
      "href",
      "/lobby",
    );
    expect(screen.getByRole("link", { name: "Dice" })).toHaveAttribute(
      "href",
      "/dice",
    );
    expect(screen.getByRole("link", { name: "Rangliste" })).toHaveAttribute(
      "href",
      "/leaderboard",
    );
    expect(screen.getByText("150 Credits")).toBeVisible();
    expect(screen.getByRole("button", { name: "Abmelden" })).toBeVisible();
    expect(screen.queryByRole("link", { name: /roulette|verlauf/iu })).toBeNull();
  });
});
