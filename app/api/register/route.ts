import { NextResponse } from "next/server";
import { db, connectDB } from "@/lib/prisma";
import bcrypt from "bcryptjs";

function generateReferralCode(name: string) {
  const cleanName = name
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 5);

  const random = Math.random()
    .toString(36)
    .substring(2, 7)
    .toUpperCase();

  return `${cleanName || "USER"}${random}`;
}

async function createUniqueReferralCode(name: string) {
  for (let i = 0; i < 20; i++) {
    const code = generateReferralCode(name);

    const existing = await db.orm.public.User
      .where({
        referralCode: code,
      })
      .first();

    if (!existing) {
      return code;
    }
  }

  throw new Error("Could not generate a unique referral code.");
}

export async function POST(request: Request) {
  try {
    await connectDB();

    const body = await request.json();

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    const referralCodeInput =
      typeof body.referralCode === "string"
        ? body.referralCode.trim().toUpperCase()
        : typeof body.ref === "string"
          ? body.ref.trim().toUpperCase()
          : "";

    // ------------------------------------------
    // VALIDATION
    // ------------------------------------------

    if (!name || !email || !password) {
      return NextResponse.json(
        {
          success: false,
          error: "Name, email and password are required.",
        },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          error: "Password must be at least 6 characters.",
        },
        { status: 400 }
      );
    }

    // ------------------------------------------
    // CHECK EXISTING USER
    // ------------------------------------------

    const existingUser = await db.orm.public.User
      .where({
        email,
      })
      .first();

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: "User already exists.",
        },
        { status: 409 }
      );
    }

    // ------------------------------------------
    // FIND REFERRER
    // ------------------------------------------

    let referrer: any = null;

    if (referralCodeInput) {
      referrer = await db.orm.public.User
        .where({
          referralCode: referralCodeInput,
        })
        .first();

      if (!referrer) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid referral code.",
          },
          { status: 400 }
        );
      }
    }

    // ------------------------------------------
    // HASH PASSWORD
    // ------------------------------------------

    const hashedPassword = await bcrypt.hash(
      password,
      12
    );

    // ------------------------------------------
    // GENERATE USER REFERRAL CODE
    // ------------------------------------------

    const newReferralCode =
      await createUniqueReferralCode(name);

    // ------------------------------------------
    // CREATE USER
    // ------------------------------------------

    const user = await db.orm.public.User.create({
      name,
      email,
      password: hashedPassword,
      referralCode: newReferralCode,
      referredById: referrer ? referrer.id : null,
    });

    // ------------------------------------------
    // CREATE REFERRAL RECORD
    // ------------------------------------------
    //
    // Important:
    // This record does NOT unlock withdrawal
    // by itself.
    //
    // Withdrawal will only unlock after the
    // referred user's deposit becomes
    // APPROVED or COMPLETED.
    //
    // ------------------------------------------

    if (referrer) {
      await db.orm.public.ReferralCommission.create({
        referrerId: referrer.id,
        referredUserId: user.id,
        amount: 0,
        percentage: 0,
        status: "PENDING",
      });
    }

    // ------------------------------------------
    // RESPONSE
    // ------------------------------------------

    return NextResponse.json(
      {
        success: true,
        message: referrer
          ? "Account created successfully with referral."
          : "Account created successfully.",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          referralCode: user.referralCode,
          referredById: user.referredById,
        },
        referral: referrer
          ? {
              referred: true,
              referrerId: referrer.id,
            }
          : {
              referred: false,
            },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("REGISTER ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Something went wrong.",
      },
      { status: 500 }
    );
  }
}