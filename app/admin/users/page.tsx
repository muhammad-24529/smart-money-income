
"use client";

import { useEffect, useState } from "react";

type ReferredUser = {
  id: string;
  name: string;
  email: string;
  balance: number;
  isActive: boolean;
  hasDeposit: boolean;
  hasApprovedDeposit: boolean;
  totalDepositedUSDT: number;
  pendingUSDT: number;
  rejectedUSDT: number;
  approvedDepositCount: number;
  pendingDepositCount: number;
  rejectedDepositCount: number;
  referralCommission: number;
};

type Referral = {
  totalReferred: number;
  usersWithDeposit: number;
  usersWithApprovedDeposit: number;
  totalCommission: number;
  referredUsers: ReferredUser[];
};

type User = {
  id: string;
  name: string;
  email: string;
  balance: number;
  isActive: boolean;
  referralCode: string | null;
  referral?: Referral;
};

type BalanceAction = "ADD" | "DEDUCT";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [generatingReferralCodes, setGeneratingReferralCodes] =
    useState(false);

  const [balanceUser, setBalanceUser] = useState<User | null>(null);
  const [balanceAction, setBalanceAction] =
    useState<BalanceAction>("ADD");
  const [balanceAmount, setBalanceAmount] = useState("");

  const [referralUser, setReferralUser] =
    useState<User | null>(null);

  const [deleteUser, setDeleteUser] =
    useState<User | null>(null);

  const [loggingOut, setLoggingOut] = useState(false);

  // =========================
  // LOAD USERS
  // =========================

  async function loadUsers() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/admin/users", {
        method: "GET",
        cache: "no-store",
      });

      const text = await response.text();

      let data: {
        users?: User[];
        error?: string;
      } = {};

      if (text.trim()) {
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(
            `Server returned invalid JSON. HTTP ${response.status}`
          );
        }
      }

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to load users."
        );
      }

      setUsers(data.users || []);
    } catch (err) {
      console.error("LOAD USERS ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load users."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  // =========================
  // GENERATE REFERRAL CODES
  // =========================

  async function generateReferralCodes() {
    try {
      setGeneratingReferralCodes(true);
      setError("");
      setSuccess("");

      const response = await fetch(
        "/api/admin/generate-referral-codes",
        {
          method: "POST",
        }
      );

      const text = await response.text();

      let data: {
        success?: boolean;
        message?: string;
        error?: string;
        totalUsers?: number;
        updated?: number;
      } = {};

      if (text.trim()) {
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(
            `Server returned invalid JSON. HTTP ${response.status}`
          );
        }
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            `Failed to generate referral codes. HTTP ${response.status}`
        );
      }

      setSuccess(
        data.message ||
          `Referral codes generated successfully. ${
            data.updated || 0
          } users updated.`
      );

      await loadUsers();
    } catch (err) {
      console.error(
        "GENERATE REFERRAL CODES ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to generate referral codes."
      );
    } finally {
      setGeneratingReferralCodes(false);
    }
  }

  // =========================
  // ACTIVATE / DEACTIVATE
  // =========================

  async function toggleUser(user: User) {
    try {
      setUpdatingId(user.id);
      setError("");
      setSuccess("");

      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          isActive: !user.isActive,
        }),
      });

      const text = await response.text();

      let data: {
        message?: string;
        error?: string;
        user?: User;
      } = {};

      if (text.trim()) {
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(
            `Server returned invalid JSON. HTTP ${response.status}`
          );
        }
      }

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to update user."
        );
      }

      setSuccess(
        data.message || "User status updated successfully."
      );

      if (data.user) {
        setUsers((currentUsers) =>
          currentUsers.map((item) =>
            item.id === user.id
              ? {
                  ...item,
                  isActive: data.user!.isActive,
                }
              : item
          )
        );
      }
    } catch (err) {
      console.error("TOGGLE USER ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to update user."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  // =========================
  // BALANCE MODAL
  // =========================

  function openBalanceModal(
    user: User,
    action: BalanceAction
  ) {
    setBalanceUser(user);
    setBalanceAction(action);
    setBalanceAmount("");
    setError("");
    setSuccess("");
  }

  function closeBalanceModal() {
    if (updatingId) return;

    setBalanceUser(null);
    setBalanceAmount("");
  }

  // =========================
  // UPDATE BALANCE
  // =========================

  async function updateBalance() {
    if (!balanceUser) return;

    const amount = Number(balanceAmount);

    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !Number.isInteger(amount)
    ) {
      setError(
        "Please enter a valid whole USDT amount."
      );
      return;
    }

    try {
      setUpdatingId(balanceUser.id);
      setError("");
      setSuccess("");

      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: balanceUser.id,
          balanceAction,
          amount,
        }),
      });

      const text = await response.text();

      let data: {
        message?: string;
        error?: string;
        user?: User;
      } = {};

      if (text.trim()) {
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(
            `Server returned invalid JSON. HTTP ${response.status}`
          );
        }
      }

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to update balance."
        );
      }

      setSuccess(
        data.message || "Balance updated successfully."
      );

      if (data.user) {
        setUsers((currentUsers) =>
          currentUsers.map((item) =>
            item.id === balanceUser.id
              ? {
                  ...item,
                  balance: Number(
                    data.user!.balance || 0
                  ),
                }
              : item
          )
        );
      }

      setBalanceUser(null);
      setBalanceAmount("");
    } catch (err) {
      console.error("UPDATE BALANCE ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to update balance."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  // =========================
  // REFERRAL
  // =========================

  function openReferralModal(user: User) {
    setReferralUser(user);
    setError("");
  }

  function closeReferralModal() {
    setReferralUser(null);
  }

  // =========================
  // DELETE MODAL
  // =========================

  function openDeleteModal(user: User) {
    setDeleteUser(user);
    setError("");
    setSuccess("");
  }

  function closeDeleteModal() {
    if (deletingId) return;

    setDeleteUser(null);
  }

  // =========================
  // DELETE USER
  // =========================

  async function deleteAccount() {
    if (!deleteUser) return;

    const userId = deleteUser.id;
    const userName = deleteUser.name;

    try {
      setDeletingId(userId);
      setError("");
      setSuccess("");

      const response = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
        }),
      });

      const responseText = await response.text();

      let data: {
        message?: string;
        error?: string;
        user?: {
          id: string;
          name: string;
          email: string;
        };
      } = {};

      if (responseText.trim()) {
        try {
          data = JSON.parse(responseText);
        } catch {
          console.error(
            "DELETE INVALID JSON RESPONSE:",
            responseText
          );

          throw new Error(
            `Server returned invalid response. HTTP ${response.status}`
          );
        }
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            `Delete failed. HTTP ${response.status}`
        );
      }

      setUsers((currentUsers) =>
        currentUsers.filter(
          (user) => user.id !== userId
        )
      );

      setDeleteUser(null);

      setSuccess(
        data.message ||
          `${userName}'s account deleted successfully.`
      );
    } catch (err) {
      console.error("DELETE USER ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete user."
      );
    } finally {
      setDeletingId(null);
    }
  }

  // =========================
  // LOGOUT
  // =========================

  async function logout() {
    try {
      setLoggingOut(true);

      await fetch("/api/admin/auth/logout", {
        method: "POST",
      });

      window.location.href = "/admin/login";
    } catch (err) {
      console.error("LOGOUT ERROR:", err);
      setLoggingOut(false);
    }
  }

  // =========================
  // STATS
  // =========================

  const totalUsers = users.length;

  const activeUsers = users.filter(
    (user) => user.isActive
  ).length;

  const inactiveUsers =
    totalUsers - activeUsers;

  const totalBalance = users.reduce(
    (total, user) =>
      total + Number(user.balance || 0),
    0
  );

  // =========================
  // UI
  // =========================

  return (
    <main className="min-h-screen bg-slate-950 text-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* HEADER */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-400">
              Admin Panel
            </p>

            <h1 className="mt-1 text-3xl font-bold text-white">
              Users
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Manage users, balances, referrals and accounts.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={generateReferralCodes}
              disabled={generatingReferralCodes}
              className="rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {generatingReferralCodes
                ? "Generating..."
                : "Generate Referral Codes"}
            </button>

            <button
              onClick={logout}
              disabled={loggingOut}
              className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loggingOut
                ? "Logging out..."
                : "Logout"}
            </button>
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* SUCCESS */}
        {success && (
          <div className="mb-6 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
            {success}
          </div>
        )}

        {/* STATS */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Total Users
            </p>

            <p className="mt-2 text-2xl font-bold text-white">
              {totalUsers}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Active Users
            </p>

            <p className="mt-2 text-2xl font-bold text-green-400">
              {activeUsers}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Inactive Users
            </p>

            <p className="mt-2 text-2xl font-bold text-red-400">
              {inactiveUsers}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Total Balance
            </p>

            <p className="mt-2 text-2xl font-bold text-blue-400">
              {totalBalance.toLocaleString()} USDT
            </p>
          </div>

        </div>

        {/* USERS TABLE */}
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">

          <div className="flex flex-col gap-3 border-b border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-white">
              All Users
            </h2>

            <button
              onClick={loadUsers}
              disabled={loading}
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="px-5 py-12 text-center text-slate-400">
              Loading users...
            </div>
          ) : users.length === 0 ? (
            <div className="px-5 py-12 text-center text-slate-400">
              No users found.
            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="w-full min-w-[1200px] text-left">

                <thead className="bg-slate-950/60 text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-5 py-4">
                      User
                    </th>

                    <th className="px-5 py-4">
                      Balance
                    </th>

                    <th className="px-5 py-4">
                      Referral
                    </th>

                    <th className="px-5 py-4">
                      Status
                    </th>

                    <th className="px-5 py-4">
                      Balance Actions
                    </th>

                    <th className="px-5 py-4">
                      Account
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800">

                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-slate-800/40"
                    >

                      {/* USER */}
                      <td className="px-5 py-4">
                        <div>
                          <p className="font-semibold text-white">
                            {user.name}
                          </p>

                          <p className="text-sm text-slate-400">
                            {user.email}
                          </p>

                          <p className="mt-1 break-all font-mono text-[10px] text-slate-600">
                            {user.id}
                          </p>
                        </div>
                      </td>

                      {/* BALANCE */}
                      <td className="px-5 py-4">
                        <span className="font-semibold text-blue-400">
                          {Number(
                            user.balance || 0
                          ).toLocaleString()}{" "}
                          USDT
                        </span>
                      </td>

                      {/* REFERRAL */}
                      <td className="px-5 py-4">

                        <div>
                          <p className="font-mono text-sm text-purple-300">
                            {user.referralCode || "—"}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {user.referral?.totalReferred || 0}{" "}
                            referred
                          </p>

                          <button
                            onClick={() =>
                              openReferralModal(user)
                            }
                            className="mt-2 rounded-md bg-purple-600/20 px-3 py-1.5 text-xs font-semibold text-purple-300 hover:bg-purple-600/30"
                          >
                            View Details
                          </button>
                        </div>

                      </td>

                      {/* STATUS */}
                      <td className="px-5 py-4">

                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            user.isActive
                              ? "bg-green-500/10 text-green-400"
                              : "bg-red-500/10 text-red-400"
                          }`}
                        >
                          {user.isActive
                            ? "Active"
                            : "Inactive"}
                        </span>

                      </td>

                      {/* BALANCE ACTIONS */}
                      <td className="px-5 py-4">

                        <div className="flex flex-wrap gap-2">

                          <button
                            onClick={() =>
                              openBalanceModal(
                                user,
                                "ADD"
                              )
                            }
                            className="rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700"
                          >
                            + Add
                          </button>

                          <button
                            onClick={() =>
                              openBalanceModal(
                                user,
                                "DEDUCT"
                              )
                            }
                            className="rounded-lg bg-orange-600 px-3 py-2 text-xs font-semibold text-white hover:bg-orange-700"
                          >
                            − Deduct
                          </button>

                        </div>

                      </td>

                      {/* ACCOUNT */}
                      <td className="px-5 py-4">

                        <div className="flex flex-wrap gap-2">

                          <button
                            onClick={() =>
                              toggleUser(user)
                            }
                            disabled={
                              updatingId === user.id
                            }
                            className={`rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-50 ${
                              user.isActive
                                ? "bg-yellow-600 hover:bg-yellow-700"
                                : "bg-green-600 hover:bg-green-700"
                            }`}
                          >
                            {updatingId === user.id
                              ? "Updating..."
                              : user.isActive
                              ? "Deactivate"
                              : "Activate"}
                          </button>

                          <button
                            onClick={() =>
                              openDeleteModal(user)
                            }
                            disabled={
                              deletingId === user.id
                            }
                            className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            {deletingId === user.id
                              ? "Deleting..."
                              : "Delete"}
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

      {/* ========================= */}
      {/* BALANCE MODAL */}
      {/* ========================= */}

      {balanceUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">

          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">

            <h3 className="text-xl font-bold text-white">
              {balanceAction === "ADD"
                ? "Add Balance"
                : "Deduct Balance"}
            </h3>

            <p className="mt-2 text-sm text-slate-400">
              User:{" "}
              <span className="text-white">
                {balanceUser.name}
              </span>
            </p>

            <p className="mt-1 text-sm text-slate-400">
              Current Balance:{" "}
              <span className="text-blue-400">
                {Number(
                  balanceUser.balance || 0
                ).toLocaleString()}{" "}
                USDT
              </span>
            </p>

            <label className="mt-6 block text-sm font-medium text-slate-300">
              Amount (USDT)
            </label>

            <input
              type="number"
              min="1"
              step="1"
              value={balanceAmount}
              onChange={(event) =>
                setBalanceAmount(
                  event.target.value
                )
              }
              placeholder="Enter USDT amount"
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
            />

            <div className="mt-6 flex gap-3">

              <button
                onClick={updateBalance}
                disabled={
                  updatingId === balanceUser.id
                }
                className={`flex-1 rounded-lg px-4 py-3 font-semibold text-white disabled:opacity-50 ${
                  balanceAction === "ADD"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-orange-600 hover:bg-orange-700"
                }`}
              >
                {updatingId === balanceUser.id
                  ? "Processing..."
                  : balanceAction === "ADD"
                  ? "Add Balance"
                  : "Deduct Balance"}
              </button>

              <button
                onClick={closeBalanceModal}
                disabled={
                  updatingId === balanceUser.id
                }
                className="rounded-lg bg-slate-700 px-4 py-3 font-semibold text-white hover:bg-slate-600 disabled:opacity-50"
              >
                Cancel
              </button>

            </div>

          </div>
        </div>
      )}

      {/* ========================= */}
      {/* REFERRAL MODAL */}
      {/* ========================= */}

      {referralUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-4">

          <div className="mx-auto my-8 w-full max-w-6xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">

            <div className="flex items-center justify-between border-b border-slate-800 p-6">

              <div>
                <h3 className="text-xl font-bold text-white">
                  Referral Details
                </h3>

                <p className="mt-1 text-sm text-slate-400">
                  {referralUser.name} —{" "}
                  {referralUser.email}
                </p>
              </div>

              <button
                onClick={closeReferralModal}
                className="rounded-lg bg-slate-800 px-4 py-2 text-slate-300 hover:bg-slate-700"
              >
                Close
              </button>

            </div>

            <div className="p-6">

              <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">

                <div className="rounded-xl bg-slate-950 p-4">
                  <p className="text-xs text-slate-400">
                    Referral Code
                  </p>

                  <p className="mt-2 font-mono text-purple-300">
                    {referralUser.referralCode || "—"}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-950 p-4">
                  <p className="text-xs text-slate-400">
                    Total Referred
                  </p>

                  <p className="mt-2 text-xl font-bold text-white">
                    {referralUser.referral?.totalReferred || 0}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-950 p-4">
                  <p className="text-xs text-slate-400">
                    With Deposit
                  </p>

                  <p className="mt-2 text-xl font-bold text-white">
                    {referralUser.referral?.usersWithDeposit || 0}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-950 p-4">
                  <p className="text-xs text-slate-400">
                    Approved
                  </p>

                  <p className="mt-2 text-xl font-bold text-green-400">
                    {referralUser.referral?.usersWithApprovedDeposit || 0}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-950 p-4">
                  <p className="text-xs text-slate-400">
                    Commission
                  </p>

                  <p className="mt-2 text-xl font-bold text-yellow-400">
                    {Number(
                      referralUser.referral?.totalCommission || 0
                    ).toLocaleString()}{" "}
                    USDT
                  </p>
                </div>

              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-800">

                {referralUser.referral?.referredUsers?.length ? (
                  <table className="w-full min-w-[1000px] text-left">

                    <thead className="bg-slate-950 text-xs uppercase text-slate-400">
                      <tr>
                        <th className="px-4 py-4">
                          User
                        </th>

                        <th className="px-4 py-4">
                          Balance
                        </th>

                        <th className="px-4 py-4">
                          Deposit
                        </th>

                        <th className="px-4 py-4">
                          Approved
                        </th>

                        <th className="px-4 py-4">
                          Pending
                        </th>

                        <th className="px-4 py-4">
                          Rejected
                        </th>

                        <th className="px-4 py-4">
                          Commission
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-800">

                      {referralUser.referral.referredUsers.map(
                        (referredUser) => (
                          <tr
                            key={referredUser.id}
                            className="hover:bg-slate-800/40"
                          >

                            <td className="px-4 py-4">
                              <p className="font-semibold text-white">
                                {referredUser.name}
                              </p>

                              <p className="text-xs text-slate-400">
                                {referredUser.email}
                              </p>
                            </td>

                            <td className="px-4 py-4 text-blue-400">
                              {Number(
                                referredUser.balance || 0
                              ).toLocaleString()}{" "}
                              USDT
                            </td>

                            <td className="px-4 py-4">

                              <span
                                className={
                                  referredUser.hasDeposit
                                    ? "text-green-400"
                                    : "text-slate-500"
                                }
                              >
                                {referredUser.hasDeposit
                                  ? "YES"
                                  : "NO"}
                              </span>

                              {referredUser.hasDeposit && (
                                <p className="text-xs text-slate-400">
                                  Approved:{" "}
                                  {referredUser.totalDepositedUSDT.toLocaleString()}{" "}
                                  USDT
                                </p>
                              )}

                            </td>

                            <td className="px-4 py-4">

                              <span
                                className={
                                  referredUser.hasApprovedDeposit
                                    ? "text-green-400"
                                    : "text-slate-500"
                                }
                              >
                                {referredUser.hasApprovedDeposit
                                  ? "YES"
                                  : "NO"}
                              </span>

                              <p className="text-xs text-slate-400">
                                {
                                  referredUser.approvedDepositCount
                                }{" "}
                                approved
                              </p>

                            </td>

                            <td className="px-4 py-4 text-yellow-400">
                              {referredUser.pendingUSDT.toLocaleString()}{" "}
                              USDT
                            </td>

                            <td className="px-4 py-4 text-red-400">
                              {referredUser.rejectedUSDT.toLocaleString()}{" "}
                              USDT
                            </td>

                            <td className="px-4 py-4 text-purple-400">
                              {referredUser.referralCommission.toLocaleString()}{" "}
                              USDT
                            </td>

                          </tr>
                        )
                      )}

                    </tbody>

                  </table>
                ) : (
                  <div className="p-10 text-center text-slate-400">
                    No referred users found.
                  </div>
                )}

              </div>

            </div>

          </div>
        </div>
      )}

      {/* ========================= */}
      {/* DELETE MODAL */}
      {/* ========================= */}

      {deleteUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4">

          <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-slate-900 p-6 shadow-2xl">

            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-2xl">
              🗑️
            </div>

            <h3 className="text-xl font-bold text-white">
              Delete User Account?
            </h3>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              You are about to permanently delete:
            </p>

            <div className="mt-4 rounded-lg bg-slate-950 p-4">

              <p className="font-semibold text-white">
                {deleteUser.name}
              </p>

              <p className="mt-1 text-sm text-slate-400">
                {deleteUser.email}
              </p>

              <p className="mt-2 break-all text-xs text-slate-600">
                ID: {deleteUser.id}
              </p>

              <p className="mt-2 text-sm text-blue-400">
                Balance:{" "}
                {Number(
                  deleteUser.balance || 0
                ).toLocaleString()}{" "}
                USDT
              </p>

            </div>

            <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/5 p-4">

              <p className="text-sm font-medium text-red-300">
                ⚠️ This action cannot be undone.
              </p>

              <p className="mt-1 text-xs leading-5 text-red-300/70">
                The account and related records may be permanently removed according to the database relations.
              </p>

            </div>

            <div className="mt-6 flex gap-3">

              <button
                onClick={deleteAccount}
                disabled={
                  deletingId === deleteUser.id
                }
                className="flex-1 rounded-lg bg-red-600 px-4 py-3 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deletingId === deleteUser.id
                  ? "Deleting..."
                  : "Yes, Delete Account"}
              </button>

              <button
                onClick={closeDeleteModal}
                disabled={
                  deletingId === deleteUser.id
                }
                className="rounded-lg bg-slate-700 px-4 py-3 font-semibold text-white hover:bg-slate-600 disabled:opacity-50"
              >
                Cancel
              </button>

            </div>

          </div>
        </div>
      )}

    </main>
  );
}
