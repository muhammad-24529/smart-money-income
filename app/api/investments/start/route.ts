import { validateRequestOrigin } from "@/lib/security/csrf";
import { Temporal } from "@js-temporal/polyfill";
import { NextResponse } from "next/server";
import { db, connectDB } from "@/lib/prisma";
import { getUserSession } from "@/lib/auth/user";

if (!("Temporal" in globalThis)) {
  Object.defineProperty(globalThis, "Temporal", {
    value: Temporal,
    configurable: true,
  });
}

export const runtime = "nodejs";

export async function POST(request: Request) {
  const originError = validateRequestOrigin(request);

  if (originError) {
    return originError;
  }

  try {
    await connectDB();

    // ========================================
    // AUTHENTICATION
    // ========================================

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

    // ========================================
    // REQUEST DATA
    // ========================================

    const body = await request.json();

    const requestedUserId =
      typeof body?.userId === "string"
        ? body.userId.trim()
        : "";

    const investmentId =
      typeof body?.investmentId === "string"
        ? body.investmentId.trim()
        : "";

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

    if (!investmentId) {
      return NextResponse.json(
        {
          success: false,
          error: "Investment ID is required.",
        },
        { status: 400 }
      );
    }

    // ========================================
    // CURRENT TIME
    // ========================================

    const now = Temporal.Now.instant();

    /*
      All financial state changes below are handled
      inside ONE database transaction.
    */

    const result = await db.transaction(async (tx) => {
      // ======================================
      // FIND USER
      // ======================================

      const user = await tx.orm.public.User
        .where({
          id: sessionUserId,
        })
        .first();

      if (!user) {
        return {
          kind: "ERROR" as const,
          status: 404,
          body: {
            success: false,
            error: "User not found.",
          },
        };
      }

      if (user.isActive === false) {
        return {
          kind: "ERROR" as const,
          status: 403,
          body: {
            success: false,
            error:
              "Your account has been deactivated.",
          },
        };
      }

      // ======================================
      // FIND INVESTMENT FRESH INSIDE TX
      // ======================================

      const investment =
        await tx.orm.public.Investment
          .where({
            id: investmentId,
            userId: sessionUserId,
          })
          .first();

      if (!investment) {
        return {
          kind: "ERROR" as const,
          status: 404,
          body: {
            success: false,
            error: "Investment not found.",
          },
        };
      }

      const investmentStatus =
        String(
          investment.status || ""
        ).toUpperCase();

      if (investmentStatus === "COMPLETED") {
        return {
          kind: "ERROR" as const,
          status: 400,
          body: {
            success: false,
            completed: true,
            error:
              "This investment has already been completed.",
          },
        };
      }

      if (investmentStatus !== "ACTIVE") {
        return {
          kind: "ERROR" as const,
          status: 400,
          body: {
            success: false,
            error:
              "This investment is not active.",
          },
        };
      }

      // ======================================
      // PURCHASE TIME
      // ======================================

      if (!investment.startAt) {
        return {
          kind: "ERROR" as const,
          status: 400,
          body: {
            success: false,
            error:
              "Investment purchase time is missing.",
          },
        };
      }

      // ======================================
      // 24-HOUR LOCK
      // ======================================

      const referenceTime =
        investment.lastIncomeAt ||
        investment.startAt;

      const nextAllowedStart =
        referenceTime.add({
          hours: 24,
        });

      if (
        Temporal.Instant.compare(
          now,
          nextAllowedStart
        ) < 0
      ) {
        const remainingSeconds = Math.max(
          0,
          Math.ceil(
            (
              nextAllowedStart.epochMilliseconds -
              now.epochMilliseconds
            ) / 1000
          )
        );

        return {
          kind: "ERROR" as const,
          status: 403,
          body: {
            success: false,
            locked: true,
            error:
              "START is locked. You must wait 24 hours.",
            nextStartAt:
              nextAllowedStart.toString(),
            remainingSeconds,
          },
        };
      }

      // ======================================
      // VALIDATE DURATION
      // ======================================

      const durationDays =
        Number(investment.durationDays);

      if (
        !Number.isInteger(durationDays) ||
        durationDays <= 0
      ) {
        return {
          kind: "ERROR" as const,
          status: 400,
          body: {
            success: false,
            error:
              "Invalid investment duration.",
          },
        };
      }

      // ======================================
      // COUNT COMPLETED DAILY INCOME
      // ======================================

      const dailyIncomeTransactions =
        await tx.orm.public.Transaction
          .where({
            investmentId: investment.id,
            type: "DAILY_INCOME",
          })
          .all();

      const completedCycles =
        dailyIncomeTransactions.filter(
          (transaction: any) =>
            String(
              transaction.status || ""
            ).toUpperCase() === "COMPLETED"
        ).length;

      if (
        completedCycles >= durationDays
      ) {
        await tx.orm.public.Investment
          .where({
            id: investment.id,
            userId: sessionUserId,
          })
          .update({
            status: "COMPLETED",
          });

        return {
          kind: "ERROR" as const,
          status: 400,
          body: {
            success: false,
            completed: true,
            error:
              "All daily income cycles have already been completed.",
          },
        };
      }

      // ======================================
      // DAILY INCOME
      // ======================================

      const income =
        Number(investment.dailyIncome);

      if (
        !Number.isInteger(income) ||
        income <= 0
      ) {
        return {
          kind: "ERROR" as const,
          status: 400,
          body: {
            success: false,
            error:
              "Invalid daily income amount.",
          },
        };
      }

      // ======================================
      // WALLET
      // ======================================

      const currentBalance =
        Number(user.balance || 0);

      if (
        !Number.isInteger(currentBalance) ||
        currentBalance < 0
      ) {
        return {
          kind: "ERROR" as const,
          status: 500,
          body: {
            success: false,
            error:
              "Invalid wallet balance.",
          },
        };
      }

      const newBalance =
        currentBalance + income;

      const currentCycle =
        completedCycles + 1;

      // ======================================
      // ATOMIC BALANCE UPDATE
      // ======================================

      const updatedUser =
        await tx.orm.public.User
          .where({
            id: sessionUserId,
            balance: currentBalance,
          })
          .update({
            balance: newBalance,
          });

      if (!updatedUser) {
        return {
          kind: "CONFLICT" as const,
        };
      }

      // ======================================
      // CREATE INCOME TRANSACTION
      // ======================================

      await tx.orm.public.Transaction.create({
        userId: sessionUserId,
        investmentId: investment.id,
        type: "DAILY_INCOME",
        amount: income,
        description:
          `Daily investment income - cycle ${currentCycle}/${durationDays}.`,
        status: "COMPLETED",
      });

      // ======================================
      // UPDATE INVESTMENT
      // ======================================

      const completed =
        currentCycle >= durationDays;

      await tx.orm.public.Investment
        .where({
          id: investment.id,
          userId: sessionUserId,
        })
        .update({
          lastIncomeAt: now,
          status: completed
            ? "COMPLETED"
            : "ACTIVE",
        });

      return {
        kind: "SUCCESS" as const,
        completed,
        income,
        currentCycle,
        durationDays,
        currentBalance,
        newBalance,
        nextStartAt: completed
          ? null
          : now
              .add({ hours: 24 })
              .toString(),
      };
    });

    // ========================================
    // TRANSACTION CONFLICT
    // ========================================

    if (result.kind === "CONFLICT") {
      return NextResponse.json(
        {
          success: false,
          error:
            "START was already processed or your wallet changed. Please refresh and try again.",
        },
        { status: 409 }
      );
    }

    // ========================================
    // VALIDATION / BUSINESS ERROR
    // ========================================

    if (result.kind === "ERROR") {
      return NextResponse.json(
        result.body,
        { status: result.status }
      );
    }

    // ========================================
    // SUCCESS
    // ========================================

    return NextResponse.json({
      success: true,
      completed: result.completed,

      message: result.completed
        ? "START successful. Final daily income added. Investment completed."
        : "START successful. Daily income added to your wallet.",

      income: {
        amount: result.income,
        cycle: result.currentCycle,
        totalCycles: result.durationDays,
      },

      wallet: {
        previousBalance:
          result.currentBalance,
        incomeAdded: result.income,
        newBalance: result.newBalance,
      },

      nextStartAt:
        result.nextStartAt,
    });
  } catch (error) {
    console.error(
      "INVESTMENT START ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to process investment START.",
      },
      { status: 500 }
    );
  }
}