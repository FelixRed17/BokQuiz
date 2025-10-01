import "./index.css";
import SpringbokGameHost from "./Pages/SpringbokGameHostPage/SpringbokGameHost";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LobbyScreen from "./Pages/AdminLobbyPage/LobbyPage";
import WelcomePageWrapper from "./Pages/WelcomePage/WelcomePageWrapper";
import { PlayerRegistration } from "./Pages/registration/PlayerRegistration";
import PlayerLobbyPage from "./Pages/PlayerLobbyPage/PlayerLobbyPage";

function App() {
  return (
    /*<BrowserRouter>
      <Routes>
        <Route path="/" element={<WelcomePageWrapper />} />
        <Route path="/admin" element={<SpringbokGameHost />} />
        <Route path="/player" element={<PlayerRegistration />} />
        <Route path="/lobby/:code" element={<LobbyScreen />} />
      </Routes>
    </BrowserRouter>*/
    <PlayerLobbyPage/>
  );
}

export default App;
