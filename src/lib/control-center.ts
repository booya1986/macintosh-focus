// Talks to Avi's Control Center using the password-login flow.
// Activated when CONTROL_CENTER_URL + CONTROL_CENTER_PASSWORD env vars are set.
//
// Flow:
//   1. POST /api/auth { password } -> Set-Cookie: cc-session=...
//   2. GET  /api/tasks?today=YYYY-MM-DD with cookie -> JSON list
//   3. PATCH /api/tasks/:id { done: true } with cookie -> mark done
//
// We cache the cookie in module memory and re-login on 401.

import { Task } from "./state";

const CC_URL =
  (process.env.CONTROL_CENTER_URL || "https://avis-control-center.vercel.app").replace(/\/$/, "");
const CC_PASSWORD = process.env.ACCESS_PASSWORD || "";

export const ccEnabled = () => !!CC_PASSWORD;

let _cookie: string | null = null;
let _cookieAt = 0;
const COOKIE_TTL_MS = 6 * 24 * 60 * 60 * 1000; // 6 days; iron-session uses 7

async function login(): Promise<string | null> {
  try {
    const r = await fetch(`${CC_URL}/api/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: CC_PASSWORD }),
      cache: "no-store",
    });
    if (!r.ok) return null;
    const setCookie = r.headers.get("set-cookie") || "";
    // Extract just the cc-session=value pair
    const m = /(?:^|,\s*)(cc-session=[^;,]+)/.exec(setCookie);
    if (!m) return null;
    _cookie = m[1];
    _cookieAt = Date.now();
    return _cookie;
  } catch {
    return null;
  }
}

async function ensureCookie(): Promise<string | null> {
  if (_cookie && Date.now() - _cookieAt < COOKIE_TTL_MS) return _cookie;
  return login();
}

interface CCRawTask {
  id: number;
  label: string;
  done: boolean | null;
  position: number | null;
  date: string | null;
  time: string | null;
}

async function ccFetch(path: string, init: RequestInit = {}): Promise<Response | null> {
  const cookie = await ensureCookie();
  if (!cookie) return null;
  let r = await fetch(`${CC_URL}${path}`, {
    ...init,
    headers: { ...(init.headers || {}), Cookie: cookie },
    cache: "no-store",
  });
  // Cookie may have expired; re-login once and retry
  if (r.status === 401) {
    _cookie = null;
    const fresh = await ensureCookie();
    if (!fresh) return r;
    r = await fetch(`${CC_URL}${path}`, {
      ...init,
      headers: { ...(init.headers || {}), Cookie: fresh },
      cache: "no-store",
    });
  }
  return r;
}

export async function fetchControlCenterTasks(): Promise<Task[] | null> {
  if (!ccEnabled()) return null;
  const today = new Date();
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const r = await ccFetch(`/api/tasks?today=${iso}`);
  if (!r || !r.ok) return null;
  try {
    const raw = (await r.json()) as CCRawTask[];
    return raw
      .filter((t) => !t.done)
      .map((t) => ({ id: String(t.id), title: t.label }));
  } catch {
    return null;
  }
}

export async function markControlCenterDone(id: string): Promise<boolean> {
  if (!ccEnabled()) return false;
  const r = await ccFetch(`/api/tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ done: true }),
  });
  return !!(r && r.ok);
}
