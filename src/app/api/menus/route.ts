import { NextResponse } from "next/server";
import { getMenus } from "@/lib/storefront/store-service";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const bookingTemplate = url.searchParams.get("template")?.trim();

  return NextResponse.json({ menus: await getMenus({ bookingTemplate }) });
}
