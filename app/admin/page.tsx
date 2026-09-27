
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminPage() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const logout = async () => {
    try {
      setLoggingOut(true);

      await fetch("/api/admin/auth/logout", {
        method: "POST",
      });
    } catch (error) {
      console.error("LOGOUT ERROR:", error);
    } finally {
      localStorage.removeItem("smi_admin");
      router.replace("/admin-login");
      router.refresh();
    }
  };

  const buttons = [
    {
      title: "Users",
      icon: "👥",
      description: "View and manage users",
      path: "/admin/users",
    },
    {
      title: "Deposits",
      icon: "💰",
      description: "Approve or reject deposits",
      path: "/admin/deposits",
    },
    {
      title: "Withdrawals",
      icon: "💸",
      description: "Manage withdrawal requests",
      path: "/admin/withdrawals",
    },
    {
      title: "Investment Plans",
      icon: "📊",
      description: "Manage investment plans",
      path: "/admin/plans",
    },
    {
      title: "Payment Methods",
      icon: "💳",
      description: "Manage payment methods",
      path: "/admin/payment-methods",
    },
    {
      title: "Promo Codes",
      icon: "🎁",
      description: "Manage promotional codes",
      path: "/admin/promo-codes",
    },
    {
      title: "Chat",
      icon: "💬",
      description: "Manage user support messages",
      path: "/admin/chat",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-gray-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}
        <div className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <p className="text-sm font-semibold text-blue-400">
                Smart Money Income
              </p>

              <h1 className="mt-1 text-3xl font-bold">
                Admin Panel
              </h1>

              <p className="mt-2 text-sm text-slate-400">
                Manage users, deposits, withdrawals, plans and system settings.
              </p>
            </div>

            <button
              onClick={logout}
              disabled={loggingOut}
              className="rounded-xl bg-red-600 px-5 py-3 font-semibold transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loggingOut ? "Logging out..." : "🚪 Logout"}
            </button>

          </div>
        </div>

        {/* ADMIN MENU */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">

          {buttons.map((button) => (
            <button
              key={button.path}
              type="button"
              onClick={() => router.push(button.path)}
              className="group rounded-2xl border border-slate-800 bg-slate-900 p-6 text-left shadow-lg transition hover:-translate-y-1 hover:border-slate-600 hover:bg-slate-800 hover:shadow-2xl"
            >

              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-slate-950 text-2xl transition group-hover:scale-105">
                {button.icon}
              </div>

              <h2 className="text-xl font-bold text-gray-900">
                {button.title}
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                {button.description}
              </p>

              <div className="mt-5 text-sm font-semibold text-blue-400">
                Open →
              </div>

            </button>
          ))}

          {/* REFRESH */}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="group rounded-2xl border border-slate-800 bg-slate-900 p-6 text-left shadow-lg transition hover:-translate-y-1 hover:border-slate-600 hover:bg-slate-800 hover:shadow-2xl"
          >

            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-slate-950 text-2xl transition group-hover:rotate-180">
              🔄
            </div>

            <h2 className="text-xl font-bold text-gray-900">
              Refresh
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Refresh the admin panel and reload the latest data.
            </p>

            <div className="mt-5 text-sm font-semibold text-blue-400">
              Refresh →
            </div>

          </button>

        </div>

      </div>
    </main>
  );
}
