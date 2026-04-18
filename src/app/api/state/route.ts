import { NextResponse } from "next/server";
import { getState, setState } from "@/lib/store";
import { AppState } from "@/lib/state";
import { ccEnabled, fetchControlCenterTasks } from "@/lib/control-center";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const s = await getState();
  // If the Control Center is configured, its task queue is the source of
  // truth — merge it into the state we return.
  if (ccEnabled()) {
    const cc = await fetchControlCenterTasks();
    if (cc) s.tasks = cc;
  }
  return NextResponse.json(s, {
    headers: { "Cache-Control": "no-store" },
  });
}

// Pi posts back its current view of state (useful for debugging / heartbeat).
export async function PUT(req: Request) {
  const body = (await req.json()) as Partial<AppState>;
  const cur = await getState();
  const next: AppState = { ...cur, ...body, updatedAt: Date.now() };
  await setState(next);
  return NextResponse.json(next);
}
