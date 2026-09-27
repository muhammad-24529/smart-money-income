import { validateRequestOrigin } from "@/lib/security/csrf";
import { NextResponse } from "next/server";
import { db, connectDB } from "@/lib/prisma";
import { getUserSession } from "@/lib/auth/user";

export const runtime = "nodejs";

export async function POST(request: Request) {
 const originError = validateRequestOrigin(request);

if (originError) {
  return originError;
} try {
    await connectDB();

    // =========================
    // AUTHENTICATION
    // =========================

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

    const body =
      await request.json();

    // =========================
    // REQUEST DATA
    // =========================

    const requestedUserId =
      typeof body?.userId === "string"
        ? body.userId.trim()
        : "";

    const code =
      typeof body?.code === "string"
        ? body.code.trim().toUpperCase()
        : "";

    // Client userId is accepted only
    // for frontend compatibility.
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
    const userId =
      sessionUserId;

    if (!code) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Promo code is required.",
        },
        { status: 400 }
      );
    }

    if (code.length > 100) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid promo code.",
        },
        { status: 400 }
      );
    }

    // =========================
    // FIND USER
    // =========================

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
          error: "User not found.",
        },
        { status: 404 }
      );
    }

    // =========================
    // ACCOUNT STATUS
    // =========================

    if (!user.isActive) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Your account has been deactivated.",
        },
        { status: 403 }
      );
    }

    // =========================
    // FIND PROMO
    // =========================

    const promo =
      await db.orm.public.PromoCode
        .where({
          code,
        })
        .first();

    if (!promo) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid promo code.",
        },
        { status: 404 }
      );
    }

    // =========================
    // ACTIVE CHECK
    // =========================

    if (!promo.active) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This promo code is inactive.",
        },
        { status: 400 }
      );
    }

    // =========================
    // VALIDATE PROMO LIMIT
    // =========================

    const usedCount =
      Number(
        promo.usedCount || 0
      );

    const maxUses =
      promo.maxUses === null ||
      promo.maxUses === undefined
        ? null
        : Number(promo.maxUses);

    if (
      !Number.isInteger(
        usedCount
      ) ||
      usedCount < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid promo usage count.",
        },
        { status: 500 }
      );
    }

    if (
      maxUses !== null &&
      (
        !Number.isInteger(
          maxUses
        ) ||
        maxUses < 0
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid promo usage limit.",
        },
        { status: 500 }
      );
    }

    if (
      maxUses !== null &&
      usedCount >= maxUses
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This promo code has reached its maximum usage limit.",
        },
        { status: 400 }
      );
    }

    // =========================
    // ALREADY USED
    // =========================

    const previousUsage =
      await db.orm.public.PromoCodeUsage
        .where({
          promoCodeId:
            promo.id,
          userId,
        })
        .first();

    if (previousUsage) {
      return NextResponse.json(
        {
          success: false,
          error:
            "You have already used this promo code.",
        },
        { status: 409 }
      );
    }

    // =========================
    // SUCCESSFUL REFERRALS
    // =========================

    const referralRecords =
      await db.orm.public.ReferralCommission
        .where({
          referrerId:
            userId,
          status:
            "COMPLETED",
        })
        .all();

    const successfulReferralIds =
      new Set<string>();

    for (
      const referral
      of referralRecords
    ) {
      if (
        referral.referredUserId
      ) {
        successfulReferralIds.add(
          referral.referredUserId
        );
      }
    }

    const successfulReferrals =
      successfulReferralIds.size;

    const requiredReferrals =
      Number(
        promo.requiredReferrals || 0
      );

    if (
      !Number.isInteger(
        requiredReferrals
      ) ||
      requiredReferrals < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid promo referral requirement.",
        },
        { status: 500 }
      );
    }

    if (
      successfulReferrals <
      requiredReferrals
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            `You need ${requiredReferrals} successful referrals to use this promo code. You currently have ${successfulReferrals}.`,
          requiredReferrals,
          successfulReferrals,
        },
        { status: 403 }
      );
    }

    // =========================
    // CALCULATE REWARD
    // =========================

    const bonusAmount =
      Number(
        promo.bonusAmount || 0
      );

    const bonusPercent =
      Number(
        promo.bonusPercent || 0
      );

    if (
      !Number.isInteger(
        bonusAmount
      ) ||
      bonusAmount < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid promo bonus amount.",
        },
        { status: 500 }
      );
    }

    if (
      !Number.isInteger(
        bonusPercent
      ) ||
      bonusPercent < 0 ||
      bonusPercent > 100
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid promo bonus percentage.",
        },
        { status: 500 }
      );
    }

    const currentBalance =
      Number(
        user.balance || 0
      );

    if (
      !Number.isInteger(
        currentBalance
      ) ||
      currentBalance < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid wallet balance.",
        },
        { status: 500 }
      );
    }

    let rewardAmount =
      0;

    if (
      bonusAmount > 0
    ) {
      rewardAmount +=
        bonusAmount;
    }

    if (
      bonusPercent > 0
    ) {
      const percentageReward =
        Math.floor(
          (
            currentBalance *
            bonusPercent
          ) / 100
        );

      rewardAmount +=
        percentageReward;
    }

    if (
      !Number.isInteger(
        rewardAmount
      ) ||
      rewardAmount <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This promo code has no valid reward.",
        },
        { status: 400 }
      );
    }

    const newBalance =
      currentBalance +
      rewardAmount;

    // =========================
    // UPDATE BALANCE
    // =========================

    // Protect against an old balance
    // being overwritten by another request.
    const updatedUser =
      await db.orm.public.User
        .where({
          id:
            userId,
          balance:
            currentBalance,
        })
        .update({
          balance:
            newBalance,
        });

    if (!updatedUser) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Wallet changed before promo redemption was processed. Please refresh and try again.",
        },
        { status: 409 }
      );
    }

    // =========================
    // CREATE PROMO USAGE
    // =========================

    try {
      await db.orm.public.PromoCodeUsage.create({
        promoCodeId:
          promo.id,

        userId,

        rewardAmount,
      });
    } catch (usageError) {
      // Roll back wallet if usage
      // record could not be created.
      await db.orm.public.User
        .where({
          id:
            userId,
          balance:
            newBalance,
        })
        .update({
          balance:
            currentBalance,
        });

      console.error(
        "PROMO USAGE CREATE ERROR:",
        usageError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Promo code could not be redeemed.",
        },
        { status: 500 }
      );
    }

    // =========================
    // UPDATE USED COUNT
    // =========================

    const newUsedCount =
      usedCount + 1;

    const updatedPromo =
      await db.orm.public.PromoCode
        .where({
          id:
            promo.id,
          usedCount:
            usedCount,
        })
        .update({
          usedCount:
            newUsedCount,
        });

    if (!updatedPromo) {
      // Roll back usage record.
      await db.orm.public.PromoCodeUsage
        .where({
          promoCodeId:
            promo.id,
          userId,
        })
        .delete();

      // Roll back wallet.
      await db.orm.public.User
        .where({
          id:
            userId,
          balance:
            newBalance,
        })
        .update({
          balance:
            currentBalance,
        });

      return NextResponse.json(
        {
          success: false,
          error:
            "Promo code could not be completed. Please try again.",
        },
        { status: 409 }
      );
    }

    // =========================
    // TRANSACTION
    // =========================

    try {
      await db.orm.public.Transaction.create({
        userId,

        investmentId:
          null,

        type:
          "PROMO_REWARD",

        amount:
          rewardAmount,

        description:
          `Promo code ${promo.code} reward.`,

        status:
          "COMPLETED",
      });
    } catch (transactionError) {
      console.error(
        "PROMO TRANSACTION ERROR:",
        transactionError
      );
    }

    // =========================
    // NOTIFICATION
    // =========================

    try {
      await db.orm.public.Notification.create({
        userId,

        title:
          "Promo Reward Received",

        message:
          `You received ${rewardAmount.toFixed(
            2
          )} USDT from promo code ${promo.code}.`,

        isRead:
          false,
      });
    } catch (notificationError) {
      console.error(
        "PROMO NOTIFICATION ERROR:",
        notificationError
      );
    }

    // =========================
    // SUCCESS
    // =========================

    return NextResponse.json({
      success: true,

      message:
        `Promo code redeemed successfully. ${rewardAmount.toFixed(
          2
        )} USDT has been added to your wallet.`,

      promo: {
        id:
          promo.id,

        code:
          promo.code,

        rewardAmount,

        requiredReferrals,

        successfulReferrals,

        usedCount:
          newUsedCount,

        maxUses,
      },

      user: {
        id:
          updatedUser.id,

        balance:
          Number(
            updatedUser.balance || 0
          ),
      },
    });
  } catch (error) {
    console.error(
      "PROMO REDEEM ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to redeem promo code.",
      },
      { status: 500 }
    );
  }
}