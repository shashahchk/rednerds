
import { EQUATIONS } from './equations';

export type CharStatus = 'CORRECT' | 'PRESENT' | 'ABSENT' | 'EMPTY';

export const EQUATION_LENGTH = 8;

export function getDailyIndex(dateObj: Date = new Date()): number {
  const year = dateObj.getUTCFullYear();
  const month = dateObj.getUTCMonth();
  const date = dateObj.getUTCDate();
  
  const dateString = `${year}-${month + 1}-${date}`;
  let hash = 0;
  for (let i = 0; i < dateString.length; i++) {
    hash = ((hash << 5) - hash) + dateString.charCodeAt(i);
    hash |= 0;
  }
  
  return Math.abs(hash) % EQUATIONS.length;
}

export function getEquationByIndex(index: number): string {
    return EQUATIONS[index] ?? EQUATIONS[0] ?? '10+20=30';
}

export function getDailyEquation(): string {
  // Client-side fallback if network fails
  return getEquationByIndex(getDailyIndex());
}

export function isValidEquation(equation: string): { valid: boolean; message?: string } {
  if (equation.length !== EQUATION_LENGTH) {
    return { valid: false, message: 'Equation must be 8 characters long' };
  }

  if (!/^[0-9+\-*/=]+$/.test(equation)) {
    return { valid: false, message: 'Invalid characters' };
  }

  const parts = equation.split('=');
  if (parts.length !== 2) {
    return { valid: false, message: 'Must contain exactly one "="' };
  }

  const [lhs, rhs] = parts;
  if (!lhs || !rhs) {
    return { valid: false, message: 'Invalid format' };
  }

  // Check for leading zeros in numbers (except 0 itself)
  // Split by operators to check each number
  const numbers = equation.split(/[+\-*/=]/);
  for (const num of numbers) {
    if (num.length > 1 && num.startsWith('0')) {
      return { valid: false, message: 'Leading zeros are not allowed' };
    }
    if (num.length === 0) {
       // e.g. "1++1=2" -> empty string between plusses
       return { valid: false, message: 'Invalid syntax' };
    }
  }

  try {
    // Basic math evaluation
    // Since we validated input chars, new Function is relatively safe here 
    // strictly for client-side gameplay validation.
    const calculated = new Function(`return ${lhs}`)();
    const result = parseInt(rhs, 10);

    if (!Number.isInteger(calculated)) {
        return { valid: false, message: 'Result must be an integer' };
    }

    if (calculated !== result) {
      return { valid: false, message: 'Equation does not compute' };
    }
  } catch (e) {
    return { valid: false, message: 'Invalid equation' };
  }

  return { valid: true };
}

export function checkGuess(guess: string, solution: string): CharStatus[] {
  const result: CharStatus[] = Array(guess.length).fill('ABSENT');
  const solutionChars = solution.split('');
  const guessChars = guess.split('');
  const solutionCounts: Record<string, number> = {};

  // Count frequencies in solution
  for (const char of solutionChars) {
    solutionCounts[char] = (solutionCounts[char] || 0) + 1;
  }

  // First pass: CORRECT (Green)
  for (let i = 0; i < guess.length; i++) {
    const char = guessChars[i];
    if (char && char === solutionChars[i]) {
      result[i] = 'CORRECT';
      if (solutionCounts[char]) {
         solutionCounts[char]--;
      }
    }
  }

  // Second pass: PRESENT (Purple/Yellow)
  for (let i = 0; i < guess.length; i++) {
    if (result[i] === 'CORRECT') continue;

    const char = guessChars[i];
    if (char && solutionCounts[char] && solutionCounts[char] > 0) {
      result[i] = 'PRESENT';
      solutionCounts[char]--;
    }
  }

  return result;
}
