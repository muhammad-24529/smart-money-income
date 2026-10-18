import { NextResponse } from "next/server";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import { getUserSession } from "@/lib/auth/user";

export const runtime = "nodejs";

const isProduction = Boolean(process.env.VERCEL);
const databaseUrl = process.env.DATABASE_URL;

const pool = databaseUrl
  ? new Pool({ connectionString: databaseUrl })
  : null;

export async function POST(request: Request) {
  let client: import("pg").PoolClient | null = null;

  try {
    if (!pool) {
      return NextResponse.json(
        { error: "Database connection is not configured." },
        { status: 500 }
      );
    }

    const userId = await getUserSession();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const currentPassword =
      typeof body.currentPassword === "string"
        ? body.currentPassword
        : "";

    const newPassword =
      typeof body.newPassword === "string"
        ? body.newPassword
        : "";

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current password and new password are required." },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const passwordColumn = isProduction
      ? '"passwordHash"'
      : '"password"';

    client = await pool.connect();

    const result = await client.query(
      `SELECT id, ${passwordColumn} AS password_value
       FROM public."user"
       WHERE id = $1
       LIMIT 1`,
      [userId]
    );

    const user = result.rows[0];

    if (!user) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    const passwordMatch = await bcrypt.compare(
      currentPassword,
      user.password_value
    );

    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Current password is incorrect." },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await client.query(
      `UPDATE public."user"
       SET ${passwordColumn} = $1
       WHERE id = $2`,
      [hashedPassword, userId]
    );

    return NextResponse.json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error) {
    console.error("CHANGE PASSWORD ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to change password.",
      },
      { status: 500 }
    );
  } finally {
    client?.release();
  }
}

