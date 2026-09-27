import { NextResponse } from "next/server";
import { clearUserSession } from "@/lib/auth/user";

export const runtime = "nodejs";

export async function POST() {
  try {
    await clearUserSession();

    return NextResponse.json({
      success: true,
      message: "Logged out successfully.",
    });
  } catch (error) {
    console.error("LOGOUT ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to logout.",
      },
      { status: 500 }
    );
  }
}