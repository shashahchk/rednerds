import './index.css';

import { navigateTo } from '@devvit/web/client';
import { context } from '@devvit/web/client';
import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useNerdle } from './hooks/useNerdle';
import { Grid } from './components/Grid';
import { Keyboard } from './components/Keyboard';
import { Leaderboard } from './components/Leaderboard';
import { getDailyEquation, generateShareText, getEquationByIndex, checkGuess } from '../shared/nerdle-logic';
import type { SubmitScoreRequest } from '../shared/api';

const PREVIEW_SOLUTION = '12+34=46';
const PREVIEW_GUESSES = [
  '13+24=37',
  '15+30=45',
  '12+34=46',
];

const TILE_STAGGER = 100;
const FLIP_HALF_MS = 300;

function getStatusStyle(status: string | undefined): string {
  if (status === 'CORRECT') return 'bg-book-correct border-book-correct text-white';
  if (status === 'PRESENT') return 'bg-book-present border-book-present text-book-text';
  if (status === 'ABSENT') return 'bg-book-absent border-book-absent text-book-text/60';
  return 'border-book-border bg-book-paper text-book-text';
}

function SplashPreviewGrid() {
  const indexRef = useRef(0);
  const [displayGuess, setDisplayGuess] = useState(PREVIEW_GUESSES[0]!);
  const [incomingGuess, setIncomingGuess] = useState<string | null>(null);
  const [flipId, setFlipId] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const nextIdx = (indexRef.current + 1) % PREVIEW_GUESSES.length;
      indexRef.current = nextIdx;
      setIncomingGuess(PREVIEW_GUESSES[nextIdx]!);
      setFlipId((k) => k + 1);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  // After flip animation finishes, promote incoming to display
  useEffect(() => {
    if (!incomingGuess) return;
    const totalDuration = 7 * TILE_STAGGER + FLIP_HALF_MS * 2 + 100;
    const timeout = setTimeout(() => {
      setDisplayGuess(incomingGuess);
      setIncomingGuess(null);
    }, totalDuration);
    return () => clearTimeout(timeout);
  }, [flipId, incomingGuess]);

  const isFlipping = incomingGuess !== null;
  const displayStatuses = checkGuess(displayGuess, PREVIEW_SOLUTION);
  const displayChars = displayGuess.split('');
  const incomingStatuses = incomingGuess ? checkGuess(incomingGuess, PREVIEW_SOLUTION) : null;
  const incomingChars = incomingGuess ? incomingGuess.split('') : null;

  return (
    <div className="my-2 shrink-0 w-full max-w-[280px] sm:max-w-xs">
      <div className="grid grid-cols-8 gap-1">
        {displayChars.map((char, i) => (
          <div key={i} className="relative aspect-square">
            {/* Current tile — static normally, flips out when transitioning */}
            <div
              key={`out-${flipId}`}
              className={`absolute inset-0 flex items-center justify-center border-2 font-bold select-none rounded text-base sm:text-lg shadow-sm font-mono ${getStatusStyle(displayStatuses[i])}`}
              style={isFlipping ? {
                animation: `tile-flip-out ${FLIP_HALF_MS}ms ease-in forwards`,
                animationDelay: `${i * TILE_STAGGER}ms`,
              } : undefined}
            >
              {char}
            </div>
            {/* Incoming tile — flips in after outgoing tile hides */}
            {isFlipping && incomingChars && incomingStatuses && (
              <div
                key={`in-${flipId}`}
                className={`absolute inset-0 flex items-center justify-center border-2 font-bold select-none rounded text-base sm:text-lg shadow-sm font-mono ${getStatusStyle(incomingStatuses[i])}`}
                style={{
                  transform: 'scaleY(0)',
                  animation: `tile-flip-in ${FLIP_HALF_MS}ms ease-out forwards`,
                  animationDelay: `${i * TILE_STAGGER + FLIP_HALF_MS}ms`,
                }}
              >
                {incomingChars[i]}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export const Splash = () => {
  const [gameStarted, setGameStarted] = useState(false);
  const [solution, setSolution] = useState('');
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [currentDate, setCurrentDate] = useState('');
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [hasPlayedToday, setHasPlayedToday] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [postId, setPostId] = useState<string | undefined>(undefined);
  const [puzzleLabel, setPuzzleLabel] = useState('');
  const [serverGuesses, setServerGuesses] = useState<string[]>([]);

  // Check if user has already played (today or for this post)
  useEffect(() => {
    async function checkStatus() {
      const today = new Date().toISOString().split('T')[0] || '';
      setCurrentDate(today);

      let fetchedPostId: string | undefined;

      try {
        const initRes = await fetch('/api/init');
        if (initRes.ok) {
          const initData = await initRes.json();
          fetchedPostId = initData.postId;
          setPostId(fetchedPostId);
        }
      } catch (e) {
        console.error('Error fetching init:', e);
      }

      // Fetch puzzle info for the correct label and solution
      try {
        const puzzleRes = await fetch('/api/puzzle');
        if (puzzleRes.ok) {
          const puzzleData = await puzzleRes.json();
          setPuzzleLabel(puzzleData.puzzleLabel || '');
          const eq = getEquationByIndex(puzzleData.index);
          setSolution(eq);
          if (puzzleData.postId && !fetchedPostId) {
            fetchedPostId = puzzleData.postId;
            setPostId(fetchedPostId);
          }
        }
      } catch (e) {
        console.error('Error fetching puzzle:', e);
        setSolution(getDailyEquation());
      }

      const key = fetchedPostId || today;

      try {
        console.log('[Splash] Checking status for:', key);
        const response = await fetch(`/api/leaderboard/${key}`);
        const result = await response.json();

        if (result.userEntry) {
          console.log('[Splash] User already played:', result.userEntry);
          setHasPlayedToday(true);
          setScoreSubmitted(true);
          setShowLeaderboard(true);
          if (result.userEntry.guesses) {
            setServerGuesses(result.userEntry.guesses);
          }
        }
      } catch (error) {
        console.error('Error checking status:', error);
      } finally {
        setCheckingStatus(false);
      }
    }

    void checkStatus();
  }, []);

  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleShare = async () => {
    try {
      // Use local guesses if available, fall back to server-stored guesses
      const shareGuesses = guesses.length > 0 ? guesses : serverGuesses;
      const text = generateShareText(shareGuesses, solution, puzzleLabel || 'Daily');
      await navigator.clipboard.writeText(text);
      setToast('Copied to clipboard!');
    } catch (e) {
      setToast('Failed to copy');
    }
  };

  // Solution is now fetched from /api/puzzle in checkStatus above

  const handleStartGame = () => {
    if (hasPlayedToday && !gameStarted) {
      // Already played, just show leaderboard
      setShowLeaderboard(true);
      return;
    }

    setGameStarted(true);
    if (!currentDate) {
      setCurrentDate(new Date().toISOString().split('T')[0] || '');
    }
    // Attempt to focus the window to capture keyboard events immediately
    window.focus();
  };

  const {
    guesses,
    currentGuess,
    status,
    isInvalidShake,
    errorMessage,
    onChar,
    onDelete,
    onEnter,
    elapsedSeconds
  } = useNerdle({
    solution,
    storageKey: postId ? `nerdle-state-${postId}` : undefined
  });

  // Physical Keyboard handling
  useEffect(() => {
    if (!gameStarted) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        onEnter();
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        onDelete();
      } else if (/^[0-9+\-*/=xX]$/.test(e.key)) {
        const char = e.key.toLowerCase() === 'x' ? '*' : e.key;
        onChar(char);
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
          postId: postId,
          timeSeconds: elapsedSeconds,
          guesses: guesses
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

    void submitScore();
  }, [status, guesses.length, currentDate, scoreSubmitted, postId, elapsedSeconds, guesses]);

  if (gameStarted && solution) {
    return (
      <div className="flex flex-col h-screen w-full bg-book-bg text-book-text overflow-hidden">
        {/* Header */}
        <header className="flex-shrink-0 py-2 px-3 border-b-2 border-book-border bg-book-paper flex justify-between items-center shadow-sm">
          <div className="w-16 text-left">
            <div className="text-xs text-book-text/60">Time</div>
            <div className="text-sm font-bold text-book-accent font-mono">
              {Math.floor(elapsedSeconds / 60)}:{(elapsedSeconds % 60).toString().padStart(2, '0')}
            </div>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-book-accent">
            NERD<span className="text-book-green">ITT</span>
          </h1>
          <div className="w-16 flex justify-end">
            <button
              onClick={() => setShowLeaderboard(true)}
              className="text-book-accent hover:text-book-green transition-colors text-xl"
              aria-label="View Leaderboard"
            >
              🤓
            </button>
          </div>
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
          {(errorMessage || toast) && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-[90%]">
              <div className="bg-book-text text-book-paper px-4 py-2 rounded-lg font-bold shadow-lg text-sm">
                {errorMessage || toast}
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
                    onClick={handleShare}
                    className="flex-1 bg-book-accent text-white px-4 py-3 rounded-lg font-bold hover:bg-book-accent/80 transition-colors shadow-md flex items-center justify-center"
                  >
                    Share 📋
                  </button>
                  <button
                    onClick={() => setShowLeaderboard(true)}
                    className="flex-1 bg-book-green text-white px-4 py-3 rounded-lg font-bold hover:bg-book-correct transition-colors shadow-md"
                  >
                    Leaderboard
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
            key={`lb-${scoreSubmitted}`}
            date={postId || currentDate}
            onClose={() => setShowLeaderboard(false)}
          />
        )}
      </div>
    );
  }

  // Floating symbols positioned in corners/edges, gently drifting
  const symbols = [
    // Left edge
    { char: '+', x: 3, y: 10, size: 28, dur: 6, delay: 0 },
    { char: '7', x: 8, y: 35, size: 22, dur: 5, delay: 1.5 },
    { char: '/', x: 5, y: 60, size: 26, dur: 7, delay: 0.8 },
    { char: '3', x: 10, y: 82, size: 20, dur: 5.5, delay: 2 },
    { char: '=', x: 2, y: 90, size: 24, dur: 6.5, delay: 0.3 },
    // Right edge
    { char: '-', x: 90, y: 12, size: 26, dur: 5.5, delay: 0.5 },
    { char: '9', x: 88, y: 40, size: 22, dur: 6, delay: 1 },
    { char: '*', x: 93, y: 65, size: 28, dur: 7, delay: 1.8 },
    { char: '4', x: 86, y: 85, size: 20, dur: 5, delay: 0.2 },
    { char: '2', x: 92, y: 92, size: 24, dur: 6.5, delay: 2.5 },
    // Top corners
    { char: '8', x: 15, y: 5, size: 20, dur: 5, delay: 1.2 },
    { char: '+', x: 82, y: 4, size: 22, dur: 6, delay: 0.7 },
    // Bottom corners
    { char: '6', x: 14, y: 93, size: 20, dur: 5.5, delay: 1.8 },
    { char: '=', x: 84, y: 95, size: 22, dur: 6, delay: 2.2 },
  ];

  return (
    <div className="flex flex-col h-screen bg-book-bg overflow-hidden relative">
      {/* Floating symbols along edges */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {symbols.map((s, i) => (
          <div
            key={i}
            className="absolute font-bold text-book-accent"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              fontSize: `${s.size}px`,
              opacity: 0.12,
              animation: `drift ${s.dur}s ease-in-out infinite`,
              animationDelay: `${s.delay}s`,
            }}
          >
            {s.char}
          </div>
        ))}
      </div>
      <style>{`
        @keyframes tile-flip-out {
          0% { transform: scaleY(1); }
          100% { transform: scaleY(0); }
        }
        @keyframes tile-flip-in {
          0% { transform: scaleY(0); }
          100% { transform: scaleY(1); }
        }
        @keyframes drift {
          0%, 100% {
            transform: translate(0, 0) rotate(0deg);
          }
          25% {
            transform: translate(6px, -8px) rotate(5deg);
          }
          50% {
            transform: translate(-4px, -14px) rotate(-3deg);
          }
          75% {
            transform: translate(8px, -6px) rotate(4deg);
          }
        }
      `}</style>

      <div className="flex-1 flex flex-col justify-center items-center px-4 py-2 min-h-0 relative z-10">
        <div className="flex flex-col items-center gap-2 max-w-md w-full">
          <div className="flex items-center justify-center gap-3 w-full shrink-0">
            <h1 className="text-4xl md:text-5xl font-extrabold text-center text-book-accent tracking-tight drop-shadow-lg">
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
              🤓
            </button>
          </div>

          <div className="flex flex-col items-center gap-2 text-center w-full min-h-0">
            <p className="text-base text-book-text font-medium shrink-0">
              Hey {context.username ?? 'user'} 👋
            </p>
            <p className="text-sm text-book-text/80 leading-tight shrink-0 font-semibold">
              A daily math puzzle. Guess the equation in 6 tries.
            </p>

            {/* Animated Preview Grid */}
            <SplashPreviewGrid />

            <div className="bg-book-paper border-2 border-book-border rounded-xl p-3 w-full shadow-lg overflow-y-auto shrink backdrop-blur-sm">
              <p className="text-xs text-book-accent mb-2 font-bold">How to play:</p>
              <ul className="text-xs text-book-text/70 space-y-1 text-left leading-tight">
                <li>• Guess the 8-character equation</li>
                <li>• Must be a valid calculation (e.g., <span className="font-mono font-semibold text-book-text">12+34=46</span>)</li>
                <li>• <span className="inline-block w-3 h-3 bg-book-correct rounded align-middle"></span> Green = correct position</li>
                <li>• <span className="inline-block w-3 h-3 bg-book-present rounded align-middle"></span> Gold = wrong position</li>
                <li>• <span className="inline-block w-3 h-3 bg-book-absent rounded align-middle"></span> Gray = not in equation</li>
              </ul>
            </div>
          </div>

          {checkingStatus ? (
            <div className="text-center text-book-text/60 py-2 shrink-0">Loading...</div>
          ) : hasPlayedToday ? (
            <div className="flex flex-col gap-2 w-full max-w-xs mt-1 shrink-0">
              <div className="bg-book-green/10 border-2 border-book-green rounded-xl p-3 text-center">
                <p className="text-sm text-book-accent font-bold mb-0.5">✓ Puzzle Completed!</p>
                <p className="text-[10px] text-book-text/70">Check back later or try another post</p>
              </div>
              <div className="flex gap-2 w-full">
                <button
                  className="flex-1 flex items-center justify-center bg-book-accent text-white font-bold text-sm h-10 rounded-xl cursor-pointer hover:bg-book-accent/90 transition-all shadow-md active:scale-95"
                  onClick={handleShare}
                >
                  Share 📋
                </button>
                <button
                  className="flex-1 flex items-center justify-center bg-book-green text-white font-bold text-sm h-10 rounded-xl cursor-pointer hover:bg-book-correct transition-all shadow-md active:scale-95"
                  onClick={() => setShowLeaderboard(true)}
                >
                  Leaderboard
                </button>
              </div>
            </div>
          ) : (
            <button
              className="flex items-center justify-center bg-book-green text-white font-bold text-base w-full max-w-xs h-12 rounded-xl cursor-pointer hover:bg-book-correct transition-all shadow-lg hover:shadow-xl active:scale-95 mt-1 shrink-0"
              onClick={handleStartGame}
            >
              Start Playing
            </button>
          )}
        </div>
      </div>

      <footer className="flex-shrink-0 flex justify-center gap-3 text-[10px] text-book-text/50 py-2">
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
          key={`lb-${scoreSubmitted}`}
          date={postId || currentDate}
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