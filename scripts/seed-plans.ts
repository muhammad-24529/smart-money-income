import { db, connectDB } from "../lib/prisma";

const plans = [
  {
    name: "Plan 1",
    amount: 20,
    durationDays: 50,
    dailyIncome: 1,
  },
  {
    name: "Plan 2",
    amount: 40,
    durationDays: 50,
    dailyIncome: 2,
  },
  {
    name: "Plan 3",
    amount: 80,
    durationDays: 50,
    dailyIncome: 4,
  },
  {
    name: "Plan 4",
    amount: 150,
    durationDays: 55,
    dailyIncome: 6,
  },
  {
    name: "Plan 5",
    amount: 200,
    durationDays: 80,
    dailyIncome: 7,
  },
  {
    name: "Plan 6",
    amount: 400,
    durationDays: 100,
    dailyIncome: 10,
  },
  {
    name: "Plan 7",
    amount: 1000,
    durationDays: 200,
    dailyIncome: 20,
  },
  {
    name: "Plan 8",
    amount: 2000,
    durationDays: 150,
    dailyIncome: 40,
  },
];

async function seedPlans() {
  await connectDB();

  for (const plan of plans) {
    const existing = await db.orm.public.InvestmentPlan
      .where({ name: plan.name })
      .first();

    if (existing) {
      await db.orm.public.InvestmentPlan
        .where({ id: existing.id })
        .update({
          amount: plan.amount,
          durationDays: plan.durationDays,
          dailyIncome: plan.dailyIncome,
          active: true,
        });

      console.log(`Updated: ${plan.name}`);
    } else {
      await db.orm.public.InvestmentPlan.create({
        name: plan.name,
        amount: plan.amount,
        durationDays: plan.durationDays,
        dailyIncome: plan.dailyIncome,
        active: true,
      });

      console.log(`Created: ${plan.name}`);
    }
  }

  console.log("All investment plans are ready.");
}

seedPlans().catch((error) => {
  console.error("SEED PLANS ERROR:", error);
  process.exit(1);
});