import { Suspense, lazy } from "react";
import "./index.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import WelcomePageWrapper from "./Pages/WelcomePage/WelcomePageWrapper";
import { PlayerRegistration } from "./Pages/registration/PlayerRegistration";

const SpringbokGameHost = lazy(
  () => import("./Pages/SpringbokGameHostPage/SpringbokGameHost")
);
const LobbyScreen = lazy(() => import("./Pages/AdminLobbyPage/LobbyPage"));
const PlayerLobbyPage = lazy(
  () => import("./Pages/PlayerLobbyPage/PlayerLobbyPage")
);
const QuizPage = lazy(() => import("./Pages/QuizPage/QuizPage"));
const HostQuizView = lazy(
  () => import("./Pages/HostQuizPage/HostQuizView")
);
const HostLeaderboardPage = lazy(
  () => import("./Pages/HostLeaderboardPage/HostLeaderboardPage")
);
const PlayerRoundResultPage = lazy(
  () => import("./Pages/PlayerRoundResultPage/PlayerRoundResultPage")
);
const WaitingSuddenDeathPage = lazy(
  () => import("./Pages/WaitingSuddenDeathPage/WaitingSuddenDeathPage")
);
const WinnerPage = lazy(() => import("./Pages/WinnerPage/WinnerPage"));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div>Loading...</div>}>
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
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
