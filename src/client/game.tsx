
import './index.css';
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useNerdle } from './hooks/useNerdle';
import { Grid } from './components/Grid';
import { Keyboard } from './components/Keyboard';
import { getDailyEquation, generateShareText, getEquationByIndex } from '../shared/nerdle-logic';

const App = () => {
  const [solution, setSolution] = useState('');
  const [puzzleLabel, setPuzzleLabel] = useState('');
  const [postId, setPostId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPuzzle() {
      try {
        const response = await fetch('/api/puzzle');
        if (response.ok) {
          const data = await response.json();
          // We receive the index, now get the equation
          const eq = getEquationByIndex(data.index);
          setSolution(eq);
          setPuzzleLabel(data.puzzleLabel || '');
          setPostId(data.postId);
        } else {
          console.error('Failed to fetch puzzle');
          // Fallback
          setSolution(getDailyEquation());
        }
      } catch (e) {
        console.error('Error fetching puzzle:', e);
        setSolution(getDailyEquation());
      } finally {
        setLoading(false);
      }
    }
    fetchPuzzle();
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
  } = useNerdle({
    solution,
    // Use postId as key if available (per-post), otherwise fallback to daily date or generic
    storageKey: postId ? `nerdle-state-${postId}` : undefined
  });

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
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (status !== 'playing') {
      const timer = setTimeout(() => setShowModal(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleShare = async () => {
    try {
      const text = generateShareText(guesses, solution, puzzleLabel || 'Daily');
      await navigator.clipboard.writeText(text);
      setToast('Copied to clipboard!');
    } catch (e) {
      setToast('Failed to copy');
    }
  };

  // Render loading if solution not yet set
  if (loading || !solution) {
    return (
      <div className="flex h-screen items-center justify-center bg-nerdle-dark text-white">
        <div className="animate-spin text-4xl">⏳</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen max-h-screen bg-nerdle-dark text-white overflow-hidden">
      {/* Header */}
      <header className="flex-none p-4 border-b border-gray-800 flex justify-between items-center relative">
        <div className="w-8"></div>
        <div className="flex flex-col items-center">
          <h1 className="text-3xl font-bold tracking-widest text-nerdle-purple font-mono leading-none">
            NERD<span className="text-nerdle-green">ITT</span>
          </h1>
          {puzzleLabel && <span className="text-xs text-gray-500 font-mono mt-1">{puzzleLabel}</span>}
        </div>
        <div className="w-8 flex justify-end">
          {status !== 'playing' && (
            <button
              onClick={handleShare}
              className="text-2xl hover:scale-110 transition-transform"
              title="Share Result"
            >
              📋
            </button>
          )}
        </div>
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
        {(errorMessage || toast) && (
          <div className="absolute top-10 left-1/2 transform -translate-x-1/2 z-50">
            <div className="bg-white text-black px-4 py-2 rounded font-bold animate-pop shadow-lg whitespace-nowrap">
              {errorMessage || toast}
            </div>
          </div>
        )}

        {/* Game Over Message */}
        {/* Game Over Modal */}
        {showModal && (
          <div className="absolute top-0 left-0 w-full h-full bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-nerdle-gray border-2 border-nerdle-green p-6 rounded-lg shadow-2xl text-center animate-pop w-3/4 max-w-sm relative">
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-2 right-2 text-gray-400 hover:text-white"
              >
                ✕
              </button>
              <h2 className="text-2xl font-bold mb-4">
                {status === 'won' ? 'Calculation Correct!' : 'Calculation Failed'}
              </h2>
              <p className="mb-4 text-xl tracking-wider">{solution}</p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleShare}
                  className="bg-nerdle-purple text-white px-6 py-2 rounded font-bold hover:bg-purple-600 transition-colors flex items-center justify-center gap-2"
                >
                  Share Result 📋
                </button>
                <div className="text-sm text-gray-400 mt-2">
                  Next puzzle available tomorrow!
                </div>
              </div>
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
