import Link from "next/link";
import { AppNavigation } from "@/components/navigation/AppNavigation";
import { Card } from "@/components/ui/Card";
import { requireAuthenticatedUser } from "@/server/auth/require-authenticated-user";
import styles from "./page.module.css";

export default async function LobbyPage() {
  const user = await requireAuthenticatedUser();

  return (
    <div className={styles.shell}>
      <AppNavigation displayName={user.displayName} credits={user.credits} />
      <main className={styles.page}>
        <section className={styles.intro} aria-labelledby="lobby-title">
          <p className={styles.eyebrow}>Geschützter Bereich</p>
          <h1 id="lobby-title">Lobby</h1>
          <p>Willkommen zurück, {user.displayName}.</p>
        </section>

        <Card as="section" aria-labelledby="credits-title">
          <h2 id="credits-title">Dein Guthaben</h2>
          <p className={styles.credits}>{user.credits} Credits</p>
        </Card>

        <section aria-labelledby="areas-title">
          <h2 id="areas-title" className={styles.areasTitle}>
            Bereiche
          </h2>
          <ul className={styles.areaLinks}>
            <li>
              <Link className={styles.areaLink} href="/dice">
                Dice spielen
              </Link>
            </li>
            <li>
              <Link className={styles.areaLink} href="/roulette">
                Roulette spielen
              </Link>
            </li>
            <li>
              <Link className={styles.areaLink} href="/leaderboard">
                Rangliste ansehen
              </Link>
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
