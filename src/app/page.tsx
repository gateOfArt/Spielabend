import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.page}>
      <section className={styles.intro} aria-labelledby="page-title">
        <p className={styles.eyebrow}>Universitätsprojekt</p>
        <h1 id="page-title">Spieleabend</h1>
        <p>
          Registriere dich, spiele Dice und Roulette mit virtuellen Credits
          und verfolge deinen Stand in der Rangliste.
        </p>
        <nav className={styles.actions} aria-label="Einstieg">
          <Link className={styles.primaryAction} href="/login">
            Anmelden
          </Link>
          <Link className={styles.secondaryAction} href="/register">
            Registrieren
          </Link>
        </nav>
      </section>
    </main>
  );
}
