interface Player {
  place: number;
  name: string;
  score: number;
}

const players: Player[] = [
  { place: 1, name: "Thabo", score: 3 },
  { place: 2, name: "Lerato", score: 2 },
  { place: 3, name: "Aisha", score: 2 },
  { place: 4, name: "Sipho", score: 0 },
];

export default function Leaderboard() {
  return (
    <div className="leaderboard-container">
      {/* Background video */}
      <video
        className="leaderboard-bg-video"
        autoPlay
        muted
        loop
        playsInline
        src="public/Celebration.mp4" /* put your video in public/bg.mp4 */
      />
      <div className="leaderboard-card">
        {/* Header */}
        <div className="leaderboard-header">
          <div className="leaderboard-header-icon">🏉</div>
          <h2 className="leaderboard-title">Springbok Quiz – Leaderboard</h2>
        </div>
        <p className="leaderboard-subtitle">
          Manage players and start the match
        </p>

        <hr className="leaderboard-divider" />

        {/* Table Headers */}
        <div className="leaderboard-headers">
          <span className="header-place">Place</span>
          <span className="header-name">Name</span>
          <span className="header-score">Score</span>
        </div>

        {/* Table */}
        <div>
          {players.map((player) => (
            <div key={player.place} className="leaderboard-row">
              <span className="data-place">{player.place}</span>
              <span className="data-name">{player.name}</span>
              <span className="data-score">{player.score}</span>
            </div>
          ))}
        </div>

        {/* Button */}
        <button
          className="leaderboard-button"
          onClick={() => (window.location.href = "/countdown")}
        >
          Next
        </button>
      </div>
    </div>
  );
}
