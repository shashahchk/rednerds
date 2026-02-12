

import clsx from 'clsx';
import { checkGuess, CharStatus } from '../../shared/nerdle-logic';

interface KeyboardProps {
    onChar: (char: string) => void;
    onDelete: () => void;
    onEnter: () => void;
    guesses: string[];
    solution: string;
}

const KEYS = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['DELETE', '+', '-', '*', '/', '=', 'ENTER']
];

export function Keyboard({ onChar, onDelete, onEnter, guesses, solution }: KeyboardProps) {
    const charStatuses: Record<string, CharStatus> = {};

    // Compute status for each key based on guesses
    // Iterating all guesses to find the best status for each key
    guesses.forEach((guess) => {
        const statuses = checkGuess(guess, solution);

        guess.split('').forEach((char, i) => {
            const status = statuses[i];
            const currentStatus = charStatuses[char];

            if (status === 'CORRECT') {
                charStatuses[char] = 'CORRECT';
            } else if (status === 'PRESENT' && currentStatus !== 'CORRECT') {
                charStatuses[char] = 'PRESENT';
            } else if (status === 'ABSENT' && currentStatus !== 'CORRECT' && currentStatus !== 'PRESENT') {
                charStatuses[char] = 'ABSENT';
            }
        });
    });

    return (
        <div className="w-full max-w-2xl mx-auto px-1">
            {KEYS.map((row, i) => (
                <div key={i} className="flex justify-center gap-1 mb-1">
                    {row.map((key) => {
                        const status = charStatuses[key] || 'EMPTY';
                        return (
                            <Key
                                key={key}
                                value={key}
                                status={status}
                                onClick={() => {
                                    if (key === 'ENTER') onEnter();
                                    else if (key === 'DELETE') onDelete();
                                    else onChar(key);
                                }}
                            />
                        );
                    })}
                </div>
            ))}
        </div>
    );
}

interface KeyProps {
    value: string;
    status: CharStatus | 'EMPTY';
    onClick: () => void;
}

function Key({ value, status, onClick }: KeyProps) {
    const statusStyles = {
        CORRECT: "bg-book-correct text-white border-book-correct",
        PRESENT: "bg-book-present text-book-text border-book-present",
        ABSENT: "bg-book-absent text-book-text/60 border-book-absent",
        EMPTY: "bg-book-paper text-book-text border-book-border hover:bg-book-bg"
    };

    // Wide keys for ENTER and DELETE
    const isWide = value === 'ENTER' || value === 'DELETE';
    const isOperator = ['+', '-', '*', '/', '='].includes(value);
    
    // Special styling for ENTER button
    const specialClass = value === 'ENTER' 
        ? "bg-book-green text-white border-book-green hover:bg-book-correct font-extrabold" 
        : value === 'DELETE'
        ? "bg-book-accent text-white border-book-accent hover:bg-opacity-90"
        : "";

    return (
        <button
            onClick={onClick}
            className={clsx(
                "flex items-center justify-center rounded font-bold transition-all active:scale-95 touch-manipulation border-2 shadow-sm",
                "flex-1 min-w-0",
                "h-11 text-sm",
                "sm:h-12 sm:text-base",
                isWide && "px-2 text-[10px] sm:text-xs font-extrabold",
                isOperator ? "font-mono text-lg sm:text-xl" : "font-mono",
                specialClass || statusStyles[status]
            )}
        >
            <span className="truncate">{value === 'DELETE' ? '⌫' : value}</span>
        </button>
    );
}
