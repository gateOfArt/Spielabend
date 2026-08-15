import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppNavigation } from "@/components/navigation/AppNavigation";
import { Card } from "@/components/ui/Card";
import { SESSION_POLICY } from "@/server/auth/authentication.contract";
import { leaderboardQueryService } from "@/server/services/leaderboard-query";
import styles from "./page.module.css";

export default async function LeaderboardPage() {
  const sessionToken = (await cookies()).get(
    SESSION_POLICY.cookie.name,
  )?.value;
  const result = await leaderboardQueryService.read(sessionToken);

  if (!result.ok) {
    redirect("/login");
  }

  return (
    <div className={styles.shell}>
      <AppNavigation
        displayName={result.currentUser.displayName}
        credits={result.currentUser.credits}
      />
      <main className={styles.page}>
        <header className={styles.intro}>
          <p className={styles.eyebrow}>Aktuelle Creditstände</p>
          <h1>Rangliste</h1>
          <p>
            Höhere Creditstände stehen vorne. Bei Gleichstand teilen sich
            Konten den Rang und werden nach Anzeigename geordnet.
          </p>
        </header>

        <Card as="section" aria-labelledby="leaderboard-title">
          <h2 id="leaderboard-title">Alle Spielerinnen und Spieler</h2>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <caption>Rangfolge nach aktuellem Creditstand</caption>
              <thead>
                <tr>
                  <th scope="col">Rang</th>
                  <th scope="col">Anzeigename</th>
                  <th scope="col">Credits</th>
                </tr>
              </thead>
              <tbody>
                {result.entries.map((entry, index) => (
                  <tr
                    className={entry.isCurrentUser ? styles.currentRow : undefined}
                    key={`${entry.rank}-${entry.displayName}-${index}`}
                  >
                    <td>#{entry.rank}</td>
                    <th scope="row">
                      {entry.displayName}
                      {entry.isCurrentUser ? (
                        <span className={styles.currentBadge}>Du</span>
                      ) : null}
                    </th>
                    <td>{entry.credits} Credits</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </div>
  );
}
