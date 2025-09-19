import SpringboksImage from '../assets/Springboks.png'

interface WelcomePageProps {
  onStartQuiz: () => void
  onAdmin: () => void
}

export function WelcomePage({ onStartQuiz, onAdmin }: WelcomePageProps) {
  return (
    <div className="app-container">
      {/* Top Section with Image */}
      <header className="top-section">
        <img src={SpringboksImage} alt="Springbok" className="floating pulse" />
      </header>

      {/* Middle Content */}
      <main className="main-content">
        <h1>BOKQUIZ</h1>
      </main>

      {/* Bottom Buttons */}
      <footer className="bottom-section">
        <div className="button-group">
          <button className="cta-button primary glow bounce" onClick={onStartQuiz}>
            GET STARTED
          </button>
          <button className="cta-button secondary" onClick={onAdmin}>
            Admin Panel
          </button>
        </div>
      </footer>
    </div>
  )
}
