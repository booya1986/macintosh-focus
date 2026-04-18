// Shared state shape between the phone UI and the Pi client.
// Stored as a single JSON blob in Upstash Redis under the key STATE_KEY.

export const STATE_KEY = "mac-focus:state";

export type Mode = "idle" | "focus" | "break";

export interface Task {
  id: string;
  title: string;
}

export interface AppState {
  mode: Mode;
  tasks: Task[];          // queue; index 0 is current
  focusTotal: number;     // seconds (default 1200 = 20m)
  focusStartedAt: number; // unix ms; only valid when mode === "focus"
  breakUntil: number;     // unix ms; only valid when mode === "break"
  encouragementIdx: number;
  updatedAt: number;
}

export const ENCOURAGEMENTS = [
  "You got this!",
  "Keep going.",
  "Deep focus.",
  "One thing at a time.",
  "Almost there!",
  "Stay with it.",
  "Beautiful work.",
];

export function defaultState(): AppState {
  return {
    mode: "idle",
    tasks: [
      { id: cryptoRandomId(), title: "Reply to important email" },
      { id: cryptoRandomId(), title: "Draft project proposal" },
      { id: cryptoRandomId(), title: "Review PR #142" },
    ],
    focusTotal: 20 * 60,
    focusStartedAt: 0,
    breakUntil: 0,
    encouragementIdx: 0,
    updatedAt: Date.now(),
  };
}

export function cryptoRandomId(): string {
  // 8 hex chars, no deps
  const a = new Uint8Array(4);
  if (typeof crypto !== "undefined") crypto.getRandomValues(a);
  else for (let i = 0; i < 4; i++) a[i] = Math.floor(Math.random() * 256);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function remainingSeconds(s: AppState, nowMs: number = Date.now()): number {
  if (s.mode !== "focus") return s.focusTotal;
  return Math.max(0, Math.ceil((s.focusStartedAt + s.focusTotal * 1000 - nowMs) / 1000));
}
