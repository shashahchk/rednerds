# nerd-itt

A daily math puzzle game for Reddit, built on the [Devvit](https://developers.reddit.com/) platform. Think Wordle, but for equations.

## How to Play

Each day, a new 8-character math equation is chosen. You have **6 attempts** to guess it.

1. **Enter a valid equation** using digits (`0-9`), operators (`+`, `-`, `*`, `/`), and `=`. Every guess must be exactly 8 characters and must be a mathematically correct equation (e.g., `12+34=46`).

2. **Read the color hints** after each guess:
   - 🟩 **Green** — correct character in the correct position
   - 🟨 **Gold** — correct character but in the wrong position
   - ⬛ **Black** — character is not in the equation at all

3. **Refine your guesses** using the hints until you crack the equation or run out of attempts.

### Rules

- Guesses must be valid math: the left side must evaluate to the right side.
- Leading zeros are not allowed (e.g., `01+02=03` is invalid).
- Division must result in a whole number.
- Each puzzle is tied to the Reddit post — every player on the same post solves the same equation.

### Example

If the answer is `10+26=36`:

| Guess      | Result           |
| ---------- | ---------------- |
| `12+34=46` | 🟩🟨🟩🟨⬛🟩⬛🟨 |
| `10+26=36` | 🟩🟩🟩🟩🟩🟩🟩🟩 |

## Features

- **Daily puzzles** — a new equation every post, so there's always a fresh challenge.
- **Leaderboard** — compete with other Redditors. Ranked by whether you solved it, number of attempts, and speed.
- **Share your result** — copy a spoiler-free emoji grid to share in comments or other subreddits.
- **Streak tracking** — tracks how many puzzles you've played consecutively.
- **Timer** — see how fast you can solve it.

## Tech Stack

| Layer       | Technology                        |
| ----------- | --------------------------------- |
| Frontend    | React 19, Tailwind CSS 4, Vite    |
| Backend     | Node.js (Devvit serverless), Hono |
| Type Safety | TypeScript, tRPC v11              |
| Platform    | Reddit Devvit                     |

## Project Structure

```
src/
├── client/             # Frontend (runs in an iframe on reddit.com)
│   ├── splash.tsx      # Inline view — shown in the Reddit feed
│   ├── game.tsx        # Expanded view — full game experience
│   ├── components/     # Grid, Keyboard, Leaderboard
│   └── hooks/          # useNerdle game logic hook
├── server/             # Backend (Devvit serverless)
│   ├── routes/api.ts   # API endpoints (puzzle, leaderboard, score submission)
│   └── core/           # Post creation logic
└── shared/             # Shared between client and server
    ├── api.ts          # Type definitions
    ├── nerdle-logic.ts # Equation validation, hints, share text generation
    └── equations.ts    # Puzzle equation pool
```

## Getting Started

> Requires Node.js >= 22

```bash
# Install dependencies
npm install

# Start local development (playtests on Reddit)
npm run dev

# Type-check, lint, and format
npm run type-check
npm run lint

# Build and deploy
npm run deploy

# Publish for review
npm run launch
```

## Commands

| Command              | Description                                   |
| -------------------- | --------------------------------------------- |
| `npm run dev`        | Start a live playtest session on Reddit       |
| `npm run build`      | Build client and server                       |
| `npm run deploy`     | Type-check, lint, test, then upload to Devvit |
| `npm run launch`     | Deploy and publish for review                 |
| `npm run test`       | Run tests                                     |
| `npm run type-check` | Type-check the project                        |
| `npm run lint`       | Lint all source files                         |
| `npm run login`      | Log in to Reddit via the Devvit CLI           |

## License

BSD-3-Clause
