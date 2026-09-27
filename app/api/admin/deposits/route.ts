import { NextResponse } from "next/server";
import { db, connectDB } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/admin/auth";

export const runtime = "nodejs";

const FIXED_USDT_RATE = 285;
const REFERRAL_PERCENTAGE = 10;

export async function GET() {
  try {
    const authenticated =
      await isAdminAuthenticated();

    if (!authenticated) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    await connectDB();

    const deposits =
      await db.orm.public.Deposit.all();

    return NextResponse.json({
      success: true,

      deposits: deposits.map((deposit) => ({
        id: deposit.id,
        userId: deposit.userId,
        paymentMethod: deposit.paymentMethod,

        amount: Number(
          deposit.amount || 0
        ),

        pkrAmount: Number(
          deposit.pkrAmount || 0
        ),

        usdtRate: Number(
          deposit.usdtRate ||
            FIXED_USDT_RATE
        ),

        referenceId:
          deposit.referenceId,

        screenshotUrl:
          deposit.screenshotUrl,

        status: deposit.status,

        createdAt:
          deposit.createdAt,
      })),
    });
  } catch (error) {
    console.error(
      "ADMIN DEPOSITS GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load deposits.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request
) {
  try {
    // ==================================================
    // ADMIN AUTH
    // ==================================================

    const authenticated =
      await isAdminAuthenticated();

    if (!authenticated) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    await connectDB();

    // ==================================================
    // READ REQUEST
    // ==================================================

    const body =
      await request.json();

    const depositId =
      typeof body?.depositId === "string"
        ? body.depositId.trim()
        : "";

    const action =
      typeof body?.action === "string"
        ? body.action
            .trim()
            .toUpperCase()
        : "";

    if (!depositId || !action) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Deposit ID and action are required.",
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
          success: false,
          error: "Invalid action.",
        },
        { status: 400 }
      );
    }

    // ==================================================
    // FIND DEPOSIT
    // ==================================================

    const deposit =
      await db.orm.public.Deposit
        .where({
          id: depositId,
        })
        .first();

    if (!deposit) {
      return NextResponse.json(
        {
          success: false,
          error: "Deposit not found.",
        },
        { status: 404 }
      );
    }

    // ==================================================
    // ONLY PENDING DEPOSITS
    // ==================================================

    if (
      String(
        deposit.status
      ).toUpperCase() !== "PENDING"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            `Deposit is already ${deposit.status}.`,
        },
        { status: 409 }
      );
    }

    // ==================================================
    // VALIDATE AMOUNT
    // ==================================================

    const depositAmount =
      Number(deposit.amount || 0);

    if (
      !Number.isFinite(
        depositAmount
      ) ||
      depositAmount <= 0 ||
      !Number.isInteger(
        depositAmount
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid deposit amount.",
        },
        { status: 400 }
      );
    }

    // ==================================================
    // REJECT
    // ==================================================

    if (action === "REJECT") {
      const updatedDeposit =
        await db.orm.public.Deposit
          .where({
            id: depositId,
            status: "PENDING",
          })
          .update({
            status: "REJECTED",
          });

      if (!updatedDeposit) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Deposit could not be rejected.",
          },
          { status: 409 }
        );
      }

      await db.orm.public.Notification.create({
        userId: deposit.userId,

        title: "Deposit Rejected",

        message:
          `Your deposit of ${depositAmount.toFixed(
            2
          )} USDT has been rejected.`,

        isRead: false,
      });

      return NextResponse.json({
        success: true,

        message:
          "Deposit rejected successfully.",

        deposit: {
          id:
            updatedDeposit.id,

          amount:
            Number(
              updatedDeposit.amount || 0
            ),

          status:
            updatedDeposit.status,
        },
      });
    }

    // ==================================================
    // FIND USER
    // ==================================================

    const user =
      await db.orm.public.User
        .where({
          id: deposit.userId,
        })
        .first();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Deposit user not found.",
        },
        { status: 404 }
      );
    }

    if (user.isActive === false) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Deposit user's account is inactive.",
        },
        { status: 403 }
      );
    }

    // ==================================================
    // USER BALANCE
    // ==================================================

    const currentBalance =
      Number(user.balance || 0);

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
            "Invalid user balance.",
        },
        { status: 500 }
      );
    }

    const newBalance =
      currentBalance +
      depositAmount;

    // ==================================================
    // APPROVE DEPOSIT
    // ==================================================

    const updatedDeposit =
      await db.orm.public.Deposit
        .where({
          id: depositId,
          status: "PENDING",
        })
        .update({
          status: "APPROVED",
        });

    if (!updatedDeposit) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Deposit could not be approved. It may already have been processed.",
        },
        { status: 409 }
      );
    }

    // ==================================================
    // UPDATE USER BALANCE
    //
    // Conditional balance check helps prevent
    // overwriting a newer balance.
    // ==================================================

    const updatedUser =
      await db.orm.public.User
        .where({
          id: user.id,
          balance: currentBalance,
        })
        .update({
          balance: newBalance,
        });

    if (!updatedUser) {
      await db.orm.public.Deposit
        .where({
          id: depositId,
          status: "APPROVED",
        })
        .update({
          status: "PENDING",
        });

      return NextResponse.json(
        {
          success: false,
          error:
            "User balance changed before approval completed. Please try again.",
        },
        { status: 409 }
      );
    }

    // ==================================================
    // DEPOSIT TRANSACTION
    // ==================================================

    await db.orm.public.Transaction.create({
      userId: user.id,

      investmentId: null,

      type: "DEPOSIT",

      amount: depositAmount,

      description:
        `Deposit approved via ${deposit.paymentMethod}.`,

      status: "COMPLETED",
    });

    // ==================================================
    // USER NOTIFICATION
    // ==================================================

    await db.orm.public.Notification.create({
      userId: user.id,

      title: "Deposit Approved",

      message:
        `Your deposit of ${depositAmount.toFixed(
          2
        )} USDT has been approved successfully and added to your wallet.`,

      isRead: false,
    });

    // ==================================================
    // REFERRAL SYSTEM
    // ==================================================

    let referralCommission =
      null;

    let referrer = null;

    let successfulReferral =
      false;

    if (user.referredById) {
      referrer =
        await db.orm.public.User
          .where({
            id: user.referredById,
          })
          .first();

      if (referrer) {
        // ==================================================
        // FIND EXISTING REFERRAL
        // ==================================================

        const existingReferral =
          await db.orm.public.ReferralCommission
            .where({
              referrerId:
                referrer.id,

              referredUserId:
                user.id,
            })
            .first();

        // ==================================================
        // FIRST SUCCESSFUL REFERRAL
        // ==================================================

        if (
          existingReferral &&
          String(
            existingReferral.status
          ).toUpperCase() ===
            "PENDING"
        ) {
          await db.orm.public.ReferralCommission
            .where({
              id:
                existingReferral.id,
            })
            .update({
              status: "COMPLETED",
            });

          successfulReferral =
            true;
        }

        // ==================================================
        // FALLBACK FOR OLD USERS
        // ==================================================

        if (!existingReferral) {
          await db.orm.public.ReferralCommission.create({
            referrerId:
              referrer.id,

            referredUserId:
              user.id,

            amount: 0,

            percentage: 0,

            status: "COMPLETED",
          });

          successfulReferral =
            true;
        }

        // ==================================================
        // 10% COMMISSION
        // ==================================================

        const commissionAmount =
          Math.floor(
            depositAmount *
              (REFERRAL_PERCENTAGE /
                100)
          );

        if (
          commissionAmount > 0
        ) {
          const commission =
            await db.orm.public.ReferralCommission.create({
              referrerId:
                referrer.id,

              referredUserId:
                user.id,

              amount:
                commissionAmount,

              percentage:
                REFERRAL_PERCENTAGE,

              status:
                "COMPLETED",
            });

          referralCommission =
            commission;

          // ------------------------------------------------
          // REFERRER BALANCE
          // ------------------------------------------------

          const referrerBalance =
            Number(
              referrer.balance ||
                0
            );

          if (
            !Number.isInteger(
              referrerBalance
            ) ||
            referrerBalance < 0
          ) {
            console.error(
              "INVALID REFERRER BALANCE:",
              referrer.id
            );
          } else {
            const newReferrerBalance =
              referrerBalance +
              commissionAmount;

            const updatedReferrer =
              await db.orm.public.User
                .where({
                  id: referrer.id,
                  balance:
                    referrerBalance,
                })
                .update({
                  balance:
                    newReferrerBalance,
                });

            if (
              updatedReferrer
            ) {
              // --------------------------------------------
              // COMMISSION TRANSACTION
              // --------------------------------------------

              await db.orm.public.Transaction.create({
                userId:
                  referrer.id,

                investmentId:
                  null,

                type:
                  "REFERRAL_COMMISSION",

                amount:
                  commissionAmount,

                description:
                  `10% referral commission from ${user.name}'s deposit.`,

                status:
                  "COMPLETED",
              });

              // --------------------------------------------
              // COMMISSION NOTIFICATION
              // --------------------------------------------

              await db.orm.public.Notification.create({
                userId:
                  referrer.id,

                title:
                  "Referral Commission Received",

                message:
                  `You received ${commissionAmount.toFixed(
                    2
                  )} USDT referral commission from ${user.name}'s deposit.`,

                isRead: false,
              });
            } else {
              console.error(
                "REFERRER BALANCE UPDATE FAILED:",
                referrer.id
              );
            }
          }
        }

        // ==================================================
        // SUCCESSFUL REFERRAL NOTIFICATION
        // ==================================================

        if (
          successfulReferral
        ) {
          await db.orm.public.Notification.create({
            userId:
              referrer.id,

            title:
              "Successful Referral",

            message:
              `${user.name} has completed their first approved deposit. You now have 1 additional successful referral.`,

            isRead: false,
          });
        }
      }
    }

    // ==================================================
    // RESPONSE
    // ==================================================

    return NextResponse.json({
      success: true,

      message:
        `Deposit approved successfully. ${depositAmount.toFixed(
          2
        )} USDT added to the user's balance.`,

      deposit: {
        id:
          updatedDeposit.id,

        userId:
          updatedDeposit.userId,

        paymentMethod:
          updatedDeposit.paymentMethod,

        amount:
          Number(
            updatedDeposit.amount || 0
          ),

        pkrAmount:
          Number(
            updatedDeposit.pkrAmount || 0
          ),

        usdtRate:
          Number(
            updatedDeposit.usdtRate || 0
          ),

        referenceId:
          updatedDeposit.referenceId,

        screenshotUrl:
          updatedDeposit.screenshotUrl,

        status:
          updatedDeposit.status,

        createdAt:
          updatedDeposit.createdAt,
      },

      user: {
        id:
          updatedUser.id,

        balance:
          Number(
            updatedUser.balance || 0
          ),
      },

      referral:
        referralCommission
          ? {
              commissionId:
                referralCommission.id,

              referrerId:
                referrer?.id,

              referredUserId:
                user.id,

              referredUserName:
                user.name,

              depositAmount,

              amount:
                Number(
                  referralCommission.amount ||
                    0
                ),

              percentage:
                Number(
                  referralCommission.percentage ||
                    0
                ),

              status:
                referralCommission.status,

              successfulReferral,
            }
          : referrer
            ? {
                commissionId:
                  null,

                referrerId:
                  referrer.id,

                referredUserId:
                  user.id,

                referredUserName:
                  user.name,

                depositAmount,

                amount: 0,

                percentage: 0,

                status:
                  "COMPLETED",

                successfulReferral,
              }
            : null,
    });
  } catch (error) {
    console.error(
      "ADMIN DEPOSITS PATCH ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Failed to process deposit.",
      },
      { status: 500 }
    );
  }
}