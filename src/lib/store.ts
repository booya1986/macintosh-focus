// Thin wrapper around Upstash Redis (works with Vercel KV out of the box).
// Falls back to an in-memory store when the env vars are missing — useful
// for local development without configuring KV.

import { Redis } from "@upstash/redis";
import { AppState, defaultState, STATE_KEY } from "./state";

let _client: Redis | null = null;
let _memory: AppState | null = null;

function client(): Redis | null {
  if (_client) return _client;
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const tok = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !tok) return null;
  _client = new Redis({ url, token: tok });
  return _client;
}

export async function getState(): Promise<AppState> {
  const c = client();
  if (!c) {
    if (!_memory) _memory = defaultState();
    return _memory;
  }
  const s = (await c.get<AppState>(STATE_KEY)) ?? null;
  if (!s) {
    const init = defaultState();
    await c.set(STATE_KEY, init);
    return init;
  }
  return s;
}

export async function setState(s: AppState): Promise<void> {
  s.updatedAt = Date.now();
  const c = client();
  if (!c) { _memory = s; return; }
  await c.set(STATE_KEY, s);
}

export async function mutate(fn: (s: AppState) => AppState | void): Promise<AppState> {
  const cur = await getState();
  const next = fn(cur) ?? cur;
  await setState(next);
  return next;
}
