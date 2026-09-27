import { validateRequestOrigin } from "@/lib/security/csrf";
import { Temporal } from "@js-temporal/polyfill";

if (!("Temporal" in globalThis)) {
  Object.defineProperty(globalThis, "Temporal", {
    value: Temporal,
    configurable: true,
  });
}

import { NextResponse } from "next/server";
import { db, connectDB } from "@/lib/prisma";
import { getUserSession } from "@/lib/auth/user";

export const runtime = "nodejs";

class PurchaseError extends Error {
  status: number;
  data?: Record<string, unknown>;

  constructor(
    message: string,
    status: number,
    data?: Record<string, unknown>
  ) {
    super(message);
    this.name = "PurchaseError";
    this.status = status;
    this.data = data;
  }
}

export async function POST(request: Request) {
  const originError = validateRequestOrigin(request);

if (originError) {
  return originError;
} try {
    await connectDB();

    // ============================================
    // AUTHENTICATION
    // ============================================

    const sessionUserId = await getUserSession();

    if (!sessionUserId) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required.",
        },
        { status: 401 }
      );
    }

    // ============================================
    // REQUEST DATA
    // ============================================

    let body: Record<string, unknown>;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid JSON request.",
        },
        { status: 400 }
      );
    }

    const requestedUserId =
      typeof body.userId === "string"
        ? body.userId.trim()
        : "";

    const planId =
      typeof body.planId === "string"
        ? body.planId.trim()
        : "";

    // Client userId is accepted only for
    // frontend compatibility.
    if (
      requestedUserId &&
      requestedUserId !== sessionUserId
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized access.",
        },
        { status: 403 }
      );
    }

    // NEVER trust client userId.
    const userId = sessionUserId;

    if (!planId) {
      return NextResponse.json(
        {
          success: false,
          error: "Plan ID is required.",
        },
        { status: 400 }
      );
    }

    // ============================================
    // PURCHASE TIME
    // ============================================

    const purchaseTime = Temporal.Now.instant();

    // ============================================
    // ATOMIC FINANCIAL TRANSACTION
    // ============================================

    const result = await db.transaction(async (tx) => {
      // ------------------------------------------
      // FIND USER INSIDE TRANSACTION
      // ------------------------------------------

      const user =
        await tx.orm.public.User
          .where({
            id: userId,
          })
          .first();

      if (!user) {
        throw new PurchaseError(
          "User not found.",
          404
        );
      }

      // ------------------------------------------
      // ACCOUNT STATUS
      // ------------------------------------------

      if (!user.isActive) {
        throw new PurchaseError(
          "Your account has been deactivated.",
          403
        );
      }

      // ------------------------------------------
      // FIND ACTIVE PLAN
      // ------------------------------------------

      const plan =
        await tx.orm.public.InvestmentPlan
          .where({
            id: planId,
            active: true,
          })
          .first();

      if (!plan) {
        throw new PurchaseError(
          "Investment plan not found or inactive.",
          404
        );
      }

      // ------------------------------------------
      // VALIDATE PLAN DATA
      // ------------------------------------------

      const planAmount =
        Number(plan.amount);

      const dailyIncome =
        Number(plan.dailyIncome);

      const durationDays =
        Number(plan.durationDays);

      if (
        !Number.isInteger(planAmount) ||
        planAmount <= 0
      ) {
        throw new PurchaseError(
          "Invalid investment plan amount.",
          400
        );
      }

      if (
        !Number.isInteger(dailyIncome) ||
        dailyIncome < 0
      ) {
        throw new PurchaseError(
          "Invalid investment plan income.",
          400
        );
      }

      if (
        !Number.isInteger(durationDays) ||
        durationDays <= 0
      ) {
        throw new PurchaseError(
          "Invalid investment plan duration.",
          400
        );
      }

      // ------------------------------------------
      // CHECK EXISTING INVESTMENT
      // ------------------------------------------

      const existingInvestment =
        await tx.orm.public.Investment
          .where({
            userId,
            planId: plan.id,
          })
          .first();

      if (existingInvestment) {
        throw new PurchaseError(
          `You have already purchased ${plan.name}. Each plan can only be purchased once.`,
          400
        );
      }

      // ------------------------------------------
      // CHECK WALLET BALANCE
      // ------------------------------------------

      const currentBalance =
        Number(user.balance || 0);

      if (
        !Number.isInteger(currentBalance) ||
        currentBalance < 0
      ) {
        throw new PurchaseError(
          "Invalid wallet balance.",
          500
        );
      }

      if (currentBalance < planAmount) {
        throw new PurchaseError(
          "Insufficient wallet balance.",
          400,
          {
            balance: currentBalance,
            required: planAmount,
          }
        );
      }

      const newBalance =
        currentBalance - planAmount;

      // ------------------------------------------
      // CREATE INVESTMENT
      // ------------------------------------------

      const investment =
        await tx.orm.public.Investment.create({
          userId,

          planId:
            plan.id,

          amount:
            planAmount,

          dailyIncome:
            dailyIncome,

          durationDays:
            durationDays,

          startAt:
            purchaseTime,

          lastIncomeAt:
            null,

          status:
            "ACTIVE",
        });

      if (!investment) {
        throw new PurchaseError(
          "Failed to create investment.",
          500
        );
      }

      // ------------------------------------------
      // DEDUCT WALLET BALANCE
      // ------------------------------------------

      const updatedUser =
        await tx.orm.public.User
          .where({
            id: userId,
            balance: currentBalance,
          })
          .update({
            balance: newBalance,
          });

      if (!updatedUser) {
        throw new PurchaseError(
          "Wallet balance changed before the purchase could be completed. Please try again.",
          409
        );
      }

      // ------------------------------------------
      // CREATE FINANCIAL TRANSACTION
      // ------------------------------------------

      const transactionRecord =
        await tx.orm.public.Transaction.create({
          userId,

          investmentId:
            investment.id,

          type:
            "INVESTMENT_PURCHASE",

          amount:
            planAmount,

          description:
            `Purchased ${plan.name}. First START available after 24 hours.`,

          status:
            "COMPLETED",
        });

      if (!transactionRecord) {
        throw new PurchaseError(
          "Failed to create investment transaction record.",
          500
        );
      }

      // ------------------------------------------
      // RETURN TRANSACTION RESULT
      // ------------------------------------------

      return {
        investment,
        planName: plan.name,
        currentBalance,
        newBalance,
        planAmount,
      };
    });

    // ============================================
    // NEXT START TIME
    // ============================================

    const nextStartAt =
      purchaseTime.add({
        hours: 24,
      });

    // ============================================
    // SUCCESS RESPONSE
    // ============================================

    return NextResponse.json(
      {
        success: true,

        message:
          "Investment purchased successfully. START will be available after 24 hours.",

        investment: {
          id:
            result.investment.id,

          planId:
            result.investment.planId,

          planName:
            result.planName,

          amount:
            Number(
              result.investment.amount
            ),

          dailyIncome:
            Number(
              result.investment.dailyIncome
            ),

          durationDays:
            Number(
              result.investment.durationDays
            ),

          startAt:
            result.investment.startAt,

          lastIncomeAt:
            result.investment.lastIncomeAt,

          status:
            result.investment.status,

          nextStartAt,
        },

        wallet: {
          previousBalance:
            result.currentBalance,

          deducted:
            result.planAmount,

          newBalance:
            result.newBalance,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    // ============================================
    // EXPECTED PURCHASE ERRORS
    // ============================================

    if (error instanceof PurchaseError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          ...(error.data || {}),
        },
        { status: error.status }
      );
    }

    // ============================================
    // DATABASE / UNKNOWN ERROR
    // ============================================

    console.error(
      "INVESTMENT PURCHASE TRANSACTION ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to process investment purchase.",
      },
      { status: 500 }
    );
  }
}