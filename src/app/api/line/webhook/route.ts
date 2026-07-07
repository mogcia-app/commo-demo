import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  return NextResponse.json({
    received: true,
    mode: "mock",
    events: Array.isArray(body.events) ? body.events.length : 0,
  });
}
