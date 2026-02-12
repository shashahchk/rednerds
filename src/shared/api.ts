export type InitResponse = {
  type: 'init';
  postId: string;
  count: number;
  username: string;
};

export type IncrementResponse = {
  type: 'increment';
  postId: string;
  count: number;
};

export type DecrementResponse = {
  type: 'decrement';
  postId: string;
  count: number;
};

export type DailyPuzzleResponse = {
  type: 'daily-puzzle';
  index: number;
  date: string;
  puzzleLabel?: string;
  postId?: string;
};

export type LeaderboardEntry = {
  username: string;
  attempts: number;
  timestamp: number;
  won: boolean;
  timeSeconds: number;
  consecutivePlays?: number;
  avatarUrl?: string;
  guesses?: string[];
};

export type SubmitScoreRequest = {
  date: string;
  attempts: number;
  won: boolean;
  postId?: string | undefined;
  timeSeconds: number;
  guesses: string[];
};

export type SubmitScoreResponse = {
  type: 'submit-score';
  success: boolean;
  rank?: number;
};

export type LeaderboardResponse = {
  type: 'leaderboard';
  date: string;
  postId?: string;
  postCreatedAt?: string;
  entries: LeaderboardEntry[];
  userEntry?: LeaderboardEntry;
  userRank?: number;
};
