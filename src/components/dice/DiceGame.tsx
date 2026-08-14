"use client";

import { useActionState, useCallback, useState } from "react";
import { playDiceAction } from "@/app/dice/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  initialDiceActionState,
  type DiceAction,
} from "@/domain/dice";
import styles from "./DiceGame.module.css";

export type DiceGameProps = {
  initialCredits: number;
  minimumBet: number;
  maximumBet: number;
  minimumFace: number;
  maximumFace: number;
  action?: DiceAction;
};

interface DiceGameViewState {
  readonly actionState: typeof initialDiceActionState;
  readonly displayedCredits: number;
}

function assignRequestId(input: HTMLInputElement | null) {
  if (input && !input.value) {
    input.value = globalThis.crypto.randomUUID();
  }
}

export function DiceGame({
  initialCredits,
  minimumBet,
  maximumBet,
  minimumFace,
  maximumFace,
  action = playDiceAction,
}: DiceGameProps) {
  const updateView = useCallback(
    async (
      previousView: DiceGameViewState,
      formData: FormData,
    ): Promise<DiceGameViewState> => {
      const actionState = await action(previousView.actionState, formData);

      return {
        actionState,
        displayedCredits:
          actionState.status === "success"
            ? actionState.round.finalCredits
            : previousView.displayedCredits,
      };
    },
    [action],
  );
  const [view, formAction, isPending] = useActionState(updateView, {
    actionState: initialDiceActionState,
    displayedCredits: initialCredits,
  });
  const [bet, setBet] = useState(String(minimumBet));
  const [prediction, setPrediction] = useState(String(minimumFace));
  const state = view.actionState;

  const requestIdKey =
    state.status === "success" ? state.round.requestId : "new-request";

  return (
    <section className={styles.game} aria-labelledby="dice-controls-title">
      <div className={styles.balance} aria-live="polite">
        <span>Aktuelles Guthaben</span>
        <strong>{view.displayedCredits} Credits</strong>
      </div>

      <form action={formAction} className={styles.form}>
        <input
          key={requestIdKey}
          ref={assignRequestId}
          type="hidden"
          name="requestId"
        />

        <h2 id="dice-controls-title">Runde spielen</h2>

        <div className={styles.controls}>
          <Input
            id="bet"
            name="bet"
            label="Einsatz in Credits"
            type="number"
            min={minimumBet}
            max={maximumBet}
            step={1}
            value={bet}
            onChange={(event) => setBet(event.target.value)}
            error={state.status === "error" ? state.fieldErrors.bet?.[0] : undefined}
            disabled={isPending}
            required
          />

          <div className={styles.field}>
            <label className={styles.label} htmlFor="prediction">
              Vorhergesagte Augenzahl
            </label>
            <select
              id="prediction"
              name="prediction"
              className={styles.select}
              value={prediction}
              onChange={(event) => setPrediction(event.target.value)}
              aria-invalid={
                state.status === "error" &&
                Boolean(state.fieldErrors.prediction)
              }
              aria-describedby={
                state.status === "error" && state.fieldErrors.prediction
                  ? "prediction-error"
                  : undefined
              }
              disabled={isPending}
              required
            >
              {Array.from(
                { length: maximumFace - minimumFace + 1 },
                (_, index) => minimumFace + index,
              ).map((face) => (
                <option key={face} value={face}>
                  {face}
                </option>
              ))}
            </select>
            {state.status === "error" && state.fieldErrors.prediction ? (
              <p id="prediction-error" className={styles.fieldError}>
                {state.fieldErrors.prediction[0]}
              </p>
            ) : null}
          </div>
        </div>

        {state.status === "error" ? (
          <p className={styles.error} role="alert">
            {state.message}
          </p>
        ) : null}

        <Button type="submit" disabled={isPending}>
          {isPending ? "Wurf läuft …" : "Würfeln"}
        </Button>
      </form>

      {state.status === "success" ? (
        <section className={styles.result} aria-labelledby="dice-result-title">
          <p className={styles.resultStatus} role="status">
            {state.message}
          </p>
          <h2 id="dice-result-title">
            {state.round.outcome === "win" ? "Treffer" : "Daneben"}
          </h2>
          <dl className={styles.resultGrid}>
            <div>
              <dt>Vorhersage</dt>
              <dd>{state.round.prediction}</dd>
            </div>
            <div>
              <dt>Ergebnis</dt>
              <dd>{state.round.result}</dd>
            </div>
            <div>
              <dt>Nettoänderung</dt>
              <dd>
                {state.round.netDelta > 0 ? "+" : ""}
                {state.round.netDelta} Credits
              </dd>
            </div>
          </dl>
        </section>
      ) : null}
    </section>
  );
}
