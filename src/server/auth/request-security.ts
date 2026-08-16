import "server-only";

export interface HeaderReader {
  get(name: string): string | null;
}

export interface MutationRequestEvidence {
  readonly method: "POST" | "PUT" | "PATCH" | "DELETE";
  readonly origin: string | null;
  readonly trustedOrigin: string | null;
  readonly secFetchSite: string | null;
}

function firstHeaderValue(value: string | null): string | null {
  const firstValue = value?.split(",", 1)[0]?.trim();

  return firstValue || null;
}

function resolveTrustedOrigin(headers: HeaderReader): string | null {
  const origin = firstHeaderValue(headers.get("origin"));
  const host =
    firstHeaderValue(headers.get("x-forwarded-host")) ??
    firstHeaderValue(headers.get("host"));

  if (!origin || !host) {
    return null;
  }

  try {
    const forwardedProtocol = firstHeaderValue(headers.get("x-forwarded-proto"));
    const protocol = forwardedProtocol ?? new URL(origin).protocol.slice(0, -1);

    if (protocol !== "http" && protocol !== "https") {
      return null;
    }

    return `${protocol}://${host}`;
  } catch {
    return null;
  }
}

export function createMutationRequestEvidence(
  headers: HeaderReader,
  method: MutationRequestEvidence["method"],
): MutationRequestEvidence {
  return {
    method,
    origin: firstHeaderValue(headers.get("origin")),
    trustedOrigin: resolveTrustedOrigin(headers),
    secFetchSite: firstHeaderValue(headers.get("sec-fetch-site")),
  };
}

const UNKNOWN_CLIENT_KEY = "unknown-client";

/**
 * Best-effort IP-like identity for rate-limit keys, not an authoritative
 * client identifier. `x-forwarded-for` is attacker-influenceable on a
 * deployment without a trusted reverse proxy in front of the app; that only
 * weakens rate-limit key isolation, it never grants access, so it is an
 * acceptable trade-off for a single-process in-memory limiter.
 */
export function resolveClientIpLikeKey(headers: HeaderReader): string {
  return firstHeaderValue(headers.get("x-forwarded-for")) ?? UNKNOWN_CLIENT_KEY;
}
