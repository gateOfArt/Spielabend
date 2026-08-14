import Link from "next/link";
import { LogoutControl } from "@/components/authentication/LogoutControl";
import styles from "./AppNavigation.module.css";

export type AppNavigationProps = {
  displayName: string;
};

export function AppNavigation({ displayName }: AppNavigationProps) {
  return (
    <nav className={styles.navigation} aria-label="Hauptnavigation">
      <Link className={styles.brand} href="/lobby">
        Spieleabend
      </Link>
      <Link className={styles.link} href="/dice">
        Dice
      </Link>
      <div className={styles.account}>
        <span>Angemeldet als {displayName}</span>
        <LogoutControl />
      </div>
    </nav>
  );
}
