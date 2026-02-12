import './index.css';

import { navigateTo } from '@devvit/web/client';
import { context } from '@devvit/web/client';
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useNerdle } from './hooks/useNerdle';
import { Grid } from './components/Grid';
import { Keyboard } from './components/Keyboard';
import { Leaderboard } from './components/Leaderboard';
import { getDailyEquation } from '../shared/nerdle-logic';
import type { SubmitScoreRequest } from '../shared/api';

export const Splash = () => {
  const [gameStarted, setGameStarted] = useState(false);
  const [solution, setSolution] = useState('');
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [currentDate, setCurrentDate] = useState('');
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [hasPlayedToday, setHasPlayedToday] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Check if user has already played today
  useEffect(() => {
    async function checkTodayStatus() {
      const today = new Date().toISOString().split('T')[0] || '';
      setCurrentDate(today);
      
      try {
        const response = await fetch(`/api/leaderboard/${today}`);
        const result = await response.json();
        
        if (result.userEntry) {
          setHasPlayedToday(true);
          setScoreSubmitted(true);
        }
      } catch (error) {
        console.error('Error checking today status:', error);
      } finally {
        setCheckingStatus(false);
      }
    }
    
    checkTodayStatus();
  }, []);

  const handleStartGame = () => {
    if (hasPlayedToday && !gameStarted) {
      // Already played, just show leaderboard
      setShowLeaderboard(true);
      return;
    }
    
    setSolution(getDailyEquation());
    setGameStarted(true);
    if (!currentDate) {
      setCurrentDate(new Date().toISOString().split('T')[0] || '');
    }
  };

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

  // Physical Keyboard handling
  useEffect(() => {
    if (!gameStarted) return;

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
  }, [gameStarted, onEnter, onDelete, onChar]);

  // Submit score when game ends
  useEffect(() => {
    if (status === 'playing' || scoreSubmitted || !currentDate) return;

    async function submitScore() {
      try {
        const payload: SubmitScoreRequest = {
          date: currentDate,
          attempts: guesses.length,
          won: status === 'won',
        };

        console.log('Submitting score:', payload);

        const response = await fetch('/api/leaderboard/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const result = await response.json();
        console.log('Submit score response:', result);

        if (result.success) {
          console.log('Score submitted successfully! Rank:', result.rank);
          setScoreSubmitted(true);
        } else {
          console.log('Score submission failed or already submitted');
          setScoreSubmitted(true); // Mark as submitted even if already exists
        }
      } catch (error) {
        console.error('Error submitting score:', error);
      }
    }

    submitScore();
  }, [status, guesses.length, currentDate, scoreSubmitted]);

  if (gameStarted && solution) {
    return (
      <div className="flex flex-col h-screen w-full bg-book-bg text-book-text overflow-hidden">
        {/* Header */}
        <header className="flex-shrink-0 py-2 px-3 border-b-2 border-book-border bg-book-paper flex justify-between items-center shadow-sm">
          <div className="w-8"></div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-book-accent">
            NERD<span className="text-book-green">ITT</span>
          </h1>
          <button
            onClick={() => setShowLeaderboard(true)}
            className="text-book-accent hover:text-book-green transition-colors text-xl"
            aria-label="View Leaderboard"
          >
            🏆
          </button>
        </header>

        {/* Game Area */}
        <main className="flex-1 flex flex-col items-center justify-center overflow-hidden relative min-h-0 py-2">
          {/* Grid Container */}
          <div className="flex-1 flex items-center justify-center w-full px-2 min-h-0">
            <Grid
              guesses={guesses}
              currentGuess={currentGuess}
              solution={solution}
              isInvalid={isInvalidShake}
            />
          </div>

          {/* Messages / Toast */}
          {errorMessage && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-[90%]">
              <div className="bg-book-text text-book-paper px-4 py-2 rounded-lg font-bold shadow-lg text-sm">
                {errorMessage}
              </div>
            </div>
          )}

          {/* Game Over Message */}
          {status !== 'playing' && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-[90%] max-w-sm px-4">
              <div className="bg-book-paper border-4 border-book-green p-6 rounded-2xl shadow-2xl text-center">
                <h2 className="text-xl sm:text-2xl font-bold mb-3 text-book-accent">
                  {status === 'won' ? 'Calculation Correct!' : 'Calculation Failed'}
                </h2>
                <p className="mb-2 text-lg sm:text-xl tracking-wider text-book-text font-bold font-mono">{solution}</p>
                <p className="mb-4 text-sm text-book-text/60">
                  {status === 'won' ? 'Solved' : 'Used'} {guesses.length} {guesses.length === 1 ? 'guess' : 'guesses'}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowLeaderboard(true)}
                    className="flex-1 bg-book-accent text-white px-4 py-3 rounded-lg font-bold hover:bg-book-accent/90 transition-colors shadow-md"
                  >
                    Leaderboard
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="flex-1 bg-book-green text-white px-4 py-3 rounded-lg font-bold hover:bg-book-correct transition-colors shadow-md"
                  >
                    Play Again
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Keyboard - Fixed at bottom */}
        <div className="flex-shrink-0 w-full pb-1 px-1 bg-book-bg overflow-hidden">
          <Keyboard
            onChar={onChar}
            onDelete={onDelete}
            onEnter={onEnter}
            guesses={guesses}
            solution={solution}
          />
        </div>

        {/* Leaderboard Modal */}
        {showLeaderboard && (
          <Leaderboard
            date={currentDate}
            onClose={() => setShowLeaderboard(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-book-bg overflow-y-auto">
      <div className="flex-1 flex flex-col justify-center items-center px-4 py-8">
        <div className="flex flex-col items-center gap-6 max-w-md w-full">
          <div className="flex items-center justify-center gap-3 w-full">
            <h1 className="text-4xl md:text-5xl font-extrabold text-center text-book-accent tracking-tight">
              NERD<span className="text-book-green">ITT</span>
            </h1>
            <button
              onClick={() => {
                setCurrentDate(new Date().toISOString().split('T')[0] || '');
                setShowLeaderboard(true);
              }}
              className="text-2xl hover:scale-110 transition-transform"
              aria-label="View Leaderboard"
            >
              🏆
            </button>
          </div>
          
          <div className="flex flex-col items-center gap-4 text-center w-full">
            <p className="text-lg text-book-text font-medium">
              Hey {context.username ?? 'user'} 👋
            </p>
            <p className="text-sm text-book-text/80 leading-relaxed">
              A daily math puzzle. Guess the equation in up to 6 tries. One puzzle per day!
            </p>
            
            <div className="bg-book-paper border-2 border-book-border rounded-xl p-5 mt-2 w-full shadow-md">
              <p className="text-sm text-book-accent mb-3 font-bold">How to play:</p>
              <ul className="text-xs text-book-text/70 space-y-2 text-left leading-relaxed">
                <li>• Guess the 8-character equation</li>
                <li>• Must be a valid calculation (e.g., <span className="font-mono font-semibold text-book-text">12+34=46</span>)</li>
                <li>• <span className="inline-block w-4 h-4 bg-book-correct rounded align-middle"></span> Green = correct position</li>
                <li>• <span className="inline-block w-4 h-4 bg-book-present rounded align-middle"></span> Gold = wrong position</li>
                <li>• <span className="inline-block w-4 h-4 bg-book-absent rounded align-middle"></span> Gray = not in equation</li>
              </ul>
            </div>
          </div>

          {checkingStatus ? (
            <div className="text-center text-book-text/60 py-3">Loading...</div>
          ) : hasPlayedToday ? (
            <div className="flex flex-col gap-3 w-full max-w-xs mt-2">
              <div className="bg-book-green/10 border-2 border-book-green rounded-xl p-4 text-center">
                <p className="text-sm text-book-accent font-bold mb-1">✓ Completed Today!</p>
                <p className="text-xs text-book-text/70">Come back tomorrow for the next puzzle</p>
              </div>
              <button
                className="flex items-center justify-center bg-book-accent text-white font-bold text-base w-full h-12 rounded-xl cursor-pointer hover:bg-book-accent/90 transition-all shadow-lg hover:shadow-xl active:scale-95"
                onClick={() => setShowLeaderboard(true)}
              >
                View Leaderboard
              </button>
            </div>
          ) : (
            <button
              className="flex items-center justify-center bg-book-green text-white font-bold text-base w-full max-w-xs h-12 rounded-xl cursor-pointer hover:bg-book-correct transition-all shadow-lg hover:shadow-xl active:scale-95 mt-2"
              onClick={handleStartGame}
            >
              Start Playing
            </button>
          )}
        </div>
      </div>

      <footer className="flex-shrink-0 flex justify-center gap-3 text-xs text-book-text/50 py-4">
        <button
          className="cursor-pointer hover:text-book-accent transition-colors"
          onClick={() => navigateTo('https://developers.reddit.com/docs')}
        >
          Docs
        </button>
        <span className="text-book-border">|</span>
        <button
          className="cursor-pointer hover:text-book-accent transition-colors"
          onClick={() => navigateTo('https://www.reddit.com/r/Devvit')}
        >
          r/Devvit
        </button>
        <span className="text-book-border">|</span>
        <button
          className="cursor-pointer hover:text-book-accent transition-colors"
          onClick={() => navigateTo('https://discord.com/invite/R7yu2wh9Qz')}
        >
          Discord
        </button>
      </footer>

      {/* Leaderboard Modal */}
      {showLeaderboard && (
        <Leaderboard
          date={currentDate}
          onClose={() => setShowLeaderboard(false)}
        />
      )}
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
