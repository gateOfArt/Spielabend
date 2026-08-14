import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "@/proxy";
import { SESSION_POLICY } from "@/server/auth/authentication.contract";

describe("lobby proxy guard", () => {
  it("redirects when the session cookie is absent", () => {
    const response = proxy(
      new NextRequest("https://spieleabend.example/lobby"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://spieleabend.example/login",
    );
  });

  it("uses cookie presence only and leaves authoritative validation to the page", () => {
    const request = new NextRequest("https://spieleabend.example/lobby");
    request.cookies.set(SESSION_POLICY.cookie.name, "invalid-cookie-value");

    const response = proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
