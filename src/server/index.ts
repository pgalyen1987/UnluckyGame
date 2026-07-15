import express from 'express';
import { createServer, context, getServerPort, redis, reddit } from '@devvit/web/server';
import type { GameState, LeaderboardEntry, ProgressPayload, UnlockResult } from '../shared/types';
import { createPost } from './core/post';

const app = express();
app.use(express.json());

const LEADERBOARD_KEY = 'unlucky:leaderboard';
const CHAIN_KEY = 'unlucky:chain';
const UNLOCKS_KEY = 'unlucky:globalUnlocks';

const userStatsKey = (username: string) => `unlucky:stats:${username}`;

const sendJson = (res: express.Response, status: number, data: unknown) => {
  res.status(status).json(data);
};

app.get('/api/state', async (_req, res) => {
  try {
    const user = await reddit.getCurrentUser();
    const username = user?.username ?? 'Guest';

    const statsRaw = username !== 'Guest' ? await redis.get(userStatsKey(username)) : null;
    const stats = statsRaw
      ? (JSON.parse(statsRaw) as { bestStreak: number; totalTaps: number; cutsceneSeen: boolean })
      : { bestStreak: 0, totalTaps: 0, cutsceneSeen: false };

    const chainLevel = Number((await redis.get(CHAIN_KEY)) ?? 0);
    const globalUnlocks = Number((await redis.get(UNLOCKS_KEY)) ?? 0);

    const payload: GameState = {
      username,
      bestStreak: stats.bestStreak,
      totalTaps: stats.totalTaps,
      cutsceneSeen: stats.cutsceneSeen,
      chainLevel,
      globalUnlocks,
      chainStarted: chainLevel > 0,
    };
    sendJson(res, 200, { success: true, state: payload });
  } catch (error) {
    console.error('GET /api/state', error);
    sendJson(res, 500, { success: false });
  }
});

app.get('/api/leaderboard', async (_req, res) => {
  try {
    const rows = await redis.zRange(LEADERBOARD_KEY, 0, 9, { reverse: true, by: 'rank' });
    const leaderboard: LeaderboardEntry[] = rows.map((row, index) => ({
      username: row.member,
      bestStreak: row.score,
      rank: index + 1,
    }));
    sendJson(res, 200, { success: true, leaderboard });
  } catch (error) {
    console.error('GET /api/leaderboard', error);
    sendJson(res, 500, { success: false, leaderboard: [] });
  }
});

app.post('/api/progress', async (req, res) => {
  try {
    const user = await reddit.getCurrentUser();
    const username = user?.username ?? '';
    if (!username) {
      sendJson(res, 403, { success: false });
      return;
    }

    const { bestStreak, totalTaps } = req.body as ProgressPayload;
    const safeStreak = Math.max(0, Math.floor(Number(bestStreak) || 0));
    const safeTaps = Math.max(0, Math.floor(Number(totalTaps) || 0));

    const key = userStatsKey(username);
    const existingRaw = await redis.get(key);
    const existing = existingRaw
      ? (JSON.parse(existingRaw) as { bestStreak: number; totalTaps: number; cutsceneSeen: boolean })
      : { bestStreak: 0, totalTaps: 0, cutsceneSeen: false };

    const merged = {
      bestStreak: Math.max(existing.bestStreak, safeStreak),
      totalTaps: Math.max(existing.totalTaps, safeTaps),
      cutsceneSeen: existing.cutsceneSeen,
    };
    await redis.set(key, JSON.stringify(merged));

    if (merged.bestStreak > 0) {
      const current = await redis.zScore(LEADERBOARD_KEY, username);
      if (current === undefined || merged.bestStreak > current) {
        await redis.zAdd(LEADERBOARD_KEY, { member: username, score: merged.bestStreak });
      }
    }

    sendJson(res, 200, { success: true, stats: merged });
  } catch (error) {
    console.error('POST /api/progress', error);
    sendJson(res, 500, { success: false });
  }
});

app.post('/api/unlock-cutscene', async (req, res) => {
  try {
    const user = await reddit.getCurrentUser();
    const username = user?.username ?? '';
    if (!username) {
      sendJson(res, 403, { success: false });
      return;
    }

    const { streak, totalTaps } = req.body as { streak?: number; totalTaps?: number };
    const key = userStatsKey(username);
    const existingRaw = await redis.get(key);
    const existing = existingRaw
      ? (JSON.parse(existingRaw) as { bestStreak: number; totalTaps: number; cutsceneSeen: boolean })
      : { bestStreak: 0, totalTaps: 0, cutsceneSeen: false };

    const merged = {
      bestStreak: Math.max(existing.bestStreak, Math.floor(Number(streak) || 0)),
      totalTaps: Math.max(existing.totalTaps, Math.floor(Number(totalTaps) || 0)),
      cutsceneSeen: true,
    };
    await redis.set(key, JSON.stringify(merged));
    await redis.zAdd(LEADERBOARD_KEY, { member: username, score: merged.bestStreak });

    const globalUnlockNumber = await redis.incrBy(UNLOCKS_KEY, 1);
    const firstGlobalUnlock = globalUnlockNumber === 1;
    let chainLevel = Number((await redis.get(CHAIN_KEY)) ?? 0);

    if (firstGlobalUnlock) {
      chainLevel = 1;
      await redis.set(CHAIN_KEY, '1');
    } else if (globalUnlockNumber <= 10) {
      chainLevel = Math.min(10, chainLevel + 1);
      await redis.set(CHAIN_KEY, String(chainLevel));
    }

    const result: UnlockResult = {
      success: true,
      globalUnlockNumber,
      chainLevel,
      firstGlobalUnlock,
    };
    sendJson(res, 200, result);

    if (firstGlobalUnlock) {
      try {
        const postId = context.postId;
        if (postId) {
          await reddit.submitComment({
            id: postId as `t3_${string}`,
            text: `🚲 **The chain has started.**\n\nSomeone just saw the fall — the ending nobody was supposed to reach. Every lane feels a little more crowded now.\n\n*0.001% unlock the cutscene. 100% fall over anyway.*`,
          });
        }
      } catch (e) {
        console.error('unlock comment failed', e);
      }
    }
  } catch (error) {
    console.error('POST /api/unlock-cutscene', error);
    sendJson(res, 500, { success: false });
  }
});

app.post('/internal/on-app-install', async (_req, res) => {
  try {
    const post = await createPost();
    try {
      await reddit.submitComment({
        id: post.id as `t3_${string}`,
        text: `**UNLUCKY** — a one-tap bike game.\n\nTraffic jams. Your rear wheel flies off. Tap it back on with frame-perfect timing — **280 times in a row** without a miss.\n\nIf you somehow win, you might see the cutscene: standing on **one pedal**, then falling sideways anyway.\n\nEven winning is unlucky. 🚲`,
      });
    } catch (e) {
      console.error('install comment failed', e);
    }
    sendJson(res, 200, {
      status: 'success',
      message: `Post created in r/${context.subredditName}: ${post.id}`,
    });
  } catch (error) {
    console.error('on-app-install', error);
    sendJson(res, 400, { status: 'error', message: String(error) });
  }
});

app.post('/internal/menu/post-create', async (_req, res) => {
  try {
    const post = await createPost();
    sendJson(res, 200, {
      navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
    });
  } catch (error) {
    console.error('menu post-create', error);
    sendJson(res, 400, { status: 'error', message: String(error) });
  }
});

const port = getServerPort();
const server = createServer(app);
server.listen(port, () => {
  console.log(`UNLUCKY server on port ${port}`);
});

export default server;
