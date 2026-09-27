import { validateRequestOrigin } from "@/lib/security/csrf";
import { NextResponse } from "next/server";
import { db, connectDB } from "@/lib/prisma";
import { getUserSession } from "@/lib/auth/user";
import path from "path";
import { mkdir, writeFile } from "fs/promises";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const FIXED_USDT_RATE = 285;

const ALLOWED_PAYMENT_METHODS = new Set([
  "JazzCash",
  "Easypaisa",
  "Binance",
  "USDT (TRC20)",
]);

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function getFileExtension(type: string) {
  switch (type) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    default:
      return "";
  }
}

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

    const formData =
      await request.formData();

    // =========================
    // CLIENT USER ID
    // =========================

    const requestedUserId =
      typeof formData.get("userId") === "string"
        ? String(
            formData.get("userId")
          ).trim()
        : "";

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

    const userId = sessionUserId;

    // =========================
    // FORM DATA
    // =========================

    const paymentMethod =
      typeof formData.get("paymentMethod") === "string"
        ? String(
            formData.get("paymentMethod")
          ).trim()
        : "";

    const amount =
      Number(
        formData.get("amount")
      );

    const referenceId =
      typeof formData.get("referenceId") === "string"
        ? String(
            formData.get("referenceId")
          ).trim()
        : "";

    const screenshot =
      formData.get("screenshot");

    // =========================
    // BASIC VALIDATION
    // =========================

    if (
      !paymentMethod ||
      !referenceId
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Payment method and reference ID are required.",
        },
        { status: 400 }
      );
    }

    if (referenceId.length > 150) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Reference ID is too long.",
        },
        { status: 400 }
      );
    }

    if (
      !ALLOWED_PAYMENT_METHODS.has(
        paymentMethod
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid payment method.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Please enter a valid USDT deposit amount.",
        },
        { status: 400 }
      );
    }

    if (!Number.isInteger(amount)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "USDT amount must be a whole number.",
        },
        { status: 400 }
      );
    }

    // =========================
    // SCREENSHOT VALIDATION
    // =========================

    if (!(screenshot instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Payment screenshot is required.",
        },
        { status: 400 }
      );
    }

    if (
      !ALLOWED_TYPES.has(
        screenshot.type
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid screenshot format. Please upload JPG, PNG or WebP.",
        },
        { status: 400 }
      );
    }

    if (screenshot.size <= 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Screenshot file is empty.",
        },
        { status: 400 }
      );
    }

    if (
      screenshot.size > MAX_FILE_SIZE
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Screenshot must be 5 MB or smaller.",
        },
        { status: 400 }
      );
    }

    // =========================
    // FIND AUTHENTICATED USER
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
    // BINANCE / USDT NORMALIZATION
    // =========================

    const isBinance =
      paymentMethod === "Binance" ||
      paymentMethod === "USDT (TRC20)";

    const normalizedPaymentMethod =
      isBinance
        ? "USDT (TRC20)"
        : paymentMethod;

    // =========================
    // CHECK PAYMENT METHOD
    // =========================

    const paymentMethodRecord =
      await db.orm.public.PaymentMethod
        .where({
          methodType:
            normalizedPaymentMethod,
          active: true,
        })
        .first();

    if (!paymentMethodRecord) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Selected payment method is currently unavailable.",
        },
        { status: 400 }
      );
    }

    // =========================
    // CALCULATE PKR
    // =========================

    const usdtRate =
      isBinance
        ? 0
        : FIXED_USDT_RATE;

    const pkrAmount =
      isBinance
        ? 0
        : amount * FIXED_USDT_RATE;

    // =========================
    // SAVE SCREENSHOT PRIVATELY
    // =========================

    const extension =
      getFileExtension(
        screenshot.type
      );

    if (!extension) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Unsupported screenshot format.",
        },
        { status: 400 }
      );
    }

    const uploadDirectory =
      path.join(
        process.cwd(),
        "private",
        "uploads",
        "deposits"
      );

    await mkdir(
      uploadDirectory,
      {
        recursive: true,
      }
    );

    const safeUserId =
      userId.replace(
        /[^a-zA-Z0-9_-]/g,
        ""
      );

    const uniqueName =
      `deposit-${safeUserId}-${Date.now()}-${crypto.randomUUID()}${extension}`;

    const filePath =
      path.join(
        uploadDirectory,
        uniqueName
      );

    const fileBuffer =
      Buffer.from(
        await screenshot.arrayBuffer()
      );

    await writeFile(
      filePath,
      fileBuffer
    );

    // Keep only the filename/path identifier in DB.
    // The actual file is stored outside public/.
    const screenshotUrl =
      `/private/uploads/deposits/${uniqueName}`;

    // =========================
    // CREATE PENDING DEPOSIT
    // =========================

    const deposit =
      await db.orm.public.Deposit.create({
        userId,

        paymentMethod:
          normalizedPaymentMethod,

        amount,

        pkrAmount,

        usdtRate,

        referenceId,

        screenshotUrl,

        status: "PENDING",
      });

    // =========================
    // RESPONSE
    // =========================

    return NextResponse.json(
      {
        success: true,

        message:
          "Deposit submitted successfully.",

        deposit: {
          id: deposit.id,

          userId:
            deposit.userId,

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

          paymentMethod:
            deposit.paymentMethod,

          referenceId:
            deposit.referenceId,

          screenshotUrl:
            deposit.screenshotUrl,

          status:
            deposit.status,

          createdAt:
            deposit.createdAt,
        },

        payment: {
          usdtAmount:
            amount,

          pkrAmount,

          rate:
            isBinance
              ? null
              : FIXED_USDT_RATE,

          paymentMethod:
            normalizedPaymentMethod,

          accountInfo:
            paymentMethodRecord.accountInfo ||
            "",

          instruction:
            isBinance
              ? `Send ${amount} USDT (TRC20) to the provided Binance wallet.`
              : `Send ${pkrAmount.toLocaleString()} PKR to the selected ${paymentMethod} account.`,
        },
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "DEPOSIT POST ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Something went wrong while submitting deposit.",
      },
      {
        status: 500,
      }
    );
  }
}