import "server-only";

import type { NextRequest } from "next/server";
import { coreApiHandlers } from "@/server/api/core-route-handlers";

export function DELETE(request: NextRequest): Promise<Response> {
  return coreApiHandlers.deleteCurrentSession(request);
}
