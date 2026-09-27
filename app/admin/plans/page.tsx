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

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [durationDays, setDurationDays] =
    useState("");
  const [dailyIncome, setDailyIncome] =
    useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // ==============================
  // LOAD PLANS
  // ==============================

  async function loadPlans() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/admin/plans",
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }
      );

      const text = await response.text();

      let data: any = {};

      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            `Failed to load plans. HTTP ${response.status}`
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
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPlans();
  }, []);

  // ==============================
  // RESET FORM
  // ==============================

  function resetForm() {
    setEditingId(null);
    setName("");
    setAmount("");
    setDurationDays("");
    setDailyIncome("");
  }

  // ==============================
  // ADD / UPDATE PLAN
  // ==============================

  async function savePlan(
    event: React.FormEvent
  ) {
    event.preventDefault();

    setMessage("");
    setError("");
    setSaving(true);

    try {
      const payload = {
        name: name.trim(),
        amount: Number(amount),
        durationDays: Number(durationDays),
        dailyIncome: Number(dailyIncome),
      };

      if (
        !payload.name ||
        !Number.isInteger(payload.amount) ||
        payload.amount <= 0 ||
        !Number.isInteger(
          payload.durationDays
        ) ||
        payload.durationDays <= 0 ||
        !Number.isInteger(
          payload.dailyIncome
        ) ||
        payload.dailyIncome < 0
      ) {
        throw new Error(
          "Please enter valid plan details."
        );
      }

      const response = await fetch(
        "/api/admin/plans",
        {
          method: editingId
            ? "PATCH"
            : "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          credentials: "include",
          body: JSON.stringify(
            editingId
              ? {
                  id: editingId,
                  ...payload,
                }
              : payload
          ),
        }
      );

      const text = await response.text();

      let data: any = {};

      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            `Request failed. HTTP ${response.status}`
        );
      }

      setMessage(
        editingId
          ? "Plan updated successfully."
          : "Plan created successfully."
      );

      resetForm();

      await loadPlans();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  }

  // ==============================
  // EDIT
  // ==============================

  function editPlan(plan: Plan) {
    setEditingId(plan.id);
    setName(plan.name);
    setAmount(String(plan.amount));
    setDurationDays(
      String(plan.durationDays)
    );
    setDailyIncome(
      String(plan.dailyIncome)
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // ==============================
  // ACTIVATE / DEACTIVATE
  // ==============================

  async function togglePlan(plan: Plan) {
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        "/api/admin/plans",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            id: plan.id,
            active: !plan.active,
          }),
        }
      );

      const text = await response.text();

      let data: any = {};

      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            `Request failed. HTTP ${response.status}`
        );
      }

      setMessage(
        plan.active
          ? "Plan deactivated successfully."
          : "Plan activated successfully."
      );

      await loadPlans();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update plan."
      );
    }
  }

  // ==============================
  // DELETE
  // ==============================

  async function deletePlan(plan: Plan) {
    const confirmed = window.confirm(
      `Delete "${plan.name}"?`
    );

    if (!confirmed) return;

    setMessage("");
    setError("");

    try {
      const response = await fetch(
        "/api/admin/plans",
        {
          method: "DELETE",
          headers: {
            "Content-Type":
              "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            id: plan.id,
          }),
        }
      );

      const text = await response.text();

      let data: any = {};

      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            `Delete failed. HTTP ${response.status}`
        );
      }

      setMessage(
        "Plan deleted successfully."
      );

      await loadPlans();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete plan."
      );
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-7xl">
        {/* HEADER */}

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Investment Plans
          </h1>

          <p className="mt-1 text-gray-600">
            Create and manage investment plans.
          </p>
        </div>

        {/* MESSAGES */}

        {message && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 text-green-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {/* FORM */}

        <div className="mb-8 rounded-xl bg-white p-6 shadow">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {editingId
                ? "Edit Investment Plan"
                : "Add Investment Plan"}
            </h2>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border px-4 py-2 text-sm"
              >
                Cancel
              </button>
            )}
          </div>

          <form
            onSubmit={savePlan}
            className="grid grid-cols-1 gap-4 md:grid-cols-4"
          >
            <div>
              <label className="mb-1 block text-sm font-medium">
                Plan Name
              </label>

              <input
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
                placeholder="e.g. Starter"
                className="w-full rounded-lg border px-4 py-3 outline-none focus:ring-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Amount (USDT)
              </label>

              <input
                type="number"
                min="1"
                value={amount}
                onChange={(e) =>
                  setAmount(e.target.value)
                }
                placeholder="100"
                className="w-full rounded-lg border px-4 py-3 outline-none focus:ring-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Duration (Days)
              </label>

              <input
                type="number"
                min="1"
                value={durationDays}
                onChange={(e) =>
                  setDurationDays(
                    e.target.value
                  )
                }
                placeholder="30"
                className="w-full rounded-lg border px-4 py-3 outline-none focus:ring-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Daily Income (USDT)
              </label>

              <input
                type="number"
                min="0"
                value={dailyIncome}
                onChange={(e) =>
                  setDailyIncome(
                    e.target.value
                  )
                }
                placeholder="5"
                className="w-full rounded-lg border px-4 py-3 outline-none focus:ring-2"
              />
            </div>

            <div className="md:col-span-4">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-black px-6 py-3 font-semibold text-gray-900 disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editingId
                  ? "Update Plan"
                  : "Add Plan"}
              </button>
            </div>
          </form>
        </div>

        {/* PLANS */}

        <div className="rounded-xl bg-white shadow">
          <div className="border-b p-6">
            <h2 className="text-xl font-semibold">
              All Investment Plans
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">
              Loading plans...
            </div>
          ) : plans.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No investment plans found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-4">
                      Plan
                    </th>

                    <th className="p-4">
                      Amount
                    </th>

                    <th className="p-4">
                      Duration
                    </th>

                    <th className="p-4">
                      Daily Income
                    </th>

                    <th className="p-4">
                      Status
                    </th>

                    <th className="p-4">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {plans.map((plan) => (
                    <tr
                      key={plan.id}
                      className="border-t"
                    >
                      <td className="p-4 font-semibold">
                        {plan.name}
                      </td>

                      <td className="p-4">
                        {plan.amount} USDT
                      </td>

                      <td className="p-4">
                        {plan.durationDays} days
                      </td>

                      <td className="p-4">
                        {plan.dailyIncome} USDT
                      </td>

                      <td className="p-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            plan.active
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {plan.active
                            ? "ACTIVE"
                            : "INACTIVE"}
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() =>
                              editPlan(plan)
                            }
                            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-gray-900"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() =>
                              togglePlan(plan)
                            }
                            className={`rounded-lg px-3 py-2 text-sm font-medium text-gray-900 ${
                              plan.active
                                ? "bg-orange-500"
                                : "bg-green-600"
                            }`}
                          >
                            {plan.active
                              ? "Deactivate"
                              : "Activate"}
                          </button>

                          <button
                            onClick={() =>
                              deletePlan(plan)
                            }
                            className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-gray-900"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
