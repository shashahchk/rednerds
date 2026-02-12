import { Hono } from 'hono';
import { createPost } from '../core/post';

export const scheduler = new Hono();

scheduler.post('/daily-post', async (c) => {
  try {
    console.log('daily post cron scheduler');
    const post = await createPost();
    console.log(`[Scheduler] Daily post created: ${post.id}`);

    return c.json(
      {
        status: 'success',
        message: `Daily post created with id ${post.id}`,
      },
      200
    );
  } catch (error) {
    console.error(`[Scheduler] Failed to create daily post:`, error);
    return c.json(
      {
        status: 'error',
        message: 'Failed to create daily post',
      },
      500
    );
  }
});
