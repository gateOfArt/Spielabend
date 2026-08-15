import "server-only";

import type { NextRequest } from "next/server";
import { z } from "zod";
import { DICE_RULE } from "@/server/services/dice-round.contract";
import { SESSION_POLICY } from "@/server/auth/authentication.contract";
import type { AuthenticationSessionService } from "@/server/auth/authentication.contract";
import { createMutationRequestEvidence } from "@/server/auth/request-security";
import type { DiceRoundService } from "@/server/services/dice-round.contract";
import {
  currentUserQueryService,
  type CurrentUserQueryService,
} from "@/server/services/current-user-query";
import {
  gameRoundQueryService,
  type GameRoundQueryService,
} from "@/server/services/game-round-query";
import {
  leaderboardQueryService,
  type LeaderboardQueryService,
} from "@/server/services/leaderboard-query";
import { authenticationSessionService } from "@/server/services/authentication-session";
import { diceRoundService } from "@/server/services/dice-round";
import {
  hasValidEmptyQuery,
  jsonResponse,
  noContentResponse,
  problemResponse,
} from "@/server/api/http";

const MAX_JSON_BODY_LENGTH = 8_192;

const gameRoundPostSchema = z.strictObject({
  game: z.literal("DICE"),
  requestId: z.uuidv4(),
  input: z.strictObject({
    bet: z
      .number()
      .int()
      .min(DICE_RULE.minimumBet)
      .max(DICE_RULE.maximumBet),
    prediction: z
      .number()
      .int()
      .min(DICE_RULE.minimumFace)
      .max(DICE_RULE.maximumFace),
  }),
});

const emptyBodySchema = z.strictObject({});
const notFoundParamsSchema = z.strictObject({
  path: z.array(z.string().min(1)).min(1),
});

type ReadAuthorizationResult =
  | { readonly ok: true; readonly sessionToken: string | null }
  | { readonly ok: false; readonly response: Response };

type JsonBodyResult =
  | { readonly success: true; readonly data: unknown }
  | { readonly success: false };

export interface CoreApiHandlerProps {
  readonly authenticationService: Pick<
    AuthenticationSessionService,
    | "requireAuthenticatedAccount"
    | "authorizeCookieMutation"
    | "logout"
  >;
  readonly currentUserQueryService: Pick<CurrentUserQueryService, "read">;
  readonly leaderboardQueryService: Pick<LeaderboardQueryService, "read">;
  readonly gameRoundQueryService: Pick<GameRoundQueryService, "read">;
  readonly diceRoundService: DiceRoundService;
}

export interface CoreApiHandlers {
  getCurrentUser(request: NextRequest): Promise<Response>;
  getLeaderboard(request: NextRequest): Promise<Response>;
  getGameRounds(request: NextRequest): Promise<Response>;
  postGameRound(request: NextRequest): Promise<Response>;
  deleteCurrentSession(request: NextRequest): Promise<Response>;
  notFound(
    request: NextRequest,
    context: { readonly params: Promise<unknown> },
  ): Promise<Response>;
}

export function createCoreApiHandlers(
  props: CoreApiHandlerProps,
): CoreApiHandlers {
  function sessionToken(request: NextRequest): string | null {
    return request.cookies.get(SESSION_POLICY.cookie.name)?.value ?? null;
  }

  async function authorizeRead(
    request: NextRequest,
  ): Promise<ReadAuthorizationResult> {
    const token = sessionToken(request);
    const authorization =
      await props.authenticationService.requireAuthenticatedAccount(token);

    return authorization.ok
      ? { ok: true, sessionToken: token }
      : {
          ok: false,
          response: problemResponse(401, "AUTHENTICATION_REQUIRED"),
        };
  }

  async function authorizeMutation(
    request: NextRequest,
    method: "POST" | "DELETE",
  ): Promise<ReadAuthorizationResult> {
    const token = sessionToken(request);
    const authorization =
      await props.authenticationService.authorizeCookieMutation({
        ...createMutationRequestEvidence(request.headers, method),
        sessionToken: token,
      });

    if (authorization.ok) {
      return { ok: true, sessionToken: token };
    }

    return {
      ok: false,
      response:
        authorization.code === "UNSAFE_REQUEST"
          ? problemResponse(403, "FORBIDDEN")
          : problemResponse(401, "AUTHENTICATION_REQUIRED"),
    };
  }

  async function readJsonBody(request: NextRequest): Promise<JsonBodyResult> {
    const mediaType = request.headers
      .get("content-type")
      ?.split(";", 1)[0]
      ?.trim()
      .toLowerCase();

    if (mediaType !== "application/json") {
      return { success: false };
    }

    try {
      const rawBody = await request.text();

      if (!rawBody || rawBody.length > MAX_JSON_BODY_LENGTH) {
        return { success: false };
      }

      return { success: true, data: JSON.parse(rawBody) as unknown };
    } catch {
      return { success: false };
    }
  }

  async function hasValidOptionalEmptyBody(
    request: NextRequest,
  ): Promise<boolean> {
    if (request.body === null) {
      return true;
    }

    try {
      const rawBody = await request.text();

      if (!rawBody.trim()) {
        return true;
      }

      if (rawBody.length > MAX_JSON_BODY_LENGTH) {
        return false;
      }

      return emptyBodySchema.safeParse(
        JSON.parse(rawBody) as unknown,
      ).success;
    } catch {
      return false;
    }
  }

  async function getCurrentUser(request: NextRequest): Promise<Response> {
    try {
      const authorization = await authorizeRead(request);

      if (!authorization.ok) {
        return authorization.response;
      }

      if (!hasValidEmptyQuery(request.nextUrl.searchParams)) {
        return problemResponse(422, "INVALID_REQUEST");
      }

      const result = await props.currentUserQueryService.read(
        authorization.sessionToken,
      );

      return result.ok
        ? jsonResponse({ data: result.user })
        : problemResponse(401, "AUTHENTICATION_REQUIRED");
    } catch {
      return problemResponse(500, "REQUEST_FAILED");
    }
  }

  async function getLeaderboard(request: NextRequest): Promise<Response> {
    try {
      const authorization = await authorizeRead(request);

      if (!authorization.ok) {
        return authorization.response;
      }

      if (!hasValidEmptyQuery(request.nextUrl.searchParams)) {
        return problemResponse(422, "INVALID_REQUEST");
      }

      const result = await props.leaderboardQueryService.read(
        authorization.sessionToken,
      );

      return result.ok
        ? jsonResponse({ data: { entries: result.entries } })
        : problemResponse(401, "AUTHENTICATION_REQUIRED");
    } catch {
      return problemResponse(500, "REQUEST_FAILED");
    }
  }

  async function getGameRounds(request: NextRequest): Promise<Response> {
    try {
      const authorization = await authorizeRead(request);

      if (!authorization.ok) {
        return authorization.response;
      }

      if (!hasValidEmptyQuery(request.nextUrl.searchParams)) {
        return problemResponse(422, "INVALID_REQUEST");
      }

      const result = await props.gameRoundQueryService.read(
        authorization.sessionToken,
      );

      return result.ok
        ? jsonResponse({ data: { rounds: result.rounds } })
        : problemResponse(401, "AUTHENTICATION_REQUIRED");
    } catch {
      return problemResponse(500, "REQUEST_FAILED");
    }
  }

  async function postGameRound(request: NextRequest): Promise<Response> {
    try {
      const authorization = await authorizeMutation(request, "POST");

      if (!authorization.ok) {
        return authorization.response;
      }

      if (!hasValidEmptyQuery(request.nextUrl.searchParams)) {
        return problemResponse(422, "INVALID_REQUEST");
      }

      const body = await readJsonBody(request);
      const validation = body.success
        ? gameRoundPostSchema.safeParse(body.data)
        : { success: false as const };

      if (!validation.success) {
        return problemResponse(422, "INVALID_REQUEST");
      }

      const result = await props.diceRoundService.play(
        authorization.sessionToken,
        {
          requestId: validation.data.requestId,
          bet: validation.data.input.bet,
          prediction: validation.data.input.prediction,
        },
      );

      if (!result.ok) {
        switch (result.code) {
          case "AUTHENTICATION_REQUIRED":
            return problemResponse(401, "AUTHENTICATION_REQUIRED");
          case "INVALID_INPUT":
          case "INSUFFICIENT_CREDITS":
            return problemResponse(422, "INVALID_REQUEST");
          case "REQUEST_CONFLICT":
            return problemResponse(409, "REQUEST_CONFLICT");
          case "ROUND_FAILED":
            return problemResponse(500, "REQUEST_FAILED");
        }
      }

      return jsonResponse(
        { data: { round: { game: "DICE", ...result.round } } },
        result.replayed ? 200 : 201,
      );
    } catch {
      return problemResponse(500, "REQUEST_FAILED");
    }
  }

  async function deleteCurrentSession(
    request: NextRequest,
  ): Promise<Response> {
    try {
      const authorization = await authorizeMutation(request, "DELETE");

      if (!authorization.ok) {
        return authorization.response;
      }

      if (
        !hasValidEmptyQuery(request.nextUrl.searchParams) ||
        !(await hasValidOptionalEmptyBody(request))
      ) {
        return problemResponse(422, "INVALID_REQUEST");
      }

      const result = await props.authenticationService.logout(
        authorization.sessionToken,
      );

      if (!result.ok) {
        return problemResponse(500, "REQUEST_FAILED");
      }

      const response = noContentResponse();
      response.cookies.set(result.cookie.name, result.cookie.value, {
        httpOnly: result.cookie.httpOnly,
        sameSite: result.cookie.sameSite,
        secure: result.cookie.secure,
        path: result.cookie.path,
        expires: new Date(result.cookie.expires),
        maxAge: result.cookie.maxAge,
      });

      return response;
    } catch {
      return problemResponse(500, "REQUEST_FAILED");
    }
  }

  async function notFound(
    request: NextRequest,
    context: { readonly params: Promise<unknown> },
  ): Promise<Response> {
    void request;

    try {
      notFoundParamsSchema.safeParse(await context.params);
    } catch {
      // Unknown API paths intentionally share one neutral response.
    }

    return problemResponse(404, "RESOURCE_NOT_FOUND");
  }

  return {
    getCurrentUser,
    getLeaderboard,
    getGameRounds,
    postGameRound,
    deleteCurrentSession,
    notFound,
  };
}

export const coreApiHandlers = createCoreApiHandlers({
  authenticationService: authenticationSessionService,
  currentUserQueryService,
  leaderboardQueryService,
  gameRoundQueryService,
  diceRoundService,
});
