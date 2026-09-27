"use client";

import { useEffect, useState } from "react";

type Withdrawal = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  paymentMethod: string;
  amount: number;
  accountInfo: string;
  referenceId: string | null;
  status: string;
};

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [referenceId, setReferenceId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  async function loadWithdrawals() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/admin/withdrawals",
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to load withdrawals."
        );
      }

      setWithdrawals(data.withdrawals || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load withdrawals."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWithdrawals();
  }, []);

  async function processWithdrawal(
    withdrawalId: string,
    action: "APPROVE" | "REJECT"
  ) {
    setError("");
    setMessage("");

    const withdrawal = withdrawals.find(
      (item) => item.id === withdrawalId
    );

    if (!withdrawal) {
      setError("Withdrawal not found.");
      return;
    }

    const confirmed = window.confirm(
      action === "APPROVE"
        ? `Approve withdrawal of $${withdrawal.amount.toFixed(
            2
          )} for ${withdrawal.userName}?`
        : `Reject withdrawal of $${withdrawal.amount.toFixed(
            2
          )} for ${withdrawal.userName}? The amount will be refunded.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setProcessingId(withdrawalId);

      const response = await fetch(
        "/api/admin/withdrawals",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            withdrawalId,
            action,
            referenceId: referenceId.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to process withdrawal."
        );
      }

      setMessage(
        data?.message ||
          `Withdrawal ${action.toLowerCase()}d successfully.`
      );

      setReferenceId("");

      await loadWithdrawals();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to process withdrawal."
      );
    } finally {
      setProcessingId(null);
    }
  }

  async function logoutAdmin() {
    try {
      setLoggingOut(true);
      setError("");
      setMessage("");

      const response = await fetch(
        "/api/admin/logout",
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to logout."
        );
      }

      window.location.href = "/admin-login";
    } catch (err) {
      setLoggingOut(false);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to logout."
      );
    }
  }

  const pendingWithdrawals = withdrawals.filter(
    (withdrawal) =>
      withdrawal.status === "PENDING"
  );

  const approvedWithdrawals = withdrawals.filter(
    (withdrawal) =>
      withdrawal.status === "APPROVED"
  );

  const rejectedWithdrawals = withdrawals.filter(
    (withdrawal) =>
      withdrawal.status === "REJECTED"
  );

  const pendingAmount = pendingWithdrawals.reduce(
    (sum, withdrawal) =>
      sum + Number(withdrawal.amount),
    0
  );

  return (
    <main className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold text-blue-600">
              Smart Money Income
            </h1>

            <p className="text-sm text-gray-500">
              Admin — Withdrawals
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                window.location.href =
                  "/admin/users";
              }}
              disabled={loggingOut}
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              Users
            </button>

            <button
              onClick={() => {
                window.location.href =
                  "/admin/deposits";
              }}
              disabled={loggingOut}
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              Deposits
            </button>

            <button
              onClick={() => {
                window.location.href =
                  "/admin/payment-methods";
              }}
              disabled={loggingOut}
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              Payment Methods
            </button>

            <button
              onClick={loadWithdrawals}
              disabled={loading || loggingOut}
              className="rounded-lg bg-blue-600 px-5 py-2 font-semibold text-gray-900 hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>

            <button
              onClick={logoutAdmin}
              disabled={loggingOut}
              className="rounded-lg bg-red-600 px-5 py-2 font-semibold text-gray-900 hover:bg-red-700 disabled:opacity-50"
            >
              {loggingOut
                ? "Logging out..."
                : "Logout"}
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-8">
        {/* Stats */}
        <div className="grid gap-5 md:grid-cols-4">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">
              Total Requests
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-900">
              {withdrawals.length}
            </p>
          </div>

          <div className="rounded-2xl bg-yellow-50 p-6 shadow-sm">
            <p className="text-sm text-yellow-700">
              Pending
            </p>

            <p className="mt-2 text-3xl font-bold text-yellow-800">
              {pendingWithdrawals.length}
            </p>

            <p className="mt-1 text-sm text-yellow-700">
              ${pendingAmount.toFixed(2)}
            </p>
          </div>

          <div className="rounded-2xl bg-green-50 p-6 shadow-sm">
            <p className="text-sm text-green-700">
              Approved
            </p>

            <p className="mt-2 text-3xl font-bold text-green-800">
              {approvedWithdrawals.length}
            </p>
          </div>

          <div className="rounded-2xl bg-red-50 p-6 shadow-sm">
            <p className="text-sm text-red-700">
              Rejected
            </p>

            <p className="mt-2 text-3xl font-bold text-red-800">
              {rejectedWithdrawals.length}
            </p>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mt-6 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="mt-6 rounded-xl bg-green-50 p-4 text-sm font-medium text-green-700">
            {message}
          </div>
        )}

        {/* Reference ID */}
        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">
            Payment Reference
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Optional. Enter the transaction/reference ID
            before approving or rejecting a withdrawal.
          </p>

          <input
            type="text"
            value={referenceId}
            onChange={(event) => {
              setReferenceId(event.target.value);
            }}
            placeholder="Example: TXN-123456"
            disabled={loggingOut}
            className="mt-4 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-600 disabled:bg-gray-100"
          />
        </div>

        {/* Withdrawals */}
        <div className="mt-6 rounded-2xl bg-white shadow-sm">
          <div className="border-b px-6 py-5">
            <h2 className="text-2xl font-bold text-gray-900">
              Withdrawal Requests
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Review and process user withdrawal requests.
            </p>
          </div>

          {loading ? (
            <div className="p-10 text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />

              <p className="mt-4 text-gray-500">
                Loading withdrawals...
              </p>
            </div>
          ) : withdrawals.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-lg font-semibold text-gray-700">
                No withdrawal requests found.
              </p>

              <p className="mt-2 text-sm text-gray-500">
                New withdrawal requests will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-gray-500">
                      User
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-gray-500">
                      Amount
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-gray-500">
                      Payment
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-gray-500">
                      Account Info
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-gray-500">
                      Status
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-gray-500">
                      Reference
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-gray-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {withdrawals.map(
                    (withdrawal) => (
                      <tr
                        key={withdrawal.id}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-5">
                          <p className="font-bold text-gray-900">
                            {withdrawal.userName}
                          </p>

                          <p className="text-sm text-gray-500">
                            {withdrawal.userEmail}
                          </p>

                          <p className="mt-1 text-xs text-gray-400">
                            {withdrawal.userId}
                          </p>
                        </td>

                        <td className="px-6 py-5">
                          <p className="text-xl font-bold text-gray-900">
                            $
                            {Number(
                              withdrawal.amount
                            ).toFixed(2)}
                          </p>
                        </td>

                        <td className="px-6 py-5">
                          <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
                            {withdrawal.paymentMethod}
                          </span>
                        </td>

                        <td className="max-w-xs px-6 py-5">
                          <p className="break-words text-sm text-gray-700">
                            {withdrawal.accountInfo}
                          </p>
                        </td>

                        <td className="px-6 py-5">
                          {withdrawal.status ===
                          "PENDING" ? (
                            <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-bold text-yellow-800">
                              PENDING
                            </span>
                          ) : withdrawal.status ===
                            "APPROVED" ? (
                            <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-bold text-green-800">
                              APPROVED
                            </span>
                          ) : (
                            <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-bold text-red-800">
                              REJECTED
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-5">
                          <p className="max-w-xs break-all text-sm text-gray-600">
                            {withdrawal.referenceId ||
                              "—"}
                          </p>
                        </td>

                        <td className="px-6 py-5">
                          {withdrawal.status ===
                          "PENDING" ? (
                            <div className="flex min-w-[150px] flex-col gap-2">
                              <button
                                onClick={() =>
                                  processWithdrawal(
                                    withdrawal.id,
                                    "APPROVE"
                                  )
                                }
                                disabled={
                                  processingId ===
                                    withdrawal.id ||
                                  loggingOut
                                }
                                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-gray-900 hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {processingId ===
                                withdrawal.id
                                  ? "Processing..."
                                  : "Approve"}
                              </button>

                              <button
                                onClick={() =>
                                  processWithdrawal(
                                    withdrawal.id,
                                    "REJECT"
                                  )
                                }
                                disabled={
                                  processingId ===
                                    withdrawal.id ||
                                  loggingOut
                                }
                                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-gray-900 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Reject & Refund
                              </button>
                            </div>
                          ) : (
                            <span className="text-sm font-medium text-gray-400">
                              Processed
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <footer className="border-t bg-white px-6 py-8 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} Smart Money Income.
        All rights reserved.
      </footer>
    </main>
  );
}
