import { RegistrationForm, type RegistrationData } from "./RegistrationForm";
import styles from "./PlayerRegistration.module.css";
import { useNavigate } from "react-router-dom";

export interface PlayerRegistrationProps {
  onRegisterComplete?: (data: RegistrationData) => void;
  onNavigateBack?: () => void;
}

export function PlayerRegistration({
  onRegisterComplete,
}: PlayerRegistrationProps) {
  const navigate = useNavigate();

  const handleRegistrationSuccess = (registrationData: RegistrationData) => {
    if (onRegisterComplete) {
      onRegisterComplete(registrationData);
    }

    console.log("Player registered:", registrationData);

    // Navigate to player lobby with game code
    navigate(`/player/lobby/${encodeURIComponent(registrationData.gameCode)}`);
  };

  return (
    <div className={styles.pageRoot}>
      <div className={styles.registrationContainer}>
        <div className={styles.header}>
          <h1 className={styles.title}>Join FIFA Quiz</h1>
          <p className={styles.subtitle}>
            Ready to test your FIFA football knowledge?
          </p>
        </div>

        <RegistrationForm onRegisterSuccess={handleRegistrationSuccess} />

        <div className={styles.footer}>
          <p className={styles.footerText}>
            Challenge yourself with FIFA Quiz trivia.
          </p>
        </div>
      </div>
    </div>
  );
}
