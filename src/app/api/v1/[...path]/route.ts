import "server-only";

import type { NextRequest } from "next/server";
import { coreApiHandlers } from "@/server/api/core-route-handlers";

interface NotFoundRouteContext {
  readonly params: Promise<{ readonly path: readonly string[] }>;
}

function notFound(
  request: NextRequest,
  context: NotFoundRouteContext,
): Promise<Response> {
  return coreApiHandlers.notFound(request, context);
}

export { notFound as DELETE, notFound as GET, notFound as POST };
