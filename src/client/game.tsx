
import './index.css';
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useNerdle } from './hooks/useNerdle';
import { Grid } from './components/Grid';
import { Keyboard } from './components/Keyboard';
import { getDailyEquation } from '../shared/nerdle-logic';

const App = () => {
  const [solution, setSolution] = useState('');

  useEffect(() => {
    // Initialize with daily equation (UTC based)
    setSolution(getDailyEquation());
  }, []);

  const {
    guesses,
    currentGuess,
    status,
    isInvalidShake,
    errorMessage,
    onChar,
    onDelete,
    onEnter
  } = useNerdle({ solution });

  // Physiocal Keyboard handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        onEnter();
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        onDelete();
      } else if (/^[0-9+\-*/=]$/.test(e.key)) {
        onChar(e.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onEnter, onDelete, onChar]);

  // Render loading if solution not yet set (though it's sync, useEffect might delay slightly?)
  // Actually getDailyEquation is sync, so we could just set it InitialState.
  // stick to useState('') for now.
  if (!solution) return null;

  return (
    <div className="flex flex-col h-screen max-h-screen bg-nerdle-dark text-white overflow-hidden">
      {/* Header */}
      <header className="flex-none p-4 border-b border-gray-800 flex justify-center items-center relative">
        <h1 className="text-3xl font-bold tracking-widest text-nerdle-purple font-mono">
          NERD<span className="text-nerdle-green">ITT</span>
        </h1>
        {/* Help/Settings buttons could go here */}
      </header>

      {/* Game Area */}
      <main className="flex-grow flex flex-col items-center justify-center p-2 relative">
        <div className="flex-grow flex flex-col justify-center w-full max-w-[500px]">
          <Grid
            guesses={guesses}
            currentGuess={currentGuess}
            solution={solution}
            isInvalid={isInvalidShake}
          />
        </div>

        {/* Messages / Toast */}
        {errorMessage && (
          <div className="absolute top-10 left-1/2 transform -translate-x-1/2 z-50">
            <div className="bg-white text-black px-4 py-2 rounded font-bold animate-pop shadow-lg">
              {errorMessage}
            </div>
          </div>
        )}

        {/* Game Over Message */}
        {status !== 'playing' && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-3/4 max-w-sm">
            <div className="bg-nerdle-gray border-2 border-nerdle-green p-6 rounded-lg shadow-2xl text-center animate-pop">
              <h2 className="text-2xl font-bold mb-4">
                {status === 'won' ? 'Calculation Correct!' : 'Calculation Failed'}
              </h2>
              <p className="mb-4 text-xl tracking-wider">{solution}</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-nerdle-green text-black px-6 py-2 rounded font-bold hover:bg-green-400 transition-colors"
              >
                Play Again (Debug)
              </button>
              {/* In real daily game, check back tomorrow */}
            </div>
          </div>
        )}

        <div className="flex-none w-full pb- safe-area-bottom">
          <Keyboard
            onChar={onChar}
            onDelete={onDelete}
            onEnter={onEnter}
            guesses={guesses}
            solution={solution}
          />
        </div>
      </main>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
