import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error:
        "Automatic daily income is disabled. User must click START after every 24 hours.",
    },
    { status: 410 }
  );
}