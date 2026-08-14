import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.page}>
      <section className={styles.intro} aria-labelledby="page-title">
        <p className={styles.eyebrow}>University project</p>
        <h1 id="page-title">Spieleabend</h1>
        <p>
          The repository foundation is ready. Product behavior will be added only
          from reviewed requirements.
        </p>
      </section>
    </main>
  );
}
