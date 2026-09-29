
"use client";

import { useEffect, useState } from "react";

type User = {
  id: string;
  name: string;
  email: string;
  balance: number;
};

type PaymentMethod = {
  id: string;
  name: string;
  methodType: string;
  active?: boolean;
};

type Withdrawal = {
  id: string;
  paymentMethod: string;
  amount: number;
  accountInfo: string;
  referenceId?: string | null;
  status: string;
  createdAt?: string | null;
  approvedAt?: string | null;
};

export default function WithdrawPage() {
  const [user, setUser] =
    useState<User | null>(null);

  const [paymentMethods, setPaymentMethods] =
    useState<PaymentMethod[]>([]);

  const [paymentMethod, setPaymentMethod] =
    useState("");

  const [amount, setAmount] =
    useState("");

  const [accountInfo, setAccountInfo] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState(false);

  const [lastWithdrawal, setLastWithdrawal] =
    useState<Withdrawal | null>(null);

  const [withdrawalHistory, setWithdrawalHistory] =
    useState<Withdrawal[]>([]);

  // =====================================
  // LOAD PAGE
  // =====================================

  useEffect(() => {
    const savedUser =
      localStorage.getItem("smi_user") ||
      sessionStorage.getItem("smi_user");

    if (!savedUser) {
      window.location.href = "/login";
      return;
    }

    try {
      const parsed =
        JSON.parse(savedUser);

      if (!parsed?.id) {
        throw new Error(
          "Invalid user session."
        );
      }

      loadUser(parsed.id);
      loadPaymentMethods();
    } catch (error) {
      console.error(
        "WITHDRAW SESSION ERROR:",
        error
      );

      localStorage.removeItem(
        "smi_user"
      );

      sessionStorage.removeItem(
        "smi_user"
      );

      window.location.href = "/login";
    }
  }, []);

  // =====================================
  // LOAD USER + WITHDRAWAL HISTORY
  // =====================================

  async function loadUser(
    userId: string
  ) {
    try {
      setError("");

      const response =
        await fetch(
          `/api/user/${userId}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

      const data =
        await response.json();

      console.log(
        "WITHDRAW USER:",
        response.status,
        data
      );

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Unable to load user."
        );
      }

      if (!data?.user) {
        throw new Error(
          "User information not found."
        );
      }

      // -------------------------------
      // USER
      // -------------------------------

      setUser({
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        balance: Number(
          data.user.balance || 0
        ),
      });

      // -------------------------------
      // WITHDRAWAL HISTORY
      // -------------------------------

      const withdrawals =
        Array.isArray(
          data.withdrawals
        )
          ? data.withdrawals
          : [];

      setWithdrawalHistory(
        withdrawals
      );

    } catch (error) {
      console.error(
        "LOAD USER ERROR:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to load user."
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================
  // LOAD PAYMENT METHODS
  // =====================================

  async function loadPaymentMethods() {
    try {
      const response =
        await fetch(
          "/api/payment-methods",
          {
            method: "GET",
            cache: "no-store",
          }
        );

      const data =
        await response.json();

      console.log(
        "PAYMENT METHODS:",
        response.status,
        data
      );

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to load payment methods."
        );
      }

      const methods =
        Array.isArray(
          data.paymentMethods
        )
          ? data.paymentMethods
          : [];

      setPaymentMethods(
        methods
      );

      if (
        methods.length > 0
      ) {
        setPaymentMethod(
          methods[0].name
        );
      }
    } catch (error) {
      console.error(
        "PAYMENT METHODS ERROR:",
        error
      );

      setPaymentMethods([]);
    }
  }

  // =====================================
  // LOGOUT
  // =====================================

  function logout() {
    localStorage.removeItem(
      "smi_user"
    );

    sessionStorage.removeItem(
      "smi_user"
    );

    window.location.href =
      "/login";
  }

  // =====================================
  // FORMAT NUMBER
  // =====================================

  function formatNumber(
    value:
      | number
      | null
      | undefined
  ) {
    return Number(
      value || 0
    ).toFixed(2);
  }

  // =====================================
  // FORMAT DATE
  // =====================================

  function formatDate(
    value?: string | null
  ) {
    if (!value) {
      return "Date unavailable";
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "Date unavailable";
    }

    return date.toLocaleString("en-PK", { timeZone: "Asia/Karachi", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
  }

  // =====================================
  // STATUS STYLE
  // =====================================

  function getStatusStyle(
    status: string
  ) {
    const normalized =
      String(
        status || ""
      ).toUpperCase();

    if (
      normalized ===
        "APPROVED" ||
      normalized ===
        "COMPLETED"
    ) {
      return {
        badge:
          "bg-green-100 text-green-700",
        icon: "Ã¢Å“â€¦",
      };
    }

    if (
      normalized ===
      "REJECTED"
    ) {
      return {
        badge:
          "bg-red-100 text-red-700",
        icon: "Ã¢ÂÅ’",
      };
    }

    return {
      badge:
        "bg-yellow-100 text-yellow-700",
      icon: "Ã¢ÂÂ³",
    };
  }

  // =====================================
  // SET MAX AMOUNT
  // =====================================

  function setMaxAmount() {
    if (!user) {
      return;
    }

    setAmount(
      Number(
        user.balance || 0
      ).toFixed(2)
    );
  }

  // =====================================
  // HANDLE WITHDRAW
  // =====================================

  async function handleWithdraw(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setMessage("");
    setError("");
    setSuccess(false);
    setLastWithdrawal(null);

    // -------------------------------------
    // USER CHECK
    // -------------------------------------

    if (!user?.id) {
      setError(
        "User session not found. Please login again."
      );

      return;
    }

    // -------------------------------------
    // PAYMENT METHOD CHECK
    // -------------------------------------

    if (!paymentMethod) {
      setError(
        "Please select a payment method."
      );

      return;
    }

    // -------------------------------------
    // AMOUNT CHECK
    // -------------------------------------

    if (!amount) {
      setError(
        "Please enter withdrawal amount."
      );

      return;
    }

    const withdrawAmount =
      Number(amount);

    if (
      !Number.isFinite(
        withdrawAmount
      ) ||
      withdrawAmount <= 0
    ) {
      setError(
        "Please enter a valid withdrawal amount."
      );

      return;
    }

    // -------------------------------------
    // ACCOUNT INFO CHECK
    // -------------------------------------

    if (!accountInfo.trim()) {
      setError(
        "Please enter your account information."
      );

      return;
    }

    // -------------------------------------
    // BALANCE CHECK
    // -------------------------------------

    const currentBalance =
      Number(
        user.balance || 0
      );

    if (
      withdrawAmount >
      currentBalance
    ) {
      setError(
        `Insufficient balance. Your available balance is ${currentBalance.toFixed(
          2
        )} USDT.`
      );

      return;
    }

    // -------------------------------------
    // SUBMIT
    // -------------------------------------

    setSubmitting(true);

    try {
      const response =
        await fetch(
          "/api/withdraw",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                userId:
                  user.id,

                paymentMethod:
                  paymentMethod,

                amount:
                  withdrawAmount,

                accountInfo:
                  accountInfo.trim(),
              }),
          }
        );

      const data =
        await response.json();

      console.log(
        "WITHDRAW RESPONSE:",
        response.status,
        data
      );

      // ===================================
      // WITHDRAWAL LOCK
      // ===================================

      if (
        response.status ===
          403 &&
        data?.locked
      ) {
        setError(
          data?.message ||
            "Withdrawal is locked. At least one referred user must make an approved deposit."
        );

        return;
      }

      // ===================================
      // OTHER ERROR
      // ===================================

      if (!response.ok) {
        setError(
          data?.message ||
            data?.error ||
            "Withdrawal failed."
        );

        return;
      }

      // ===================================
      // SUCCESS
      // ===================================

      setSuccess(true);

      setMessage(
        data?.message ||
          "Withdrawal request submitted successfully."
      );

      setLastWithdrawal(
        data?.withdrawal ||
          null
      );

      // ===================================
      // CLEAR FORM
      // ===================================

      setAmount("");
      setAccountInfo("");

      // ===================================
      // RELOAD USER + HISTORY
      // ===================================

      await loadUser(
        user.id
      );

    } catch (error) {
      console.error(
        "WITHDRAW REQUEST ERROR:",
        error
      );

      setError(
        "Unable to connect to the server. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // =====================================
  // REMAINING BALANCE PREVIEW
  // =====================================

  const enteredAmount =
    Number(amount) || 0;

  const remainingBalance =
    Math.max(
      0,
      Number(
        user?.balance || 0
      ) -
        enteredAmount
    );

  // =====================================
  // LOADING
  // =====================================

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 px-6 py-10">

        <div className="mx-auto max-w-xl">

          <div className="rounded-2xl bg-white p-10 text-center shadow-xl">

            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />

            <p className="mt-4 text-gray-600">
              Loading withdrawal page...
            </p>

          </div>

        </div>

      </main>
    );
  }

  // =====================================
  // MAIN PAGE
  // =====================================

  return (
    <main className="min-h-screen bg-gray-100">

      {/* =================================
          HEADER
          ================================= */}

      <header className="border-b bg-white shadow-sm">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

          <div>

            <a
              href="/dashboard"
              className="text-2xl font-bold text-blue-600"
            >
              Smart Money Income
            </a>

            <p className="mt-1 text-sm text-gray-500">
              Withdrawal
            </p>

          </div>

          <div className="flex items-center gap-3">

            <a
              href="/dashboard"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Dashboard
            </a>

            <button
              onClick={logout}
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100"
            >
              Logout
            </button>

          </div>

        </div>

      </header>

      {/* =================================
          CONTENT
          ================================= */}

      <div className="mx-auto max-w-xl px-6 py-8">

        {/* =================================
            TITLE
            ================================= */}

        <div className="mb-6">

          <h1 className="text-3xl font-bold text-gray-900">
            Withdraw Funds Ã°Å¸â€™Â¸
          </h1>

          <p className="mt-2 text-gray-500">
            Withdraw your available wallet balance.
          </p>

        </div>

        {/* =================================
            WALLET
            ================================= */}

        <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white shadow-xl">

          <p className="text-sm text-blue-100">
            Available Wallet Balance
          </p>

          <p className="mt-2 text-4xl font-bold">

            {formatNumber(
              user?.balance
            )}{" "}

            <span className="text-lg">
              USDT
            </span>

          </p>

          <p className="mt-2 text-sm text-blue-100">
            This balance will decrease when your withdrawal request is submitted.
          </p>

        </div>

        {/* =================================
            REQUIREMENT
            ================================= */}

        <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-5">

          <div className="flex gap-3">

            <div className="text-2xl">
              Ã¢â€žÂ¹Ã¯Â¸Â
            </div>

            <div>

              <h3 className="font-bold text-blue-900">
                Withdrawal Requirement
              </h3>

              <p className="mt-2 text-sm leading-6 text-blue-700">
                To unlock withdrawals, at least one user referred through your referral link must make a deposit and that deposit must be approved or completed.
              </p>

            </div>

          </div>

        </div>

        {/* =================================
            SUCCESS
            ================================= */}

        {success && (

          <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-5">

            <div className="flex gap-3">

              <div className="text-2xl">
                Ã¢Å“â€¦
              </div>

              <div>

                <h3 className="font-bold text-green-800">
                  Withdrawal Submitted
                </h3>

                <p className="mt-1 text-sm text-green-700">
                  {message}
                </p>

              </div>

            </div>

            {lastWithdrawal && (

              <div className="mt-4 rounded-xl bg-white p-4">

                <div className="grid grid-cols-2 gap-4 text-sm">

                  <div>

                    <p className="text-gray-500">
                      Amount
                    </p>

                    <p className="mt-1 font-bold text-gray-900">
                      {formatNumber(
                        lastWithdrawal.amount
                      )}{" "}
                      USDT
                    </p>

                  </div>

                  <div>

                    <p className="text-gray-500">
                      Status
                    </p>

                    <p className="mt-1 font-bold text-yellow-600">
                      {String(
                        lastWithdrawal.status
                      ).toUpperCase()}
                    </p>

                  </div>

                </div>

              </div>

            )}

          </div>

        )}

        {/* =================================
            ERROR
            ================================= */}

        {error && (

          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5">

            <div className="flex gap-3">

              <div className="text-2xl">
                Ã¢Å¡Â Ã¯Â¸Â
              </div>

              <div>

                <h3 className="font-bold text-red-800">
                  Withdrawal Error
                </h3>

                <p className="mt-1 text-sm leading-6 text-red-700">
                  {error}
                </p>

              </div>

            </div>

          </div>

        )}

        {/* =================================
            FORM
            ================================= */}

        <form
          onSubmit={
            handleWithdraw
          }
          className="mt-6 rounded-2xl bg-white p-6 shadow-xl"
        >

          {/* PAYMENT METHOD */}

          <div>

            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Payment Method
            </label>

            {paymentMethods.length ===
            0 ? (

              <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">

                <p className="font-semibold text-yellow-800">
                  No active payment methods available.
                </p>

                <button
                  type="button"
                  onClick={
                    loadPaymentMethods
                  }
                  className="mt-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
                >
                  Try Again
                </button>

              </div>

            ) : (

              <select
                value={
                  paymentMethod
                }
                onChange={(e) =>
                  setPaymentMethod(
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              >

                {paymentMethods.map(
                  (method) => (

                    <option
                      key={
                        method.id
                      }
                      value={
                        method.name
                      }
                    >
                      {method.name}

                      {method.methodType
                        ? ` (${method.methodType})`
                        : ""}

                    </option>

                  )
                )}

              </select>

            )}

          </div>

          {/* AMOUNT */}

          <div className="mt-5">

            <div className="mb-2 flex items-center justify-between">

              <label className="block text-sm font-semibold text-gray-700">
                Withdrawal Amount
              </label>

              <button
                type="button"
                onClick={
                  setMaxAmount
                }
                className="text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                MAX
              </button>

            </div>

            <div className="relative">

              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) =>
                  setAmount(
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-gray-300 px-4 py-3 pr-20 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />

              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500">
                USDT
              </span>

            </div>

            <p className="mt-2 text-xs text-gray-400">
              Available:{" "}

              {formatNumber(
                user?.balance
              )}{" "}

              USDT
            </p>

          </div>

          {/* ACCOUNT INFO */}

          <div className="mt-5">

            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Account Information
            </label>

            <textarea
              rows={4}
              placeholder="Enter your wallet address / account number / payment details"
              value={
                accountInfo
              }
              onChange={(e) =>
                setAccountInfo(
                  e.target.value
                )
              }
              className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />

            <p className="mt-2 text-xs text-gray-400">
              Make sure your payment/account information is correct.
            </p>

          </div>

          {/* SUMMARY */}

          <div className="mt-6 rounded-xl bg-gray-50 p-4">

            <div className="flex items-center justify-between">

              <span className="text-sm text-gray-500">
                Current Balance
              </span>

              <span className="font-semibold text-gray-900">
                {formatNumber(
                  user?.balance
                )}{" "}
                USDT
              </span>

            </div>

            <div className="mt-3 flex items-center justify-between">

              <span className="text-sm text-gray-500">
                Withdrawal
              </span>

              <span className="font-semibold text-red-600">
                -{" "}

                {formatNumber(
                  enteredAmount
                )}{" "}

                USDT
              </span>

            </div>

            <div className="mt-3 border-t pt-3">

              <div className="flex items-center justify-between">

                <span className="font-semibold text-gray-700">
                  Remaining Balance
                </span>

                <span className="text-lg font-bold text-blue-600">
                  {formatNumber(
                    remainingBalance
                  )}{" "}
                  USDT
                </span>

              </div>

            </div>

          </div>

          {/* SUBMIT BUTTON */}

          <button
            type="submit"
            disabled={
              submitting ||
              paymentMethods.length ===
                0 ||
              !user
            }
            className="mt-6 w-full rounded-xl bg-green-600 px-5 py-4 font-bold text-white shadow-lg transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >

            {submitting
              ? "Submitting Withdrawal..."
              : "Ã°Å¸â€™Â¸ Submit Withdrawal"}

          </button>

        </form>

        {/* =================================
            WITHDRAWAL HISTORY
            ================================= */}

        <div className="mt-6 rounded-2xl bg-white p-6 shadow">

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <h2 className="text-xl font-bold text-gray-900">
                Withdrawal History
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Your previous withdrawal requests.
              </p>

            </div>

            <button
              type="button"
              onClick={() =>
                user &&
                loadUser(user.id)
              }
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Ã°Å¸â€â€ž Refresh
            </button>

          </div>

          {withdrawalHistory.length ===
          0 ? (

            <div className="mt-5 rounded-xl bg-gray-50 p-6 text-center">

              <div className="text-3xl">
                Ã°Å¸â€™Â¸
              </div>

              <p className="mt-2 font-semibold text-gray-700">
                No withdrawal history yet.
              </p>

              <p className="mt-1 text-sm text-gray-400">
                Your withdrawal requests will appear here.
              </p>

            </div>

          ) : (

            <div className="mt-5 space-y-4">

              {[...withdrawalHistory]
                .reverse()
                .map(
                  (withdrawal) => {

                    const status =
                      String(
                        withdrawal.status ||
                          ""
                      ).toUpperCase();

                    const statusStyle =
                      getStatusStyle(
                        status
                      );

                    return (
                      <div
                        key={
                          withdrawal.id
                        }
                        className="rounded-xl border border-gray-200 bg-white p-4 transition hover:shadow-md"
                      >

                        {/* TOP */}

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

                          <div>

                            <p className="text-lg font-bold text-gray-900">
                              {formatNumber(
                                withdrawal.amount
                              )}{" "}
                              USDT
                            </p>

                            <p className="mt-1 text-sm text-gray-500">
                              {withdrawal.paymentMethod}
                            </p>

                          </div>

                          <span
                            className={`inline-flex w-fit items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${statusStyle.badge}`}
                          >

                            {statusStyle.icon}

                            {status}

                          </span>

                        </div>

                        {/* DETAILS */}

                        <div className="mt-4 grid gap-4 border-t pt-4 sm:grid-cols-2">

                          <div>

                            <p className="text-xs font-medium text-gray-400">
                              Account Information
                            </p>

                            <p className="mt-1 break-all text-sm font-medium text-gray-700">
                              {
                                withdrawal.accountInfo
                              }
                            </p>

                          </div>

                          <div>

                            <p className="text-xs font-medium text-gray-400">
                              Reference ID
                            </p>

                            <p className="mt-1 break-all text-sm font-medium text-gray-700">
                              {
                                withdrawal.referenceId ||
                                "Not available"
                              }
                            </p>

                          </div>

                        </div>

                        {/* DATE */}

                        <div className="mt-4 border-t pt-3">

                          <p className="text-xs text-gray-400">
                            Submitted:{" "}
                            {formatDate(
                              withdrawal.createdAt
                            )}
                          </p>

                          <p className="mt-1 text-xs text-gray-400">
                            Approved:{" "}
                            {withdrawal.approvedAt ? formatDate(withdrawal.approvedAt) : String(withdrawal.status || "").toUpperCase() === "PENDING" ? "Pending" : "â€”"}
                          </p>

                        </div>

                      </div>
                    );
                  }
                )}

            </div>

          )}

        </div>

        {/* =================================
            INFORMATION
            ================================= */}

        <div className="mt-6 rounded-2xl bg-white p-6 shadow">

          <h3 className="font-bold text-gray-900">
            Important Information
          </h3>

          <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-600">

            <li>
              Ã¢â‚¬Â¢ Withdrawal requests are reviewed by the admin.
            </li>

            <li>
              Ã¢â‚¬Â¢ Your wallet balance is deducted when the withdrawal request is submitted.
            </li>

            <li>
              Ã¢â‚¬Â¢ Make sure your account information is correct.
            </li>

            <li>
              Ã¢â‚¬Â¢ Approved withdrawals will remain in your withdrawal history.
            </li>

            <li>
              Ã¢â‚¬Â¢ Rejected withdrawals will be refunded to your wallet.
            </li>

          </ul>

        </div>

        {/* =================================
            BACK
            ================================= */}

        <div className="mt-6 text-center">

          <a
            href="/dashboard"
            className="text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            Ã¢â€ Â Back to Dashboard
          </a>

        </div>

      </div>

    </main>
  );
}







