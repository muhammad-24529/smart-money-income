"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type User = {
  id: string;
  name: string;
  email: string;
  balance: number;
  isActive: boolean;
  referralCode: string | null;
};

export default function AdminUserDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const userId =
    typeof params.id === "string"
      ? params.id
      : "";

  const [user, setUser] =
    useState<User | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    async function loadUser() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/admin/users/${encodeURIComponent(
            userId
          )}`,
          {
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Failed to load user."
          );
        }

        setUser(data.user);
      } catch (err) {
        console.error(
          "LOAD USER ERROR:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load user."
        );
      } finally {
        setLoading(false);
      }
    }

    if (userId) {
      loadUser();
    }
  }, [userId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        <div className="mx-auto max-w-5xl">
          <p className="text-slate-400">
            Loading user...
          </p>
        </div>
      </main>
    );
  }

  if (error || !user) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        <div className="mx-auto max-w-5xl">

          <button
            onClick={() =>
              router.push("/admin/users")
            }
            className="mb-6 rounded-lg bg-slate-800 px-4 py-2 text-sm hover:bg-slate-700"
          >
            ← Back to Users
          </button>

          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-red-300">
            {error || "User not found."}
          </div>

        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">

        {/* HEADER */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <p className="text-sm font-medium text-blue-400">
              Admin Panel
            </p>

            <h1 className="mt-1 text-3xl font-bold">
              User Details
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Complete information for this account.
            </p>
          </div>

          <button
            onClick={() =>
              router.push("/admin/users")
            }
            className="rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-semibold hover:bg-slate-700"
          >
            ← Back to Users
          </button>

        </div>

        {/* USER CARD */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <h2 className="text-2xl font-bold">
                {user.name}
              </h2>

              <p className="mt-1 text-slate-400">
                {user.email}
              </p>
            </div>

            <span
              className={`inline-flex w-fit rounded-full px-4 py-2 text-sm font-semibold ${
                user.isActive
                  ? "bg-green-500/10 text-green-400"
                  : "bg-red-500/10 text-red-400"
              }`}
            >
              {user.isActive
                ? "Active"
                : "Inactive"}
            </span>

          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

            <div className="rounded-xl bg-slate-950 p-5">
              <p className="text-sm text-slate-400">
                Name
              </p>

              <p className="mt-2 font-semibold">
                {user.name}
              </p>
            </div>

            <div className="rounded-xl bg-slate-950 p-5">
              <p className="text-sm text-slate-400">
                Email
              </p>

              <p className="mt-2 break-all font-semibold">
                {user.email}
              </p>
            </div>

            <div className="rounded-xl bg-slate-950 p-5">
              <p className="text-sm text-slate-400">
                Balance
              </p>

              <p className="mt-2 text-xl font-bold text-blue-400">
                {Number(
                  user.balance || 0
                ).toLocaleString()}{" "}
                USDT
              </p>
            </div>

            <div className="rounded-xl bg-slate-950 p-5">
              <p className="text-sm text-slate-400">
                Referral Code
              </p>

              <p className="mt-2 font-mono font-semibold text-purple-300">
                {user.referralCode || "—"}
              </p>
            </div>

            <div className="rounded-xl bg-slate-950 p-5 sm:col-span-2">
              <p className="text-sm text-slate-400">
                User ID
              </p>

              <p className="mt-2 break-all font-mono text-xs text-slate-500">
                {user.id}
              </p>
            </div>

          </div>

        </div>

      </div>
    </main>
  );
}