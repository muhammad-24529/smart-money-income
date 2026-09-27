"use client";

import { useEffect, useState } from "react";

type Deposit = {
  id: string;
  userId: string;
  paymentMethod: string;
  amount: number;
  pkrAmount: number;
  usdtRate: number;
  referenceId: string;
  screenshotUrl?: string | null;
  status: string;
  createdAt: string;
};

export default function AdminDepositsPage() {
  const [deposits, setDeposits] = useState<Deposit[]>(
    []
  );

  const [loading, setLoading] =
    useState(true);

  const [processingId, setProcessingId] =
    useState<string | null>(null);

  const [message, setMessage] =
    useState("");

  const [messageType, setMessageType] =
    useState<"success" | "error" | "info">(
      "info"
    );

  const [loggingOut, setLoggingOut] =
    useState(false);

  async function loadDeposits() {
    try {
      setLoading(true);

      const response = await fetch(
        "/api/admin/deposits",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        setMessage(
          data?.error ||
            "Failed to load deposits."
        );

        setMessageType("error");
        return;
      }

      setDeposits(
        Array.isArray(data?.deposits)
          ? data.deposits
          : []
      );
    } catch (error) {
      console.error(
        "LOAD DEPOSITS ERROR:",
        error
      );

      setMessage(
        "Unable to connect to the server."
      );

      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(
    depositId: string,
    action: "APPROVE" | "REJECT"
  ) {
    const deposit =
      deposits.find(
        (item) =>
          item.id === depositId
      );

    if (!deposit) {
      return;
    }

    const isBinance =
      deposit.paymentMethod
        .toLowerCase()
        .includes("binance") ||
      deposit.paymentMethod
        .toLowerCase()
        .includes("trc20");

    const amountText =
      isBinance
        ? `${Number(
            deposit.amount || 0
          ).toLocaleString()} USDT (TRC20)`
        : `${Number(
            deposit.amount || 0
          ).toLocaleString()} USDT`;

    const confirmMessage =
      action === "APPROVE"
        ? `Approve deposit of ${amountText}?\n\nThis will add ${Number(
            deposit.amount || 0
          ).toLocaleString()} USDT to the user's wallet balance.`
        : `Reject deposit of ${amountText}?\n\nThe user's balance will NOT be increased.`;

    const confirmed =
      window.confirm(
        confirmMessage
      );

    if (!confirmed) {
      return;
    }

    try {
      setProcessingId(
        depositId
      );

      setMessage("");

      const response =
        await fetch(
          "/api/admin/deposits",
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              depositId,
              action,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        setMessage(
          data?.error ||
            "Action failed."
        );

        setMessageType("error");

        return;
      }

      setMessage(
        data?.message ||
          "Action completed successfully."
      );

      setMessageType("success");

      await loadDeposits();
    } catch (error) {
      console.error(
        "DEPOSIT ACTION ERROR:",
        error
      );

      setMessage(
        "Unable to connect to the server."
      );

      setMessageType("error");
    } finally {
      setProcessingId(null);
    }
  }

  async function logoutAdmin() {
    try {
      setLoggingOut(true);

      setMessage("");

      const response =
        await fetch(
          "/api/admin/logout",
          {
            method: "POST",
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to logout."
        );
      }

      window.location.href =
        "/admin/login";
    } catch (error) {
      setLoggingOut(false);

      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to logout."
      );

      setMessageType("error");
    }
  }

  function formatDateTime(
    value: string
  ) {
    if (!value) {
      return "N/A";
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "N/A";
    }

    return date.toLocaleString(
      "en-PK",
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    );
  }

  function getStatusClass(
    status: string
  ) {
    const normalized =
      status.toUpperCase();

    if (
      normalized === "APPROVED"
    ) {
      return "bg-green-100 text-green-700";
    }

    if (
      normalized === "REJECTED"
    ) {
      return "bg-red-100 text-red-700";
    }

    return "bg-yellow-100 text-yellow-700";
  }

  const pendingCount =
    deposits.filter(
      (deposit) =>
        deposit.status.toUpperCase() ===
        "PENDING"
    ).length;

  const approvedCount =
    deposits.filter(
      (deposit) =>
        deposit.status.toUpperCase() ===
        "APPROVED"
    ).length;

  const rejectedCount =
    deposits.filter(
      (deposit) =>
        deposit.status.toUpperCase() ===
        "REJECTED"
    ).length;

  useEffect(() => {
    loadDeposits();
  }, []);

  return (
    <main className="min-h-screen bg-gray-100">
      {/* =========================
          HEADER
      ========================== */}

      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-bold text-blue-600 sm:text-2xl">
              Smart Money Income
            </h1>

            <p className="text-sm text-gray-500">
              Admin — Deposit Management
            </p>
          </div>

          <div className="flex w-full flex-wrap gap-2 lg:w-auto">
            <a
              href="/admin/users"
              className="flex-1 rounded-lg border px-4 py-2 text-center text-sm font-medium hover:bg-gray-50 sm:flex-none"
            >
              Users
            </a>

            <a
              href="/admin/payment-methods"
              className="flex-1 rounded-lg border px-4 py-2 text-center text-sm font-medium hover:bg-gray-50 sm:flex-none"
            >
              Payment Methods
            </a>

            <button
              onClick={
                loadDeposits
              }
              disabled={
                loading ||
                loggingOut
              }
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-blue-700 disabled:opacity-50 sm:flex-none"
            >
              {loading
                ? "Loading..."
                : "Refresh"}
            </button>

            <button
              onClick={
                logoutAdmin
              }
              disabled={
                loggingOut
              }
              className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-red-700 disabled:opacity-50 sm:flex-none"
            >
              {loggingOut
                ? "Logging out..."
                : "Logout"}
            </button>
          </div>
        </div>
      </header>

      {/* =========================
          MAIN
      ========================== */}

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Deposits
          </h2>

          <p className="mt-2 text-sm text-gray-500 sm:text-base">
            Review and manage customer deposit requests.
          </p>
        </div>

        {/* =========================
            STATS
        ========================== */}

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Pending
            </p>

            <p className="mt-1 text-2xl font-bold text-yellow-600">
              {pendingCount}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Approved
            </p>

            <p className="mt-1 text-2xl font-bold text-green-600">
              {approvedCount}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Rejected
            </p>

            <p className="mt-1 text-2xl font-bold text-red-600">
              {rejectedCount}
            </p>
          </div>
        </div>

        {/* =========================
            MESSAGE
        ========================== */}

        {message && (
          <div
            className={`mb-6 rounded-xl border p-4 text-sm font-medium ${
              messageType === "success"
                ? "border-green-200 bg-green-50 text-green-700"
                : messageType === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-blue-200 bg-blue-50 text-blue-700"
            }`}
          >
            {message}
          </div>
        )}

        {/* =========================
            LOADING
        ========================== */}

        {loading ? (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />

            <p className="text-gray-500">
              Loading deposits...
            </p>
          </div>
        ) : deposits.length === 0 ? (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
            <p className="text-gray-500">
              No deposits found.
            </p>
          </div>
        ) : (
          /* =========================
             TABLE
          ========================== */

          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1500px]">
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
                      USDT Amount
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      PKR Paid
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Rate
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Reference
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Date & Time
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
                  {deposits.map(
                    (deposit) => {
                      const isProcessing =
                        processingId ===
                        deposit.id;

                      const normalizedStatus =
                        deposit.status.toUpperCase();

                      const isPending =
                        normalizedStatus ===
                        "PENDING";

                      const isBinance =
                        deposit.paymentMethod
                          .toLowerCase()
                          .includes(
                            "binance"
                          ) ||
                        deposit.paymentMethod
                          .toLowerCase()
                          .includes(
                            "trc20"
                          );

                      return (
                        <tr
                          key={
                            deposit.id
                          }
                          className="hover:bg-gray-50"
                        >
                          {/* DEPOSIT ID */}

                          <td className="px-6 py-4 text-sm text-gray-600">
                            <div className="max-w-[180px] truncate">
                              {
                                deposit.id
                              }
                            </div>
                          </td>

                          {/* USER ID */}

                          <td className="px-6 py-4 text-sm text-gray-600">
                            <div className="max-w-[180px] truncate">
                              {
                                deposit.userId
                              }
                            </div>
                          </td>

                          {/* PAYMENT METHOD */}

                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            <div>
                              {
                                deposit.paymentMethod
                              }

                              {isBinance && (
                                <p className="mt-1 text-xs text-gray-500">
                                  USDT (TRC20)
                                </p>
                              )}
                            </div>
                          </td>

                          {/* USDT */}

                          <td className="px-6 py-4 text-sm font-bold text-gray-900">
                            {Number(
                              deposit.amount ||
                                0
                            ).toLocaleString()}{" "}
                            USDT
                          </td>

                          {/* PKR */}

                          <td className="px-6 py-4 text-sm">
                            {isBinance ||
                            Number(
                              deposit.pkrAmount ||
                                0
                            ) === 0 ? (
                              <span className="text-gray-400">
                                —
                              </span>
                            ) : (
                              <span className="font-semibold text-gray-900">
                                Rs.{" "}
                                {Number(
                                  deposit.pkrAmount ||
                                    0
                                ).toLocaleString(
                                  "en-PK"
                                )}
                              </span>
                            )}
                          </td>

                          {/* RATE */}

                          <td className="px-6 py-4 text-sm">
                            {isBinance ||
                            Number(
                              deposit.usdtRate ||
                                0
                            ) === 0 ? (
                              <span className="text-gray-400">
                                —
                              </span>
                            ) : (
                              <span className="font-medium text-gray-700">
                                1 USDT ={" "}
                                {Number(
                                  deposit.usdtRate ||
                                    0
                                ).toLocaleString()}{" "}
                                PKR
                              </span>
                            )}
                          </td>

                          {/* REFERENCE */}

                          <td className="px-6 py-4 text-sm text-gray-600">
                            <div className="max-w-[180px] break-all">
                              {
                                deposit.referenceId
                              }
                            </div>
                          </td>

                          {/* DATE */}

                          <td className="px-6 py-4 text-sm text-gray-700">
                            <div className="whitespace-nowrap">
                              {formatDateTime(
                                deposit.createdAt
                              )}
                            </div>
                          </td>

                          {/* STATUS */}

                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                                deposit.status
                              )}`}
                            >
                              {
                                deposit.status
                              }
                            </span>
                          </td>

                          {/* SCREENSHOT */}

                          <td className="px-6 py-4 text-sm">
                            {deposit.screenshotUrl ? (
                              <a
                                href={`/api/admin/deposits/screenshot?file=${encodeURIComponent(deposit.screenshotUrl?.split("/").pop() || "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex rounded-lg bg-blue-50 px-3 py-2 font-medium text-blue-600 hover:bg-blue-100"
                              >
                                View
                              </a>
                            ) : (
                              <span className="text-gray-400">
                                No screenshot
                              </span>
                            )}
                          </td>

                          {/* ACTIONS */}

                          <td className="px-6 py-4">
                            {isPending ? (
                              <div className="flex flex-col gap-2 sm:flex-row">
                                <button
                                  onClick={() =>
                                    handleAction(
                                      deposit.id,
                                      "APPROVE"
                                    )
                                  }
                                  disabled={
                                    isProcessing ||
                                    loggingOut
                                  }
                                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
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
                                  disabled={
                                    isProcessing ||
                                    loggingOut
                                  }
                                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
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
                    }
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}



