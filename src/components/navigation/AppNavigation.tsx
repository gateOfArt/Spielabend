import Link from "next/link";
import { LogoutControl } from "@/components/authentication/LogoutControl";
import styles from "./AppNavigation.module.css";

export type AppNavigationProps = {
  displayName: string;
  credits: number;
};

export function AppNavigation({ displayName, credits }: AppNavigationProps) {
  return (
    <nav className={styles.navigation} aria-label="Hauptnavigation">
      <span className={styles.brand}>Spieleabend</span>
      <ul className={styles.links}>
        <li>
          <Link className={styles.link} href="/lobby">
            Lobby
          </Link>
        </li>
        <li>
          <Link className={styles.link} href="/dice">
            Dice
          </Link>
        </li>
        <li>
          <Link className={styles.link} href="/roulette">
            Roulette
          </Link>
        </li>
        <li>
          <Link className={styles.link} href="/leaderboard">
            Rangliste
          </Link>
        </li>
      </ul>
      <div className={styles.account}>
        <span className={styles.identity}>Angemeldet als {displayName}</span>
        <span className={styles.creditsChip} aria-live="polite">
          <span className={styles.creditsLabel}>Guthaben</span>
          <strong>{credits} Credits</strong>
        </span>
        <LogoutControl />
      </div>
    </nav>
  );
}
