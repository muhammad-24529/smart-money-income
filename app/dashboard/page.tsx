"use client";

import { useEffect, useMemo, useState } from "react";

type User = {
  id: string;
  name: string;
  email: string;
  balance: number;
  referralCode?: string | null;
};

type Stats = {
  totalInvestment: number;
  dailyIncome: number;
  totalDeposited: number;
  totalWithdrawn: number;
  pendingWithdrawals: number;
  referralIncome: number;
  pendingReferralIncome: number;
};

type Investment = {
  id: string;
  planId?: string | null;
  amount: number;
  dailyIncome: number;
  durationDays: number;
  startAt: string | null;
  lastIncomeAt?: string | null;
  status: string;
};

type Deposit = {
  id: string;
  paymentMethod: string;
  amount: number;
  pkrAmount?: number;
  usdtRate?: number;
  referenceId?: string | null;
  status: string;
  createdAt: string;
};

type Withdrawal = {
  id: string;
  paymentMethod: string;
  amount: number;
  accountInfo: string;
  referenceId?: string | null;
  status: string;
  createdAt?: string;
};

type Transaction = {
  id: string;
  investmentId?: string | null;
  type: string;
  amount: number;
  description?: string | null;
  status: string;
  createdAt?: string;
};

type Notification = {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt?: string;
};

type NewsItem = {
  id: string;
  title: string;
  message: string;
  active: boolean;
  createdAt: string;
};

type ReferredUser = {
  id: string;
  name: string;
  email: string;
  isActive?: boolean;
  totalApprovedDeposit: number;
  totalPendingDeposit: number;
  totalRejectedDeposit: number;
  depositStatus: string;
  referralIncome: number;
  pendingReferralIncome: number;
};

type DashboardData = {
  user: User;
  error?: string;
  stats?: any;
  investments?: Investment[];
  deposits?: Deposit[];
  withdrawals?: Withdrawal[];
  transactions?: Transaction[];
  referralCommissions?: any[];
  referredUsers?: ReferredUser[];
};

function money(value: number | null | undefined) {
  return Number(value || 0).toFixed(2);
}

function statusClass(status: string) {
  const value = String(status || "").toUpperCase();

  if (
    value === "APPROVED" ||
    value === "COMPLETED" ||
    value === "ACTIVE"
  ) {
    return "bg-green-100 text-green-700";
  }

  if (value === "PENDING") {
    return "bg-yellow-100 text-yellow-700";
  }

  if (
    value === "REJECTED" ||
    value === "FAILED" ||
    value === "CANCELLED"
  ) {
    return "bg-red-100 text-red-700";
  }

  return "bg-gray-100 text-gray-700";
}

function getUserId() {
  if (typeof window === "undefined") {
    return "";
  }

  const savedUser =
    localStorage.getItem("smi_user") ||
    sessionStorage.getItem("smi_user");

  if (!savedUser) {
    return "";
  }

  try {
    const parsed = JSON.parse(savedUser);

    return parsed?.id ? String(parsed.id) : "";
  } catch {
    return "";
  }
}

function formatCountdown(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));

  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;

  return `${String(hours).padStart(2, "0")}:${String(
    minutes
  ).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function getNextStartTime(investment: Investment) {
  const reference =
    investment.lastIncomeAt || investment.startAt;

  if (!reference) {
    return null;
  }

  const referenceTime = new Date(reference).getTime();

  if (!Number.isFinite(referenceTime)) {
    return null;
  }

  return referenceTime + 24 * 60 * 60 * 1000;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);

  const [stats, setStats] = useState<Stats>({
    totalInvestment: 0,
    dailyIncome: 0,
    totalDeposited: 0,
    totalWithdrawn: 0,
    pendingWithdrawals: 0,
    referralIncome: 0,
    pendingReferralIncome: 0,
  });

  const [investments, setInvestments] =
    useState<Investment[]>([]);

  const [deposits, setDeposits] =
    useState<Deposit[]>([]);

  const [withdrawals, setWithdrawals] =
    useState<Withdrawal[]>([]);

  const [transactions, setTransactions] =
    useState<Transaction[]>([]);

  const [referredUsers, setReferredUsers] =
    useState<ReferredUser[]>([]);

  // =========================
  // NEWS
  // =========================

  const [news, setNews] =
    useState<NewsItem[]>([]);

  // =========================
  // NOTIFICATIONS
  // =========================

  const [notifications, setNotifications] =
    useState<Notification[]>([]);

  const [notificationOpen, setNotificationOpen] =
    useState(false);

  const [notificationLoading, setNotificationLoading] =
    useState(false);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [copied, setCopied] = useState(false);

  const [now, setNow] = useState(Date.now());

  const [startingId, setStartingId] =
    useState<string | null>(null);

  const [startMessage, setStartMessage] =
    useState("");

  const [startError, setStartError] =
    useState("");

  // =========================
  // PROMO CODE
  // =========================

  const [promoCode, setPromoCode] =
    useState("");

  const [promoLoading, setPromoLoading] =
    useState(false);

  const [promoMessage, setPromoMessage] =
    useState("");

  const [promoError, setPromoError] =
    useState("");

  // =========================
  // INITIAL LOAD
  // =========================

  useEffect(() => {
    loadDashboard();
    loadNews();
  }, []);

  // =========================
  // LOAD NOTIFICATIONS
  // =========================

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    loadNotifications();

    const notificationTimer =
      window.setInterval(() => {
        loadNotifications();
      }, 10000);

    return () => {
      window.clearInterval(notificationTimer);
    };
  }, [user?.id]);

  // =========================
  // LIVE COUNTDOWN
  // =========================

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  // =========================
  // LOAD NEWS
  // =========================

  async function loadNews() {
    try {
      const response = await fetch("/api/news", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("NEWS LOAD ERROR:", data);
        return;
      }

      setNews(
        Array.isArray(data?.news)
          ? data.news.filter(
              (item: NewsItem) =>
                item.active === true
            )
          : []
      );
    } catch (error) {
      console.error("NEWS ERROR:", error);
    }
  }

  // =========================
  // LOAD NOTIFICATIONS
  // =========================

  async function loadNotifications() {
    try {
      const userId = user?.id;

      if (!userId) {
        return;
      }

      setNotificationLoading(true);

      const response = await fetch(
        `/api/notifications?userId=${encodeURIComponent(
          userId
        )}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error(
          "NOTIFICATION LOAD ERROR:",
          data
        );

        return;
      }

      setNotifications(
        Array.isArray(data?.notifications)
          ? data.notifications
          : []
      );
    } catch (error) {
      console.error(
        "NOTIFICATION ERROR:",
        error
      );
    } finally {
      setNotificationLoading(false);
    }
  }

  // =========================
  // MARK NOTIFICATION READ
  // =========================

  async function markNotificationRead(
    notificationId: string
  ) {
    try {
      const userId = user?.id;

      if (!userId) {
        return;
      }

      const response = await fetch(
        "/api/notifications/read",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
            notificationId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error(
          "MARK NOTIFICATION READ ERROR:",
          data
        );

        return;
      }

      setNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId
            ? {
                ...notification,
                isRead: true,
              }
            : notification
        )
      );
    } catch (error) {
      console.error(
        "MARK NOTIFICATION READ ERROR:",
        error
      );
    }
  }

  // =========================
  // MARK ALL NOTIFICATIONS READ
  // =========================

  async function markAllNotificationsRead() {
    const userId = user?.id;

    if (!userId) {
      return;
    }

    try {
      const response = await fetch(
        "/api/notifications",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error(
          "MARK ALL NOTIFICATIONS ERROR:",
          data
        );

        return;
      }

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          isRead: true,
        }))
      );
    } catch (error) {
      console.error(
        "MARK ALL NOTIFICATIONS ERROR:",
        error
      );
    }
  }

  // =========================
  // LOAD DASHBOARD
  // =========================

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      const userId = getUserId();

      if (!userId) {
        window.location.href = "/login";
        return;
      }

      const response = await fetch(
        `/api/user/${encodeURIComponent(userId)}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data: DashboardData =
        await response.json();

      console.log(
        "DASHBOARD:",
        response.status,
        data
      );

      if (response.status === 401) {
        localStorage.removeItem("smi_user");
        sessionStorage.removeItem("smi_user");

        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to load dashboard."
        );
      }

      setUser(data.user);

      setStats({
        totalInvestment: Number(
          data.stats?.totalInvestment ??
            data.stats?.totalInvested ??
            0
        ),

        dailyIncome: Number(
          data.stats?.dailyIncome ??
            data.stats?.totalDailyIncome ??
            0
        ),

        totalDeposited: Number(
          data.stats?.totalDeposited ??
            data.stats?.totalDepositedUSDT ??
            0
        ),

        totalWithdrawn: Number(
          data.stats?.totalWithdrawn ??
            data.stats?.totalWithdrawnUSDT ??
            0
        ),

        pendingWithdrawals: Number(
          data.stats?.pendingWithdrawals ??
            data.stats?.totalPendingWithdrawals ??
            0
        ),

        referralIncome: Number(
          data.stats?.referralIncome ??
            data.stats?.totalReferralIncome ??
            0
        ),

        pendingReferralIncome: Number(
          data.stats?.pendingReferralIncome ?? 0
        ),
      });

      setInvestments(
        Array.isArray(data.investments)
          ? data.investments
          : []
      );

      setDeposits(
        Array.isArray(data.deposits)
          ? data.deposits
          : []
      );

      setWithdrawals(
        Array.isArray(data.withdrawals)
          ? data.withdrawals
          : []
      );

      setTransactions(
        Array.isArray(data.transactions)
          ? data.transactions
          : []
      );

      setReferredUsers(
        Array.isArray(data.referredUsers)
          ? data.referredUsers
          : []
      );
    } catch (err) {
      console.error(
        "DASHBOARD ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load dashboard."
      );
    } finally {
      setLoading(false);
    }
  }

  // =========================
  // START INVESTMENT
  // =========================

  async function startInvestment(
    investment: Investment
  ) {
    const userId =
      user?.id || getUserId();

    if (!userId) {
      window.location.href = "/login";
      return;
    }

    const status = String(
      investment.status || ""
    ).toUpperCase();

    if (status === "COMPLETED") {
      return;
    }

    const nextStart =
      getNextStartTime(investment);

    if (nextStart) {
      const remaining =
        nextStart - Date.now();

      if (remaining > 0) {
        setStartError(
          `START is locked. ${formatCountdown(
            Math.ceil(
              remaining / 1000
            )
          )} remaining.`
        );

        return;
      }
    }

    try {
      setStartingId(investment.id);
      setStartMessage("");
      setStartError("");

      const response = await fetch(
        "/api/investments/start",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            userId,
            investmentId:
              investment.id,
          }),
        }
      );

      const data =
        await response.json();

      console.log(
        "START RESPONSE:",
        response.status,
        data
      );

      if (!response.ok) {
        if (data?.locked) {
          setStartError(
            `START is locked. ${formatCountdown(
              Number(
                data.remainingSeconds || 0
              )
            )} remaining.`
          );
        } else {
          setStartError(
            data?.error ||
              "Unable to start investment."
          );
        }

        return;
      }

      setStartMessage(
        data?.message ||
          "START successful. Daily income added to your wallet."
      );

      await loadDashboard();
      await loadNotifications();
    } catch (err) {
      console.error(
        "START ERROR:",
        err
      );

      setStartError(
        err instanceof Error
          ? err.message
          : "Unable to start investment."
      );
    } finally {
      setStartingId(null);
    }
  }

  // =========================
  // REDEEM PROMO CODE
  // =========================

  async function redeemPromoCode() {
    const userId =
      user?.id || getUserId();

    const code =
      promoCode.trim().toUpperCase();

    if (!userId) {
      window.location.href = "/login";
      return;
    }

    if (!code) {
      setPromoError(
        "Please enter a promo code."
      );
      setPromoMessage("");
      return;
    }

    try {
      setPromoLoading(true);
      setPromoMessage("");
      setPromoError("");

      const response = await fetch(
        "/api/promo/redeem",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            userId,
            code,
          }),
        }
      );

      const data =
        await response.json();

      console.log(
        "PROMO REDEEM:",
        response.status,
        data
      );

      if (!response.ok) {
        setPromoError(
          data?.error ||
            "Unable to redeem promo code."
        );
        return;
      }

      setPromoMessage(
        data?.message ||
          "Promo code redeemed successfully."
      );

      setPromoCode("");

      await loadDashboard();
      await loadNotifications();
    } catch (error) {
      console.error(
        "PROMO REDEEM ERROR:",
        error
      );

      setPromoError(
        error instanceof Error
          ? error.message
          : "Unable to redeem promo code."
      );
    } finally {
      setPromoLoading(false);
    }
  }

  // =========================
  // REFERRAL COPY
  // =========================

  async function copyReferralLink() {
    if (!user?.referralCode) {
      return;
    }

    const link =
      `${window.location.origin}/register?ref=${encodeURIComponent(
        user.referralCode
      )}`;

    try {
      await navigator.clipboard.writeText(
        link
      );

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error(
        "COPY ERROR:",
        error
      );
    }
  }

  // =========================
  // REFERRAL SHARE
  // =========================

  async function shareReferralLink() {
    if (!user?.referralCode) {
      return;
    }

    const link =
      `${window.location.origin}/register?ref=${encodeURIComponent(
        user.referralCode
      )}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title:
            "Smart Money Income",
          text:
            "Join Smart Money Income using my referral link.",
          url: link,
        });
      } else {
        await navigator.clipboard.writeText(
          link
        );

        setCopied(true);

        setTimeout(() => {
          setCopied(false);
        }, 2000);
      }
    } catch (error) {
      console.error(
        "SHARE ERROR:",
        error
      );
    }
  }

  // =========================
  // LOGOUT
  // =========================

  function logout() {
    localStorage.removeItem("smi_user");
    sessionStorage.removeItem("smi_user");

    window.location.href = "/login";
  }

  // =========================
  // ACTIVE INVESTMENTS
  // =========================

  const activeInvestments =
    useMemo(() => {
      return investments.filter(
        (investment) => {
          const status =
            String(
              investment.status || ""
            ).toUpperCase();

          return (
            status === "ACTIVE" ||
            status === "COMPLETED"
          );
        }
      );
    }, [investments]);

  // =========================
  // UNREAD NOTIFICATIONS
  // =========================

  const unreadNotifications =
    useMemo(() => {
      return notifications.filter(
        (notification) =>
          !notification.isRead
      );
    }, [notifications]);

  // =========================
  // LOADING
  // =========================

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />

            <p className="mt-4 text-gray-600">
              Loading dashboard...
            </p>
          </div>
        </div>
      </main>
    );
  }

  // =========================
  // ERROR
  // =========================

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 text-center shadow-lg sm:p-8">
            <h2 className="text-2xl font-bold text-red-600">
              Unable to Load Dashboard
            </h2>

            <p className="mt-4 break-words text-gray-600">
              {error}
            </p>

            <button
              type="button"
              onClick={loadDashboard}
              className="mt-6 w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 sm:w-auto"
            >
              Try Again
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  const referralLink =
    user.referralCode
      ? `${window.location.origin}/register?ref=${encodeURIComponent(
          user.referralCode
        )}`
      : "";

  return (
    <main className="min-h-screen overflow-x-hidden bg-gray-50">

      {/* ================= HEADER ================= */}

      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 sm:py-5 lg:flex-row lg:items-center lg:justify-between lg:px-8">

          <div className="min-w-0">
            <a
              href="/dashboard"
              className="block truncate text-xl font-bold text-blue-600 sm:text-2xl"
            >
              Smart Money Income
            </a>

            <p className="mt-1 text-xs text-gray-500 sm:text-sm">
              Investment Dashboard
            </p>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end">

            {/* NOTIFICATIONS */}

            <div className="relative">

              <button
                type="button"
                onClick={() =>
                  setNotificationOpen(
                    (current) =>
                      !current
                  )
                }
                className="relative rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 sm:px-4"
                aria-label="Notifications"
              >
                Notifications

                {unreadNotifications.length >
                  0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white sm:text-xs">
                    {unreadNotifications.length >
                    99
                      ? "99+"
                      : unreadNotifications.length}
                  </span>
                )}
              </button>

              {notificationOpen && (
                <div className="absolute right-0 z-50 mt-3 w-[calc(100vw-32px)] max-w-[360px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">

                  <div className="flex items-start justify-between gap-3 border-b px-4 py-4 sm:px-5">

                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-900">
                        Notifications
                      </h3>

                      <p className="mt-1 text-xs text-gray-500">
                        Your latest account updates
                      </p>
                    </div>

                    {unreadNotifications.length >
                      0 && (
                      <button
                        type="button"
                        onClick={
                          markAllNotificationsRead
                        }
                        className="shrink-0 text-xs font-semibold text-blue-600 hover:underline"
                      >
                        Mark all read
                      </button>
                    )}

                  </div>

                  <div className="max-h-[420px] overflow-y-auto">

                    {notificationLoading ? (

                      <div className="p-8 text-center">

                        <div className="mx-auto h-7 w-7 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />

                        <p className="mt-3 text-sm text-gray-500">
                          Loading notifications...
                        </p>

                      </div>

                    ) : notifications.length === 0 ? (

                      <div className="p-8 text-center">

                        <div className="text-2xl font-bold text-gray-400">
                          Notifications
                        </div>

                        <p className="mt-3 font-semibold text-gray-700">
                          No notifications
                        </p>

                        <p className="mt-1 text-sm text-gray-400">
                          You are all caught up.
                        </p>

                      </div>

                    ) : (

                      notifications.map(
                        (notification) => (

                          <button
                            type="button"
                            key={
                              notification.id
                            }
                            onClick={() => {
                              if (
                                !notification.isRead
                              ) {
                                markNotificationRead(
                                  notification.id
                                );
                              }
                            }}
                            className={`block w-full border-b px-4 py-4 text-left transition last:border-b-0 hover:bg-gray-50 sm:px-5 ${
                              notification.isRead
                                ? "bg-white"
                                : "bg-blue-50"
                            }`}
                          >

                            <div className="flex gap-3">

                              <div className="mt-1 shrink-0 text-xs font-semibold text-gray-500">
                                {notification.isRead
                                  ? "READ"
                                  : "NEW"}
                              </div>

                              <div className="min-w-0 flex-1">

                                <div className="flex items-start justify-between gap-2">

                                  <p className="break-words font-semibold text-gray-900">
                                    {
                                      notification.title
                                    }
                                  </p>

                                  {!notification.isRead && (
                                    <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600" />
                                  )}

                                </div>

                                <p className="mt-1 break-words text-sm leading-5 text-gray-600">
                                  {
                                    notification.message
                                  }
                                </p>

                                {notification.createdAt && (
                                  <p className="mt-2 text-xs text-gray-400">
                                    {new Date(
                                      notification.createdAt
                                    ).toLocaleString()}
                                  </p>
                                )}

                                {!notification.isRead && (
                                  <p className="mt-2 text-xs font-semibold text-blue-600">
                                    Click to mark as read
                                  </p>
                                )}

                              </div>

                            </div>

                          </button>

                        )
                      )

                    )}

                  </div>

                </div>
              )}

            </div>

            {/* PROFILE */}

            <a
              href="/profile"
              className="rounded-lg bg-purple-600 px-3 py-2 text-sm font-semibold text-white hover:bg-purple-700 sm:px-4"
            >
              Profile
            </a>

            {/* WHATSAPP */}

            <a
              href="https://wa.me/13435127589"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 sm:px-4"
            >
              WhatsApp
            </a>

            {/* DEPOSIT */}

            <a
              href="/deposit"
              className="rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 sm:px-4"
            >
              Deposit
            </a>

            {/* WITHDRAW */}

            <a
              href="/withdraw"
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 sm:px-4"
            >
              Withdraw
            </a>

            {/* LOGOUT */}

            <button
              type="button"
              onClick={logout}
              className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 sm:px-4"
            >
              Logout
            </button>

          </div>
        </div>
      </header>

      {/* ================= MAIN ================= */}

      <section className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

        {/* ================= NEWS ================= */}

        <div className="mb-6 overflow-hidden rounded-xl border border-blue-200 bg-blue-50 shadow-sm">

          <div className="flex items-stretch">

            <div className="flex shrink-0 items-center bg-blue-600 px-4 py-3 font-bold text-white sm:px-5">
              NEWS
            </div>

            <div className="min-w-0 flex-1 px-4 py-3 sm:px-5">

              {news.length === 0 ? (

                <p className="text-sm font-semibold text-blue-700">
                  No announcements at the moment.
                </p>

              ) : (

                <div className="space-y-3">

                  {news.map((item) => (

                    <div
                      key={item.id}
                      className="border-b border-blue-200 pb-3 last:border-b-0 last:pb-0"
                    >

                      <p className="text-sm font-bold text-blue-900">
                        {item.title}
                      </p>

                      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-blue-700">
                        {item.message}
                      </p>

                      <p className="mt-1 text-xs text-blue-400">
                        {new Date(
                          item.createdAt
                        ).toLocaleString()}
                      </p>

                    </div>

                  ))}

                </div>

              )}

            </div>

          </div>

        </div>

        {/* ================= WELCOME ================= */}

        <div className="mb-6 sm:mb-8">

          <h2 className="break-words text-2xl font-bold text-gray-900 sm:text-3xl">
            Welcome, {user.name}
          </h2>

          <p className="mt-2 text-sm leading-6 text-gray-500 sm:text-base">
            Manage your wallet, investments and
            referral income from here.
          </p>

        </div>

        {/* ================= STATS ================= */}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
            <p className="text-sm text-gray-500">
              Wallet Balance
            </p>

            <p className="mt-3 break-words text-2xl font-bold text-gray-900 sm:text-3xl">
              {money(user.balance)}

              <span className="ml-2 text-sm font-medium text-gray-500 sm:text-base">
                USDT
              </span>
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
            <p className="text-sm text-gray-500">
              Referral Income
            </p>

            <p className="mt-3 break-words text-2xl font-bold text-green-600 sm:text-3xl">
              {money(stats.referralIncome)}

              <span className="ml-2 text-sm font-medium text-gray-500 sm:text-base">
                USDT
              </span>
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
            <p className="text-sm text-gray-500">
              Total Investment
            </p>

            <p className="mt-3 break-words text-2xl font-bold text-blue-600 sm:text-3xl">
              {money(stats.totalInvestment)}

              <span className="ml-2 text-sm font-medium text-gray-500 sm:text-base">
                USDT
              </span>
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
            <p className="text-sm text-gray-500">
              Daily Income
            </p>

            <p className="mt-3 break-words text-2xl font-bold text-purple-600 sm:text-3xl">
              {money(stats.dailyIncome)}

              <span className="ml-2 text-sm font-medium text-gray-500 sm:text-base">
                USDT
              </span>
            </p>
          </div>

        </div>

        {/* ================= QUICK ACTIONS ================= */}

        <div className="mt-6 grid grid-cols-1 gap-3 sm:mt-8 sm:grid-cols-3 sm:gap-4">

          <a
            href="/deposit"
            className="rounded-2xl bg-green-600 p-4 text-center font-bold text-white shadow-sm transition hover:bg-green-700 sm:p-5"
          >
            + Deposit Money
          </a>

          <a
            href="/plans"
            className="rounded-2xl bg-blue-600 p-4 text-center font-bold text-white shadow-sm transition hover:bg-blue-700 sm:p-5"
          >
            View Investment Plans
          </a>

          <a
            href="/withdraw"
            className="rounded-2xl bg-gray-900 p-4 text-center font-bold text-white shadow-sm transition hover:bg-gray-800 sm:p-5"
          >
            Withdraw Money
          </a>

        </div>

        {/* ================= REFERRAL ================= */}

        <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm sm:mt-8 sm:p-6">

          <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">
            Referral Program
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Invite users and earn referral commission.
          </p>

          <div className="mt-4 rounded-xl bg-blue-50 p-4">

            <p className="text-sm font-semibold text-blue-800">
              Referral Benefits
            </p>

            <p className="mt-2 text-sm text-blue-700">
              - Earn <strong>10% referral commission</strong>
            </p>

            <p className="mt-1 text-sm text-blue-700">
              - Get a special reward after <strong>50 referrals</strong>
            </p>

            <p className="mt-1 text-sm text-blue-700">
              - Reach <strong>500 referrals</strong> and qualify for a{" "}
              <strong>$1,000 monthly salary</strong>
            </p>

          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">

            <div className="rounded-xl border bg-gray-50 p-4 sm:p-5">

              <p className="text-sm text-gray-500">
                Your Referral Code
              </p>

              <p className="mt-2 break-all text-xl font-bold text-blue-600 sm:text-2xl">
                {user.referralCode || "N/A"}
              </p>

            </div>

            <div className="rounded-xl border bg-gray-50 p-4 sm:p-5">

              <p className="text-sm text-gray-500">
                Your Referral Link
              </p>

              <div className="mt-3 flex flex-col gap-3">

                <input
                  type="text"
                  value={referralLink}
                  readOnly
                  className="min-w-0 w-full rounded-lg border bg-white px-3 py-2.5 text-xs text-gray-700 outline-none sm:text-sm"
                />

                <div className="grid grid-cols-2 gap-2">

                  <button
                    type="button"
                    onClick={copyReferralLink}
                    disabled={!referralLink}
                    className="rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {copied
                      ? "Copied!"
                      : "Copy"}
                  </button>

                  <button
                    type="button"
                    onClick={shareReferralLink}
                    disabled={!referralLink}
                    className="rounded-lg bg-green-600 px-4 py-2.5 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Share
                  </button>

                </div>

              </div>

            </div>

          </div>

        </div>

        {/* ================= PROMO CODE ================= */}

        <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm sm:mt-8 sm:p-6">

          <div className="flex items-start gap-3">

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-sm font-bold text-purple-700">
              PROMO
            </div>

            <div>

              <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">
                Promo Code
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Enter your promo code to claim your available reward.
              </p>

            </div>

          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">

            <input
              type="text"
              value={promoCode}
              onChange={(event) => {
                setPromoCode(
                  event.target.value.toUpperCase()
                );

                setPromoError("");
                setPromoMessage("");
              }}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !promoLoading
                ) {
                  redeemPromoCode();
                }
              }}
              placeholder="Enter promo code"
              maxLength={50}
              className="min-w-0 flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 font-semibold uppercase text-gray-900 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
            />

            <button
              type="button"
              onClick={redeemPromoCode}
              disabled={
                promoLoading ||
                !promoCode.trim()
              }
              className="rounded-xl bg-purple-600 px-6 py-3 font-bold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {promoLoading
                ? "Redeeming..."
                : "Redeem"}
            </button>

          </div>

          {promoMessage && (
            <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700 sm:text-base">
              SUCCESS: {promoMessage}
            </div>
          )}

          {promoError && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 sm:text-base">
              WARNING: {promoError}
            </div>
          )}

          <div className="mt-4 rounded-xl bg-purple-50 p-4">

            <p className="text-sm font-semibold text-purple-800">
              Promo rewards
            </p>

            <p className="mt-1 text-xs leading-5 text-purple-600 sm:text-sm">
              Promo codes may require a specific number of successful referrals before they can be redeemed.
            </p>

          </div>

        </div>

        {/* ================= ACTIVE INVESTMENTS ================= */}

        <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm sm:mt-8 sm:p-6">

          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">

            <div>

              <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">
                Active Investments
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                START is available every 24 hours.
              </p>

            </div>

            <a
              href="/plans"
              className="w-fit font-semibold text-blue-600 hover:underline"
            >
              View Plans
            </a>

          </div>

          {startMessage && (
            <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700 sm:text-base">
              SUCCESS: {startMessage}
            </div>
          )}

          {startError && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 sm:text-base">
              WARNING: {startError}
            </div>
          )}

          {activeInvestments.length === 0 ? (

            <div className="mt-6 rounded-xl border border-dashed p-6 text-center sm:p-8">

              <p className="font-semibold text-gray-700">
                No investments yet.
              </p>

              <a
                href="/plans"
                className="mt-3 inline-block font-semibold text-blue-600"
              >
                Choose an investment plan
              </a>

            </div>

          ) : (

            <div className="mt-6 overflow-x-auto rounded-xl border">

              <table className="w-full min-w-[1050px] text-left text-sm">

                <thead>

                  <tr className="border-b bg-gray-50">

                    <th className="px-4 py-3 font-semibold text-gray-600">
                      Amount
                    </th>

                    <th className="px-4 py-3 font-semibold text-gray-600">
                      Daily Income
                    </th>

                    <th className="px-4 py-3 font-semibold text-gray-600">
                      Duration
                    </th>

                    <th className="px-4 py-3 font-semibold text-gray-600">
                      Purchased
                    </th>

                    <th className="px-4 py-3 font-semibold text-gray-600">
                      Status
                    </th>

                    <th className="px-4 py-3 font-semibold text-gray-600">
                      Daily START
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {activeInvestments.map(
                    (investment) => {

                      const status =
                        String(
                          investment.status || ""
                        ).toUpperCase();

                      const nextStart =
                        getNextStartTime(
                          investment
                        );

                      const remainingSeconds =
                        nextStart
                          ? Math.max(
                              0,
                              Math.ceil(
                                (nextStart -
                                  now) /
                                  1000
                              )
                            )
                          : 0;

                      const ready =
                        status === "ACTIVE" &&
                        remainingSeconds <= 0;

                      const starting =
                        startingId ===
                        investment.id;

                      return (
                        <tr
                          key={investment.id}
                          className="border-b last:border-b-0 hover:bg-gray-50"
                        >

                          <td className="px-4 py-5 font-semibold text-gray-900">
                            {money(
                              investment.amount
                            )}{" "}
                            USDT
                          </td>

                          <td className="px-4 py-5 font-semibold text-green-600">
                            +
                            {money(
                              investment.dailyIncome
                            )}{" "}
                            USDT
                          </td>

                          <td className="px-4 py-5 text-gray-600">
                            {investment.durationDays}{" "}
                            days
                          </td>

                          <td className="px-4 py-5 text-gray-600">
                            {investment.startAt
                              ? new Date(
                                  investment.startAt
                                ).toLocaleString()
                              : "-"}
                          </td>

                          <td className="px-4 py-5">

                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                                investment.status
                              )}`}
                            >
                              {investment.status}
                            </span>

                          </td>

                          <td className="px-4 py-5">

                            {status ===
                            "COMPLETED" ? (

                              <div>

                                <span className="inline-flex rounded-lg bg-gray-100 px-4 py-2 font-semibold text-gray-500">
                                  Completed
                                </span>

                                <p className="mt-2 text-xs text-gray-400">
                                  All income cycles completed.
                                </p>

                              </div>

                            ) : ready ? (

                              <div>

                                <button
                                  type="button"
                                  onClick={() =>
                                    startInvestment(
                                      investment
                                    )
                                  }
                                  disabled={
                                    starting
                                  }
                                  className="rounded-lg bg-green-600 px-6 py-3 font-bold text-white shadow-sm hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {starting
                                    ? "STARTING..."
                                    : "START"}
                                </button>

                                <p className="mt-2 text-xs font-semibold text-green-600">
                                  Daily income available
                                </p>

                              </div>

                            ) : (

                              <div>

                                <button
                                  type="button"
                                  disabled
                                  className="cursor-not-allowed rounded-lg bg-gray-200 px-6 py-3 font-bold text-gray-500"
                                >
                                  START
                                </button>

                                <p className="mt-2 text-lg font-bold text-orange-600">
                                  {formatCountdown(
                                    remainingSeconds
                                  )}
                                </p>

                                <p className="text-xs text-gray-400">
                                  Time remaining
                                </p>

                              </div>

                            )}

                          </td>

                        </tr>
                      );
                    }
                  )}

                </tbody>

              </table>

            </div>

          )}

        </div>

        {/* ================= REFERRED USERS ================= */}

        <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm sm:mt-8 sm:p-6">

          <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">
            Referred Users
          </h2>

          {referredUsers.length === 0 ? (

            <div className="mt-5 rounded-xl border border-dashed p-6 text-center text-sm text-gray-500 sm:p-8">
              No referred users yet.
            </div>

          ) : (

            <div className="mt-5 overflow-x-auto rounded-xl border">

              <table className="w-full min-w-[800px] text-left text-sm">

                <thead>

                  <tr className="border-b bg-gray-50">

                    <th className="px-4 py-3">
                      User
                    </th>

                    <th className="px-4 py-3">
                      Email
                    </th>

                    <th className="px-4 py-3">
                      Approved Deposit
                    </th>

                    <th className="px-4 py-3">
                      Your Income
                    </th>

                    <th className="px-4 py-3">
                      Status
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {referredUsers.map(
                    (item) => (

                      <tr
                        key={item.id}
                        className="border-b last:border-b-0"
                      >

                        <td className="px-4 py-4 font-semibold">
                          {item.name}
                        </td>

                        <td className="px-4 py-4 text-gray-600">
                          {item.email}
                        </td>

                        <td className="px-4 py-4 text-green-600">
                          {money(
                            item.totalApprovedDeposit
                          )}{" "}
                          USDT
                        </td>

                        <td className="px-4 py-4 text-blue-600">
                          {money(
                            item.referralIncome
                          )}{" "}
                          USDT
                        </td>

                        <td className="px-4 py-4">

                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                              item.depositStatus
                            )}`}
                          >
                            {item.depositStatus}
                          </span>

                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          )}

        </div>

        {/* ================= DEPOSITS ================= */}

        <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm sm:mt-8 sm:p-6">

          <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">
            Recent Deposits
          </h2>

          {deposits.length === 0 ? (

            <div className="mt-5 rounded-xl border border-dashed p-6 text-center text-sm text-gray-500 sm:p-8">
              No deposits found.
            </div>

          ) : (

            <div className="mt-5 overflow-x-auto rounded-xl border">

              <table className="w-full min-w-[700px] text-left text-sm">

                <thead>

                  <tr className="border-b bg-gray-50">

                    <th className="px-4 py-3">
                      Method
                    </th>

                    <th className="px-4 py-3">
                      Amount
                    </th>

                    <th className="px-4 py-3">
                      Reference
                    </th>

                    <th className="px-4 py-3">
                      Status
                    </th>

                    <th className="px-4 py-3">
                      Date
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {deposits
                    .slice(0, 10)
                    .map(
                      (deposit) => (

                        <tr
                          key={deposit.id}
                          className="border-b last:border-b-0"
                        >

                          <td className="px-4 py-4">
                            {deposit.paymentMethod}
                          </td>

                          <td className="px-4 py-4 font-semibold">
                            {money(
                              deposit.amount
                            )}{" "}
                            USDT
                          </td>

                          <td className="px-4 py-4 break-all">
                            {deposit.referenceId ||
                              "-"}
                          </td>

                          <td className="px-4 py-4">

                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                                deposit.status
                              )}`}
                            >
                              {deposit.status}
                            </span>

                          </td>

                          <td className="px-4 py-4 text-gray-500">
                            {deposit.createdAt
                              ? new Date(
                                  deposit.createdAt
                                ).toLocaleDateString()
                              : "-"}
                          </td>

                        </tr>

                      )
                    )}

                </tbody>

              </table>

            </div>

          )}

        </div>

        {/* ================= TRANSACTIONS ================= */}

        <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm sm:mt-8 sm:p-6">

          <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">
            Recent Transactions
          </h2>

          {transactions.length === 0 ? (

            <div className="mt-5 rounded-xl border border-dashed p-6 text-center text-sm text-gray-500 sm:p-8">
              No transactions found.
            </div>

          ) : (

            <div className="mt-5 overflow-x-auto rounded-xl border">

              <table className="w-full min-w-[750px] text-left text-sm">

                <thead>

                  <tr className="border-b bg-gray-50">

                    <th className="px-4 py-3">
                      Type
                    </th>

                    <th className="px-4 py-3">
                      Amount
                    </th>

                    <th className="px-4 py-3">
                      Description
                    </th>

                    <th className="px-4 py-3">
                      Status
                    </th>

                    <th className="px-4 py-3">
                      Date
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {transactions
                    .slice(0, 10)
                    .map(
                      (transaction) => (

                        <tr
                          key={
                            transaction.id
                          }
                          className="border-b last:border-b-0"
                        >

                          <td className="px-4 py-4 font-semibold">
                            {transaction.type}
                          </td>

                          <td className="px-4 py-4 font-semibold text-blue-600">
                            {money(
                              transaction.amount
                            )}{" "}
                            USDT
                          </td>

                          <td className="max-w-[300px] px-4 py-4 break-words">
                            {transaction.description ||
                              "-"}
                          </td>

                          <td className="px-4 py-4">

                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                                transaction.status
                              )}`}
                            >
                              {transaction.status}
                            </span>

                          </td>

                          <td className="px-4 py-4 text-gray-500">
                            {transaction.createdAt
                              ? new Date(
                                  transaction.createdAt
                                ).toLocaleDateString()
                              : "-"}
                          </td>

                        </tr>

                      )
                    )}

                </tbody>

              </table>

            </div>

          )}

        </div>

        {/* ================= WITHDRAWALS ================= */}

        <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm sm:mt-8 sm:p-6">

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">
              Recent Withdrawals
            </h2>

            <a
              href="/withdraw"
              className="w-fit font-semibold text-blue-600 hover:underline"
            >
              New Withdrawal
            </a>

          </div>

          {withdrawals.length === 0 ? (

            <div className="mt-5 rounded-xl border border-dashed p-6 text-center text-sm text-gray-500 sm:p-8">
              No withdrawals found.
            </div>

          ) : (

            <div className="mt-5 overflow-x-auto rounded-xl border">

              <table className="w-full min-w-[750px] text-left text-sm">

                <thead>

                  <tr className="border-b bg-gray-50">

                    <th className="px-4 py-3">
                      Method
                    </th>

                    <th className="px-4 py-3">
                      Amount
                    </th>

                    <th className="px-4 py-3">
                      Account
                    </th>

                    <th className="px-4 py-3">
                      Status
                    </th>

                    <th className="px-4 py-3">
                      Date
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {withdrawals
                    .slice(0, 10)
                    .map(
                      (withdrawal) => (

                        <tr
                          key={
                            withdrawal.id
                          }
                          className="border-b last:border-b-0"
                        >

                          <td className="px-4 py-4">
                            {withdrawal.paymentMethod}
                          </td>

                          <td className="px-4 py-4 font-semibold text-red-600">
                            {money(
                              withdrawal.amount
                            )}{" "}
                            USDT
                          </td>

                          <td className="max-w-[250px] truncate px-4 py-4">
                            {withdrawal.accountInfo}
                          </td>

                          <td className="px-4 py-4">

                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                                withdrawal.status
                              )}`}
                            >
                              {withdrawal.status}
                            </span>

                          </td>

                          <td className="px-4 py-4 text-gray-500">
                            {withdrawal.createdAt
                              ? new Date(
                                  withdrawal.createdAt
                                ).toLocaleDateString()
                              : "-"}
                          </td>

                        </tr>

                      )
                    )}

                </tbody>

              </table>

            </div>

          )}

        </div>

        {/* ================= FOOTER ================= */}

        <footer className="mt-8 border-t py-8 text-center text-xs text-gray-500 sm:mt-10 sm:text-sm">
          (c) {new Date().getFullYear()} Smart Money Income.
          All rights reserved.
        </footer>

      </section>

    </main>
  );
}