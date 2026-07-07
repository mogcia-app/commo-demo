import { NextResponse } from "next/server";
import { getQuestions } from "@/lib/storefront/store-service";

export async function GET() {
  return NextResponse.json({ questions: await getQuestions() });
}
