"use client";

import { useEffect, useState } from "react";

type Deposit = {
  id: string;
  userId: string;
  paymentMethod: string;
  amount: number;
  referenceId: string;
  screenshotUrl?: string | null;
  status: string;
};

export default function AdminDepositsPage() {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function loadDeposits() {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch("/api/admin/deposits");

      const data = await response.json();

      if (!response.ok) {
        setMessage(data?.error || "Failed to load deposits.");
        return;
      }

      setDeposits(data.deposits || []);
    } catch (error) {
      console.error("LOAD DEPOSITS ERROR:", error);
      setMessage("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(
    depositId: string,
    action: "APPROVE" | "REJECT"
  ) {
    const deposit = deposits.find((item) => item.id === depositId);

    if (!deposit) {
      return;
    }

    const confirmMessage =
      action === "APPROVE"
        ? `Approve deposit of Rs. ${deposit.amount}?\n\nThis will add the amount to the user's balance.`
        : `Reject deposit of Rs. ${deposit.amount}?`;

    const confirmed = window.confirm(confirmMessage);

    if (!confirmed) {
      return;
    }

    try {
      setProcessingId(depositId);
      setMessage("");

      const response = await fetch("/api/admin/deposits", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          depositId,
          action,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data?.error || "Action failed.");
        return;
      }

      setMessage(data?.message || "Action completed successfully.");

      await loadDeposits();
    } catch (error) {
      console.error("DEPOSIT ACTION ERROR:", error);
      setMessage("Unable to connect to the server.");
    } finally {
      setProcessingId(null);
    }
  }

  useEffect(() => {
    loadDeposits();
  }, []);

  return (
    <main className="min-h-screen bg-gray-100">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold text-blue-600">
              Smart Money Income
            </h1>

            <p className="text-sm text-gray-500">
              Admin — Deposit Management
            </p>
          </div>

          <div className="flex gap-3">
            <a
              href="/admin/payment-methods"
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              Payment Methods
            </a>

            <button
              onClick={loadDeposits}
              disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">
            Deposits
          </h2>

          <p className="mt-2 text-gray-500">
            Review and manage customer deposit requests.
          </p>
        </div>

        {message && (
          <div className="mb-6 rounded-lg bg-blue-50 p-4 text-sm font-medium text-blue-700">
            {message}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
            <p className="text-gray-500">Loading deposits...</p>
          </div>
        ) : deposits.length === 0 ? (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
            <p className="text-gray-500">
              No deposits found.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px]">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Deposit ID
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      User ID
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Payment Method
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Amount
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Reference
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Status
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Screenshot
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {deposits.map((deposit) => {
                    const isProcessing =
                      processingId === deposit.id;

                    const isPending =
                      deposit.status === "PENDING";

                    return (
                      <tr
                        key={deposit.id}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 text-sm text-gray-600">
                          <div className="max-w-[180px] truncate">
                            {deposit.id}
                          </div>
                        </td>

                        <td className="px-6 py-4 text-sm text-gray-600">
                          <div className="max-w-[180px] truncate">
                            {deposit.userId}
                          </div>
                        </td>

                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {deposit.paymentMethod}
                        </td>

                        <td className="px-6 py-4 text-sm font-bold text-gray-900">
                          Rs. {deposit.amount.toLocaleString()}
                        </td>

                        <td className="px-6 py-4 text-sm text-gray-600">
                          {deposit.referenceId}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              deposit.status === "APPROVED"
                                ? "bg-green-100 text-green-700"
                                : deposit.status === "REJECTED"
                                ? "bg-red-100 text-red-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {deposit.status}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-sm">
                          {deposit.screenshotUrl ? (
                            <a
                              href={deposit.screenshotUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-blue-600 hover:underline"
                            >
                              View
                            </a>
                          ) : (
                            <span className="text-gray-400">
                              No screenshot
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          {isPending ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() =>
                                  handleAction(
                                    deposit.id,
                                    "APPROVE"
                                  )
                                }
                                disabled={isProcessing}
                                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {isProcessing
                                  ? "Processing..."
                                  : "Approve"}
                              </button>

                              <button
                                onClick={() =>
                                  handleAction(
                                    deposit.id,
                                    "REJECT"
                                  )
                                }
                                disabled={isProcessing}
                                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {isProcessing
                                  ? "Processing..."
                                  : "Reject"}
                              </button>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">
                              Completed
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}