import "./index.css";
import SpringbokGameHost from "./Pages/SpringbokGameHostPage/SpringbokGameHost";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LobbyScreen from "./Pages/AdminLobbyPage/LobbyPage";
import WelcomePageWrapper from "./Pages/WelcomePage/WelcomePageWrapper";
import { PlayerRegistration } from "./Pages/registration/PlayerRegistration";
import PlayerLobbyPage from "./Pages/PlayerLobbyPage/PlayerLobbyPage";
import QuizPage from "./Pages/QuizPage/QuizPage";
import HostQuizView from "./Pages/HostQuizPage/HostQuizView";
import HostLeaderboardPage from "./Pages/HostLeaderboardPage/HostLeaderboardPage";
import PlayerRoundResultPage from "./Pages/PlayerRoundResultPage/PlayerRoundResultPage";
import WinnerPage from "./Pages/WinnerPage/WinnerPage";
import WaitingSuddenDeathPage from "./Pages/WaitingSuddenDeathPage/WaitingSuddenDeathPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<WelcomePageWrapper />} />
        <Route path="/admin" element={<SpringbokGameHost />} />
        <Route path="/player" element={<PlayerRegistration />} />
        <Route path="/lobby/:code" element={<LobbyScreen />} />
        <Route path="/player/lobby/:code" element={<PlayerLobbyPage />} />
        <Route path="/game/:code/question" element={<QuizPage />} />
        <Route path="/game/:code/host" element={<HostQuizView />} />
        <Route
          path="/game/:code/leaderboard"
          element={<HostLeaderboardPage />}
        />
        <Route
          path="/game/:code/round-result"
          element={<PlayerRoundResultPage />}
        />
        <Route
          path="/game/:code/sudden-death-wait"
          element={<WaitingSuddenDeathPage />}
        />
        <Route path="/game/:code/winner" element={<WinnerPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

