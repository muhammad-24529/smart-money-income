import { NextResponse } from "next/server";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

const isProduction = Boolean(process.env.VERCEL);
const databaseUrl = process.env.DATABASE_URL;

const pool = databaseUrl
  ? new Pool({ connectionString: databaseUrl })
  : null;

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

export async function POST(request: Request) {
  if (!pool) {
    return NextResponse.json(
      { success: false, error: "Database connection is not configured." },
      { status: 500 }
    );
  }

  const client = await pool.connect();

  try {
    const body = await request.json();

    const name =
      typeof body.name === "string" ? body.name.trim() : "";
    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";
    const password =
      typeof body.password === "string" ? body.password : "";
    const referralCodeInput =
      typeof body.referralCode === "string"
        ? body.referralCode.trim().toUpperCase()
        : typeof body.ref === "string"
          ? body.ref.trim().toUpperCase()
          : "";

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: "Name, email and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    const passwordColumn = isProduction ? '"passwordHash"' : '"password"';

    await client.query("BEGIN");

    const existingUser = await client.query(
      'SELECT id FROM public."user" WHERE email = $1 LIMIT 1',
      [email]
    );

    if (existingUser.rowCount) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { success: false, error: "User already exists." },
        { status: 409 }
      );
    }

    let referrer: { id: string } | null = null;

    if (referralCodeInput) {
      const referrerResult = await client.query(
        'SELECT id FROM public."user" WHERE "referralCode" = $1 LIMIT 1',
        [referralCodeInput]
      );

      if (!referrerResult.rows[0]) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { success: false, error: "Invalid referral code." },
          { status: 400 }
        );
      }

      referrer = referrerResult.rows[0];
    }

    let newReferralCode = "";
    let codeFound = false;

    for (let i = 0; i < 20; i++) {
      const candidate = generateReferralCode(name);
      const found = await client.query(
        'SELECT id FROM public."user" WHERE "referralCode" = $1 LIMIT 1',
        [candidate]
      );

      if (!found.rows[0]) {
        newReferralCode = candidate;
        codeFound = true;
        break;
      }
    }

    if (!codeFound) {
      throw new Error("Could not generate a unique referral code.");
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const userId = crypto.randomUUID();

    const insertUser = await client.query(
      `INSERT INTO public."user"
        (id, name, email, ${passwordColumn}, "referralCode", "referredById")
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, "referralCode", "referredById"`,
      [
        userId,
        name,
        email,
        hashedPassword,
        newReferralCode,
        referrer?.id ?? null,
      ]
    );

    const user = insertUser.rows[0];

    if (referrer) {
      await client.query(
        `INSERT INTO public."referralCommission"
          (id, "referrerId", "referredUserId", amount, percentage, status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          crypto.randomUUID(),
          referrer.id,
          user.id,
          0,
          isProduction ? 10 : 0,
          "PENDING",
        ]
      );
    }

    await client.query("COMMIT");

    return NextResponse.json(
      {
        success: true,
        message: referrer
          ? "Account created successfully with referral."
          : "Account created successfully.",
        user,
        referral: referrer
          ? { referred: true, referrerId: referrer.id }
          : { referred: false },
      },
      { status: 201 }
    );
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("REGISTER ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error
          ? error.message
          : "Something went wrong.",
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
