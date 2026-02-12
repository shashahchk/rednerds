import { Hono } from 'hono';
import { context, redis, reddit } from '@devvit/web/server';
import type {
  DailyPuzzleResponse,
  DecrementResponse,
  IncrementResponse,
  InitResponse,
  LeaderboardEntry,
  LeaderboardResponse,
  SubmitScoreRequest,
  SubmitScoreResponse,
} from '../../shared/api';
import { getDailyIndex } from '../../shared/nerdle-logic';

type ErrorResponse = {
  status: 'error';
  message: string;
};

export const api = new Hono();

api.get('/init', async (c) => {
  const { postId } = context;

  if (!postId) {
    console.error('API Init Error: postId not found in devvit context');
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message: 'postId is required but missing from context',
      },
      400
    );
  }

  try {
    const [count, username] = await Promise.all([
      redis.get('count'),
      reddit.getCurrentUsername(),
    ]);

    return c.json<InitResponse>({
      type: 'init',
      postId: postId,
      count: count ? parseInt(count) : 0,
      username: username ?? 'anonymous',
    });
  } catch (error) {
    console.error(`API Init Error for post ${postId}:`, error);
    let errorMessage = 'Unknown error during initialization';
    if (error instanceof Error) {
      errorMessage = `Initialization failed: ${error.message}`;
    }
    return c.json<ErrorResponse>(
      { status: 'error', message: errorMessage },
      400
    );
  }
});

api.post('/increment', async (c) => {
  const { postId } = context;
  if (!postId) {
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message: 'postId is required',
      },
      400
    );
  }

  const count = await redis.incrBy('count', 1);
  return c.json<IncrementResponse>({
    count,
    postId,
    type: 'increment',
  });
});

api.post('/decrement', async (c) => {
  const { postId } = context;
  if (!postId) {
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message: 'postId is required',
      },
      400
    );
  }

  const count = await redis.incrBy('count', -1);
  return c.json<DecrementResponse>({
    count,
    postId,
    type: 'decrement',
  });
});

api.get('/daily', (c) => {
  const now = new Date();
  const index = getDailyIndex(now);
  const dateStr = now.toISOString().split('T')[0] ?? '2025-01-01';
  
  return c.json<DailyPuzzleResponse>({
    type: 'daily-puzzle',
    index,
    date: dateStr,
  });
});

api.post('/leaderboard/submit', async (c) => {
  try {
    const body = await c.req.json<SubmitScoreRequest>();
    const { date, attempts, won } = body;
    
    const username = await reddit.getCurrentUsername();
    if (!username) {
      console.error('No username found when submitting score');
      return c.json<ErrorResponse>(
        { status: 'error', message: 'User not authenticated' },
        401
      );
    }

    console.log(`Submitting score for ${username}: ${attempts} attempts, won: ${won}, date: ${date}`);

    // Redis key for leaderboard sorted by attempts (lower is better)
    const leaderboardKey = `leaderboard:${date}`;
    const userKey = `user:${username}:${date}`;
    
    // ONE ENTRY PER USER PER DAY: Check if user already submitted for this day
    // Users can only play once per day, so reject duplicate submissions
    const existingScore = await redis.get(userKey);
    if (existingScore) {
      console.log(`User ${username} already submitted for ${date}. Existing score:`, existingScore);
      const rank = await redis.zRank(leaderboardKey, username);
      return c.json<SubmitScoreResponse>({
        type: 'submit-score',
        success: true, // Return true since they already have a valid submission
        rank: rank !== undefined ? rank + 1 : undefined,
      });
    }

    // Store user's score
    const entry: LeaderboardEntry = {
      username,
      attempts,
      timestamp: Date.now(),
      won,
    };
    
    const entryJson = JSON.stringify(entry);
    await redis.set(userKey, entryJson);
    console.log(`Stored user entry at ${userKey}: ${entryJson}`);
    
    // Add to sorted leaderboard (score = attempts for winners, 999 + attempts for losers)
    // This ensures winners are always ranked higher than non-winners
    const score = won ? attempts : 999 + attempts;
    await redis.zAdd(leaderboardKey, { member: username, score });
    console.log(`Added ${username} to ${leaderboardKey} with score ${score}`);
    
    // Get user's rank (0-indexed)
    const rank = await redis.zRank(leaderboardKey, username);
    console.log(`User ${username} rank: ${rank}`);
    
    return c.json<SubmitScoreResponse>({
      type: 'submit-score',
      success: true,
      rank: rank !== undefined ? rank + 1 : undefined,
    });
  } catch (error) {
    console.error('Error submitting score:', error);
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Failed to submit score' },
      500
    );
  }
});

api.get('/leaderboard/:date', async (c) => {
  try {
    const date = c.req.param('date');
    const leaderboardKey = `leaderboard:${date}`;
    
    console.log(`Fetching leaderboard for date: ${date}`);
    
    // Get top 100 players (sorted by score ascending)
    const topPlayers = await redis.zRange(leaderboardKey, 0, 99);
    console.log(`Found ${topPlayers.length} entries in leaderboard`, topPlayers);
    
    // Fetch their data
    const entries: LeaderboardEntry[] = [];
    for (const player of topPlayers) {
      const username = player.member;
      const userKey = `user:${username}:${date}`;
      const data = await redis.get(userKey);
      console.log(`Fetching ${userKey}: ${data ? 'found' : 'not found'}`);
      if (data) {
        try {
          entries.push(JSON.parse(data));
        } catch (e) {
          console.error(`Failed to parse data for ${username}:`, e);
        }
      }
    }
    
    console.log(`Parsed ${entries.length} entries successfully`);
    
    // Get current user's entry if they played
    const currentUsername = await reddit.getCurrentUsername();
    let userEntry: LeaderboardEntry | undefined;
    let userRank: number | undefined;
    
    if (currentUsername) {
      const userKey = `user:${currentUsername}:${date}`;
      const userData = await redis.get(userKey);
      console.log(`Current user ${currentUsername} data: ${userData ? 'found' : 'not found'}`);
      if (userData) {
        try {
          userEntry = JSON.parse(userData);
          const rank = await redis.zRank(leaderboardKey, currentUsername);
          userRank = rank !== undefined ? rank + 1 : undefined;
          console.log(`Current user rank: ${userRank}`);
        } catch (e) {
          console.error(`Failed to parse user data:`, e);
        }
      }
    }
    
    return c.json<LeaderboardResponse>({
      type: 'leaderboard',
      date,
      entries,
      userEntry,
      userRank,
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Failed to fetch leaderboard' },
      500
    );
  }
});
