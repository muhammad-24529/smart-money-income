import { NextResponse } from "next/server";
import { db, connectDB } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/admin/auth";

export const runtime = "nodejs";

// =====================================
// GET PAYMENT METHODS
// =====================================

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

    const paymentMethods =
      await db.orm.public.PaymentMethod.all();

    return NextResponse.json({
      success: true,

      paymentMethods: paymentMethods.map(
        (method: any) => ({
          id: method.id,
          name: method.name,
          methodType:
            method.methodType,

          accountInfo:
            method.accountInfo || "",

          active:
            method.active === true,
        })
      ),
    });
  } catch (error) {
    console.error(
      "ADMIN PAYMENT METHODS GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load payment methods.",
      },
      { status: 500 }
    );
  }
}

// =====================================
// CREATE PAYMENT METHOD
// =====================================

export async function POST(
  request: Request
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

    const body =
      await request.json();

    // =====================================
    // INPUTS
    // =====================================

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const methodType =
      typeof body.methodType === "string"
        ? body.methodType.trim()
        : "";

    const accountInfo =
      typeof body.accountInfo === "string"
        ? body.accountInfo.trim()
        : "";

    const active =
      body.active === undefined
        ? true
        : Boolean(body.active);

    // =====================================
    // VALIDATION
    // =====================================

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Payment method name is required.",
        },
        { status: 400 }
      );
    }

    if (!methodType) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Payment method type is required.",
        },
        { status: 400 }
      );
    }

    if (!accountInfo) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Account information is required.",
        },
        { status: 400 }
      );
    }

    // =====================================
    // CHECK DUPLICATE
    // =====================================

    const existingMethods =
      await db.orm.public.PaymentMethod.all();

    const duplicate =
      existingMethods.find(
        (method: any) =>
          String(method.name || "")
            .trim()
            .toLowerCase() ===
          name.toLowerCase()
      );

    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This payment method already exists.",
        },
        { status: 409 }
      );
    }

    // =====================================
    // CREATE
    // =====================================

    const paymentMethod =
      await db.orm.public.PaymentMethod.create({
        name,
        methodType,
        accountInfo,
        active,
      });

    if (!paymentMethod) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Failed to create payment method.",
        },
        { status: 500 }
      );
    }

    // =====================================
    // SUCCESS
    // =====================================

    return NextResponse.json(
      {
        success: true,

        message:
          "Payment method created successfully.",

        paymentMethod: {
          id:
            paymentMethod.id,

          name:
            paymentMethod.name,

          methodType:
            paymentMethod.methodType,

          accountInfo:
            paymentMethod.accountInfo,

          active:
            paymentMethod.active === true,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "ADMIN PAYMENT METHODS POST ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Failed to create payment method.",
      },
      { status: 500 }
    );
  }
}
