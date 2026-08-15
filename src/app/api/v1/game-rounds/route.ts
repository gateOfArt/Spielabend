import "server-only";

import type { NextRequest } from "next/server";
import { coreApiHandlers } from "@/server/api/core-route-handlers";

export function GET(request: NextRequest): Promise<Response> {
  return coreApiHandlers.getGameRounds(request);
}

export function POST(request: NextRequest): Promise<Response> {
  return coreApiHandlers.postGameRound(request);
}
