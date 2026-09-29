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

    // =========================
    // AUTHENTICATION
    // =========================

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

    // =========================
    // SECURITY CHECK
    // =========================
    // User can ONLY access their own data.

    if (requestedUserId !== sessionUserId) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized access.",
        },
        { status: 403 }
      );
    }

    const userId = sessionUserId;

    // =========================
    // USER
    // =========================

    const user =
      await db.orm.public.User
        .where({ id: userId })
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

    // =========================
    // USER DATA
    // =========================

    const investments =
      await db.orm.public.Investment
        .where({ userId })
        .all();

    const deposits =
      await db.orm.public.Deposit
        .where({ userId })
        .all();

    const withdrawals =
      await db.orm.public.Withdrawal
        .where({ userId })
        .all();

    const transactions =
      await db.orm.public.Transaction
        .where({ userId })
        .all();

    const referralCommissions =
      await db.orm.public.ReferralCommission
        .where({
          referrerId: userId,
        })
        .all();

    // =========================
    // REFERRAL INCOME
    // =========================

    const approvedReferralCommissions =
      referralCommissions.filter(
        (commission: any) => {
          const status =
            String(
              commission.status || ""
            ).toUpperCase();

          return (
            status === "APPROVED" ||
            status === "COMPLETED"
          );
        }
      );

    const pendingReferralCommissions =
      referralCommissions.filter(
        (commission: any) =>
          String(
            commission.status || ""
          ).toUpperCase() === "PENDING"
      );

    const totalReferralIncome =
      approvedReferralCommissions.reduce(
        (total: number, commission: any) =>
          total +
          Number(commission.amount || 0),
        0
      );

    const pendingReferralIncome =
      pendingReferralCommissions.reduce(
        (total: number, commission: any) =>
          total +
          Number(commission.amount || 0),
        0
      );

    // =========================
    // REFERRED USERS
    // =========================

    const referredUserIds =
      Array.from(
        new Set(
          referralCommissions
            .map(
              (commission: any) =>
                commission.referredUserId
            )
            .filter(Boolean)
        )
      );

    const referredUsers: any[] = [];

    for (const referredUserId of referredUserIds) {
      const referredUser =
        await db.orm.public.User
          .where({
            id: referredUserId,
          })
          .first();

      if (!referredUser) {
        continue;
      }

      const referredDeposits =
        await db.orm.public.Deposit
          .where({
            userId: referredUserId,
          })
          .all();

      const approvedDeposits =
        referredDeposits.filter(
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

      const pendingDeposits =
        referredDeposits.filter(
          (deposit: any) =>
            String(
              deposit.status || ""
            ).toUpperCase() === "PENDING"
        );

      const rejectedDeposits =
        referredDeposits.filter(
          (deposit: any) =>
            String(
              deposit.status || ""
            ).toUpperCase() === "REJECTED"
        );

      const totalApprovedDeposit =
        approvedDeposits.reduce(
          (total: number, deposit: any) =>
            total +
            Number(deposit.amount || 0),
          0
        );

      const totalPendingDeposit =
        pendingDeposits.reduce(
          (total: number, deposit: any) =>
            total +
            Number(deposit.amount || 0),
          0
        );

      const totalRejectedDeposit =
        rejectedDeposits.reduce(
          (total: number, deposit: any) =>
            total +
            Number(deposit.amount || 0),
          0
        );

      const userCommissions =
        referralCommissions.filter(
          (commission: any) =>
            commission.referredUserId ===
            referredUserId
        );

      const completedCommissions =
        userCommissions.filter(
          (commission: any) => {
            const status =
              String(
                commission.status || ""
              ).toUpperCase();

            return (
              status === "APPROVED" ||
              status === "COMPLETED"
            );
          }
        );

      const pendingCommissions =
        userCommissions.filter(
          (commission: any) =>
            String(
              commission.status || ""
            ).toUpperCase() === "PENDING"
        );

      const userReferralIncome =
        completedCommissions.reduce(
          (total: number, commission: any) =>
            total +
            Number(commission.amount || 0),
          0
        );

      const userPendingReferralIncome =
        pendingCommissions.reduce(
          (total: number, commission: any) =>
            total +
            Number(commission.amount || 0),
          0
        );

      let depositStatus =
        "NO DEPOSIT";

      if (approvedDeposits.length > 0) {
        depositStatus = "APPROVED";
      } else if (pendingDeposits.length > 0) {
        depositStatus = "PENDING";
      } else if (rejectedDeposits.length > 0) {
        depositStatus = "REJECTED";
      }

      referredUsers.push({
        id: referredUser.id,
        name: referredUser.name,
        email: referredUser.email,
        isActive: referredUser.isActive,

        totalApprovedDeposit,
        totalPendingDeposit,
        totalRejectedDeposit,

        depositStatus,

        referralIncome:
          userReferralIncome,

        pendingReferralIncome:
          userPendingReferralIncome,
      });
    }

    // =========================
    // INVESTMENT STATS
    // =========================

    const totalInvested =
      investments.reduce(
        (total: number, investment: any) =>
          total +
          Number(investment.amount || 0),
        0
      );

    const activeInvestments =
      investments.filter(
        (investment: any) =>
          String(
            investment.status || ""
          ).toUpperCase() === "ACTIVE"
      ).length;

    const completedInvestments =
      investments.filter(
        (investment: any) =>
          String(
            investment.status || ""
          ).toUpperCase() === "COMPLETED"
      ).length;

    const totalDailyIncome =
      investments
        .filter(
          (investment: any) =>
            String(
              investment.status || ""
            ).toUpperCase() === "ACTIVE"
        )
        .reduce(
          (total: number, investment: any) =>
            total +
            Number(
              investment.dailyIncome || 0
            ),
          0
        );

    // =========================
    // DEPOSIT STATS
    // =========================

    const approvedDeposits =
      deposits.filter(
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

    const pendingDeposits =
      deposits.filter(
        (deposit: any) =>
          String(
            deposit.status || ""
          ).toUpperCase() === "PENDING"
      );

    const rejectedDeposits =
      deposits.filter(
        (deposit: any) =>
          String(
            deposit.status || ""
          ).toUpperCase() === "REJECTED"
      );

    const totalDepositedUSDT =
      approvedDeposits.reduce(
        (total: number, deposit: any) =>
          total +
          Number(deposit.amount || 0),
        0
      );

    const totalDepositedPKR =
      approvedDeposits.reduce(
        (total: number, deposit: any) =>
          total +
          Number(deposit.pkrAmount || 0),
        0
      );

    const totalPendingUSDT =
      pendingDeposits.reduce(
        (total: number, deposit: any) =>
          total +
          Number(deposit.amount || 0),
        0
      );

    const totalRejectedUSDT =
      rejectedDeposits.reduce(
        (total: number, deposit: any) =>
          total +
          Number(deposit.amount || 0),
        0
      );

    // =========================
    // WITHDRAWAL STATS
    // =========================

    const approvedWithdrawals =
      withdrawals.filter(
        (withdrawal: any) => {
          const status =
            String(
              withdrawal.status || ""
            ).toUpperCase();

          return (
            status === "APPROVED" ||
            status === "COMPLETED"
          );
        }
      );

    const pendingWithdrawals =
      withdrawals.filter(
        (withdrawal: any) =>
          String(
            withdrawal.status || ""
          ).toUpperCase() === "PENDING"
      );

    const rejectedWithdrawals =
      withdrawals.filter(
        (withdrawal: any) =>
          String(
            withdrawal.status || ""
          ).toUpperCase() === "REJECTED"
      );

    const totalWithdrawnUSDT =
      approvedWithdrawals.reduce(
        (total: number, withdrawal: any) =>
          total +
          Number(withdrawal.amount || 0),
        0
      );

    const totalPendingWithdrawals =
      pendingWithdrawals.reduce(
        (total: number, withdrawal: any) =>
          total +
          Number(withdrawal.amount || 0),
        0
      );

    const totalRejectedWithdrawals =
      rejectedWithdrawals.reduce(
        (total: number, withdrawal: any) =>
          total +
          Number(withdrawal.amount || 0),
        0
      );

    // =========================
    // INVESTMENT RESPONSE
    // =========================

    const investmentData =
      investments.map(
        (investment: any) => ({
          id: investment.id,

          planId:
            investment.planId || null,

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

        balance:
          Number(user.balance || 0),

        isActive:
          user.isActive,

        referralCode:
          user.referralCode || null,

        referredById:
          user.referredById || null,
      },

      stats: {
        totalInvested,

        activeInvestments,

        completedInvestments,

        totalDailyIncome,

        totalDepositedUSDT,

        totalDepositedPKR,

        totalPendingUSDT,

        totalRejectedUSDT,

        totalWithdrawnUSDT,

        totalPendingWithdrawals,

        totalRejectedWithdrawals,

        totalReferralIncome,

        pendingReferralIncome,

        totalReferrals:
          referredUsers.length,
      },

      investments:
        investmentData,

      deposits:
        deposits.map(
          (deposit: any) => ({
            id: deposit.id,

            paymentMethod:
              deposit.paymentMethod,

            amount:
              Number(
                deposit.amount || 0
              ),

            pkrAmount:
              Number(
                deposit.pkrAmount || 0
              ),

            usdtRate:
              Number(
                deposit.usdtRate || 0
              ),

            referenceId:
              deposit.referenceId ||
              null,

            screenshotUrl:
              deposit.screenshotUrl ||
              null,

            status:
              deposit.status,

            createdAt:
              deposit.createdAt
                ? String(
                    deposit.createdAt
                  )
                : null,
          })
        ),

      withdrawals:
        withdrawals.map(
          (withdrawal: any) => ({
            id: withdrawal.id,

            paymentMethod:
              withdrawal.paymentMethod,

            amount:
              Number(
                withdrawal.amount || 0
              ),

            accountInfo:
              withdrawal.accountInfo,

            referenceId:
              withdrawal.referenceId ||
              null,

            status:
              withdrawal.status,

            createdAt:
              withdrawal.createdAt
                ? String(
                    withdrawal.createdAt
                  )
                : null,
            approvedAt:
              withdrawal.approvedAt
                ? String(
                    withdrawal.approvedAt
                  )
                : null,
          })
        ),

      transactions:
        transactions.map(
          (transaction: any) => ({
            id: transaction.id,

            investmentId:
              transaction.investmentId ||
              null,

            type:
              transaction.type,

            amount:
              Number(
                transaction.amount || 0
              ),

            description:
              transaction.description ||
              null,

            status:
              transaction.status,

            createdAt:
              transaction.createdAt
                ? String(
                    transaction.createdAt
                  )
                : null,
          })
        ),

      referralCommissions:
        referralCommissions.map(
          (commission: any) => ({
            id: commission.id,

            referredUserId:
              commission.referredUserId,

            amount:
              Number(
                commission.amount || 0
              ),

            percentage:
              Number(
                commission.percentage || 0
              ),

            status:
              commission.status,
          })
        ),

      referredUsers,
    });
  } catch (error) {
    console.error(
      "USER DASHBOARD GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load dashboard.",
      },
      { status: 500 }
    );
  }
}
