import { AppNavigation } from "@/components/navigation/AppNavigation";
import { DiceGame } from "@/components/dice/DiceGame";
import { Card } from "@/components/ui/Card";
import { requireAuthenticatedUser } from "@/server/auth/require-authenticated-user";
import { DICE_RULE } from "@/server/services/dice-round.contract";
import styles from "./page.module.css";

export default async function DicePage() {
  const user = await requireAuthenticatedUser();

  return (
    <div className={styles.shell}>
      <AppNavigation displayName={user.displayName} credits={user.credits} />
      <main className={styles.page}>
        <header className={styles.intro}>
          <p className={styles.eyebrow}>Serverautoritatives Spiel</p>
          <h1>Dice</h1>
          <p>
            Sage eine Augenzahl voraus. Ein Treffer gewinnt das Fünffache
            des Einsatzes netto, andernfalls wird der Einsatz abgezogen.
          </p>
        </header>

        <Card as="section" aria-label="Dice-Spiel">
          <DiceGame
            initialCredits={user.credits}
            minimumBet={DICE_RULE.minimumBet}
            maximumBet={DICE_RULE.maximumBet}
            minimumFace={DICE_RULE.minimumFace}
            maximumFace={DICE_RULE.maximumFace}
          />
        </Card>
      </main>
    </div>
  );
}
