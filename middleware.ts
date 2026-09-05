import { NextRequest, NextResponse } from "next/server";
import { ApiAuthError, assertApiAccess } from "@/lib/api-auth";

const PUBLIC_API_PATHS = [
  "/api/webhooks/razorpay",
  "/api/webhooks/twilio",
];

export function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  if (PUBLIC_API_PATHS.some((path) => request.nextUrl.pathname.startsWith(path))) {
    return NextResponse.next();
  }

  try {
    assertApiAccess(request);
    return NextResponse.next();
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { success: false, error: "Invalid server configuration." },
      { status: 500 }
    );
  }
}

export const config = {
  matcher: ["/api/:path*"],
};