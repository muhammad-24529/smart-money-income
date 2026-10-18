import { NextResponse } from "next/server";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import { setUserSession } from "@/lib/auth/user";

export const runtime = "nodejs";

const databaseUrl =
  process.env.VERCEL
    ? process.env.DATABASE_URL
    : process.env.DATABASE_URL;

const pool = databaseUrl
  ? new Pool({ connectionString: databaseUrl })
  : null;

export async function POST(request: Request) {
  try {
    if (!pool) {
      return NextResponse.json(
        { success: false, error: "Database connection is not configured." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password =
      typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required." },
        { status: 400 }
      );
    }

    const passwordColumn = process.env.VERCEL ? '"passwordHash"' : '"password"';

    const result = await pool.query(
      `SELECT id, name, email, ${passwordColumn} AS password_value, "isActive"
       FROM public."user"
       WHERE email = $1
       LIMIT 1`,
      [email]
    );

    const user = result.rows[0];

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const passwordMatch = await bcrypt.compare(password, user.password_value);

    if (!passwordMatch) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password." },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: "Your account has been deactivated by the administrator.",
        },
        { status: 403 }
      );
    }

    await setUserSession(user.id);

    return NextResponse.json(
      {
        success: true,
        message: "Login successful.",
        user: { id: user.id, name: user.name, email: user.email },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Something went wrong.",
      },
      { status: 500 }
    );
  }
}
