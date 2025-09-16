import Leaderboard from "./Leaderboard";
import CountDown from "./CountDown";
import { Routes, Route, Navigate } from "react-router-dom";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Leaderboard />} />
      <Route path="/countdown" element={<CountDown />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
