import { NextResponse } from "next/server";
import { getQuestions } from "@/lib/storefront/store-service";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const bookingTemplate = url.searchParams.get("template")?.trim();

  return NextResponse.json({ questions: await getQuestions({ bookingTemplate }) });
}
