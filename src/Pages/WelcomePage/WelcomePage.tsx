import SpringBackground from "../../assets/B1.optimized.jpg";
import styles from "./WelcomePage.module.css";
 
interface WelcomePageProps {
  onStartQuiz: () => void;
  onAdmin: () => void;
}

export function WelcomePage({ onStartQuiz, onAdmin }: WelcomePageProps) {
  return (
    <div
      className={styles["app-container"]}
      // prefer setting background via inline style so bundler handles the image path
      style={{ 
        backgroundImage: `url(${SpringBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <header className={styles["top-section"]}>
      </header>

      <main className={styles["main-content"]}>
        <h2>FIFA <br />QUIZ</h2>
      </main>

      <footer className={styles["bottom-section"]}>
        <div className={styles["button-group"]}>
          <button
            className={`${styles["cta-button"]} ${styles.primary} ${styles.glow} ${styles.bounce}`}
            onClick={onStartQuiz}
          >
            GET STARTED
          </button>

          <button
            className={`${styles["cta-button"]} ${styles["secondary"]}`}
            onClick={onAdmin}
          >
            Admin Panel
          </button>
        </div>
      </footer>
    </div>
  );
}
