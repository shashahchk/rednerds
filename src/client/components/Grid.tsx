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
        <div className="grid grid-rows-6 gap-1.5 w-full max-w-md mx-auto">
            {guesses.map((guess, i) => (
                <Row key={i} guess={guess} solution={solution} isRevealing={i === guesses.length - 1} />
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
    isRevealing?: boolean;
}

function Row({ guess, solution, isCurrent, isInvalid, isRevealing }: RowProps) {
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
                    isRevealing={isRevealing}
                    delay={i * 100}
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
    isRevealing?: boolean | undefined;
    delay?: number;
}

function Tile({ char, status, isCurrent, isRevealing, delay = 0 }: TileProps) {
    // Styles based on status
    const base = "flex items-center justify-center border-2 font-bold select-none aspect-square rounded transition-all duration-500 transform text-base sm:text-lg shadow-sm font-mono";

    // Theme colors mapping
    const statusStyles = {
        CORRECT: "bg-book-correct border-book-correct text-white",
        PRESENT: "bg-book-present border-book-present text-book-text",
        ABSENT: "bg-book-absent border-book-absent text-book-text/60",
        EMPTY: isCurrent && char
            ? "border-book-accent bg-book-paper text-book-text animate-pop"
            : "border-book-border bg-book-paper text-book-text/30"
    };

    return (
        <div
            className={clsx(base, statusStyles[status], isRevealing && "animate-flip")}
            style={isRevealing ? { animationDelay: `${delay}ms` } : undefined}
        >
            {char}
        </div>
    );
}
