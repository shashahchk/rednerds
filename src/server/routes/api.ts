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
import { getDailyIndex, getPuzzleIndexFromId } from '../../shared/nerdle-logic';

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

api.get('/puzzle', async (c) => {
  const { postId } = context;
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0] ?? '2025-01-01';
  
  let index: number;
  let label: string;

  if (postId) {
    // Try to get the sequential ID for this post
    const countStr = await redis.get(`post_puzzle_count:${postId}`);
    
    if (countStr) {
        const count = parseInt(countStr);
        index = count; // Use the sequential ID as the puzzle index!
        label = `Daily #${count}`;
    } else {
        // Legacy/Fallback for posts created before this change
        index = getPuzzleIndexFromId(postId);
        label = `Post`;
    }
  } else {
    // Fallback to daily if no post context
    index = getDailyIndex(now);
    label = `Daily ${dateStr}`;
  }

  return c.json<DailyPuzzleResponse>({
    type: 'daily-puzzle',
    index,
    date: dateStr,
    puzzleLabel: label,
    postId
  });
});

api.post('/leaderboard/submit', async (c) => {
  try {
    const body = await c.req.json<SubmitScoreRequest>();
    const { date, attempts, won, postId } = body;
    
    const username = await reddit.getCurrentUsername();
    if (!username) {
      console.error('No username found when submitting score');
      return c.json<ErrorResponse>(
        { status: 'error', message: 'User not authenticated' },
        401
      );
    }

    console.log(`Submitting score for ${username}: ${attempts} attempts, won: ${won}, date: ${date}, postId: ${postId}`);

    // Redis key for leaderboard
    // If postId provided, use post-specific leaderboard. Otherwise use daily date.
    const leaderboardKey = postId ? `leaderboard:post:${postId}` : `leaderboard:${date}`;
    // User key also needs to be unique per leaderboard context
    const userKey = postId ? `user:${username}:post:${postId}` : `user:${username}:${date}`;
    
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
    const id = c.req.param('date'); // Could be date or postId
    // Simple heuristic: Dates contain hydhens (YYYY-MM-DD), IDs typically don't or start with t3_
    const isDate = id.includes('-');
    const leaderboardKey = isDate ? `leaderboard:${id}` : `leaderboard:post:${id}`;
    
    console.log(`Fetching leaderboard for ${isDate ? 'date' : 'post'}: ${id}`);
    
    // Get top 100 players (sorted by score ascending)
    const topPlayers = await redis.zRange(leaderboardKey, 0, 99);
    console.log(`Found ${topPlayers.length} entries in leaderboard`, topPlayers);
    
    // Fetch their data
    const entries: LeaderboardEntry[] = [];
    for (const player of topPlayers) {
      const username = player.member;
      const userKey = isDate ? `user:${username}:${id}` : `user:${username}:post:${id}`;
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
      const userKey = isDate ? `user:${currentUsername}:${id}` : `user:${currentUsername}:post:${id}`;
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
      date: isDate ? id : '', // Empty date if it's a post ID? Or maybe just return ID
      postId: !isDate ? id : undefined,
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
