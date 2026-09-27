import { NextResponse } from "next/server";

import { db, connectDB } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    await connectDB();

    const paymentMethods =
      await db.orm.public.PaymentMethod
        .where({
          active: true,
        })
        .all();

    const formattedPaymentMethods =
      paymentMethods.map((method: any) => ({
        id: method.id,
        name: method.name,
        methodType: method.methodType,
        accountInfo: method.accountInfo || "",
        instructions: method.instructions || "",
        active: method.active === true,
      }));

    return NextResponse.json({
      success: true,
      paymentMethods: formattedPaymentMethods,
    });
  } catch (error) {
    console.error(
      "PAYMENT METHODS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Unable to load payment methods.",
        paymentMethods: [],
      },
      {
        status: 500,
      }
    );
  }
}