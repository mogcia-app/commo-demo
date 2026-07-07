import { NextResponse, type NextRequest } from "next/server";

const blockedCustomerEntrypoints = ["/reserve"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const demoRoutesEnabled = process.env.NEXT_PUBLIC_ENABLE_DEMO_ROUTES === "true";

  if (!demoRoutesEnabled && blockedCustomerEntrypoints.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return new NextResponse("Not Found", { status: 404 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/reserve/:path*"],
};
