import { NextResponse } from "next/server";
import { db, connectDB } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/admin/auth";

export const runtime = "nodejs";

// ==============================
// GET USERS
// ==============================

export async function GET() {
  try {
    const authenticated = await isAdminAuthenticated();

    if (!authenticated) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    await connectDB();

    const users = await db.orm.public.User.all();

    const usersWithReferrals = await Promise.all(
      users.map(async (user) => {
        const referredUsers =
          await db.orm.public.User
            .where({
              referredById: user.id,
            })
            .all();

        const referralDetails =
          await Promise.all(
            referredUsers.map(async (referredUser) => {
              const deposits =
                await db.orm.public.Deposit
                  .where({
                    userId: referredUser.id,
                  })
                  .all();

              const commissions =
                await db.orm.public.ReferralCommission
                  .where({
                    referrerId: user.id,
                    referredUserId:
                      referredUser.id,
                  })
                  .all();

              const approvedDeposits =
                deposits.filter(
                  (deposit) =>
                    deposit.status ===
                    "APPROVED"
                );

              const pendingDeposits =
                deposits.filter(
                  (deposit) =>
                    deposit.status ===
                    "PENDING"
                );

              const rejectedDeposits =
                deposits.filter(
                  (deposit) =>
                    deposit.status ===
                    "REJECTED"
                );

              const totalDepositedUSDT =
                approvedDeposits.reduce(
                  (total, deposit) =>
                    total +
                    Number(
                      deposit.amount || 0
                    ),
                  0
                );

              const pendingUSDT =
                pendingDeposits.reduce(
                  (total, deposit) =>
                    total +
                    Number(
                      deposit.amount || 0
                    ),
                  0
                );

              const rejectedUSDT =
                rejectedDeposits.reduce(
                  (total, deposit) =>
                    total +
                    Number(
                      deposit.amount || 0
                    ),
                  0
                );

              const totalCommission =
                commissions.reduce(
                  (total, commission) =>
                    total +
                    Number(
                      commission.amount || 0
                    ),
                  0
                );

              return {
                id: referredUser.id,
                name: referredUser.name,
                email: referredUser.email,
                balance: Number(
                  referredUser.balance || 0
                ),
                isActive:
                  referredUser.isActive,

                hasDeposit:
                  deposits.length > 0,

                hasApprovedDeposit:
                  approvedDeposits.length >
                  0,

                totalDepositedUSDT,

                pendingUSDT,

                rejectedUSDT,

                approvedDepositCount:
                  approvedDeposits.length,

                pendingDepositCount:
                  pendingDeposits.length,

                rejectedDepositCount:
                  rejectedDeposits.length,

                referralCommission:
                  totalCommission,
              };
            })
          );

        const totalReferralCommission =
          referralDetails.reduce(
            (total, referredUser) =>
              total +
              referredUser.referralCommission,
            0
          );

        const referredUsersWithDeposit =
          referralDetails.filter(
            (referredUser) =>
              referredUser.hasDeposit
          ).length;

        const referredUsersWithApprovedDeposit =
          referralDetails.filter(
            (referredUser) =>
              referredUser.hasApprovedDeposit
          ).length;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          balance: Number(
            user.balance || 0
          ),
          isActive: user.isActive,
          referralCode:
            user.referralCode,

          referral: {
            totalReferred:
              referralDetails.length,

            usersWithDeposit:
              referredUsersWithDeposit,

            usersWithApprovedDeposit:
              referredUsersWithApprovedDeposit,

            totalCommission:
              totalReferralCommission,

            referredUsers:
              referralDetails,
          },
        };
      })
    );

    return NextResponse.json({
      users: usersWithReferrals,
    });
  } catch (error) {
    console.error(
      "ADMIN USERS GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load users.",
      },
      { status: 500 }
    );
  }
}

// ==============================
// PATCH USER
// ==============================

export async function PATCH(
  request: Request
) {
  try {
    const authenticated =
      await isAdminAuthenticated();

    if (!authenticated) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await request.json();

    const userId =
      typeof body.userId === "string"
        ? body.userId.trim()
        : "";

    if (!userId) {
      return NextResponse.json(
        {
          error: "User ID is required.",
        },
        { status: 400 }
      );
    }

    const user =
      await db.orm.public.User
        .where({
          id: userId,
        })
        .first();

    if (!user) {
      return NextResponse.json(
        {
          error: "User not found.",
        },
        { status: 404 }
      );
    }

    // ==========================
    // ACTIVATE / DEACTIVATE
    // ==========================

    if (
      typeof body.isActive ===
      "boolean"
    ) {
      const updatedUser =
        await db.orm.public.User
          .where({
            id: userId,
          })
          .update({
            isActive:
              body.isActive,
          });

      if (!updatedUser) {
        return NextResponse.json(
          {
            error:
              "Failed to update user status.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: body.isActive
          ? "User activated successfully."
          : "User deactivated successfully.",

        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          balance: Number(
            updatedUser.balance || 0
          ),
          isActive:
            updatedUser.isActive,
          referralCode:
            updatedUser.referralCode,
        },
      });
    }

    // ==========================
    // BALANCE ADD / DEDUCT
    // ==========================

    const balanceAction =
      typeof body.balanceAction ===
      "string"
        ? body.balanceAction
            .trim()
            .toUpperCase()
        : "";

    if (
      balanceAction !== "ADD" &&
      balanceAction !== "DEDUCT"
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid balance action. Use ADD or DEDUCT.",
        },
        { status: 400 }
      );
    }

    const amount = Number(
      body.amount
    );

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Balance amount must be greater than 0.",
        },
        { status: 400 }
      );
    }

    if (!Number.isInteger(amount)) {
      return NextResponse.json(
        {
          error:
            "Balance amount must be a whole USDT amount.",
        },
        { status: 400 }
      );
    }

    const currentBalance =
      Number(user.balance || 0);

    let newBalance =
      currentBalance;

    if (
      balanceAction === "ADD"
    ) {
      newBalance =
        currentBalance + amount;
    }

    if (
      balanceAction === "DEDUCT"
    ) {
      if (
        amount > currentBalance
      ) {
        return NextResponse.json(
          {
            error:
              "Cannot deduct more than the user's current balance.",
          },
          { status: 400 }
        );
      }

      newBalance =
        currentBalance - amount;
    }

    const updatedUser =
      await db.orm.public.User
        .where({
          id: userId,
        })
        .update({
          balance: newBalance,
        });

    if (!updatedUser) {
      return NextResponse.json(
        {
          error:
            "Failed to update user balance.",
        },
        { status: 500 }
      );
    }

    const transactionType =
      balanceAction === "ADD"
        ? "ADMIN_BALANCE_ADD"
        : "ADMIN_BALANCE_DEDUCT";

    const transactionDescription =
      balanceAction === "ADD"
        ? "Admin manually added USDT to user balance."
        : "Admin manually deducted USDT from user balance.";

    await db.orm.public.Transaction.create(
      {
        userId: user.id,
        investmentId: null,
        type: transactionType,
        amount,
        description:
          transactionDescription,
        status: "COMPLETED",
      }
    );

    return NextResponse.json({
      message:
        balanceAction === "ADD"
          ? "USDT added successfully."
          : "USDT deducted successfully.",

      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        balance: Number(
          updatedUser.balance || 0
        ),
        isActive:
          updatedUser.isActive,
        referralCode:
          updatedUser.referralCode,
      },
    });
  } catch (error) {
    console.error(
      "ADMIN USERS PATCH ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update user.",
      },
      { status: 500 }
    );
  }
}

// ==============================
// DELETE USER
// ==============================

export async function DELETE(
  request: Request
) {
  try {
    console.log(
      "ADMIN USERS DELETE REQUEST"
    );

    const authenticated =
      await isAdminAuthenticated();

    if (!authenticated) {
      return NextResponse.json(
        {
          error: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await request.json();

    const userId =
      typeof body.userId === "string"
        ? body.userId.trim()
        : "";

    console.log(
      "DELETE USER ID:",
      userId
    );

    if (!userId) {
      return NextResponse.json(
        {
          error:
            "User ID is required.",
        },
        { status: 400 }
      );
    }

    const user =
      await db.orm.public.User
        .where({
          id: userId,
        })
        .first();

    if (!user) {
      return NextResponse.json(
        {
          error:
            "User not found.",
        },
        { status: 404 }
      );
    }

    // Delete user.
    //
    // Database relations in your schema use
    // Cascade / SetNull, so related records
    // should be handled by the database.

    const deletedUser =
      await db.orm.public.User
        .where({
          id: userId,
        })
        .delete();

    if (!deletedUser) {
      return NextResponse.json(
        {
          error:
            "Failed to delete user.",
        },
        { status: 500 }
      );
    }

    console.log(
      "USER DELETED:",
      user.id
    );

    return NextResponse.json({
      message:
        "User deleted successfully.",

      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error(
      "ADMIN USERS DELETE ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete user.",
      },
      { status: 500 }
    );
  }
}