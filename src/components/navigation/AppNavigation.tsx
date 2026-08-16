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
      <div className={styles.links}>
        <Link className={styles.link} href="/lobby">
          Lobby
        </Link>
        <Link className={styles.link} href="/dice">
          Dice
        </Link>
        <Link className={styles.link} href="/roulette">
          Roulette
        </Link>
        <Link className={styles.link} href="/leaderboard">
          Rangliste
        </Link>
      </div>
      <div className={styles.account}>
        <span className={styles.identity}>
          Angemeldet als {displayName}
          <strong>{credits} Credits</strong>
        </span>
        <LogoutControl />
      </div>
    </nav>
  );
}
