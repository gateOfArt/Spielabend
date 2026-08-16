import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { config, proxy } from "@/proxy";
import { SESSION_POLICY } from "@/server/auth/authentication.contract";

describe("protected navigation proxy guard", () => {
  it.each(["/lobby", "/dice", "/roulette", "/leaderboard"])(
    "redirects %s when the session cookie is absent",
    (path) => {
      const response = proxy(
        new NextRequest(`https://spieleabend.example${path}`),
      );

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        "https://spieleabend.example/login",
      );
    },
  );

  it("matches every protected page", () => {
    expect(config.matcher).toEqual([
      "/lobby/:path*",
      "/dice/:path*",
      "/roulette/:path*",
      "/leaderboard/:path*",
    ]);
  });

  it("uses cookie presence only and leaves authoritative validation to the page", () => {
    const request = new NextRequest("https://spieleabend.example/lobby");
    request.cookies.set(SESSION_POLICY.cookie.name, "invalid-cookie-value");

    const response = proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
