import "./index.css";
import SpringbokGameHost from "./Pages/SpringbokGameHostPage/SpringbokGameHost";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LobbyScreen from "./Pages/AdminLobbyPage/LobbyPage";
import WelcomePageWrapper from "./Pages/WelcomePage/WelcomePageWrapper";
import { PlayerRegistration } from "./Pages/registration/PlayerRegistration";
import PlayerLobbyPage from "./Pages/PlayerLobbyPage/PlayerLobbyPage";
import QuizPage from "./Pages/QuizPage/QuizPage";
import HostQuizView from "./Pages/HostQuizPage/HostQuizView";

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
      </Routes>
    </BrowserRouter>
  );
}

export default App;
