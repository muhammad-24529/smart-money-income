import { NextResponse } from "next/server";
import { db, connectDB } from "@/lib/prisma";
import { getUserSession } from "@/lib/auth/user";

export async function GET() {
  try {
    await connectDB();

    const userId = await getUserSession();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const user = await db.orm.public.User
      .where({ id: userId })
      .first();

    if (!user) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        balance: Number(user.balance || 0),
      },
    });
  } catch (error) {
    console.error("PROFILE API ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load profile.",
      },
      { status: 500 }
    );
  }
}
