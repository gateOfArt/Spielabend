export type RouletteSelection = "RED" | "BLACK";

export type RouletteColor = "RED" | "BLACK" | "GREEN";

export type RouletteOutcome = "win" | "loss";

export interface RouletteGameRound {
  readonly id: string;
  readonly accountId: string;
  readonly transactionId: string;
  readonly requestId: string;
  readonly game: "ROULETTE";
  readonly bet: number;
  readonly selection: RouletteSelection;
  readonly result: number;
  readonly color: RouletteColor;
  readonly outcome: RouletteOutcome;
  readonly netDelta: number;
  readonly finalCredits: number;
  readonly createdAt: string;
}

export interface RouletteRoundDto {
  readonly requestId: string;
  readonly bet: number;
  readonly selection: RouletteSelection;
  readonly result: number;
  readonly color: RouletteColor;
  readonly outcome: RouletteOutcome;
  readonly netDelta: number;
  readonly finalCredits: number;
}

export type RouletteRoundErrorCode =
  | "AUTHENTICATION_REQUIRED"
  | "INVALID_INPUT"
  | "INSUFFICIENT_CREDITS"
  | "REQUEST_CONFLICT"
  | "ROUND_FAILED";

export type RouletteRoundResult =
  | {
      readonly ok: true;
      readonly replayed: boolean;
      readonly round: RouletteRoundDto;
    }
  | {
      readonly ok: false;
      readonly code: RouletteRoundErrorCode;
    };

export type RouletteField = "requestId" | "bet" | "selection";
export type RouletteFieldErrors = Partial<
  Record<RouletteField, readonly string[]>
>;

export type RouletteActionState =
  | { readonly status: "idle" }
  | {
      readonly status: "error";
      readonly message: string;
      readonly fieldErrors: RouletteFieldErrors;
    }
  | {
      readonly status: "success";
      readonly message: string;
      readonly replayed: boolean;
      readonly round: RouletteRoundDto;
    };

export type RouletteAction = (
  previousState: RouletteActionState,
  formData: FormData,
) => Promise<RouletteActionState>;

export const initialRouletteActionState: RouletteActionState = {
  status: "idle",
};
