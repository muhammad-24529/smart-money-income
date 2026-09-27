import { NextResponse } from "next/server";
import { db, connectDB } from "@/lib/prisma";

export async function GET() {
  try {
    await connectDB();

    const plans = await db.orm.public.InvestmentPlan
      .where({ active: true })
      .all();

    return NextResponse.json({
      plans,
    });
  } catch (error) {
    console.error("INVESTMENT PLANS ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load investment plans.",
      },
      { status: 500 }
    );
  }
}