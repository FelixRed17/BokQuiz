import React from 'react';
import './index.css';
import QuizScreen from './presentation/components/QuizScreen.tsx';
import WinnerScreen from './presentation/components/WinnerScreen.tsx';

const App: React.FC = () => {
  const [showWinner, setShowWinner] = React.useState(true);
  const questionData = { question: 'What is the capital of France?', options: ['Paris', 'Berlin', 'London', 'Madrid'] };

  return (
    <div>
      <div style={{ position: 'fixed', top: 10, left: 10, zIndex: 10, display: 'flex', gap: 8 }}>
        <button onClick={() => setShowWinner(false)}>Show Quiz</button>
        <button onClick={() => setShowWinner(true)}>Show Winner</button>
      </div>

      {showWinner ? (
        <WinnerScreen title="WINNER" name="Springbok" message="Well played!" />
      ) : (
        <QuizScreen
          questionData={questionData}
          questionNumber={1}
          onNext={(selected) => {
            if (selected === null) alert('Please select an option.');
            else alert(`You selected option ${selected + 1}`);
          }}
        />
      )}
    </div>
  );
};

export default App;


