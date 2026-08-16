import "server-only";

import { NextResponse } from "next/server";
import { z } from "zod";

export type ApiProblemCode =
  | "AUTHENTICATION_REQUIRED"
  | "FORBIDDEN"
  | "INVALID_REQUEST"
  | "REQUEST_CONFLICT"
  | "RESOURCE_NOT_FOUND"
  | "RATE_LIMITED"
  | "REQUEST_FAILED";

export interface ApiProblem {
  readonly type: "about:blank";
  readonly title: string;
  readonly status: number;
  readonly code: ApiProblemCode;
}

const problemTitles: Readonly<Record<ApiProblemCode, string>> = {
  AUTHENTICATION_REQUIRED: "Authentication required",
  FORBIDDEN: "Forbidden",
  INVALID_REQUEST: "Invalid request",
  REQUEST_CONFLICT: "Request conflict",
  RESOURCE_NOT_FOUND: "Resource not found",
  RATE_LIMITED: "Rate limited",
  REQUEST_FAILED: "Request failed",
};

const emptyQuerySchema = z.strictObject({});
const noStoreHeaders = { "cache-control": "no-store" } as const;

export function hasValidEmptyQuery(searchParams: URLSearchParams): boolean {
  return emptyQuerySchema.safeParse(
    Object.fromEntries(searchParams.entries()),
  ).success;
}

export function jsonResponse(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status, headers: noStoreHeaders });
}

export function problemResponse(
  status: number,
  code: ApiProblemCode,
): NextResponse<ApiProblem> {
  return NextResponse.json(
    {
      type: "about:blank",
      title: problemTitles[code],
      status,
      code,
    },
    {
      status,
      headers: {
        ...noStoreHeaders,
        "content-type": "application/problem+json",
      },
    },
  );
}

export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204, headers: noStoreHeaders });
}

export function rateLimitedResponse(
  retryAfterSeconds: number,
): NextResponse<ApiProblem> {
  return NextResponse.json(
    {
      type: "about:blank",
      title: problemTitles.RATE_LIMITED,
      status: 429,
      code: "RATE_LIMITED",
    },
    {
      status: 429,
      headers: {
        ...noStoreHeaders,
        "content-type": "application/problem+json",
        "retry-after": String(retryAfterSeconds),
      },
    },
  );
}
