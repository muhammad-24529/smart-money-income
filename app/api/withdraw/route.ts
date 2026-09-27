import { validateRequestOrigin } from "@/lib/security/csrf";
import { NextResponse } from "next/server";
import { db, connectDB } from "@/lib/prisma";
import { getUserSession } from "@/lib/auth/user";

export const runtime = "nodejs";

const ALLOWED_PAYMENT_METHODS = new Set([
  "JazzCash",
  "Easypaisa",
  "Binance",
  "USDT (TRC20)",
]);

export async function POST(request: Request) {
  const originError = validateRequestOrigin(request);

if (originError) {
  return originError;
} try {
    await connectDB();

    // ================================
    // AUTHENTICATION
    // ================================

    const sessionUserId =
      await getUserSession();

    if (!sessionUserId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Authentication required.",
        },
        { status: 401 }
      );
    }

    const body =
      await request.json();

    // ================================
    // CLIENT USER ID
    // ================================
    // Kept for frontend compatibility.
    // It MUST match the authenticated session.

    const requestedUserId =
      typeof body.userId === "string"
        ? body.userId.trim()
        : "";

    if (
      requestedUserId &&
      requestedUserId !== sessionUserId
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Unauthorized access.",
        },
        { status: 403 }
      );
    }

    // NEVER trust userId from client.
    const userId =
      sessionUserId;

    // ================================
    // FORM DATA
    // ================================

    const paymentMethod =
      typeof body.paymentMethod === "string"
        ? body.paymentMethod.trim()
        : "";

    const accountInfo =
      typeof body.accountInfo === "string"
        ? body.accountInfo.trim()
        : "";

    const withdrawAmount =
      Number(body.amount);

    // ================================
    // VALIDATION
    // ================================

    if (
      !paymentMethod ||
      !accountInfo
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please fill all required fields.",
        },
        { status: 400 }
      );
    }

    if (
      !ALLOWED_PAYMENT_METHODS.has(
        paymentMethod
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid payment method.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(
        withdrawAmount
      ) ||
      withdrawAmount <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid withdrawal amount.",
        },
        { status: 400 }
      );
    }

    // Withdrawal.amount is Int in database.
    if (
      !Number.isInteger(
        withdrawAmount
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Withdrawal amount must be a whole number.",
        },
        { status: 400 }
      );
    }

    if (
      accountInfo.length > 200
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Account information is too long.",
        },
        { status: 400 }
      );
    }

    // ================================
    // FIND AUTHENTICATED USER
    // ================================

    const user =
      await db.orm.public.User
        .where({
          id: userId,
        })
        .first();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message:
            "User not found.",
        },
        { status: 404 }
      );
    }

    // ================================
    // ACCOUNT STATUS
    // ================================

    if (!user.isActive) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Your account has been deactivated.",
        },
        { status: 403 }
      );
    }

    // ================================
    // CHECK REFERRAL REQUIREMENT
    // ================================

    const referrals =
      await db.orm.public.ReferralCommission
        .where({
          referrerId: userId,
        })
        .all();

    let hasReferralDeposit =
      false;

    for (const referral of referrals) {
      if (
        !referral.referredUserId
      ) {
        continue;
      }

      const deposits =
        await db.orm.public.Deposit
          .where({
            userId:
              referral.referredUserId,
          })
          .all();

      const approvedDeposit =
        deposits.some(
          (deposit: any) => {
            const status =
              String(
                deposit.status || ""
              ).toUpperCase();

            return (
              status === "APPROVED" ||
              status === "COMPLETED"
            );
          }
        );

      if (
        approvedDeposit
      ) {
        hasReferralDeposit =
          true;

        break;
      }
    }

    if (
      !hasReferralDeposit
    ) {
      return NextResponse.json(
        {
          success: false,
          locked: true,
          message:
            "Withdrawal is locked. At least one user referred through your referral link must make a deposit and have that deposit approved or completed.",
        },
        { status: 403 }
      );
    }

    // ================================
    // CHECK BALANCE
    // ================================

    const currentBalance =
      Number(
        user.balance || 0
      );

    if (
      !Number.isFinite(
        currentBalance
      ) ||
      currentBalance < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid account balance.",
        },
        { status: 500 }
      );
    }

    if (
      withdrawAmount >
      currentBalance
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            `Insufficient balance. Your current balance is ${currentBalance.toFixed(
              2
            )} USDT.`,
        },
        { status: 400 }
      );
    }

    // ================================
    // CALCULATE NEW BALANCE
    // ================================

    const newBalance =
      currentBalance -
      withdrawAmount;

    // ================================
    // CREATE WITHDRAWAL
    // ================================

    const withdrawal =
      await db.orm.public.Withdrawal.create({
        userId,

        paymentMethod,

        amount:
          withdrawAmount,

        accountInfo,

        status: "PENDING",
      });

    if (!withdrawal) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Failed to create withdrawal request.",
        },
        { status: 500 }
      );
    }

    // ================================
    // DEDUCT BALANCE
    // ================================

    const updatedUser =
      await db.orm.public.User
        .where({
          id: userId,
        })
        .update({
          balance:
            newBalance,
        });

    if (!updatedUser) {
      // IMPORTANT:
      // Withdrawal already exists, so admin
      // should NOT process this request if
      // balance update fails.

      console.error(
        "WITHDRAW BALANCE UPDATE FAILED:",
        withdrawal.id
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Withdrawal created, but balance update failed. Please contact administrator.",
          withdrawalId:
            withdrawal.id,
        },
        { status: 500 }
      );
    }

    // ================================
    // TRANSACTION RECORD
    // ================================

    try {
      await db.orm.public.Transaction.create({
        userId,

        investmentId:
          null,

        type:
          "WITHDRAWAL",

        amount:
          withdrawAmount,

        description:
          `Withdrawal request via ${paymentMethod}.`,

        status:
          "PENDING",
      });
    } catch (transactionError) {
      console.error(
        "WITHDRAW TRANSACTION ERROR:",
        transactionError
      );
    }

    // ================================
    // SUCCESS
    // ================================

    return NextResponse.json({
      success: true,

      message:
        "Withdrawal request submitted successfully.",

      withdrawal: {
        id:
          withdrawal.id,

        userId:
          withdrawal.userId,

        paymentMethod:
          withdrawal.paymentMethod,

        amount:
          Number(
            withdrawal.amount || 0
          ),

        accountInfo:
          withdrawal.accountInfo,

        status:
          withdrawal.status,
      },

      balance: {
        previousBalance:
          currentBalance,

        withdrawnAmount:
          withdrawAmount,

        newBalance:
          newBalance,
      },
    });
  } catch (error) {
    console.error(
      "WITHDRAW ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Internal server error.",
      },
      {
        status: 500,
      }
    );
  }
}