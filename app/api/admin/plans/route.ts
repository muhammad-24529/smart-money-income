import { NextResponse } from "next/server";
import { db, connectDB } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/admin/auth";

export const runtime = "nodejs";

// ==============================
// GET ALL PLANS
// ==============================

export async function GET() {
  try {
    const authenticated = await isAdminAuthenticated();

    if (!authenticated) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    await connectDB();

    const plans =
      await db.orm.public.InvestmentPlan.all();

    // Sort in JavaScript instead of using
    // ORM orderBy because this custom ORM
    // does not support the standard Prisma syntax.
    plans.sort(
      (a, b) =>
        Number(a.amount) - Number(b.amount)
    );

    return NextResponse.json({
      plans: plans.map((plan) => ({
        id: plan.id,
        name: plan.name,
        amount: Number(plan.amount),
        durationDays: Number(plan.durationDays),
        dailyIncome: Number(plan.dailyIncome),
        active: Boolean(plan.active),
      })),
    });
  } catch (error) {
    console.error(
      "ADMIN PLANS GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load plans.",
      },
      { status: 500 }
    );
  }
}

// ==============================
// CREATE PLAN
// ==============================

export async function POST(request: Request) {
  try {
    const authenticated =
      await isAdminAuthenticated();

    if (!authenticated) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await request.json();

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const amount = Number(body.amount);
    const durationDays = Number(
      body.durationDays
    );
    const dailyIncome = Number(
      body.dailyIncome
    );

    if (!name) {
      return NextResponse.json(
        {
          error:
            "Plan name is required.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(amount) ||
      amount <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Amount must be a positive whole number.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(durationDays) ||
      durationDays <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Duration must be a positive whole number.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(dailyIncome) ||
      dailyIncome < 0
    ) {
      return NextResponse.json(
        {
          error:
            "Daily income must be a valid number.",
        },
        { status: 400 }
      );
    }

    const existingPlan =
      await db.orm.public.InvestmentPlan
        .where({ name })
        .first();

    if (existingPlan) {
      return NextResponse.json(
        {
          error:
            "A plan with this name already exists.",
        },
        { status: 409 }
      );
    }

    const plan =
      await db.orm.public.InvestmentPlan.create({
        name,
        amount,
        durationDays,
        dailyIncome,
        active: true,
      });

    return NextResponse.json(
      {
        message:
          "Investment plan created successfully.",
        plan: {
          id: plan.id,
          name: plan.name,
          amount: Number(plan.amount),
          durationDays: Number(
            plan.durationDays
          ),
          dailyIncome: Number(
            plan.dailyIncome
          ),
          active: Boolean(plan.active),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "ADMIN PLANS POST ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create plan.",
      },
      { status: 500 }
    );
  }
}

// ==============================
// UPDATE PLAN
// ==============================

export async function PATCH(
  request: Request
) {
  try {
    const authenticated =
      await isAdminAuthenticated();

    if (!authenticated) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await request.json();

    const id =
      typeof body.id === "string"
        ? body.id.trim()
        : "";

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Plan ID is required.",
        },
        { status: 400 }
      );
    }

    const existingPlan =
      await db.orm.public.InvestmentPlan
        .where({ id })
        .first();

    if (!existingPlan) {
      return NextResponse.json(
        {
          error:
            "Investment plan not found.",
        },
        { status: 404 }
      );
    }

    const updateData: Record<
      string,
      unknown
    > = {};

    // NAME
    if (typeof body.name === "string") {
      const name = body.name.trim();

      if (!name) {
        return NextResponse.json(
          {
            error:
              "Plan name cannot be empty.",
          },
          { status: 400 }
        );
      }

      const duplicate =
        await db.orm.public.InvestmentPlan
          .where({ name })
          .first();

      if (
        duplicate &&
        duplicate.id !== id
      ) {
        return NextResponse.json(
          {
            error:
              "Another plan already has this name.",
          },
          { status: 409 }
        );
      }

      updateData.name = name;
    }

    // AMOUNT
    if (body.amount !== undefined) {
      const amount = Number(body.amount);

      if (
        !Number.isInteger(amount) ||
        amount <= 0
      ) {
        return NextResponse.json(
          {
            error:
              "Amount must be a positive whole number.",
          },
          { status: 400 }
        );
      }

      updateData.amount = amount;
    }

    // DURATION
    if (
      body.durationDays !==
      undefined
    ) {
      const durationDays = Number(
        body.durationDays
      );

      if (
        !Number.isInteger(
          durationDays
        ) ||
        durationDays <= 0
      ) {
        return NextResponse.json(
          {
            error:
              "Duration must be a positive whole number.",
          },
          { status: 400 }
        );
      }

      updateData.durationDays =
        durationDays;
    }

    // DAILY INCOME
    if (
      body.dailyIncome !==
      undefined
    ) {
      const dailyIncome = Number(
        body.dailyIncome
      );

      if (
        !Number.isInteger(
          dailyIncome
        ) ||
        dailyIncome < 0
      ) {
        return NextResponse.json(
          {
            error:
              "Daily income must be a valid number.",
          },
          { status: 400 }
        );
      }

      updateData.dailyIncome =
        dailyIncome;
    }

    // ACTIVE / INACTIVE
    if (body.active !== undefined) {
      updateData.active =
        Boolean(body.active);
    }

    const updatedPlan =
      await db.orm.public.InvestmentPlan
        .where({ id })
        .update(updateData);

    if (!updatedPlan) {
      return NextResponse.json(
        { error: "Investment plan not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message:
        "Investment plan updated successfully.",
      plan: {
        id: updatedPlan.id,
        name: updatedPlan.name,
        amount: Number(
          updatedPlan.amount
        ),
        durationDays: Number(
          updatedPlan.durationDays
        ),
        dailyIncome: Number(
          updatedPlan.dailyIncome
        ),
        active: Boolean(
          updatedPlan.active
        ),
      },
    });
  } catch (error) {
    console.error(
      "ADMIN PLANS PATCH ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update plan.",
      },
      { status: 500 }
    );
  }
}

// ==============================
// DELETE PLAN
// ==============================

export async function DELETE(
  request: Request
) {
  try {
    const authenticated =
      await isAdminAuthenticated();

    if (!authenticated) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await request.json();

    const id =
      typeof body.id === "string"
        ? body.id.trim()
        : "";

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Plan ID is required.",
        },
        { status: 400 }
      );
    }

    const plan =
      await db.orm.public.InvestmentPlan
        .where({ id })
        .first();

    if (!plan) {
      return NextResponse.json(
        {
          error:
            "Investment plan not found.",
        },
        { status: 404 }
      );
    }

    const investments =
      await db.orm.public.Investment
        .where({
          planId: id,
        })
        .all();

    if (investments.length > 0) {
      return NextResponse.json(
        {
          error:
            "This plan cannot be deleted because users have investments in it. Deactivate it instead.",
        },
        { status: 409 }
      );
    }

    await db.orm.public.InvestmentPlan
      .where({ id })
      .delete();

    return NextResponse.json({
      message:
        "Investment plan deleted successfully.",
      id,
    });
  } catch (error) {
    console.error(
      "ADMIN PLANS DELETE ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete plan.",
      },
      { status: 500 }
    );
  }
}




