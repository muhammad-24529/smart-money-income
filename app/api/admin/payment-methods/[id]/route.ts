import { NextResponse } from "next/server";
import { db, connectDB } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/admin/auth";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export const runtime = "nodejs";

/* =========================
   GET PAYMENT METHOD
========================= */
export async function GET(
  _request: Request,
  { params }: Params
) {
  try {
    const authenticated = await isAdminAuthenticated();

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

    const { id } = await params;

    const paymentMethod =
      await db.orm.public.PaymentMethod
        .where({ id })
        .first();

    if (!paymentMethod) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment method not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      paymentMethod,
    });
  } catch (error) {
    console.error(
      "PAYMENT METHOD GET ERROR:",
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

/* =========================
   UPDATE PAYMENT METHOD
========================= */
export async function PATCH(
  request: Request,
  { params }: Params
) {
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

    const { id } = await params;

    const body = await request.json();

    const existing =
      await db.orm.public.PaymentMethod
        .where({ id })
        .first();

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment method not found.",
        },
        { status: 404 }
      );
    }

    /* =========================
       PREPARE VALUES
    ========================= */

    let name = existing.name;
    let methodType = existing.methodType;
    let accountInfo = existing.accountInfo;
    let instructions = existing.instructions;
    let active = existing.active;

    /* NAME */
    if (
      typeof body.name === "string"
    ) {
      const newName =
        body.name.trim();

      if (!newName) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Payment method name cannot be empty.",
          },
          { status: 400 }
        );
      }

      name = newName;
    }

    /* METHOD TYPE */
    if (
      typeof body.methodType ===
      "string"
    ) {
      const newMethodType =
        body.methodType.trim();

      if (!newMethodType) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Payment method type cannot be empty.",
          },
          { status: 400 }
        );
      }

      methodType = newMethodType;
    }

    /* =========================
       ACCOUNT / WALLET INFO
       IMPORTANT:
       Only change it if explicitly
       provided by Admin.
    ========================= */

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        "accountInfo"
      )
    ) {
      if (
        typeof body.accountInfo !==
        "string"
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Account information must be text.",
          },
          { status: 400 }
        );
      }

      const newAccountInfo =
        body.accountInfo.trim();

      if (!newAccountInfo) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Account / Wallet Information cannot be empty.",
          },
          { status: 400 }
        );
      }

      accountInfo = newAccountInfo;
    }

    /* INSTRUCTIONS */
    if (
      Object.prototype.hasOwnProperty.call(
        body,
        "instructions"
      )
    ) {
      if (
        body.instructions === null ||
        body.instructions === undefined
      ) {
        instructions = null;
      } else if (
        typeof body.instructions ===
        "string"
      ) {
        const newInstructions =
          body.instructions.trim();

        instructions =
          newInstructions || null;
      }
    }

    /* ACTIVE */
    if (
      typeof body.active ===
      "boolean"
    ) {
      active = body.active;
    }

    /* =========================
       UPDATE DATABASE
    ========================= */

    const paymentMethod =
      await db.orm.public.PaymentMethod
        .where({ id })
        .update({
          name,
          methodType,
          accountInfo,
          instructions,
          active,
        });

    if (!paymentMethod) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Failed to update payment method.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Payment method updated successfully.",
      paymentMethod,
    });
  } catch (error) {
    console.error(
      "PAYMENT METHOD PATCH ERROR:",
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

/* =========================
   DELETE PAYMENT METHOD
========================= */
export async function DELETE(
  _request: Request,
  { params }: Params
) {
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

    const { id } = await params;

    const existing =
      await db.orm.public.PaymentMethod
        .where({ id })
        .first();

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Payment method not found.",
        },
        { status: 404 }
      );
    }

    await db.orm.public.PaymentMethod
      .where({ id })
      .delete();

    return NextResponse.json({
      success: true,
      message:
        "Payment method deleted successfully.",
    });
  } catch (error) {
    console.error(
      "PAYMENT METHOD DELETE ERROR:",
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