import { NextResponse } from "next/server";
import { getAvailableSlots } from "@/lib/storefront/store-service";

export async function GET() {
  return NextResponse.json({ availableSlots: await getAvailableSlots() });
}
