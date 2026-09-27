import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { db, connectDB } from "@/lib/prisma";

export async function GET(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    // =========================
    // ADMIN AUTH
    // =========================

    const authenticated =
      await isAdminAuthenticated();

    if (!authenticated) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    // =========================
    // DATABASE
    // =========================

    await connectDB();

    // =========================
    // PARAMS
    // =========================

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          error: "User ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    // =========================
    // USER
    // =========================

    const user = await db.orm.public.User
      .where({
        id,
      })
      .first();

    if (!user) {
      return NextResponse.json(
        {
          error: "User not found.",
        },
        {
          status: 404,
        }
      );
    }

    // =========================
    // DEPOSITS
    // =========================

    const deposits =
      await db.orm.public.Deposit
        .where({
          userId: id,
        })
        .all();

    // =========================
    // WITHDRAWALS
    // =========================

    const withdrawals =
      await db.orm.public.Withdrawal
        .where({
          userId: id,
        })
        .all();

    // =========================
    // INVESTMENTS
    // =========================

    const investments =
      await db.orm.public.Investment
        .where({
          userId: id,
        })
        .all();

    // =========================
    // TRANSACTIONS
    // =========================

    const transactions =
      await db.orm.public.Transaction
        .where({
          userId: id,
        })
        .all();

    // =========================
    // REFERRAL COMMISSIONS
    // =========================

    const commissions =
      await db.orm.public.ReferralCommission
        .where({
          referrerId: id,
        })
        .all();

    // =========================
    // REFERRED USERS
    // =========================

    const referredUsers =
      await db.orm.public.User
        .where({
          referredById: id,
        })
        .all();

    // =========================
    // CALCULATE DEPOSIT STATS
    // =========================

    let totalDeposited = 0;
    let approvedDeposited = 0;
    let pendingDeposited = 0;
    let rejectedDeposited = 0;

    let approvedDepositCount = 0;
    let pendingDepositCount = 0;
    let rejectedDepositCount = 0;

    for (const deposit of deposits) {
      const amount = Number(
        deposit.amount || 0
      );

      totalDeposited += amount;

      const status = String(
        deposit.status || ""
      ).toUpperCase();

      if (status === "APPROVED") {
        approvedDeposited += amount;
        approvedDepositCount++;
      }

      if (status === "PENDING") {
        pendingDeposited += amount;
        pendingDepositCount++;
      }

      if (status === "REJECTED") {
        rejectedDeposited += amount;
        rejectedDepositCount++;
      }
    }

    // =========================
    // WITHDRAWAL STATS
    // =========================

    let totalWithdrawn = 0;
    let approvedWithdrawn = 0;
    let pendingWithdrawn = 0;
    let rejectedWithdrawn = 0;

    let approvedWithdrawalCount = 0;
    let pendingWithdrawalCount = 0;
    let rejectedWithdrawalCount = 0;

    for (const withdrawal of withdrawals) {
      const amount = Number(
        withdrawal.amount || 0
      );

      totalWithdrawn += amount;

      const status = String(
        withdrawal.status || ""
      ).toUpperCase();

      if (status === "APPROVED") {
        approvedWithdrawn += amount;
        approvedWithdrawalCount++;
      }

      if (status === "PENDING") {
        pendingWithdrawn += amount;
        pendingWithdrawalCount++;
      }

      if (status === "REJECTED") {
        rejectedWithdrawn += amount;
        rejectedWithdrawalCount++;
      }
    }

    // =========================
    // INVESTMENT STATS
    // =========================

    let totalInvested = 0;
    let activeInvested = 0;
    let completedInvested = 0;

    for (const investment of investments) {
      const amount = Number(
        investment.amount || 0
      );

      totalInvested += amount;

      const status = String(
        investment.status || ""
      ).toUpperCase();

      if (status === "ACTIVE") {
        activeInvested += amount;
      }

      if (status === "COMPLETED") {
        completedInvested += amount;
      }
    }

    // =========================
    // COMMISSION STATS
    // =========================

    let totalCommission = 0;
    let completedCommission = 0;
    let pendingCommission = 0;

    for (const commission of commissions) {
      const amount = Number(
        commission.amount || 0
      );

      totalCommission += amount;

      const status = String(
        commission.status || ""
      ).toUpperCase();

      if (status === "COMPLETED") {
        completedCommission += amount;
      }

      if (status === "PENDING") {
        pendingCommission += amount;
      }
    }

    // =========================
    // REFERRED USER DETAILS
    // =========================

    const referredUserDetails =
      referredUsers.map(
        (referredUser) => ({
          id: referredUser.id,
          name: referredUser.name,
          email: referredUser.email,
          balance: Number(
            referredUser.balance || 0
          ),
          isActive:
            referredUser.isActive,
          referralCode:
            referredUser.referralCode,
        })
      );

    // =========================
    // RESPONSE
    // =========================

    return NextResponse.json({
      success: true,

      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        balance: Number(
          user.balance || 0
        ),
        isActive: user.isActive,
        referralCode:
          user.referralCode,
        referredById:
          user.referredById,
      },

      stats: {
        deposits: {
          total: totalDeposited,
          approved: approvedDeposited,
          pending: pendingDeposited,
          rejected: rejectedDeposited,

          totalCount:
            deposits.length,

          approvedCount:
            approvedDepositCount,

          pendingCount:
            pendingDepositCount,

          rejectedCount:
            rejectedDepositCount,
        },

        withdrawals: {
          total: totalWithdrawn,
          approved: approvedWithdrawn,
          pending: pendingWithdrawn,
          rejected: rejectedWithdrawn,

          totalCount:
            withdrawals.length,

          approvedCount:
            approvedWithdrawalCount,

          pendingCount:
            pendingWithdrawalCount,

          rejectedCount:
            rejectedWithdrawalCount,
        },

        investments: {
          total: totalInvested,
          active: activeInvested,
          completed:
            completedInvested,
          totalCount:
            investments.length,
        },

        referrals: {
          total:
            referredUsers.length,

          totalCommission,
          completedCommission,
          pendingCommission,
        },
      },

      deposits,

      withdrawals,

      investments,

      transactions,

      commissions,

      referredUsers:
        referredUserDetails,
    });
  } catch (error) {
    console.error(
      "ADMIN USER DETAILS API ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load user details.",
      },
      {
        status: 500,
      }
    );
  }
}