// Fetch tasks from the Control Center app (avis-control-center.vercel.app).
// Activated when both CONTROL_CENTER_URL and CONTROL_CENTER_TOKEN are set.

import { Task, cryptoRandomId } from "./state";

const CC_URL   = (process.env.CONTROL_CENTER_URL || "").replace(/\/$/, "");
const CC_TOKEN = process.env.CONTROL_CENTER_TOKEN || "";

export const ccEnabled = () => !!(CC_URL && CC_TOKEN);

interface CCRawTask {
  id: number;
  label: string;
  done: boolean | null;
  position: number | null;
  date: string | null;
  time: string | null;
}

/**
 * Pulls the current task queue from the Control Center.
 * Only returns not-yet-done tasks, ordered by position, scoped to today.
 */
export async function fetchControlCenterTasks(): Promise<Task[] | null> {
  if (!ccEnabled()) return null;
  try {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const iso = `${yyyy}-${mm}-${dd}`;
    const url = `${CC_URL}/api/tasks?today=${iso}`;
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${CC_TOKEN}` },
      cache: "no-store",
    });
    if (!r.ok) return null;
    const raw = (await r.json()) as CCRawTask[];
    return raw
      .filter((t) => !t.done)
      .map((t) => ({
        id: String(t.id),
        title: t.label,
      }));
  } catch {
    return null;
  }
}

/** Mark a Control Center task done (called from our /api/command "done"). */
export async function markControlCenterDone(id: string): Promise<boolean> {
  if (!ccEnabled()) return false;
  try {
    const r = await fetch(`${CC_URL}/api/tasks/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${CC_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ done: true }),
    });
    return r.ok;
  } catch {
    return false;
  }
}
