"use client";

import { useEffect, useRef, useState } from "react";
import { MacCreature } from "@/components/MacCreature";
import { AppState, ENCOURAGEMENTS, Mode, remainingSeconds } from "@/lib/state";

const POLL_MS = 1500;

function fmt(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

async function postCmd(command: string, extra: object = {}) {
  await fetch("/api/command", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ command, ...extra }),
  });
}

export default function Home() {
  const [state, setState] = useState<AppState | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    const tick = async () => {
      try {
        const r = await fetch("/api/state", { cache: "no-store" });
        if (!r.ok) throw new Error(String(r.status));
        const s = (await r.json()) as AppState;
        if (active) { setState(s); setError(null); }
      } catch (e) {
        if (active) setError("offline");
      }
    };
    tick();
    const id = setInterval(tick, POLL_MS);
    return () => { active = false; clearInterval(id); };
  }, []);

  // local 1Hz tick so countdown renders smoothly between polls
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  if (!state) {
    return (
      <main className="p-4 max-w-md mx-auto">
        <div className="card text-center text-zinc-600">connecting…</div>
      </main>
    );
  }

  const mode: Mode = state.mode;
  const cur = state.tasks[0];
  const secs = remainingSeconds(state, now);
  const pct = mode === "focus" ? 1 - secs / state.focusTotal : 0;
  const enc = ENCOURAGEMENTS[state.encouragementIdx % ENCOURAGEMENTS.length];

  async function add() {
    const t = newTitle.trim();
    if (!t) { setAdding(false); return; }
    await postCmd("addTask", { title: t });
    setNewTitle("");
    setAdding(false);
  }

  return (
    <main className="max-w-md mx-auto p-4 flex flex-col gap-3 pb-8">
      <header className="flex items-center justify-between">
        <h1 className="text-base font-bold tracking-[0.2em]">MAC FOCUS</h1>
        <span className={`tag tag-${mode}`}>{mode}</span>
      </header>

      <div className="card flex justify-center">
        <MacCreature mode={mode} size={220} />
      </div>

      {mode === "focus" && (
        <div className="card text-center">
          <div className="font-mono font-extrabold text-6xl tabular-nums tracking-wider">
            {fmt(secs)}
          </div>
          <div className="mt-2 text-link font-medium">&ldquo;{enc}&rdquo;</div>
          <div className="bar mt-3 h-3 border-2 border-ink rounded overflow-hidden bg-white">
            <div className="h-full bg-go transition-all duration-500"
                 style={{ width: `${(pct * 100).toFixed(1)}%` }} />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <button className="btn btn-bad" onClick={() => postCmd("stop")}>Stop</button>
            <button className="btn btn-go" onClick={() => postCmd("done")}>✓ Done</button>
          </div>
        </div>
      )}

      {mode === "break" && (
        <div className="card text-center">
          <div className="text-3xl font-extrabold text-go">Pomodoro complete!</div>
          <div className="text-zinc-600 mt-2">Take a 5-minute break.</div>
          <button className="btn btn-go mt-4 w-full" onClick={() => postCmd("done")}>
            Continue
          </button>
        </div>
      )}

      {mode === "idle" && (
        <div className="card">
          <div className="text-xs uppercase tracking-widest text-zinc-500">Up next</div>
          <div className="text-2xl font-bold mt-1 leading-tight min-h-[2.5rem]">
            {cur ? cur.title : "(no tasks)"}
          </div>
          <button
            className="btn btn-go w-full mt-4 text-xl py-5"
            disabled={!cur}
            onClick={() => postCmd("start")}
          >
            ▶ Focus {fmt(state.focusTotal)}
          </button>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button className="btn" disabled={!cur} onClick={() => postCmd("skip")}>Skip</button>
            <button className="btn btn-bad" disabled={!cur} onClick={() => postCmd("done")}>
              ✓ Done
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs uppercase tracking-widest text-zinc-500">
            Tasks ({state.tasks.length})
          </div>
          {!adding && (
            <button className="text-sm font-bold underline"
                    onClick={() => { setAdding(true); setTimeout(() => inputRef.current?.focus(), 50); }}>
              + add
            </button>
          )}
        </div>
        {adding && (
          <form onSubmit={(e) => { e.preventDefault(); add(); }} className="flex gap-2 mb-2">
            <input
              ref={inputRef}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="What's the task?"
              className="flex-1 border-2 border-ink rounded px-3 py-2 bg-paper text-ink"
            />
            <button type="submit" className="btn btn-go !flex-none px-4">Add</button>
          </form>
        )}
        <ul className="flex flex-col gap-1.5">
          {state.tasks.map((t, i) => (
            <li key={t.id}
                className={`flex items-center gap-2 border border-ink rounded px-3 py-2 bg-white ${i === 0 ? "font-bold" : ""}`}>
              <span className="text-zinc-400 w-5 text-right">{i + 1}.</span>
              <span className="flex-1 break-words">{t.title}</span>
              <button
                aria-label="remove"
                className="text-zinc-400 hover:text-accent text-lg leading-none px-2"
                onClick={() => postCmd("removeTask", { id: t.id })}
              >×</button>
            </li>
          ))}
          {state.tasks.length === 0 && (
            <li className="text-center text-zinc-500 py-4">No tasks. Add one above.</li>
          )}
        </ul>
      </div>

      <footer className="text-center text-xs text-zinc-500 mt-2">
        {error
          ? <span className="text-accent">● {error}</span>
          : <span className="text-go">● live</span>}
        {" · "}{new Date(state.updatedAt).toLocaleTimeString()}
      </footer>
    </main>
  );
}
