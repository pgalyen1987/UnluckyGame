import { reddit } from '@devvit/web/server';

export const createPost = async () => {
  return await reddit.submitCustomPost({
    title: 'UNLUCKY - traffic jam. Fix the wheel.',
  });
};
