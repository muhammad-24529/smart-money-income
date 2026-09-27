
import { NextResponse } from "next/server";

import { db, connectDB } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/admin/auth";

export const runtime = "nodejs";

// ==============================
// ADMIN AUTH HELPER
// ==============================

async function requireAdmin() {
  const authenticated =
    await isAdminAuthenticated();

  if (!authenticated) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized.",
      },
      {
        status: 401,
      }
    );
  }

  return null;
}

// ==============================
// GET ALL PLANS
// ==============================

export async function GET() {
  try {
    const unauthorized =
      await requireAdmin();

    if (unauthorized) {
      return unauthorized;
    }

    await connectDB();

    const plans =
      await db.orm.public.InvestmentPlan.all();

    plans.sort(
      (a, b) =>
        Number(a.amount) -
        Number(b.amount)
    );

    return NextResponse.json({
      success: true,

      plans: plans.map((plan) => ({
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
      })),
    });
  } catch (error) {
    console.error(
      "ADMIN PLANS GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load plans.",
        plans: [],
      },
      {
        status: 500,
      }
    );
  }
}

// ==============================
// CREATE PLAN
// ==============================

export async function POST(
  request: Request
) {
  try {
    const unauthorized =
      await requireAdmin();

    if (unauthorized) {
      return unauthorized;
    }

    await connectDB();

    const body = await request.json();

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const amount = Number(body.amount);

    const durationDays =
      Number(body.durationDays);

    const dailyIncome =
      Number(body.dailyIncome);

    // =========================
    // NAME VALIDATION
    // =========================

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Plan name is required.",
        },
        {
          status: 400,
        }
      );
    }

    // =========================
    // AMOUNT VALIDATION
    // =========================

    if (
      !Number.isInteger(amount) ||
      amount <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Amount must be a positive whole number.",
        },
        {
          status: 400,
        }
      );
    }

    // =========================
    // DURATION VALIDATION
    // =========================

    if (
      !Number.isInteger(durationDays) ||
      durationDays <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Duration must be a positive whole number.",
        },
        {
          status: 400,
        }
      );
    }

    // =========================
    // DAILY INCOME VALIDATION
    // =========================

    if (
      !Number.isInteger(dailyIncome) ||
      dailyIncome < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Daily income must be a valid whole number.",
        },
        {
          status: 400,
        }
      );
    }

    // =========================
    // DUPLICATE CHECK
    // =========================

    const existingPlan =
      await db.orm.public.InvestmentPlan
        .where({
          name,
        })
        .first();

    if (existingPlan) {
      return NextResponse.json(
        {
          success: false,
          error:
            "A plan with this name already exists.",
        },
        {
          status: 409,
        }
      );
    }

    // =========================
    // CREATE
    // =========================

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
        success: true,

        message:
          "Investment plan created successfully.",

        plan: {
          id: plan.id,
          name: plan.name,
          amount: Number(
            plan.amount
          ),
          durationDays: Number(
            plan.durationDays
          ),
          dailyIncome: Number(
            plan.dailyIncome
          ),
          active: Boolean(
            plan.active
          ),
        },
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "ADMIN PLANS POST ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Failed to create plan.",
      },
      {
        status: 500,
      }
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
    const unauthorized =
      await requireAdmin();

    if (unauthorized) {
      return unauthorized;
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
          success: false,
          error:
            "Plan ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const existingPlan =
      await db.orm.public.InvestmentPlan
        .where({
          id,
        })
        .first();

    if (!existingPlan) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Investment plan not found.",
        },
        {
          status: 404,
        }
      );
    }

    const updateData: Record<
      string,
      unknown
    > = {};

    // =========================
    // NAME
    // =========================

    if (
      body.name !== undefined
    ) {
      if (
        typeof body.name !==
        "string"
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Plan name must be text.",
          },
          {
            status: 400,
          }
        );
      }

      const name =
        body.name.trim();

      if (!name) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Plan name cannot be empty.",
          },
          {
            status: 400,
          }
        );
      }

      const duplicate =
        await db.orm.public.InvestmentPlan
          .where({
            name,
          })
          .first();

      if (
        duplicate &&
        duplicate.id !== id
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Another plan already has this name.",
          },
          {
            status: 409,
          }
        );
      }

      updateData.name = name;
    }

    // =========================
    // AMOUNT
    // =========================

    if (
      body.amount !== undefined
    ) {
      const amount =
        Number(body.amount);

      if (
        !Number.isInteger(amount) ||
        amount <= 0
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Amount must be a positive whole number.",
          },
          {
            status: 400,
          }
        );
      }

      updateData.amount = amount;
    }

    // =========================
    // DURATION
    // =========================

    if (
      body.durationDays !==
      undefined
    ) {
      const durationDays =
        Number(
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
            success: false,
            error:
              "Duration must be a positive whole number.",
          },
          {
            status: 400,
          }
        );
      }

      updateData.durationDays =
        durationDays;
    }

    // =========================
    // DAILY INCOME
    // =========================

    if (
      body.dailyIncome !==
      undefined
    ) {
      const dailyIncome =
        Number(
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
            success: false,
            error:
              "Daily income must be a valid whole number.",
          },
          {
            status: 400,
          }
        );
      }

      updateData.dailyIncome =
        dailyIncome;
    }

    // =========================
    // ACTIVE
    // =========================

    if (
      body.active !== undefined
    ) {
      if (
        typeof body.active !==
        "boolean"
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Active must be true or false.",
          },
          {
            status: 400,
          }
        );
      }

      updateData.active =
        body.active;
    }

    // =========================
    // EMPTY UPDATE
    // =========================

    if (
      Object.keys(updateData)
        .length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No valid fields provided for update.",
        },
        {
          status: 400,
        }
      );
    }

    // =========================
    // UPDATE
    // =========================

    const updatedPlan =
      await db.orm.public.InvestmentPlan
        .where({
          id,
        })
        .update(updateData);

    if (!updatedPlan) {
      return NextResponse.json(
        {
          success: false,
          error: "Investment plan not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,

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
        success: false,
        error:
          "Failed to update plan.",
      },
      {
        status: 500,
      }
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
    const unauthorized =
      await requireAdmin();

    if (unauthorized) {
      return unauthorized;
    }

    await connectDB();

    const body =
      await request.json();

    const id =
      typeof body.id === "string"
        ? body.id.trim()
        : "";

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Plan ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const plan =
      await db.orm.public.InvestmentPlan
        .where({
          id,
        })
        .first();

    if (!plan) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Investment plan not found.",
        },
        {
          status: 404,
        }
      );
    }

    // =========================
    // CHECK INVESTMENTS
    // =========================

    const investments =
      await db.orm.public.Investment
        .where({
          planId: id,
        })
        .all();

    if (investments.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This plan cannot be deleted because users have investments in it. Deactivate it instead.",
        },
        {
          status: 409,
        }
      );
    }

    // =========================
    // DELETE
    // =========================

    await db.orm.public.InvestmentPlan
      .where({
        id,
      })
      .delete();

    return NextResponse.json({
      success: true,

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
        success: false,
        error:
          "Failed to delete plan.",
      },
      {
        status: 500,
      }
    );
  }
}

