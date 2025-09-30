import { useNavigate } from "react-router-dom";
import { WelcomePage } from "./WelcomePage";

function WelcomePageWrapper() {
  const navigate = useNavigate();

  return (
    <WelcomePage
      onStartQuiz={() => navigate("/player")}
      onAdmin={() => navigate("/admin")}
    />
  );
}

export default WelcomePageWrapper;
