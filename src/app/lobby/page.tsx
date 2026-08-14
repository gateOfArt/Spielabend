import Link from "next/link";
import { AppNavigation } from "@/components/navigation/AppNavigation";
import { Card } from "@/components/ui/Card";
import { requireAuthenticatedUser } from "@/server/auth/require-authenticated-user";
import styles from "./page.module.css";

export default async function LobbyPage() {
  const user = await requireAuthenticatedUser();

  return (
    <div className={styles.shell}>
      <AppNavigation displayName={user.displayName} />
      <main className={styles.page}>
        <section className={styles.intro} aria-labelledby="lobby-title">
          <p className={styles.eyebrow}>Geschützter Bereich</p>
          <h1 id="lobby-title">Lobby</h1>
          <p>Willkommen zurück, {user.displayName}.</p>
        </section>

        <Card as="section" aria-labelledby="credits-title">
          <h2 id="credits-title">Dein Guthaben</h2>
          <p className={styles.credits}>{user.credits} Credits</p>
          <Link className={styles.gameLink} href="/dice">
            Dice spielen
          </Link>
        </Card>
      </main>
    </div>
  );
}
