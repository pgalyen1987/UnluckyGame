import { reddit } from '@devvit/web/server';

export const createPost = async () => {
  return await reddit.submitCustomPost({
    title: 'UNLUCKY — fix the wheel. fall anyway. 🚲',
  });
};
