"use client";

import { useEffect, useState } from "react";

type Plan = {
  id: string;
  name: string;
  amount: number;
  durationDays: number;
  dailyIncome: number;
  active: boolean;
};

type Investment = {
  id: string;
  planId: string;
  amount: number;
  dailyIncome: number;
  durationDays: number;
  startAt: string | null;
  lastIncomeAt: string | null;
  status: string;
};

function getUserId(): string {
  if (typeof window === "undefined") {
    return "";
  }

  /*
   * Try direct User ID storage.
   */
  const directKeys = [
    "userId",
    "user_id",
    "userID",
    "userid",
    "id",
  ];

  for (const key of directKeys) {
    const localValue =
      localStorage.getItem(key);

    const sessionValue =
      sessionStorage.getItem(key);

    const value =
      localValue || sessionValue;

    if (
      value &&
      value.trim() &&
      value !== "undefined" &&
      value !== "null"
    ) {
      return value.trim();
    }
  }

  /*
   * Try common stored user objects.
   */
  const userKeys = [
    "user",
    "currentUser",
    "smi_user",
    "loggedInUser",
    "authUser",
    "userData",
    "account",
    "profile",
  ];

  for (const key of userKeys) {
    const localValue =
      localStorage.getItem(key);

    const sessionValue =
      sessionStorage.getItem(key);

    const value =
      localValue || sessionValue;

    if (!value) {
      continue;
    }

    try {
      const parsed = JSON.parse(value);

      if (
        parsed &&
        typeof parsed.id === "string" &&
        parsed.id.trim()
      ) {
        return parsed.id.trim();
      }

      if (
        parsed &&
        typeof parsed.userId === "string" &&
        parsed.userId.trim()
      ) {
        return parsed.userId.trim();
      }

      if (
        parsed &&
        parsed.user &&
        typeof parsed.user.id === "string" &&
        parsed.user.id.trim()
      ) {
        return parsed.user.id.trim();
      }
    } catch {
      // Ignore invalid JSON
    }
  }

  return "";
}

function formatNumber(value: number) {
  return Number(value || 0).toFixed(2);
}

function getNextStartTime(
  investment: Investment
): number | null {
  const reference =
    investment.lastIncomeAt ||
    investment.startAt;

  if (!reference) {
    return null;
  }

  const time =
    new Date(reference).getTime();

  if (Number.isNaN(time)) {
    return null;
  }

  return (
    time +
    24 * 60 * 60 * 1000
  );
}

function getRemainingTime(
  nextStartAt: number | null,
  now: number
) {
  if (!nextStartAt) {
    return 0;
  }

  return Math.max(
    0,
    nextStartAt - now
  );
}

function formatCountdown(
  milliseconds: number
) {
  const totalSeconds =
    Math.floor(
      milliseconds / 1000
    );

  const hours =
    Math.floor(
      totalSeconds / 3600
    );

  const minutes =
    Math.floor(
      (totalSeconds % 3600) / 60
    );

  const seconds =
    totalSeconds % 60;

  return `${String(hours).padStart(
    2,
    "0"
  )}:${String(minutes).padStart(
    2,
    "0"
  )}:${String(seconds).padStart(
    2,
    "0"
  )}`;
}

export default function InvestmentPage() {
  const [plans, setPlans] =
    useState<Plan[]>([]);

  const [investments, setInvestments] =
    useState<Investment[]>([]);

  const [loadingPlans, setLoadingPlans] =
    useState(true);

  const [
    loadingInvestments,
    setLoadingInvestments,
  ] = useState(true);

  const [investing, setInvesting] =
    useState<string | null>(null);

  const [starting, setStarting] =
    useState<string | null>(null);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [now, setNow] =
    useState(Date.now());

  /*
   * Update countdown every second.
   */
  useEffect(() => {
    const interval =
      setInterval(() => {
        setNow(Date.now());
      }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  /*
   * Load investment plans.
   */
  const loadPlans = async () => {
    try {
      setLoadingPlans(true);

      const response =
        await fetch("/api/plans", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

      const text =
        await response.text();

      let data: any = {};

      try {
        data = text
          ? JSON.parse(text)
          : {};
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to load investment plans."
        );
      }

      setPlans(
        Array.isArray(data.plans)
          ? data.plans
          : []
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load plans."
      );
    } finally {
      setLoadingPlans(false);
    }
  };

  /*
   * Load user's investments.
   */
  const loadInvestments = async () => {
    try {
      setLoadingInvestments(true);

      const userId =
        getUserId();

      console.log(
        "INVESTMENT PAGE USER ID:",
        userId
      );

      if (!userId) {
        setInvestments([]);

        setError(
          "User session not found. Please login again."
        );

        return;
      }

      const response =
        await fetch(
          `/api/user/${encodeURIComponent(
            userId
          )}/investments`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }
        );

      const text =
        await response.text();

      let data: any = {};

      try {
        data = text
          ? JSON.parse(text)
          : {};
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            `Failed to load investments. HTTP ${response.status}`
        );
      }

      setInvestments(
        Array.isArray(
          data.investments
        )
          ? data.investments
          : []
      );
    } catch (err) {
      setInvestments([]);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load investments."
      );
    } finally {
      setLoadingInvestments(false);
    }
  };

  /*
   * Initial loading.
   */
  useEffect(() => {
    loadPlans();
    loadInvestments();
  }, []);

  /*
   * BUY INVESTMENT.
   */
  const handleInvest = async (
    plan: Plan
  ) => {
    const userId =
      getUserId();

    if (!userId) {
      setError(
        "User session not found. Please login again."
      );
      return;
    }

    const confirmed =
      window.confirm(
        `Buy ${plan.name} for ${formatNumber(
          plan.amount
        )} USDT?\n\nThe amount will be deducted from your wallet immediately.\n\nSTART will become available after 24 hours.`
      );

    if (!confirmed) {
      return;
    }

    setInvesting(plan.id);
    setMessage("");
    setError("");

    try {
      const response =
        await fetch(
          "/api/investments/purchase",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              userId,
              planId: plan.id,
            }),
          }
        );

      const text =
        await response.text();

      let data: any = {};

      try {
        data = text
          ? JSON.parse(text)
          : {};
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            `Investment purchase failed. HTTP ${response.status}`
        );
      }

      setMessage(
        `Investment purchased successfully! ${formatNumber(
          plan.amount
        )} USDT was deducted from your wallet. START will be available after 24 hours.`
      );

      await loadInvestments();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Investment purchase failed."
      );
    } finally {
      setInvesting(null);
    }
  };

  /*
   * START INVESTMENT.
   */
  const handleStart = async (
    investment: Investment
  ) => {
    const userId =
      getUserId();

    if (!userId) {
      setError(
        "User session not found. Please login again."
      );
      return;
    }

    setStarting(investment.id);
    setMessage("");
    setError("");

    try {
      const response =
        await fetch(
          "/api/investments/start",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              userId,
              investmentId:
                investment.id,
            }),
          }
        );

      const text =
        await response.text();

      let data: any = {};

      try {
        data = text
          ? JSON.parse(text)
          : {};
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            `START failed. HTTP ${response.status}`
        );
      }

      if (data.completed) {
        setMessage(
          `START successful! ${formatNumber(
            data.income?.amount || 0
          )} USDT was added to your wallet. This investment is now completed.`
        );
      } else {
        setMessage(
          `START successful! ${formatNumber(
            data.income?.amount || 0
          )} USDT was added to your wallet. Next START will be available after 24 hours.`
        );
      }

      await loadInvestments();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "START failed."
      );
    } finally {
      setStarting(null);
    }
  };

  /*
   * Format date.
   */
  const formatDate = (
    date: string | null
  ) => {
    if (!date) {
      return "-";
    }

    const parsed =
      new Date(date);

    if (
      Number.isNaN(
        parsed.getTime()
      )
    ) {
      return "-";
    }

    return parsed.toLocaleString(
      "en-US",
      {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  };

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-8">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Investment
          </h1>

          <p className="mt-2 text-gray-600">
            Buy a plan, wait 24 hours, then START
            every 24 hours to receive your daily
            income.
          </p>
        </div>

        {/* SUCCESS MESSAGE */}
        {message && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-green-700">
            {message}
          </div>
        )}

        {/* ERROR MESSAGE */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {/* HOW IT WORKS */}
        <section className="mb-10 rounded-2xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold text-gray-900">
            How Investment Works
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-4">

            <div className="rounded-xl bg-blue-50 p-4">
              <p className="text-sm font-semibold text-blue-600">
                STEP 1
              </p>

              <p className="mt-2 font-bold text-gray-900">
                Buy Plan
              </p>

              <p className="mt-1 text-sm text-gray-600">
                Plan amount is deducted from your
                wallet.
              </p>
            </div>

            <div className="rounded-xl bg-yellow-50 p-4">
              <p className="text-sm font-semibold text-yellow-600">
                STEP 2
              </p>

              <p className="mt-2 font-bold text-gray-900">
                Wait 24 Hours
              </p>

              <p className="mt-1 text-sm text-gray-600">
                START remains locked for 24 hours.
              </p>
            </div>

            <div className="rounded-xl bg-green-50 p-4">
              <p className="text-sm font-semibold text-green-600">
                STEP 3
              </p>

              <p className="mt-2 font-bold text-gray-900">
                Click START
              </p>

              <p className="mt-1 text-sm text-gray-600">
                Daily income is added to your wallet.
              </p>
            </div>

            <div className="rounded-xl bg-purple-50 p-4">
              <p className="text-sm font-semibold text-purple-600">
                STEP 4
              </p>

              <p className="mt-2 font-bold text-gray-900">
                Repeat Every 24h
              </p>

              <p className="mt-1 text-sm text-gray-600">
                You must click START manually every
                24 hours.
              </p>
            </div>

          </div>
        </section>

        {/* INVESTMENT PLANS */}
        <section className="mb-12">
          <div className="mb-5">
            <h2 className="text-2xl font-bold text-gray-900">
              Investment Plans
            </h2>

            <p className="mt-1 text-gray-500">
              Choose an investment plan.
            </p>
          </div>

          {loadingPlans ? (
            <div className="rounded-2xl bg-white p-10 text-center shadow">
              Loading investment plans...
            </div>
          ) : plans.length === 0 ? (
            <div className="rounded-2xl bg-white p-10 text-center shadow">
              <p className="font-semibold text-gray-700">
                No active investment plans available.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className="rounded-2xl bg-white p-6 shadow-md transition hover:shadow-xl"
                >
                  <h3 className="text-2xl font-bold text-gray-900">
                    {plan.name}
                  </h3>

                  <div className="mt-5 rounded-xl bg-blue-50 p-4">
                    <p className="text-sm text-gray-500">
                      Investment Amount
                    </p>

                    <p className="mt-1 text-3xl font-bold text-blue-600">
                      {formatNumber(
                        plan.amount
                      )}{" "}
                      USDT
                    </p>
                  </div>

                  <div className="mt-5 space-y-3">

                    <div className="flex justify-between">
                      <span className="text-gray-500">
                        Duration
                      </span>

                      <span className="font-semibold">
                        {plan.durationDays} Days
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-500">
                        Daily Income
                      </span>

                      <span className="font-semibold text-green-600">
                        {formatNumber(
                          plan.dailyIncome
                        )}{" "}
                        USDT
                      </span>
                    </div>

                    <div className="flex justify-between border-t pt-3">
                      <span className="text-gray-500">
                        Total Income
                      </span>

                      <span className="font-bold text-gray-900">
                        {formatNumber(
                          plan.dailyIncome *
                            plan.durationDays
                        )}{" "}
                        USDT
                      </span>
                    </div>

                  </div>

                  <button
                    onClick={() =>
                      handleInvest(plan)
                    }
                    disabled={
                      investing === plan.id
                    }
                    className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {investing === plan.id
                      ? "Buying..."
                      : "Buy Now"}
                  </button>
                </div>
              ))}

            </div>
          )}
        </section>

        {/* MY INVESTMENTS */}
        <section>
          <div className="mb-5">
            <h2 className="text-2xl font-bold text-gray-900">
              My Investments
            </h2>

            <p className="mt-1 text-gray-500">
              Start your investment manually every
              24 hours.
            </p>
          </div>

          {loadingInvestments ? (
            <div className="rounded-2xl bg-white p-10 text-center shadow">
              Loading your investments...
            </div>
          ) : investments.length === 0 ? (
            <div className="rounded-2xl bg-white p-10 text-center shadow">
              <p className="font-semibold text-gray-700">
                You don't have any investments yet.
              </p>

              <p className="mt-2 text-sm text-gray-500">
                Your purchased investments will appear
                here.
              </p>
            </div>
          ) : (
            <div className="space-y-5">

              {investments.map(
                (investment) => {
                  const totalIncome =
                    investment.dailyIncome *
                    investment.durationDays;

                  const nextStartAt =
                    getNextStartTime(
                      investment
                    );

                  const remaining =
                    getRemainingTime(
                      nextStartAt,
                      now
                    );

                  const isCompleted =
                    String(
                      investment.status
                    ).toUpperCase() ===
                    "COMPLETED";

                  return (
                    <div
                      key={investment.id}
                      className="rounded-2xl bg-white p-6 shadow-md"
                    >

                      {/* TOP */}
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                        <div>
                          <div className="flex flex-wrap items-center gap-3">

                            <h3 className="text-xl font-bold text-gray-900">
                              Investment
                            </h3>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                isCompleted
                                  ? "bg-gray-100 text-gray-700"
                                  : "bg-green-100 text-green-700"
                              }`}
                            >
                              {investment.status}
                            </span>

                          </div>

                          <p className="mt-2 text-sm text-gray-500">
                            Purchased:{" "}
                            {formatDate(
                              investment.startAt
                            )}
                          </p>

                          {investment.lastIncomeAt && (
                            <p className="mt-1 text-sm text-gray-500">
                              Last START:{" "}
                              {formatDate(
                                investment.lastIncomeAt
                              )}
                            </p>
                          )}
                        </div>

                        {/* START AREA */}
                        <div className="min-w-[240px]">

                          {isCompleted ? (
                            <div className="rounded-xl bg-gray-100 px-5 py-4 text-center">
                              <p className="font-bold text-gray-700">
                                Investment Completed
                              </p>

                              <p className="mt-1 text-xs text-gray-500">
                                All income cycles completed
                              </p>
                            </div>
                          ) : remaining > 0 ? (
                            <div className="rounded-xl bg-yellow-50 px-5 py-4 text-center">

                              <p className="text-xs font-semibold text-yellow-700">
                                START LOCKED
                              </p>

                              <p className="mt-1 text-2xl font-bold text-yellow-800">
                                {formatCountdown(
                                  remaining
                                )}
                              </p>

                              <p className="mt-1 text-xs text-yellow-700">
                                Time remaining
                              </p>

                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                handleStart(
                                  investment
                                )
                              }
                              disabled={
                                starting ===
                                investment.id
                              }
                              className="w-full rounded-xl bg-green-600 px-5 py-4 font-bold text-white shadow transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {starting ===
                              investment.id
                                ? "STARTING..."
                                : `START +${formatNumber(
                                    investment.dailyIncome
                                  )} USDT`}
                            </button>
                          )}

                        </div>
                      </div>

                      {/* STATS */}
                      <div className="mt-6 grid grid-cols-2 gap-5 border-t pt-5 sm:grid-cols-4">

                        <div>
                          <p className="text-sm text-gray-500">
                            Invested
                          </p>

                          <p className="font-bold text-gray-900">
                            {formatNumber(
                              investment.amount
                            )}{" "}
                            USDT
                          </p>
                        </div>

                        <div>
                          <p className="text-sm text-gray-500">
                            Daily Income
                          </p>

                          <p className="font-bold text-green-600">
                            {formatNumber(
                              investment.dailyIncome
                            )}{" "}
                            USDT
                          </p>
                        </div>

                        <div>
                          <p className="text-sm text-gray-500">
                            Duration
                          </p>

                          <p className="font-bold text-gray-900">
                            {
                              investment.durationDays
                            }{" "}
                            Days
                          </p>
                        </div>

                        <div>
                          <p className="text-sm text-gray-500">
                            Total Income
                          </p>

                          <p className="font-bold text-blue-600">
                            {formatNumber(
                              totalIncome
                            )}{" "}
                            USDT
                          </p>
                        </div>

                      </div>

                    </div>
                  );
                }
              )}

            </div>
          )}
        </section>

      </div>
    </main>
  );
}