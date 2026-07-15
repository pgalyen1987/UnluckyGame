import type { IncomingMessage, ServerResponse } from 'http';
import { Devvit } from '@devvit/public-api';
import { createServer, getServerPort } from '@devvit/server';
import { reddit } from '@devvit/reddit';
import { redis } from '@devvit/redis';
import type { GameState, LeaderboardEntry, ProgressPayload, UnlockResult } from '../shared/types';
import { createPost } from './core/post';

// Keep Devvit import for plugin registration side-effects
void Devvit;

const LEADERBOARD_KEY = 'unlucky:leaderboard';
const CHAIN_KEY = 'unlucky:chain';
const UNLOCKS_KEY = 'unlucky:globalUnlocks';

const userStatsKey = (username: string) => `unlucky:stats:${username}`;

const sendJson = (res: ServerResponse, status: number, data: unknown): void => {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(body);
};

const readBody = async (req: IncomingMessage): Promise<string> => {
  let bodyData = '';
  for await (const chunk of req) {
    bodyData += chunk;
  }
  return bodyData;
};

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  try {
    const url = new URL(req.url || '', 'http://localhost');

    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      res.end();
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/state') {
      try {
        const user = await reddit.getCurrentUser();
        const username = user?.username ?? 'Guest';
        const statsRaw = username !== 'Guest' ? await redis.get(userStatsKey(username)) : undefined;
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
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/leaderboard') {
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
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/progress') {
      try {
        const user = await reddit.getCurrentUser();
        const username = user?.username ?? '';
        if (!username) {
          sendJson(res, 403, { success: false });
          return;
        }
        const { bestStreak, totalTaps } = JSON.parse((await readBody(req)) || '{}') as ProgressPayload;
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
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/unlock-cutscene') {
      try {
        const user = await reddit.getCurrentUser();
        const username = user?.username ?? '';
        if (!username) {
          sendJson(res, 403, { success: false });
          return;
        }
        const body = JSON.parse((await readBody(req)) || '{}') as { streak?: number; totalTaps?: number };
        const key = userStatsKey(username);
        const existingRaw = await redis.get(key);
        const existing = existingRaw
          ? (JSON.parse(existingRaw) as { bestStreak: number; totalTaps: number; cutsceneSeen: boolean })
          : { bestStreak: 0, totalTaps: 0, cutsceneSeen: false };
        const merged = {
          bestStreak: Math.max(existing.bestStreak, Math.floor(Number(body.streak) || 0)),
          totalTaps: Math.max(existing.totalTaps, Math.floor(Number(body.totalTaps) || 0)),
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
          // Comment deferred — needs an active post context
        }
      } catch (error) {
        console.error('POST /api/unlock-cutscene', error);
        sendJson(res, 500, { success: false });
      }
      return;
    }

    if (req.method === 'POST' && url.pathname === '/internal/on-app-install') {
      try {
        const post = await createPost();
        try {
          await reddit.submitComment({
            id: post.id as `t3_${string}`,
            text: `**UNLUCKY** — a one-tap bike game.\n\nTraffic jams. Your rear wheel flies off. Tap it back on with frame-perfect timing — hundreds of times without a miss.\n\nNearly impossible on purpose. If you somehow finish, you'll understand the name.`,
          });
        } catch (e) {
          console.error('install comment failed', e);
        }
        sendJson(res, 200, {
          status: 'success',
          message: `Post created: ${post.id}`,
        });
      } catch (error) {
        console.error('on-app-install post deferred:', error);
        sendJson(res, 200, {
          status: 'success',
          message: 'App installed. Create a post from the subreddit menu.',
        });
      }
      return;
    }

    if (req.method === 'POST' && url.pathname === '/internal/menu/post-create') {
      try {
        const post = await createPost();
        sendJson(res, 200, {
          navigateTo: `https://reddit.com/r/UnluckyGame/comments/${post.id}`,
        });
      } catch (error) {
        console.error('menu post-create', error);
        sendJson(res, 400, { status: 'error', message: String(error) });
      }
      return;
    }

    const body = 'Not found';
    res.writeHead(404, {
      'Content-Length': Buffer.byteLength(body),
      'Content-Type': 'text/plain',
    });
    res.end(body);
  } catch (error) {
    console.error('Top-level error:', error);
    sendJson(res, 500, { error: String(error) });
  }
});

const port = getServerPort();
server.listen(port);
export default server;
