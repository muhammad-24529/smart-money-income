
"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type PromoCode = {
  id: string;
  code: string;
  bonusAmount: number;
  bonusPercent: number;
  requiredReferrals: number;
  maxUses: number | null;
  usedCount: number;
  active: boolean;
};

type FormState = {
  code: string;
  bonusAmount: string;
  requiredReferrals: string;
  maxUses: string;
  active: boolean;
};

const emptyForm: FormState = {
  code: "",
  bonusAmount: "100",
  requiredReferrals: "50",
  maxUses: "",
  active: true,
};

export default function PromoCodesPage() {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function loadPromoCodes() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/admin/promo-codes", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Failed to load promo codes."
        );
      }

      setPromoCodes(
        Array.isArray(data.promoCodes) ? data.promoCodes : []
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load promo codes."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPromoCodes();
  }, []);

  function updateForm(
    field: keyof FormState,
    value: string | boolean
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function startEdit(promo: PromoCode) {
    setEditingId(promo.id);

    setForm({
      code: promo.code,
      bonusAmount: String(promo.bonusAmount),
      requiredReferrals: String(promo.requiredReferrals),
      maxUses:
        promo.maxUses === null ? "" : String(promo.maxUses),
      active: promo.active,
    });

    setMessage("");
    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    try {
      setSaving(true);
      setMessage("");
      setError("");

      const payload = {
        code: form.code.trim().toUpperCase(),
        bonusAmount: Number(form.bonusAmount),
        requiredReferrals: Number(form.requiredReferrals),
        maxUses:
          form.maxUses.trim() === ""
            ? null
            : Number(form.maxUses),
        active: form.active,
      };

      const url = editingId
        ? `/api/admin/promo-codes/${editingId}`
        : "/api/admin/promo-codes";

      const response = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Failed to save promo code."
        );
      }

      setMessage(
        editingId
          ? "Promo code updated successfully."
          : "Promo code created successfully."
      );

      resetForm();
      await loadPromoCodes();
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

  async function toggleActive(promo: PromoCode) {
    try {
      setError("");
      setMessage("");

      const response = await fetch(
        `/api/admin/promo-codes/${promo.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            active: !promo.active,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Failed to update promo code."
        );
      }

      setMessage(
        promo.active
          ? "Promo code deactivated."
          : "Promo code activated."
      );

      await loadPromoCodes();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update promo code."
      );
    }
  }

  async function deletePromo(promo: PromoCode) {
    if (promo.usedCount > 0) {
      setError(
        "Used promo codes cannot be deleted. Deactivate them instead."
      );
      return;
    }

    const confirmed = window.confirm(
      `Delete promo code "${promo.code}"?`
    );

    if (!confirmed) return;

    try {
      setError("");
      setMessage("");

      const response = await fetch(
        `/api/admin/promo-codes/${promo.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Failed to delete promo code."
        );
      }

      setMessage("Promo code deleted successfully.");
      await loadPromoCodes();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete promo code."
      );
    }
  }

  const stats = useMemo(() => {
    const active = promoCodes.filter((item) => item.active).length;
    const inactive = promoCodes.length - active;
    const totalUses = promoCodes.reduce(
      (sum, item) => sum + item.usedCount,
      0
    );

    return {
      total: promoCodes.length,
      active,
      inactive,
      totalUses,
    };
  }, [promoCodes]);

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-gray-900 md:px-8 md:py-8">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}
        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-gray-800 bg-gray-950 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              Admin Management
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
              Promo Codes
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
              Create and manage promotional reward codes,
              referral requirements and usage limits.
            </p>
          </div>

          <button
            type="button"
            onClick={resetForm}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-black shadow-lg shadow-white/10 transition hover:bg-gray-200"
          >
            <span className="text-lg leading-none">+</span>
            New Promo Code
          </button>
        </div>

        {/* ALERTS */}
        {message && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-green-800 bg-green-950/30 px-4 py-3 text-sm font-medium text-green-300">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-900 text-green-300">
              ✓
            </span>
            {message}
          </div>
        )}

        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-800 bg-red-950/30 px-4 py-3 text-sm font-medium text-red-300">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-900 text-red-300">
              !
            </span>
            {error}
          </div>
        )}

        {/* STATS */}
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-gray-800 bg-gray-950 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Total Codes
            </p>
            <p className="mt-3 text-3xl font-bold text-white">
              {stats.total}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-gray-950 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Active
            </p>
            <p className="mt-3 text-3xl font-bold text-green-400">
              {stats.active}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-gray-950 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Inactive
            </p>
            <p className="mt-3 text-3xl font-bold text-gray-400">
              {stats.inactive}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-gray-950 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Total Uses
            </p>
            <p className="mt-3 text-3xl font-bold text-white">
              {stats.totalUses}
            </p>
          </div>
        </div>

        {/* CREATE / EDIT */}
        <section className="mb-8 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Promo Configuration
                </p>

                <h2 className="mt-1 text-xl font-bold text-black">
                  {editingId
                    ? "Edit Promo Code"
                    : "Create Promo Code"}
                </h2>
              </div>

              {editingId && (
                <span className="rounded-full bg-black px-3 py-1 text-xs font-semibold text-white">
                  Editing
                </span>
              )}
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="p-6"
          >
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-5">

              {/* CODE */}
              <div>
                <label className="mb-2 block text-sm font-bold text-gray-800">
                  Promo Code
                </label>

                <input
                  value={form.code}
                  onChange={(e) =>
                    updateForm("code", e.target.value)
                  }
                  placeholder="REF50"
                  required
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold uppercase text-black outline-none transition placeholder:text-gray-400 focus:border-black focus:ring-2 focus:ring-black/10"
                />
              </div>

              {/* REWARD */}
              <div>
                <label className="mb-2 block text-sm font-bold text-gray-800">
                  Reward Amount
                </label>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500">
                    $
                  </span>

                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={form.bonusAmount}
                    onChange={(e) =>
                      updateForm(
                        "bonusAmount",
                        e.target.value
                      )
                    }
                    required
                    className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-9 pr-4 text-sm font-semibold text-black outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                  />
                </div>

                <p className="mt-1.5 text-xs text-gray-500">
                  Reward between $1 and $100
                </p>
              </div>

              {/* REFERRALS */}
              <div>
                <label className="mb-2 block text-sm font-bold text-gray-800">
                  Required Referrals
                </label>

                <select
                  value={form.requiredReferrals}
                  onChange={(e) =>
                    updateForm(
                      "requiredReferrals",
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-black outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                >
                  <option value="50">
                    50 Successful Referrals
                  </option>

                  <option value="100">
                    100 Successful Referrals
                  </option>

                  <option value="0">
                    No Referral Requirement
                  </option>
                </select>
              </div>

              {/* MAX USES */}
              <div>
                <label className="mb-2 block text-sm font-bold text-gray-800">
                  Maximum Uses
                </label>

                <input
                  type="number"
                  min="1"
                  value={form.maxUses}
                  onChange={(e) =>
                    updateForm(
                      "maxUses",
                      e.target.value
                    )
                  }
                  placeholder="Unlimited"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-black outline-none transition placeholder:text-gray-400 focus:border-black focus:ring-2 focus:ring-black/10"
                />

                <p className="mt-1.5 text-xs text-gray-500">
                  Leave empty for unlimited
                </p>
              </div>

              {/* ACTIVE */}
              <div>
                <label className="mb-2 block text-sm font-bold text-gray-800">
                  Status
                </label>

                <label className="flex min-h-[48px] cursor-pointer items-center justify-between rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 transition hover:bg-gray-100">
                  <span className="text-sm font-semibold text-black">
                    {form.active ? "Active" : "Inactive"}
                  </span>

                  <span
                    className={`relative h-6 w-11 rounded-full transition ${
                      form.active
                        ? "bg-black"
                        : "bg-gray-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(e) =>
                        updateForm(
                          "active",
                          e.target.checked
                        )
                      }
                      className="sr-only"
                    />

                    <span
                      className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${
                        form.active
                          ? "left-6"
                          : "left-1"
                      }`}
                    />
                  </span>
                </label>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3 border-t border-gray-200 pt-6">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-black px-6 py-3 text-sm font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update Promo Code"
                    : "Create Promo Code"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-bold text-black transition hover:bg-gray-100"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        {/* TABLE */}
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">

          <div className="flex flex-col gap-3 border-b border-gray-200 bg-gray-50 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Promotion Library
              </p>

              <h2 className="mt-1 text-xl font-bold text-black">
                Existing Promo Codes
              </h2>
            </div>

            <div className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600">
              {promoCodes.length}{" "}
              {promoCodes.length === 1
                ? "Code"
                : "Codes"}
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center">
              <div className="mb-4 h-9 w-9 animate-spin rounded-full border-4 border-gray-200 border-t-black" />
              <p className="text-sm font-medium text-gray-500">
                Loading promo codes...
              </p>
            </div>
          ) : promoCodes.length === 0 ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center px-6 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-2xl">
                %
              </div>

              <h3 className="text-lg font-bold text-black">
                No promo codes yet
              </h3>

              <p className="mt-1 max-w-md text-sm text-gray-500">
                Create your first promotional code using
                the form above.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-left">
                <thead>
                  <tr className="border-b border-gray-200 bg-white">
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">
                      Code
                    </th>

                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">
                      Reward
                    </th>

                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">
                      Referrals
                    </th>

                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">
                      Usage
                    </th>

                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">
                      Status
                    </th>

                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {promoCodes.map((promo) => {
                    const usagePercent =
                      promo.maxUses !== null &&
                      promo.maxUses > 0
                        ? Math.min(
                            100,
                            (promo.usedCount /
                              promo.maxUses) *
                              100
                          )
                        : 0;

                    return (
                      <tr
                        key={promo.id}
                        className="border-b border-gray-100 transition hover:bg-gray-50 last:border-0"
                      >
                        {/* CODE */}
                        <td className="px-6 py-5">
                          <div className="inline-flex items-center rounded-lg bg-black px-3 py-2">
                            <span className="font-mono text-sm font-bold tracking-wider text-white">
                              {promo.code}
                            </span>
                          </div>
                        </td>

                        {/* REWARD */}
                        <td className="px-6 py-5">
                          <span className="text-lg font-bold text-black">
                            ${Number(
                              promo.bonusAmount
                            ).toFixed(0)}
                          </span>
                        </td>

                        {/* REFERRALS */}
                        <td className="px-6 py-5">
                          <span className="font-semibold text-gray-800">
                            {promo.requiredReferrals === 0
                              ? "None"
                              : `${promo.requiredReferrals} referrals`}
                          </span>
                        </td>

                        {/* USAGE */}
                        <td className="px-6 py-5">
                          <div className="min-w-[150px]">
                            <div className="mb-2 flex items-center justify-between">
                              <span className="text-sm font-semibold text-gray-800">
                                {promo.usedCount}
                              </span>

                              <span className="text-xs text-gray-500">
                                {promo.maxUses !== null
                                  ? `of ${promo.maxUses}`
                                  : "Unlimited"}
                              </span>
                            </div>

                            {promo.maxUses !== null && (
                              <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
                                <div
                                  className="h-full rounded-full bg-black transition-all"
                                  style={{
                                    width: `${usagePercent}%`,
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        </td>

                        {/* STATUS */}
                        <td className="px-6 py-5">
                          <span
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${
                              promo.active
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            <span
                              className={`h-2 w-2 rounded-full ${
                                promo.active
                                  ? "bg-green-500"
                                  : "bg-gray-400"
                              }`}
                            />

                            {promo.active
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </td>

                        {/* ACTIONS */}
                        <td className="px-6 py-5">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                startEdit(promo)
                              }
                              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-black transition hover:bg-gray-100"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                toggleActive(promo)
                              }
                              className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                                promo.active
                                  ? "border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100"
                                  : "border border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                              }`}
                            >
                              {promo.active
                                ? "Deactivate"
                                : "Activate"}
                            </button>

                            {promo.usedCount === 0 && (
                              <button
                                type="button"
                                onClick={() =>
                                  deletePromo(promo)
                                }
                                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-100"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* FOOTER */}
        <div className="py-6 text-center">
          <p className="text-xs text-gray-600">
            Promo Code Management • Admin Panel
          </p>
        </div>
      </div>
    </main>
  );
}
