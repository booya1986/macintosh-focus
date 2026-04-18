import { NextResponse } from "next/server";
import { getState, setState } from "@/lib/store";
import { AppState } from "@/lib/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const s = await getState();
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
