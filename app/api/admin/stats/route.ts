import { NextResponse } from "next/server";
import { db, connectDB } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/admin/auth";

export const runtime = "nodejs";

export async function GET() {
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

    const [users, deposits, withdrawals, investments] =
      await Promise.all([
        db.orm.public.User.select("id").all(),
        db.orm.public.Deposit.select("id").all(),
        db.orm.public.Withdrawal.select("id").all(),
        db.orm.public.Investment.select("id").all(),
      ]);

    return NextResponse.json({
      success: true,
      totalUsers: users.length,
      totalDeposits: deposits.length,
      totalWithdrawals: withdrawals.length,
      totalInvestments: investments.length,
    });
  } catch (error) {
    console.error("ADMIN STATS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to load admin statistics.",
      },
      { status: 500 }
    );
  }
}