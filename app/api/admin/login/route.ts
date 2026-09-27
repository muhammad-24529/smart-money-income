
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD_HASH,
  ADMIN_SESSION_SECRET,
} from "@/lib/admin/config";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    console.log("ADMIN LOGIN DEBUG:", {
      emailReceived: email,
      emailExpected: ADMIN_EMAIL.toLowerCase(),
      emailMatch: email === ADMIN_EMAIL.toLowerCase(),
      hashLoaded: !!ADMIN_PASSWORD_HASH,
      secretLoaded: !!ADMIN_SESSION_SECRET,
      passwordProvided: !!password,
    });

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          error: "Email and password are required.",
        },
        { status: 400 }
      );
    }

    if (email !== ADMIN_EMAIL.toLowerCase()) {
      console.log("ADMIN LOGIN: Email does not match.");

      return NextResponse.json(
        {
          success: false,
          error: "Invalid admin credentials.",
        },
        { status: 401 }
      );
    }

    const passwordMatch = await bcrypt.compare(
      password,
      ADMIN_PASSWORD_HASH
    );

    console.log("ADMIN LOGIN DEBUG: Password match:", passwordMatch);

    if (!passwordMatch) {
      console.log("ADMIN LOGIN: Password does not match.");

      return NextResponse.json(
        {
          success: false,
          error: "Invalid admin credentials.",
        },
        { status: 401 }
      );
    }

    const response = NextResponse.json(
      {
        success: true,
        message: "Admin login successful.",
      },
      { status: 200 }
    );

    response.cookies.set({
      name: "admin_session",
      value: ADMIN_SESSION_SECRET,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    console.log("ADMIN LOGIN: Login successful.");

    return response;
  } catch (error) {
    console.error("ADMIN LOGIN ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Something went wrong.",
      },
      { status: 500 }
    );
  }
}

