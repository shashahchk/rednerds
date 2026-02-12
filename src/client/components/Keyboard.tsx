

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
    ['+', '-', '*', '/', '='],
    ['ENTER', 'DELETE']
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
        <div className="w-full max-w-[500px] mx-auto p-2">
            {KEYS.map((row, i) => (
                <div key={i} className="flex justify-center mb-2 gap-1">
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
        CORRECT: "bg-nerdle-green border-nerdle-green text-black",
        PRESENT: "bg-nerdle-purple border-nerdle-purple text-white",
        ABSENT: "bg-nerdle-gray border-nerdle-gray opacity-50 text-white",
        EMPTY: "bg-gray-700 hover:bg-gray-600 text-white"
    };

    // Wide keys need slightly different styling
    const widthClass = value === 'ENTER' || value === 'DELETE' ? "px-4 min-w-[3rem]" : "w-8 sm:w-10";

    return (
        <button
            onClick={onClick}
            className={clsx(
                "flex items-center justify-center rounded font-bold text-sm sm:text-base transition-colors h-12 sm:h-14",
                widthClass,
                statusStyles[status]
            )}
        >
            {value === 'DELETE' ? '⌫' : value}
        </button>
    );
}
