import { NextResponse } from "next/server";
import { db, connectDB } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/admin/auth";

export const runtime = "nodejs";

export async function GET() {
  try {
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

    const withdrawals =
      await db.orm.public.Withdrawal.all();

    const users =
      await db.orm.public.User.all();

    const result = withdrawals.map(
      (withdrawal) => {
        const user = users.find(
          (u) =>
            u.id === withdrawal.userId
        );

        return {
          id: withdrawal.id,
          userId: withdrawal.userId,
          userName:
            user?.name ||
            "Unknown User",
          userEmail:
            user?.email ||
            "Unknown Email",
          paymentMethod:
            withdrawal.paymentMethod,
          amount:
            Number(
              withdrawal.amount
            ),
          accountInfo:
            withdrawal.accountInfo,
          referenceId:
            withdrawal.referenceId,
          status:
            withdrawal.status,
        };
      }
    );

    return NextResponse.json({
      withdrawals: result,
    });
  } catch (error) {
    console.error(
      "ADMIN WITHDRAWALS GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load withdrawals.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request
) {
  try {
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

    const body =
      await request.json();

    const withdrawalId =
      typeof body.withdrawalId ===
      "string"
        ? body.withdrawalId.trim()
        : "";

    const action =
      typeof body.action ===
      "string"
        ? body.action
            .trim()
            .toUpperCase()
        : "";

    const referenceId =
      typeof body.referenceId ===
      "string"
        ? body.referenceId.trim()
        : "";

    if (!withdrawalId) {
      return NextResponse.json(
        {
          error:
            "Withdrawal ID is required.",
        },
        { status: 400 }
      );
    }

    if (
      action !== "APPROVE" &&
      action !== "REJECT"
    ) {
      return NextResponse.json(
        {
          error:
            "Action must be APPROVE or REJECT.",
        },
        { status: 400 }
      );
    }

    const withdrawal =
      await db.orm.public.Withdrawal
        .where({
          id: withdrawalId,
        })
        .first();

    if (!withdrawal) {
      return NextResponse.json(
        {
          error:
            "Withdrawal not found.",
        },
        { status: 404 }
      );
    }

    if (
      String(
        withdrawal.status
      ).toUpperCase() !== "PENDING"
    ) {
      return NextResponse.json(
        {
          error:
            "This withdrawal has already been processed.",
          status:
            withdrawal.status,
        },
        { status: 400 }
      );
    }

    const user =
      await db.orm.public.User
        .where({
          id: withdrawal.userId,
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

    const withdrawalAmount =
      Number(
        withdrawal.amount || 0
      );

    if (
      !Number.isFinite(
        withdrawalAmount
      ) ||
      withdrawalAmount <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid withdrawal amount.",
        },
        { status: 400 }
      );
    }

    /*
     * =========================
     * APPROVE WITHDRAWAL
     * =========================
     */

    if (action === "APPROVE") {
      const updatedWithdrawal =
        await db.orm.public.Withdrawal
          .where({
            id: withdrawal.id,
          })
          .update({
            status: "APPROVED",
            referenceId:
              referenceId ||
              withdrawal.referenceId,
          });

      if (!updatedWithdrawal) {
        return NextResponse.json(
          {
            error:
              "Failed to update withdrawal.",
          },
          { status: 500 }
        );
      }

      /*
       * FIND PENDING
       * WITHDRAWAL TRANSACTION
       */

      const transactions =
        await db.orm.public.Transaction
          .where({
            userId: user.id,
          })
          .all();

      const withdrawalTransaction =
        transactions.find(
          (transaction) =>
            transaction.investmentId ===
              null &&
            transaction.type ===
              "WITHDRAWAL" &&
            Number(
              transaction.amount
            ) ===
              withdrawalAmount &&
            transaction.status ===
              "PENDING"
        );

      if (
        withdrawalTransaction
      ) {
        await db.orm.public.Transaction
          .where({
            id:
              withdrawalTransaction.id,
          })
          .update({
            status:
              "COMPLETED",
            description:
              referenceId
                ? `Withdrawal approved. Reference: ${referenceId}`
                : "Withdrawal approved",
          });
      }

      /*
       * =========================
       * AUTOMATIC NOTIFICATION
       * =========================
       */

      await db.orm.public.Notification.create(
        {
          userId: user.id,
          title:
            "Withdrawal Approved",
          message:
            `Your withdrawal of ${withdrawalAmount.toFixed(
              2
            )} USDT has been approved successfully.`,
          isRead: false,
        }
      );

      return NextResponse.json({
        message:
          "Withdrawal approved successfully.",

        withdrawal: {
          id:
            updatedWithdrawal.id,
          status:
            updatedWithdrawal.status,
          referenceId:
            updatedWithdrawal.referenceId,
        },
      });
    }

    /*
     * =========================
     * REJECT WITHDRAWAL
     * =========================
     *
     * Amount was already deducted
     * when withdrawal was submitted.
     * Therefore rejected withdrawal
     * is refunded.
     */

    const currentBalance =
      Number(user.balance || 0);

    const refundAmount =
      withdrawalAmount;

    const newBalance =
      currentBalance +
      refundAmount;

    /*
     * =========================
     * REFUND USER BALANCE
     * =========================
     */

    const updatedUser =
      await db.orm.public.User
        .where({
          id: user.id,
        })
        .update({
          balance: newBalance,
        });

    if (!updatedUser) {
      return NextResponse.json(
        {
          error:
            "Failed to refund withdrawal amount.",
        },
        { status: 500 }
      );
    }

    /*
     * =========================
     * UPDATE WITHDRAWAL
     * =========================
     */

    const updatedWithdrawal =
      await db.orm.public.Withdrawal
        .where({
          id: withdrawal.id,
        })
        .update({
          status: "REJECTED",
          referenceId:
            referenceId ||
            withdrawal.referenceId,
        });

    if (!updatedWithdrawal) {
      return NextResponse.json(
        {
          error:
            "Failed to update withdrawal.",
        },
        { status: 500 }
      );
    }

    /*
     * =========================
     * FIND PENDING
     * WITHDRAWAL TRANSACTION
     * =========================
     */

    const transactions =
      await db.orm.public.Transaction
        .where({
          userId: user.id,
        })
        .all();

    const withdrawalTransaction =
      transactions.find(
        (transaction) =>
          transaction.investmentId ===
            null &&
          transaction.type ===
            "WITHDRAWAL" &&
          Number(
            transaction.amount
          ) === refundAmount &&
          transaction.status ===
            "PENDING"
      );

    /*
     * =========================
     * UPDATE WITHDRAWAL
     * TRANSACTION
     * =========================
     */

    if (
      withdrawalTransaction
    ) {
      await db.orm.public.Transaction
        .where({
          id:
            withdrawalTransaction.id,
        })
        .update({
          status:
            "REJECTED",
          description:
            referenceId
              ? `Withdrawal rejected and amount refunded. Reference: ${referenceId}`
              : "Withdrawal rejected and amount refunded",
        });
    }

    /*
     * =========================
     * REFUND TRANSACTION
     * =========================
     */

    await db.orm.public.Transaction.create(
      {
        userId: user.id,
        investmentId: null,
        type: "REFUND",
        amount: refundAmount,
        description:
          referenceId
            ? `Withdrawal refund. Reference: ${referenceId}`
            : "Withdrawal refund",
        status: "COMPLETED",
      }
    );

    /*
     * =========================
     * AUTOMATIC NOTIFICATION
     * =========================
     */

    await db.orm.public.Notification.create(
      {
        userId: user.id,
        title:
          "Withdrawal Rejected",
        message:
          `Your withdrawal of ${refundAmount.toFixed(
            2
          )} USDT has been rejected and the amount has been refunded to your wallet.`,
        isRead: false,
      }
    );

    return NextResponse.json({
      message:
        "Withdrawal rejected and balance refunded successfully.",

      withdrawal: {
        id:
          updatedWithdrawal.id,
        status:
          updatedWithdrawal.status,
        referenceId:
          updatedWithdrawal.referenceId,
      },

      wallet: {
        previousBalance:
          currentBalance,
        refunded:
          refundAmount,
        newBalance:
          newBalance,
      },
    });
  } catch (error) {
    console.error(
      "ADMIN WITHDRAWAL PATCH ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to process withdrawal.",
      },
      { status: 500 }
    );
  }
}