import { NextResponse } from "next/server";

const ALLOWED_ORIGINS = new Set(
  [
    process.env.NEXT_PUBLIC_APP_URL,
    "http://localhost:3000",
    "http://localhost:3001",
  ].filter(Boolean)
);

export function validateRequestOrigin(
  request: Request
): NextResponse | null {
  const origin = request.headers.get("origin");

  if (!origin) {
    return null;
  }

  if (!ALLOWED_ORIGINS.has(origin)) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid request origin.",
      },
      { status: 403 }
    );
  }

  return null;
}