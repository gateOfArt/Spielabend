import { describe, expect, it } from "vitest";

describe("Vitest infrastructure", () => {
  it("uses the Node environment by default", () => {
    expect(globalThis.document).toBeUndefined();
  });
});
