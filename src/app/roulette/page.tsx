import { AppNavigation } from "@/components/navigation/AppNavigation";
import { RouletteGame } from "@/components/roulette/RouletteGame";
import { Card } from "@/components/ui/Card";
import { requireAuthenticatedUser } from "@/server/auth/require-authenticated-user";
import { ROULETTE_RULE } from "@/server/services/roulette-round.contract";
import styles from "./page.module.css";

export default async function RoulettePage() {
  const user = await requireAuthenticatedUser();

  return (
    <div className={styles.shell}>
      <AppNavigation displayName={user.displayName} credits={user.credits} />
      <main className={styles.page}>
        <header className={styles.intro}>
          <p className={styles.eyebrow}>Serverautoritatives Spiel</p>
          <h1>Roulette</h1>
          <p>
            Setze auf Rot oder Schwarz. Ein Treffer gewinnt den Einsatz netto
            eins zu eins, Null verliert gegen beide Farben.
          </p>
        </header>

        <Card as="section" aria-label="Roulette-Spiel">
          <RouletteGame
            initialCredits={user.credits}
            minimumBet={ROULETTE_RULE.minimumBet}
            maximumBet={ROULETTE_RULE.maximumBet}
          />
        </Card>
      </main>
    </div>
  );
}
