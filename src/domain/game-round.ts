import type { DiceGameRound } from "@/domain/dice";
import type { RouletteGameRound } from "@/domain/roulette";

export type GameRound = DiceGameRound | RouletteGameRound;
