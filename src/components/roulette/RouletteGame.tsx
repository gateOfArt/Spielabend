"use client";

import { useActionState, useCallback, useState } from "react";
import { playRouletteAction } from "@/app/roulette/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  initialRouletteActionState,
  type RouletteAction,
  type RouletteSelection,
} from "@/domain/roulette";
import styles from "./RouletteGame.module.css";

export type RouletteGameProps = {
  initialCredits: number;
  minimumBet: number;
  maximumBet: number;
  action?: RouletteAction;
};

interface RouletteGameViewState {
  readonly actionState: typeof initialRouletteActionState;
  readonly displayedCredits: number;
}

const COLOR_LABELS = {
  RED: "Rot",
  BLACK: "Schwarz",
  GREEN: "Grün",
} as const;

function assignRequestId(input: HTMLInputElement | null) {
  if (input && !input.value) {
    input.value = globalThis.crypto.randomUUID();
  }
}

export function RouletteGame({
  initialCredits,
  minimumBet,
  maximumBet,
  action = playRouletteAction,
}: RouletteGameProps) {
  const updateView = useCallback(
    async (
      previousView: RouletteGameViewState,
      formData: FormData,
    ): Promise<RouletteGameViewState> => {
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
    actionState: initialRouletteActionState,
    displayedCredits: initialCredits,
  });
  const [bet, setBet] = useState(String(minimumBet));
  const [selection, setSelection] = useState<RouletteSelection>("RED");
  const state = view.actionState;

  const requestIdKey =
    state.status === "success" ? state.round.requestId : "new-request";

  return (
    <section
      className={styles.game}
      aria-labelledby="roulette-controls-title"
    >
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

        <h2 id="roulette-controls-title">Runde spielen</h2>

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

          <fieldset className={styles.field}>
            <legend className={styles.label}>Farbwahl</legend>
            <div className={styles.selectionOptions}>
              <label className={styles.selectionOption}>
                <input
                  type="radio"
                  name="selection"
                  value="RED"
                  checked={selection === "RED"}
                  onChange={() => setSelection("RED")}
                  disabled={isPending}
                  required
                />
                Rot
              </label>
              <label className={styles.selectionOption}>
                <input
                  type="radio"
                  name="selection"
                  value="BLACK"
                  checked={selection === "BLACK"}
                  onChange={() => setSelection("BLACK")}
                  disabled={isPending}
                />
                Schwarz
              </label>
            </div>
            {state.status === "error" && state.fieldErrors.selection ? (
              <p className={styles.fieldError}>
                {state.fieldErrors.selection[0]}
              </p>
            ) : null}
          </fieldset>
        </div>

        {state.status === "error" ? (
          <p className={styles.error} role="alert">
            {state.message}
          </p>
        ) : null}

        <Button type="submit" disabled={isPending}>
          {isPending ? "Kugel läuft …" : "Spin"}
        </Button>
      </form>

      {state.status === "success" ? (
        <section
          className={styles.result}
          aria-labelledby="roulette-result-title"
        >
          <p className={styles.resultStatus} role="status">
            {state.message}
          </p>
          <h2 id="roulette-result-title">
            {state.round.outcome === "win" ? "Treffer" : "Daneben"}
          </h2>
          <dl className={styles.resultGrid}>
            <div>
              <dt>Auswahl</dt>
              <dd>{COLOR_LABELS[state.round.selection]}</dd>
            </div>
            <div>
              <dt>Ergebnis</dt>
              <dd>
                {state.round.result} ({COLOR_LABELS[state.round.color]})
              </dd>
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
