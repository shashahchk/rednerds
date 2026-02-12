import { checkGuess, EQUATION_LENGTH, CharStatus } from '../../shared/nerdle-logic';
import clsx from 'clsx';

interface GridProps {
    guesses: string[];
    currentGuess: string;
    solution: string;
    // Shake animation trigger
    isInvalid: boolean;
}

export function Grid({ guesses, currentGuess, solution, isInvalid }: GridProps) {
    const empties = Math.max(0, 6 - guesses.length - 1);

    return (
        <div className="grid grid-rows-6 gap-2 mb-4 w-full max-w-[350px] mx-auto p-2">
            {guesses.map((guess, i) => (
                <Row key={i} guess={guess} solution={solution} />
            ))}
            {guesses.length < 6 && (
                <Row
                    guess={currentGuess}
                    solution={solution}
                    isCurrent={true}
                    isInvalid={isInvalid}
                />
            )}
            {Array.from({ length: empties }).map((_, i) => (
                <Row key={`empty-${i}`} guess="" solution={solution} />
            ))}
        </div>
    );
}

interface RowProps {
    guess: string;
    solution: string;
    isCurrent?: boolean;
    isInvalid?: boolean;
}

function Row({ guess, solution, isCurrent, isInvalid }: RowProps) {
    const statuses = !isCurrent && guess
        ? checkGuess(guess, solution)
        : Array(EQUATION_LENGTH).fill('EMPTY');

    const splitGuess = guess.split('');
    const emptyCells = Math.max(0, EQUATION_LENGTH - splitGuess.length);

    return (
        <div className={clsx("grid grid-cols-8 gap-1", isInvalid && "animate-shake")}>
            {splitGuess.map((char, i) => (
                <Tile
                    key={i}
                    char={char}
                    status={isCurrent ? 'EMPTY' : statuses[i]}
                    isCurrent={!!isCurrent}
                />
            ))}
            {Array.from({ length: emptyCells }).map((_, i) => (
                <Tile key={`empty-${i}`} char="" status="EMPTY" />
            ))}
        </div>
    );
}

interface TileProps {
    char: string;
    status: CharStatus | 'EMPTY';
    isCurrent?: boolean;
}

function Tile({ char, status, isCurrent }: TileProps) {
    // Styles based on status
    const base = "flex items-center justify-center border-2 text-xl font-bold select-none h-10 sm:h-12 rounded transition-all duration-500 transform";

    // Theme colors mapping
    const statusStyles = {
        CORRECT: "bg-nerdle-green border-nerdle-green",
        PRESENT: "bg-nerdle-purple border-nerdle-purple",
        ABSENT: "bg-nerdle-gray border-nerdle-gray",
        EMPTY: isCurrent && char
            ? "border-gray-400 animate-pop"
            : "border-gray-600"
    };

    return (
        <div className={clsx(base, statusStyles[status])}>
            {char}
        </div>
    );
}
