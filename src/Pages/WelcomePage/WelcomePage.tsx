import SpringboksImage from "../../assets/glucode2.png";
import SpringBackground from "../../assets/B1.png"; // add this so webpack/vite can resolve it
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
        backgroundColor: '#213A35',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Top Section with Image */}
      <header className={styles["top-section"]}>
        <img
          src={SpringboksImage}
          alt="Springbok"
          // combine module-scoped classes
          className={`${styles.floating} ${styles.pulse}`}
        />
      </header>

      {/* Middle Content */}
      <main className={styles["main-content"]}>
        {/* optional tagline */}
        {/* <p className={styles.tagline}>Test your rugby knowledge</p> */}
      </main>

      {/* Bottom Buttons */}
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
