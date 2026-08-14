import { describe, expect, it } from "vitest";
import { creditPolicy, STARTING_CREDITS } from "@/domain/credits";

describe("credit policy", () => {
  it("applies the central starting credits to a zero balance", () => {
    expect(
      creditPolicy.calculateResultingBalance(0, creditPolicy.startingDelta),
    ).toBe(STARTING_CREDITS);
  });

  it("rejects negative and unsafe resulting balances", () => {
    expect(creditPolicy.calculateResultingBalance(0, -1)).toBeNull();
    expect(
      creditPolicy.calculateResultingBalance(
        Number.MAX_SAFE_INTEGER,
        creditPolicy.startingDelta,
      ),
    ).toBeNull();
  });
});
