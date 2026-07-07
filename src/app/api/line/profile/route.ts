import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    profile: {
      userId: "demo-line-user",
      displayName: "LINE Demo User",
      pictureUrl: "",
    },
    mode: "mock",
  });
}
