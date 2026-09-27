"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Stats = {
  totalUsers: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalInvestments: number;
};

type StatCardProps = {
  title: string;
  value: number;
  icon: React.ReactNode;
  href: string;
  description: string;
};

function StatCard({
  title,
  value,
  icon,
  href,
  description,
}: StatCardProps) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-zinc-400 hover:shadow-lg"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-500">{title}</p>

          <p className="mt-2 text-3xl font-bold tracking-tight text-zinc-950">
            {value.toLocaleString()}
          </p>

          <p className="mt-2 text-xs text-zinc-500">{description}</p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-950 text-white">
          {icon}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-zinc-700">
        View details
        <span className="transition-transform group-hover:translate-x-1">
          →
        </span>
      </div>
    </Link>
  );
}

function QuickAction({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-4 transition-all hover:border-zinc-400 hover:shadow-md"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-950 transition-colors group-hover:bg-zinc-950 group-hover:text-white">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="font-semibold text-zinc-950">{title}</p>
        <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
      </div>

      <span className="ml-auto text-zinc-400 transition-transform group-hover:translate-x-1">
        →
      </span>
    </Link>
  );
}

function UsersIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function DepositIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M7 12h10" />
      <path d="M12 8v8" />
    </svg>
  );
}

function WithdrawalIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M7 12h10" />
      <path d="M15 9l3 3-3 3" />
    </svg>
  );
}

function InvestmentIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M3 20h18" />
      <path d="M5 16l4-5 3 3 7-8" />
      <path d="M15 6h4v4" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function TicketIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M3 8a3 3 0 0 0 0 6v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3a3 3 0 0 0 0-6V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v3Z" />
      <path d="M13 7h4" />
      <path d="M13 12h4" />
      <path d="M13 17h4" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M20 7V5a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h15v10a2 2 0 0 1-2 2H5a3 3 0 0 1-3-3V6" />
      <path d="M16 14h.01" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.41 1.41-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-2v-.09a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-1.41-1.41.06-.06A1.7 1.7 0 0 0 9.4 15a1.7 1.7 0 0 0-1.56-1.03H7v-2h.09A1.7 1.7 0 0 0 8.65 10a1.7 1.7 0 0 0-.34-1.88l-.06-.06 1.41-1.41.06.06a1.7 1.7 0 0 0 1.88.34A1.7 1.7 0 0 0 12.63 5V5h2v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 1.41 1.41-.06.06A1.7 1.7 0 0 0 18.6 10a1.7 1.7 0 0 0 1.56 1.03H20v2h-.09A1.7 1.7 0 0 0 19.4 15Z" />
    </svg>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
    totalInvestments: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadStats = useCallback(async (isRefresh = false) => {
    try {
      setError("");

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await fetch("/api/admin/stats", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Unable to load dashboard statistics."
        );
      }

      setStats({
        totalUsers: Number(data.totalUsers || 0),
        totalDeposits: Number(data.totalDeposits || 0),
        totalWithdrawals: Number(data.totalWithdrawals || 0),
        totalInvestments: Number(data.totalInvestments || 0),
      });
    } catch (err) {
      console.error("ADMIN DASHBOARD ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load dashboard statistics."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const totalActivity =
    stats.totalDeposits +
    stats.totalWithdrawals +
    stats.totalInvestments;

  return (
    <div className="min-h-screen bg-[#f6f6f6] text-zinc-950">
      <main className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        {/* Header */}
        <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Admin Control Center
              </span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Dashboard
            </h1>

            <p className="mt-1 text-sm text-zinc-500">
              Monitor your platform activity and manage operations.
            </p>
          </div>

          <button
            onClick={() => loadStats(true)}
            disabled={refreshing}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={refreshing ? "animate-spin" : ""}
            >
              <path d="M20 11a8.1 8.1 0 0 0-15.5-2M4 5v4h4" />
              <path d="M4 13a8.1 8.1 0 0 0 15.5 2M20 19v-4h-4" />
            </svg>

            {refreshing ? "Refreshing..." : "Refresh Data"}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            <span>{error}</span>

            <button
              onClick={() => loadStats()}
              className="shrink-0 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-red-700 shadow-sm"
            >
              Retry
            </button>
          </div>
        )}

        {/* Stats */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {loading ? (
            <>
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="h-[185px] animate-pulse rounded-2xl border border-zinc-200 bg-white"
                />
              ))}
            </>
          ) : (
            <>
              <StatCard
                title="Total Users"
                value={stats.totalUsers}
                href="/admin/users"
                description="Registered platform users"
                icon={<UsersIcon />}
              />

              <StatCard
                title="Total Deposits"
                value={stats.totalDeposits}
                href="/admin/deposits"
                description="Deposit requests recorded"
                icon={<DepositIcon />}
              />

              <StatCard
                title="Total Withdrawals"
                value={stats.totalWithdrawals}
                href="/admin/withdrawals"
                description="Withdrawal requests recorded"
                icon={<WithdrawalIcon />}
              />

              <StatCard
                title="Total Investments"
                value={stats.totalInvestments}
                href="/admin/plans"
                description="Investment records created"
                icon={<InvestmentIcon />}
              />
            </>
          )}
        </section>

        {/* Main grid */}
        <section className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          {/* Platform overview */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                  Platform Overview
                </p>

                <h2 className="mt-1 text-xl font-bold">
                  Activity Snapshot
                </h2>
              </div>

              <div className="rounded-xl bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-600">
                Live Data
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-zinc-50 p-4">
                <p className="text-xs text-zinc-500">Deposits</p>
                <p className="mt-2 text-2xl font-bold">
                  {stats.totalDeposits.toLocaleString()}
                </p>
              </div>

              <div className="rounded-xl bg-zinc-50 p-4">
                <p className="text-xs text-zinc-500">Withdrawals</p>
                <p className="mt-2 text-2xl font-bold">
                  {stats.totalWithdrawals.toLocaleString()}
                </p>
              </div>

              <div className="rounded-xl bg-zinc-50 p-4">
                <p className="text-xs text-zinc-500">Investments</p>
                <p className="mt-2 text-2xl font-bold">
                  {stats.totalInvestments.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-zinc-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">
                    Total recorded activity
                  </p>

                  <p className="mt-1 text-xs text-zinc-500">
                    Combined deposits, withdrawals and investments
                  </p>
                </div>

                <p className="text-2xl font-bold">
                  {loading ? "—" : totalActivity.toLocaleString()}
                </p>
              </div>

              <div className="mt-5 h-2 overflow-hidden rounded-full bg-zinc-100">
                <div className="h-full w-full rounded-full bg-zinc-950" />
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <QuickAction
                href="/admin/deposits"
                title="Review Deposits"
                description="Manage deposit requests"
                icon={<DepositIcon />}
              />

              <QuickAction
                href="/admin/withdrawals"
                title="Review Withdrawals"
                description="Manage withdrawal requests"
                icon={<WithdrawalIcon />}
              />
            </div>
          </div>

          {/* Quick actions */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                Management
              </p>

              <h2 className="mt-1 text-xl font-bold">
                Quick Actions
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Frequently used admin controls.
              </p>
            </div>

            <div className="mt-5 space-y-3">
              <QuickAction
                href="/admin/plans"
                title="Investment Plans"
                description="Create and manage plans"
                icon={<PlusIcon />}
              />

              <QuickAction
                href="/admin/promo-codes"
                title="Promo Codes"
                description="Manage bonuses and codes"
                icon={<TicketIcon />}
              />

              <QuickAction
                href="/admin/payment-methods"
                title="Payment Methods"
                description="Manage deposit methods"
                icon={<WalletIcon />}
              />

              <QuickAction
                href="/admin/users"
                title="Users"
                description="View registered users"
                icon={<UsersIcon />}
              />

              <QuickAction
                href="/admin/chat"
                title="Support Chat"
                description="Manage user conversations"
                icon={<SettingsIcon />}
              />
            </div>
          </div>
        </section>

        {/* Bottom status */}
        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-600">
                <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
              </div>

              <div>
                <p className="text-sm font-semibold">System Status</p>
                <p className="text-xs text-zinc-500">
                  All dashboard services operational
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100">
                <UsersIcon />
              </div>

              <div>
                <p className="text-sm font-semibold">User Management</p>
                <p className="text-xs text-zinc-500">
                  {stats.totalUsers.toLocaleString()} users registered
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100">
                <InvestmentIcon />
              </div>

              <div>
                <p className="text-sm font-semibold">Investment Activity</p>
                <p className="text-xs text-zinc-500">
                  {stats.totalInvestments.toLocaleString()} records created
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="mt-8 border-t border-zinc-200 pt-5 text-center text-xs text-zinc-400">
          Admin Control Center • Smart Money Income
        </div>
      </main>
    </div>
  );
}