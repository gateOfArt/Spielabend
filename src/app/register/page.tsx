import Link from "next/link";
import { RegisterForm } from "@/components/registration/RegisterForm";
import { Card } from "@/components/ui/Card";
import styles from "./page.module.css";

export default function RegisterPage() {
  return (
    <main className={styles.page}>
      <section className={styles.intro} aria-labelledby="register-title">
        <p className={styles.eyebrow}>Spieleabend</p>
        <h1 id="register-title">Konto erstellen</h1>
        <p>
          Registriere dich mit E-Mail und Passwort. Dein Konto startet mit 100
          virtuellen Credits.
        </p>
      </section>

      <Card as="section" aria-label="Registrierung" className={styles.card}>
        <RegisterForm />
      </Card>

      <p className={styles.alternative}>
        Bereits registriert? <Link href="/login">Jetzt anmelden</Link>
      </p>
    </main>
  );
}
