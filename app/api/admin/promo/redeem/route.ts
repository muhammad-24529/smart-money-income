import { NextResponse } from "next/server";
import { db, connectDB } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/admin/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const admin = await isAdminAuthenticated();

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await request.json();

    const userId =
      typeof body?.userId === "string"
        ? body.userId.trim()
        : "";

    const code =
      typeof body?.code === "string"
        ? body.code.trim().toUpperCase()
        : "";

    if (!userId || !code) {
      return NextResponse.json(
        {
          success: false,
          error: "User ID and promo code are required.",
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
          success: false,
          error: "User not found.",
        },
        { status: 404 }
      );
    }

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
          error: "Invalid promo code.",
        },
        { status: 404 }
      );
    }

    if (!promo.active) {
      return NextResponse.json(
        {
          success: false,
          error: "This promo code is inactive.",
        },
        { status: 400 }
      );
    }

    const usedCount = Number(
      promo.usedCount || 0
    );

    const maxUses =
      promo.maxUses === null ||
      promo.maxUses === undefined
        ? null
        : Number(promo.maxUses);

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

    const previousUsage =
      await db.orm.public.PromoCodeUsage
        .where({
          promoCodeId: promo.id,
          userId: user.id,
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

    const referralRecords =
      await db.orm.public.ReferralCommission
        .where({
          referrerId: user.id,
          status: "COMPLETED",
        })
        .all();

    const successfulReferralIds =
      new Set<string>();

    for (const referral of referralRecords) {
      if (referral.referredUserId) {
        successfulReferralIds.add(
          referral.referredUserId
        );
      }
    }

    const successfulReferrals =
      successfulReferralIds.size;

    const requiredReferrals = Number(
      promo.requiredReferrals || 0
    );

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

    const bonusAmount = Number(
      promo.bonusAmount || 0
    );

    const bonusPercent = Number(
      promo.bonusPercent || 0
    );

    let rewardAmount = 0;

    if (bonusAmount > 0) {
      rewardAmount += bonusAmount;
    }

    if (bonusPercent > 0) {
      const percentageReward =
        Math.floor(
          (Number(user.balance || 0) *
            bonusPercent) /
            100
        );

      rewardAmount += percentageReward;
    }

    if (rewardAmount <= 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This promo code has no valid reward.",
        },
        { status: 400 }
      );
    }

    const currentBalance = Number(
      user.balance || 0
    );

    const newBalance =
      currentBalance + rewardAmount;

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
          success: false,
          error:
            "Failed to update wallet balance.",
        },
        { status: 500 }
      );
    }

    try {
      await db.orm.public.PromoCodeUsage.create({
        promoCodeId: promo.id,
        userId: user.id,
        rewardAmount,
      });
    } catch (usageError) {
      await db.orm.public.User
        .where({
          id: user.id,
        })
        .update({
          balance: currentBalance,
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

    const newUsedCount =
      usedCount + 1;

    const updatedPromo =
      await db.orm.public.PromoCode
        .where({
          id: promo.id,
        })
        .update({
          usedCount: newUsedCount,
        });

    if (!updatedPromo) {
      await db.orm.public.PromoCodeUsage
        .where({
          promoCodeId: promo.id,
          userId: user.id,
        })
        .delete();

      await db.orm.public.User
        .where({
          id: user.id,
        })
        .update({
          balance: currentBalance,
        });

      return NextResponse.json(
        {
          success: false,
          error:
            "Promo code could not be completed.",
        },
        { status: 500 }
      );
    }

    await db.orm.public.Transaction.create({
      userId: user.id,
      investmentId: null,
      type: "PROMO_REWARD",
      amount: rewardAmount,
      description:
        `Promo code ${promo.code} reward.`,
      status: "COMPLETED",
    });

    await db.orm.public.Notification.create({
      userId: user.id,
      title: "Promo Reward Received",
      message:
        `You received ${rewardAmount.toFixed(
          2
        )} USDT from promo code ${promo.code}.`,
      isRead: false,
    });

    return NextResponse.json({
      success: true,
      message:
        `Promo code redeemed successfully. ${rewardAmount.toFixed(
          2
        )} USDT has been added to your wallet.`,
      promo: {
        id: promo.id,
        code: promo.code,
        rewardAmount,
        requiredReferrals,
        successfulReferrals,
        usedCount: newUsedCount,
        maxUses,
      },
      user: {
        id: updatedUser.id,
        balance: Number(
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
          error instanceof Error
            ? error.message
            : "Something went wrong.",
      },
      { status: 500 }
    );
  }
}
