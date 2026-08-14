export type DiceOutcome = "win" | "loss";

export interface GameRound {
  readonly id: string;
  readonly accountId: string;
  readonly transactionId: string;
  readonly requestId: string;
  readonly game: "DICE";
  readonly bet: number;
  readonly prediction: number;
  readonly result: number;
  readonly outcome: DiceOutcome;
  readonly netDelta: number;
  readonly finalCredits: number;
  readonly createdAt: string;
}

export interface DiceRoundDto {
  readonly requestId: string;
  readonly bet: number;
  readonly prediction: number;
  readonly result: number;
  readonly outcome: DiceOutcome;
  readonly netDelta: number;
  readonly finalCredits: number;
}

export type DiceRoundErrorCode =
  | "AUTHENTICATION_REQUIRED"
  | "INVALID_INPUT"
  | "INSUFFICIENT_CREDITS"
  | "REQUEST_CONFLICT"
  | "ROUND_FAILED";

export type DiceRoundResult =
  | {
      readonly ok: true;
      readonly replayed: boolean;
      readonly round: DiceRoundDto;
    }
  | {
      readonly ok: false;
      readonly code: DiceRoundErrorCode;
    };

export type DiceField = "requestId" | "bet" | "prediction";
export type DiceFieldErrors = Partial<
  Record<DiceField, readonly string[]>
>;

export type DiceActionState =
  | { readonly status: "idle" }
  | {
      readonly status: "error";
      readonly message: string;
      readonly fieldErrors: DiceFieldErrors;
    }
  | {
      readonly status: "success";
      readonly message: string;
      readonly replayed: boolean;
      readonly round: DiceRoundDto;
    };

export type DiceAction = (
  previousState: DiceActionState,
  formData: FormData,
) => Promise<DiceActionState>;

export const initialDiceActionState: DiceActionState = {
  status: "idle",
};
