import { NextResponse } from "next/server";
import { db, connectDB } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/admin/auth";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const authenticated = await isAdminAuthenticated();

    if (!authenticated) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Promo code ID is required.",
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    await connectDB();

    const existing = await db.orm.public.PromoCode
      .where({
        id,
      })
      .first();

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: "Promo code not found.",
        },
        { status: 404 }
      );
    }

    // Toggle active/inactive
    if (
      Object.prototype.hasOwnProperty.call(body, "active") &&
      Object.keys(body).length === 1
    ) {
      const updated = await db.orm.public.PromoCode
        .where({
          id,
        })
        .update({
          active: Boolean(body.active),
        });

      return NextResponse.json({
        success: true,
        message: body.active
          ? "Promo code activated successfully."
          : "Promo code deactivated successfully.",
        promoCode: updated,
      });
    }

    // Full edit
    const code =
      typeof body.code === "string"
        ? body.code.trim().toUpperCase()
        : existing.code;

    const bonusAmount =
      body.bonusAmount !== undefined
        ? Number(body.bonusAmount)
        : existing.bonusAmount;

    const requiredReferrals =
      body.requiredReferrals !== undefined
        ? Number(body.requiredReferrals)
        : existing.requiredReferrals;

    const maxUses =
      body.maxUses === null ||
      body.maxUses === "" ||
      body.maxUses === undefined
        ? existing.maxUses
        : Number(body.maxUses);

    const active =
      body.active !== undefined
        ? Boolean(body.active)
        : existing.active;

    if (code.length < 3) {
      return NextResponse.json(
        {
          success: false,
          error: "Promo code must be at least 3 characters.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(bonusAmount) ||
      bonusAmount <= 0 ||
      bonusAmount > 100
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Bonus amount must be an integer between 1 and 100.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(requiredReferrals) ||
      requiredReferrals < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Required referrals must be a non-negative integer.",
        },
        { status: 400 }
      );
    }

    if (
      maxUses !== null &&
      (!Number.isInteger(maxUses) || maxUses <= 0)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Max uses must be a positive integer or empty.",
        },
        { status: 400 }
      );
    }

    // Check duplicate code
    const duplicate = await db.orm.public.PromoCode
      .where({
        code,
      })
      .first();

    if (duplicate && duplicate.id !== id) {
      return NextResponse.json(
        {
          success: false,
          error: "Another promo code with this code already exists.",
        },
        { status: 409 }
      );
    }

    // Do not reduce maxUses below already used count
    if (
      maxUses !== null &&
      existing.usedCount > maxUses
    ) {
      return NextResponse.json(
        {
          success: false,
          error: `Max uses cannot be lower than current used count (${existing.usedCount}).`,
        },
        { status: 400 }
      );
    }

    const updated = await db.orm.public.PromoCode
      .where({
        id,
      })
      .update({
        code,
        bonusAmount,
        bonusPercent: existing.bonusPercent,
        requiredReferrals,
        maxUses,
        usedCount: existing.usedCount,
        active,
      });

    return NextResponse.json({
      success: true,
      message: "Promo code updated successfully.",
      promoCode: updated,
    });
  } catch (error) {
    console.error("ADMIN PROMO CODE PATCH ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to update promo code.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext
) {
  try {
    const authenticated = await isAdminAuthenticated();

    if (!authenticated) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Promo code ID is required.",
        },
        { status: 400 }
      );
    }

    await connectDB();

    const existing = await db.orm.public.PromoCode
      .where({
        id,
      })
      .first();

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: "Promo code not found.",
        },
        { status: 404 }
      );
    }

    // Prevent deletion if this promo code has already been used.
    if (existing.usedCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This promo code cannot be deleted because it has already been used.",
        },
        { status: 400 }
      );
    }

    const deleted = await db.orm.public.PromoCode
      .where({
        id,
      })
      .delete();

    return NextResponse.json({
      success: true,
      message: "Promo code deleted successfully.",
      promoCode: deleted,
    });
  } catch (error) {
    console.error("ADMIN PROMO CODE DELETE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to delete promo code.",
      },
      { status: 500 }
    );
  }
}