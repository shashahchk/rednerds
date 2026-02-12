
import { useState, useEffect, useCallback } from 'react';
import { isValidEquation, EQUATION_LENGTH } from '../../shared/nerdle-logic';

export type GameStatus = 'playing' | 'won' | 'lost';

export interface UseNerdleProps {
  solution: string;
}

export function useNerdle({ solution }: UseNerdleProps) {
  const [guesses, setGuesses] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [status, setStatus] = useState<GameStatus>('playing');
  const [isInvalidShake, setIsInvalidShake] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset game when solution changes (new day)
  useEffect(() => {
    setGuesses([]);
    setCurrentGuess('');
    setStatus('playing');
    setErrorMessage(null);
  }, [solution]);

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
