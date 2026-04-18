import { NextResponse } from "next/server";
import { mutate } from "@/lib/store";
import { ENCOURAGEMENTS, cryptoRandomId } from "@/lib/state";
import { ccEnabled, markControlCenterDone } from "@/lib/control-center";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CmdBody {
  command:
    | "start"
    | "stop"
    | "done"
    | "skip"
    | "addTask"
    | "removeTask"
    | "reorderTask"
    | "setFocusTotal";
  // optional params
  title?: string;
  id?: string;
  fromIndex?: number;
  toIndex?: number;
  seconds?: number;
}

export async function POST(req: Request) {
  const body = (await req.json()) as CmdBody;

  // If the Control Center owns the task list, route mutations there and
  // leave our local KV alone for those.
  if (ccEnabled()) {
    if (body.command === "done" && (body.id || true)) {
      // if no explicit id, mark the CURRENT (top) task done
      const { getState } = await import("@/lib/store");
      const cur = await getState();
      const target = body.id ?? cur.tasks[0]?.id;
      if (target) await markControlCenterDone(target);
    }
    // addTask / removeTask / reorderTask / skip are not yet proxied to CC -
    // those happen in Control Center's own UI. All other state commands
    // (start / stop / setFocusTotal) still flow through our store below.
  }

  const next = await mutate((s) => {
    switch (body.command) {
      case "start":
        s.mode = "focus";
        s.focusStartedAt = Date.now();
        s.encouragementIdx = 0;
        break;
      case "stop":
        s.mode = "idle";
        s.focusStartedAt = 0;
        break;
      case "done":
        if (s.mode === "break") {
          s.mode = "idle";
          s.breakUntil = 0;
        } else {
          if (s.tasks.length) s.tasks.shift();
          s.mode = "idle";
          s.focusStartedAt = 0;
        }
        break;
      case "skip":
        if (s.tasks.length) s.tasks.push(s.tasks.shift()!);
        break;
      case "addTask":
        if (body.title?.trim()) {
          s.tasks.push({ id: cryptoRandomId(), title: body.title.trim() });
        }
        break;
      case "removeTask":
        if (body.id) s.tasks = s.tasks.filter((t) => t.id !== body.id);
        break;
      case "reorderTask":
        if (
          typeof body.fromIndex === "number" &&
          typeof body.toIndex === "number" &&
          body.fromIndex >= 0 &&
          body.toIndex >= 0 &&
          body.fromIndex < s.tasks.length &&
          body.toIndex < s.tasks.length
        ) {
          const [moved] = s.tasks.splice(body.fromIndex, 1);
          s.tasks.splice(body.toIndex, 0, moved);
        }
        break;
      case "setFocusTotal":
        if (typeof body.seconds === "number" && body.seconds > 0) {
          s.focusTotal = Math.min(60 * 60, Math.max(60, Math.floor(body.seconds)));
        }
        break;
      default:
        break;
    }
    // rotate encouragement quote whenever something happens during focus
    if (s.mode === "focus") {
      s.encouragementIdx = (s.encouragementIdx + 1) % ENCOURAGEMENTS.length;
    }
  });
  return NextResponse.json(next);
}
