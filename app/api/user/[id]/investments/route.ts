import { NextResponse } from "next/server";
import { db, connectDB } from "@/lib/prisma";
import { getUserSession } from "@/lib/auth/user";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    await connectDB();

    // ==============================
    // AUTHENTICATION
    // ==============================

    const sessionUserId =
      await getUserSession();

    if (!sessionUserId) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required.",
        },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    const requestedUserId =
      typeof id === "string"
        ? id.trim()
        : "";

    if (!requestedUserId) {
      return NextResponse.json(
        {
          success: false,
          error: "User ID is required.",
        },
        { status: 400 }
      );
    }

    // ==============================
    // SECURITY CHECK
    // ==============================
    // A user can only access
    // their own investments.

    if (requestedUserId !== sessionUserId) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized access.",
        },
        { status: 403 }
      );
    }

    // ==============================
    // FIND USER
    // ==============================

    const user =
      await db.orm.public.User
        .where({
          id: sessionUserId,
        })
        .first();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found.",
        },
        { status: 404 }
      );
    }

    // ==============================
    // GET INVESTMENTS
    // ==============================

    const investments =
      await db.orm.public.Investment
        .where({
          userId: sessionUserId,
        })
        .all();

    // ==============================
    // RETURN INVESTMENTS
    // ==============================

    return NextResponse.json({
      success: true,

      investments: investments.map(
        (investment: any) => ({
          id: investment.id,

          planId:
            investment.planId,

          amount:
            Number(
              investment.amount || 0
            ),

          dailyIncome:
            Number(
              investment.dailyIncome || 0
            ),

          durationDays:
            Number(
              investment.durationDays || 0
            ),

          startAt:
            investment.startAt
              ? String(
                  investment.startAt
                )
              : null,

          lastIncomeAt:
            investment.lastIncomeAt
              ? String(
                  investment.lastIncomeAt
                )
              : null,

          status:
            investment.status,
        })
      ),
    });
  } catch (error) {
    console.error(
      "USER INVESTMENTS GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load investments.",
      },
      { status: 500 }
    );
  }
}