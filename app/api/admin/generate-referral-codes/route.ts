import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

import { db, connectDB } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/admin/auth";

export const runtime = "nodejs";

function generateCode(name: string) {
  const cleanName = name
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 5);

  const random = randomBytes(4)
    .toString("hex")
    .toUpperCase();

  return `${cleanName || "USER"}${random}`;
}

async function generateUniqueCode(name: string) {
  for (let i = 0; i < 20; i++) {
    const code = generateCode(name);

    const existing =
      await db.orm.public.User
        .where({ referralCode: code })
        .first();

    if (!existing) {
      return code;
    }
  }

  throw new Error("Could not generate unique referral code.");
}

export async function POST() {
  try {
    const authenticated = await isAdminAuthenticated();

    if (!authenticated) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    await connectDB();

    const users = await db.orm.public.User.all();

    let updated = 0;

    for (const user of users) {
      if (user.referralCode) {
        continue;
      }

      const referralCode =
        await generateUniqueCode(user.name);

      await db.orm.public.User
        .where({ id: user.id })
        .update({
          referralCode,
        });

      updated++;
    }

    return NextResponse.json({
      success: true,
      message: "Referral codes generated successfully.",
      totalUsers: users.length,
      updated,
    });
  } catch (error) {
    console.error(
      "GENERATE REFERRAL CODES ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate referral codes.",
      },
      { status: 500 }
    );
  }
}