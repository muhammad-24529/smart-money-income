import { NextResponse } from "next/server";
import { db, connectDB } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/admin/auth";

export const runtime = "nodejs";

// GET - Load promo codes
export async function GET() {
  try {
    await connectDB();

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

    const promoCodes =
      await db.orm.public.PromoCode.all();

    return NextResponse.json({
      success: true,
      promoCodes,
    });
  } catch (error) {
    console.error("ADMIN PROMO GET ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load promo codes.",
      },
      { status: 500 }
    );
  }
}

// POST - Create promo code
export async function POST(request: Request) {
  try {
    await connectDB();

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

    const body = await request.json();

    const code =
      typeof body?.code === "string"
        ? body.code.trim().toUpperCase()
        : "";

    const bonusAmount = Number(
      body?.bonusAmount || 0
    );

    const requiredReferrals = Number(
      body?.requiredReferrals || 0
    );

    const maxUses =
      body?.maxUses === null ||
      body?.maxUses === undefined ||
      body?.maxUses === ""
        ? null
        : Number(body.maxUses);

    const active =
      body?.active === undefined
        ? true
        : Boolean(body.active);

    if (!code) {
      return NextResponse.json(
        {
          success: false,
          error: "Promo code is required.",
        },
        { status: 400 }
      );
    }

    if (code.length < 3) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Promo code must contain at least 3 characters.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(bonusAmount) ||
      bonusAmount <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Reward amount must be greater than 0.",
        },
        { status: 400 }
      );
    }

    if (bonusAmount < 1 || bonusAmount > 100) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Reward amount must be between $1 and $100.",
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
          error:
            "Required referrals must be a valid number.",
        },
        { status: 400 }
      );
    }

    if (
      maxUses !== null &&
      (!Number.isInteger(maxUses) ||
        maxUses <= 0)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Maximum uses must be a positive number.",
        },
        { status: 400 }
      );
    }

    const existing =
      await db.orm.public.PromoCode
        .where({
          code,
        })
        .first();

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error:
            "A promo code with this code already exists.",
        },
        { status: 409 }
      );
    }

    const promo =
      await db.orm.public.PromoCode.create({
        code,
        bonusAmount,
        bonusPercent: 0,
        requiredReferrals,
        maxUses,
        usedCount: 0,
        active,
      });

    return NextResponse.json(
      {
        success: true,
        message:
          "Promo code created successfully.",
        promoCode: promo,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "ADMIN PROMO CREATE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create promo code.",
      },
      { status: 500 }
    );
  }
}

// PATCH - Update promo code
export async function PATCH(request: Request) {
  try {
    await connectDB();

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

    const body = await request.json();

    const promoCodeId =
      typeof body?.promoCodeId === "string"
        ? body.promoCodeId.trim()
        : "";

    if (!promoCodeId) {
      return NextResponse.json(
        {
          success: false,
          error: "Promo code ID is required.",
        },
        { status: 400 }
      );
    }

    const existing =
      await db.orm.public.PromoCode
        .where({
          id: promoCodeId,
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

    const code =
      typeof body?.code === "string"
        ? body.code.trim().toUpperCase()
        : existing.code;

    const bonusAmount =
      body?.bonusAmount !== undefined
        ? Number(body.bonusAmount)
        : existing.bonusAmount;

    const requiredReferrals =
      body?.requiredReferrals !== undefined
        ? Number(body.requiredReferrals)
        : existing.requiredReferrals;

    const maxUses =
      body?.maxUses === null ||
      body?.maxUses === ""
        ? null
        : body?.maxUses !== undefined
          ? Number(body.maxUses)
          : existing.maxUses;

    const active =
      body?.active !== undefined
        ? Boolean(body.active)
        : existing.active;

    if (!code || code.length < 3) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Promo code must contain at least 3 characters.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(bonusAmount) ||
      bonusAmount < 1 ||
      bonusAmount > 100
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Reward amount must be between $1 and $100.",
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
          error:
            "Required referrals must be a valid number.",
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
          error:
            "Maximum uses must be a positive number.",
        },
        { status: 400 }
      );
    }

    const duplicate =
      await db.orm.public.PromoCode
        .where({
          code,
        })
        .first();

    if (
      duplicate &&
      duplicate.id !== promoCodeId
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Another promo code with this code already exists.",
        },
        { status: 409 }
      );
    }

    const updated =
      await db.orm.public.PromoCode
        .where({ id: promoCodeId })
        .update({
          code,
          bonusAmount,
          requiredReferrals,
          maxUses,
          active,
        });

    return NextResponse.json({
      success: true,
      message: "Promo code updated successfully.",
      promoCode: updated,
    });
  } catch (error) {
    console.error(
      "ADMIN PROMO UPDATE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update promo code.",
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete promo code
export async function DELETE(request: Request) {
  try {
    await connectDB();

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

    const body = await request.json();

    const promoCodeId =
      typeof body?.promoCodeId === "string"
        ? body.promoCodeId.trim()
        : "";

    if (!promoCodeId) {
      return NextResponse.json(
        {
          success: false,
          error: "Promo code ID is required.",
        },
        { status: 400 }
      );
    }

    const existing =
      await db.orm.public.PromoCode
        .where({
          id: promoCodeId,
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

    await db.orm.public.PromoCode
      .where({ id: promoCodeId })
      .delete();

    return NextResponse.json({
      success: true,
      message: "Promo code deleted successfully.",
    });
  } catch (error) {
    console.error(
      "ADMIN PROMO DELETE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete promo code.",
      },
      { status: 500 }
    );
  }
}


