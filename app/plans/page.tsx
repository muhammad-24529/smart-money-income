"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Plan = {
  id: string;
  name: string;
  amount: number;
  durationDays: number;
  dailyIncome: number;
  active: boolean;
};

export default function PlansPage() {
  const router = useRouter();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadPlans();
  }, []);

  async function loadPlans() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/investment-plans", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to load investment plans."
        );
      }

      setPlans(
        Array.isArray(data.plans)
          ? data.plans.filter((plan: Plan) => plan.active !== false)
          : []
      );
    } catch (err) {
      console.error("PLANS ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load investment plans."
      );
    } finally {
      setLoading(false);
    }
  }

  async function buyPlan(plan: Plan) {
    let savedUser: string | null =
      localStorage.getItem("smi_user");

    if (!savedUser) {
      savedUser = sessionStorage.getItem("smi_user");
    }

    if (!savedUser) {
      alert("Please login first.");
      router.push("/login");
      return;
    }

    let user: any;

    try {
      user = JSON.parse(savedUser);
    } catch {
      localStorage.removeItem("smi_user");
      sessionStorage.removeItem("smi_user");

      alert("Invalid login session. Please login again.");
      router.push("/login");
      return;
    }

    if (!user?.id) {
      localStorage.removeItem("smi_user");
      sessionStorage.removeItem("smi_user");

      alert("User session not found. Please login again.");
      router.push("/login");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to buy ${plan.name} for ${plan.amount.toFixed(
        2
      )} USDT?\n\nAfter purchase, you must wait 24 hours before START becomes available.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setBuying(plan.id);
      setError("");

      const response = await fetch(
        "/api/investments/purchase",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: user.id,
            planId: plan.id,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Investment purchase failed."
        );
      }

      alert(
        `Investment purchased successfully!\n\n` +
          `Plan: ${plan.name}\n` +
          `Amount: ${plan.amount.toFixed(2)} USDT\n` +
          `Daily Income: ${plan.dailyIncome.toFixed(2)} USDT\n` +
          `Duration: ${plan.durationDays} days\n\n` +
          `START will become available after 24 hours.\n` +
          `You must manually press START every 24 hours.`
      );

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      console.error("PURCHASE ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Investment purchase failed."
      );
    } finally {
      setBuying(null);
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-10">
      <div className="mx-auto max-w-6xl">

        {/* HEADER */}
        <div className="mb-10 text-center">
          <button
            onClick={() => router.push("/dashboard")}
            className="mb-5 rounded-lg border bg-white px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            ← Back to Dashboard
          </button>

          <h1 className="text-4xl font-bold text-gray-900">
            Investment Plans
          </h1>

          <p className="mt-3 text-gray-600">
            Choose an investment plan that suits you.
          </p>
        </div>

        {/* INFORMATION */}
        <div className="mb-8 rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <h2 className="font-bold text-blue-900">
            How Investment START Works
          </h2>

          <div className="mt-3 space-y-2 text-sm text-blue-800">
            <p>
              1. Buy a plan using your wallet balance.
            </p>

            <p>
              2. Your investment purchase amount is deducted
              immediately.
            </p>

            <p>
              3. Wait 24 hours after purchase.
            </p>

            <p>
              4. After 24 hours, press the START button
              manually.
            </p>

            <p>
              5. START adds one daily income to your wallet.
            </p>

            <p>
              6. After START, wait another 24 hours before
              the next START.
            </p>

            <p>
              7. Each plan can only be purchased once.
            </p>
          </div>
        </div>

        {/* LOADING */}
        {loading && (
          <div className="rounded-2xl bg-white py-12 text-center shadow-sm">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />

            <p className="mt-4 text-gray-600">
              Loading investment plans...
            </p>
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-center text-red-700">
            <p className="font-semibold">
              {error}
            </p>

            <button
              onClick={loadPlans}
              className="mt-3 rounded-lg bg-red-600 px-5 py-2 font-semibold text-white hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        )}

        {/* NO PLANS */}
        {!loading &&
          plans.length === 0 &&
          !error && (
            <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
              <h2 className="text-xl font-bold text-gray-900">
                No Investment Plans Available
              </h2>

              <p className="mt-2 text-gray-500">
                Please check again later.
              </p>
            </div>
          )}

        {/* PLANS */}
        {!loading && plans.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan) => {
              const totalIncome =
                Number(plan.dailyIncome) *
                Number(plan.durationDays);

              const isBuying =
                buying === plan.id;

              return (
                <div
                  key={plan.id}
                  className="relative rounded-2xl bg-white p-6 shadow-md transition hover:-translate-y-1 hover:shadow-xl"
                >
                  {/* ACTIVE BADGE */}
                  <div className="absolute right-4 top-4">
                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                      ACTIVE
                    </span>
                  </div>

                  {/* PLAN NAME */}
                  <div className="mb-5 pr-16">
                    <h2 className="text-2xl font-bold text-gray-900">
                      {plan.name}
                    </h2>
                  </div>

                  {/* AMOUNT */}
                  <div className="mb-5 text-center">
                    <p className="text-4xl font-bold text-green-600">
                      {Number(plan.amount).toFixed(2)}
                    </p>

                    <p className="mt-2 text-sm text-gray-500">
                      USDT Investment
                    </p>
                  </div>

                  {/* DETAILS */}
                  <div className="space-y-3 border-t pt-5">

                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">
                        Daily Income
                      </span>

                      <span className="font-semibold text-green-600">
                        {Number(plan.dailyIncome).toFixed(2)} USDT
                      </span>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">
                        Duration
                      </span>

                      <span className="font-semibold text-gray-900">
                        {plan.durationDays} days
                      </span>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">
                        Total Income
                      </span>

                      <span className="font-semibold text-blue-600">
                        {totalIncome.toFixed(2)} USDT
                      </span>
                    </div>
                  </div>

                  {/* TOTAL RETURN INFO */}
                  <div className="mt-5 rounded-xl bg-gray-50 p-4 text-center">
                    <p className="text-xs text-gray-500">
                      Total income over full duration
                    </p>

                    <p className="mt-1 text-xl font-bold text-gray-900">
                      {totalIncome.toFixed(2)} USDT
                    </p>
                  </div>

                  {/* BUY BUTTON */}
                  <button
                    onClick={() => buyPlan(plan)}
                    disabled={isBuying}
                    className="mt-6 w-full rounded-xl bg-black px-4 py-3 font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isBuying
                      ? "Processing..."
                      : "Buy Now"}
                  </button>

                  {/* AFTER PURCHASE MESSAGE */}
                  <p className="mt-3 text-center text-xs text-gray-500">
                    After purchase, START unlocks after 24 hours.
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* FOOTER */}
        <div className="mt-10 text-center">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-sm font-semibold text-blue-600 hover:underline"
          >
            ← Return to Dashboard
          </button>
        </div>
      </div>
    </main>
  );
}