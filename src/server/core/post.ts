import { reddit, redis } from '@devvit/web/server';

export const createPost = async () => {
  const count = await redis.incrBy('puzzle_count', 1);
  const post = await reddit.submitCustomPost({
    title: `nerd-itt Daily #${count}`,
  });
  
  if (post && post.id) {
    await redis.set(`post_puzzle_count:${post.id}`, count.toString());
  }
  
  return post;
};
