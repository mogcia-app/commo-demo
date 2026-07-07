import { NextResponse } from "next/server";
import { getMenus } from "@/lib/storefront/store-service";

export async function GET() {
  return NextResponse.json({ menus: await getMenus() });
}
