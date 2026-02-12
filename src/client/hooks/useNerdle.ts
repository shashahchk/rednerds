
import { useState, useEffect, useCallback } from 'react';
import { isValidEquation, EQUATION_LENGTH } from '../../shared/nerdle-logic';

export type GameStatus = 'playing' | 'won' | 'lost';

export interface UseNerdleProps {
  solution: string;
  storageKey?: string | undefined;
}

export function useNerdle({ solution, storageKey }: UseNerdleProps) {
  // Key wrapper
  const getStorageKey = useCallback(() => storageKey || 'nerdle-state', [storageKey]);

  // Initialize state
  const [guesses, setGuesses] = useState<string[]>(() => {
    const key = getStorageKey();
    try {
        const saved = localStorage.getItem(key);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.solution === solution) return parsed.guesses;
        }
    } catch(e) {}
    return [];
  });
  
  const [currentGuess, setCurrentGuess] = useState('');
  
  const [status, setStatus] = useState<GameStatus>(() => {
    const key = getStorageKey();
     try {
        const saved = localStorage.getItem(key);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.solution === solution) {
               if (parsed.guesses.includes(solution)) return 'won';
               if (parsed.guesses.length >= 6) return 'lost';
            }
        }
    } catch(e) {}
    return 'playing';
  });

  const [isInvalidShake, setIsInvalidShake] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Track which key the current guesses belong to
  // This prevents the persistence effect from writing stale guesses to a NEW key before the load effect has run
  const [loadedKey, setLoadedKey] = useState<string>(() => getStorageKey());

  // Load state when storageKey changes
  useEffect(() => {
    if (!solution) return; // Only wait for solution
    
    const key = getStorageKey();
    
    // If we are switching keys, we haven't loaded the data for the new key yet.
    // So current 'guesses' are stale (belong to old key).
    
    try {
        const saved = localStorage.getItem(key);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.solution === solution) {
                setGuesses(parsed.guesses);
                // ...
                if (parsed.guesses.includes(solution)) setStatus('won');
                else if (parsed.guesses.length >= 6) setStatus('lost');
                else setStatus('playing');
                setCurrentGuess('');
                setErrorMessage(null);
                setLoadedKey(key); // Mark as loaded for this key
                return;
            }
        }
    } catch(e) {}
    
    // If no saved state or mismatch, reset
    setGuesses([]);
    setStatus('playing');
    setCurrentGuess('');
    setErrorMessage(null);
    setLoadedKey(key); // Mark as loaded (empty) for this key
  }, [storageKey, solution, getStorageKey]);

  // Persistence effect
  useEffect(() => {
    const currentKey = getStorageKey();
    // CRITICAL: Only write if the current guesses actually belong to this key
    if (solution && currentKey && loadedKey === currentKey) {
        localStorage.setItem(currentKey, JSON.stringify({
            solution,
            guesses
        }));
    }
  }, [guesses, solution, storageKey, getStorageKey, loadedKey]);

  const onChar = useCallback(
    (char: string) => {
      if (status !== 'playing') return;
      if (currentGuess.length < EQUATION_LENGTH) {
        setCurrentGuess((prev) => prev + char);
      }
    },
    [currentGuess, status]
  );

  const onDelete = useCallback(() => {
    if (status !== 'playing') return;
    setCurrentGuess((prev) => prev.slice(0, -1));
    setErrorMessage(null);
  }, [status]);

  const onEnter = useCallback(() => {
    if (status !== 'playing') return;

    if (currentGuess.length !== EQUATION_LENGTH) {
      setErrorMessage('Not enough characters');
      setIsInvalidShake(true);
      setTimeout(() => setIsInvalidShake(false), 600);
      return;
    }

    const { valid, message } = isValidEquation(currentGuess);
    if (!valid) {
      setErrorMessage(message || 'Invalid equation');
      setIsInvalidShake(true);
      setTimeout(() => setIsInvalidShake(false), 600);
      return;
    }

    setGuesses((prev) => [...prev, currentGuess]);
    
    if (currentGuess === solution) {
      setStatus('won');
    } else if (guesses.length + 1 >= 6) {
      setStatus('lost');
    }
    
    setCurrentGuess('');
  }, [currentGuess, guesses.length, solution, status]);

  return {
    guesses,
    currentGuess,
    status,
    isInvalidShake,
    errorMessage,
    onChar,
    onDelete,
    onEnter,
  };
}
