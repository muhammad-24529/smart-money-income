"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const navigation = [
  {
    name: "Dashboard",
    href: "/admin/dashboard",
    icon: "▦",
  },
  {
    name: "Users",
    href: "/admin/users",
    icon: "♙",
  },
  {
    name: "Deposits",
    href: "/admin/deposits",
    icon: "↓",
  },
  {
    name: "Withdrawals",
    href: "/admin/withdrawals",
    icon: "↑",
  },
  {
    name: "Investment Plans",
    href: "/admin/plans",
    icon: "◈",
  },
  {
    name: "Payment Methods",
    href: "/admin/payment-methods",
    icon: "▣",
  },
  {
    name: "Promo Codes",
    href: "/admin/promo-codes",
    icon: "◇",
  },
  {
    name: "Chat",
    href: "/admin/chat",
    icon: "◌",
  },
  {
    name: "News",
    href: "/admin/news",
    icon: "📰",
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    try {
      setLoggingOut(true);

      await fetch("/api/admin/logout", {
        method: "POST",
      });

      router.replace("/admin/login");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <>
      {/* Mobile Header */}
      <header className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm md:hidden">
        <div>
          <div className="text-lg font-bold tracking-tight text-gray-900">
            Smart Money
          </div>

          <div className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
            Admin Panel
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-lg text-gray-700 shadow-sm transition hover:bg-gray-50"
          aria-label="Toggle menu"
        >
          ☰
        </button>
      </header>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/20 md:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 h-screen w-64 border-r border-gray-200 bg-white shadow-sm transition-transform duration-200 ${
          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="flex h-full flex-col">

          {/* Logo */}
          <div className="border-b border-gray-100 px-5 py-5">
            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-900 text-sm font-bold text-white shadow-sm">
                SM
              </div>

              <div>
                <h1 className="text-base font-bold tracking-tight text-gray-900">
                  Smart Money
                </h1>

                <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-gray-400">
                  Admin Panel
                </p>
              </div>

            </div>
          </div>

          {/* Admin Profile */}
          <div className="mx-4 mt-4 rounded-xl border border-gray-100 bg-gray-50 p-3">
            <div className="flex items-center gap-3">

              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white">
                A
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900">
                  Administrator
                </p>

                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />

                  <span className="text-[11px] text-gray-500">
                    Online
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* Navigation Title */}
          <div className="px-4 pb-2 pt-6">
            <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-400">
              Main Menu
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto px-4">

            {navigation.map((item) => {
              const active =
                pathname === item.href ||
                pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                    active
                      ? "bg-gray-900 text-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >

                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-base ${
                      active
                        ? "bg-white/10 text-white"
                        : "bg-gray-50 text-gray-500 group-hover:bg-white group-hover:text-gray-900"
                    }`}
                  >
                    {item.icon}
                  </span>

                  <span>{item.name}</span>

                </Link>
              );
            })}

          </nav>

          {/* System Status */}
          <div className="mx-4 mb-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
            <div className="flex items-center gap-2">

              <span className="h-2 w-2 rounded-full bg-green-500" />

              <span className="text-xs font-medium text-gray-700">
                System Operational
              </span>

            </div>
          </div>

          {/* Logout */}
          <div className="border-t border-gray-100 p-4">

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
            >

              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50">
                ↪
              </span>

              <span>
                {loggingOut ? "Logging out..." : "Logout"}
              </span>

            </button>

          </div>

        </div>
      </aside>

      {/* Mobile Spacer */}
      <div className="h-16 md:hidden" />
    </>
  );
}