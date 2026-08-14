import Link from "next/link";
import { LoginForm } from "@/components/authentication/LoginForm";
import { Card } from "@/components/ui/Card";
import styles from "./page.module.css";

export default function LoginPage() {
  return (
    <main className={styles.page}>
      <section className={styles.intro} aria-labelledby="login-title">
        <p className={styles.eyebrow}>Spieleabend</p>
        <h1 id="login-title">Anmelden</h1>
        <p>Melde dich mit deiner E-Mail-Adresse und deinem Passwort an.</p>
      </section>

      <Card as="section" aria-label="Anmeldung" className={styles.card}>
        <LoginForm />
      </Card>

      <p className={styles.alternative}>
        Noch kein Konto? <Link href="/register">Jetzt registrieren</Link>
      </p>
    </main>
  );
}
