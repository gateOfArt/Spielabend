import { describe, expect, it } from "vitest";
import {
  createMutationRequestEvidence,
  type HeaderReader,
} from "@/server/auth/request-security";
import { isSameOriginMutationEvidence } from "@/server/services/authentication-session";

function createHeaders(values: Record<string, string>): HeaderReader {
  const normalizedValues = new Map(
    Object.entries(values).map(([key, value]) => [key.toLowerCase(), value]),
  );

  return {
    get(name) {
      return normalizedValues.get(name.toLowerCase()) ?? null;
    },
  };
}

describe("same-origin mutation evidence", () => {
  it("accepts matching Origin and forwarded host information", () => {
    const evidence = createMutationRequestEvidence(
      createHeaders({
        origin: "https://spieleabend.example",
        "x-forwarded-host": "spieleabend.example",
        "x-forwarded-proto": "https",
        "sec-fetch-site": "same-origin",
      }),
      "POST",
    );

    expect(evidence.trustedOrigin).toBe("https://spieleabend.example");
    expect(isSameOriginMutationEvidence(evidence)).toBe(true);
  });

  it("rejects missing and cross-site evidence", () => {
    const missingOrigin = createMutationRequestEvidence(
      createHeaders({ host: "spieleabend.example" }),
      "POST",
    );
    const crossSite = {
      ...createMutationRequestEvidence(
        createHeaders({
          origin: "https://attacker.example",
          host: "spieleabend.example",
          "sec-fetch-site": "cross-site",
        }),
        "DELETE",
      ),
    };

    expect(isSameOriginMutationEvidence(missingOrigin)).toBe(false);
    expect(isSameOriginMutationEvidence(crossSite)).toBe(false);
  });
});
