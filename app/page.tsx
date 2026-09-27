"use client";

import { useEffect, useState } from "react";

type User = {
  id: string;
  name: string;
  email: string;
  balance: number;
  totalReferrals: number;
};

export default function WithdrawPage() {
  const [user, setUser] = useState<User | null>(null);

  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState("USDT");
  const [accountInfo, setAccountInfo] =
    useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] =
    useState(false);

  const [message, setMessage] =
    useState("");
  const [error, setError] =
    useState("");

  useEffect(() => {
    const savedUser =
      localStorage.getItem("smi_user") ||
      sessionStorage.getItem("smi_user");

    if (!savedUser) {
      window.location.href = "/login";
      return;
    }

    try {
      const parsed = JSON.parse(savedUser);

      if (!parsed?.id) {
        throw new Error("Invalid user");
      }

      loadUser(parsed.id);
    } catch {
      localStorage.removeItem("smi_user");
      sessionStorage.removeItem("smi_user");

      window.location.href = "/login";
    }
  }, []);

  async function loadUser(userId: string) {
    try {
      setLoading(true);

      const response = await fetch(
        `/api/user/${userId}`,
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to load user."
        );
      }

      const apiUser =
        data.user || data;

      setUser({
        id: apiUser.id,
        name: apiUser.name,
        email: apiUser.email,
        balance: Number(
          apiUser.balance || 0
        ),
        totalReferrals: Number(
          apiUser.totalReferrals || 0
        ),
      });
    } catch (err) {
      console.error(
        "WITHDRAW USER ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load account."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleWithdraw(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!user) {
      setError(
        "User account not found."
      );
      return;
    }

    // -----------------------------
    // FRONTEND REFERRAL CHECK
    // -----------------------------

    if (user.totalReferrals < 1) {
      setError(
        "Withdrawal is locked. You need at least 1 referral who has made an approved deposit."
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
        "Please enter a valid amount."
      );
      return;
    }

    if (withdrawAmount < 10) {
      setError(
        "Minimum withdrawal amount is $10."
      );
      return;
    }

    if (
      withdrawAmount >
      user.balance
    ) {
      setError(
        "Insufficient wallet balance."
      );
      return;
    }

    if (!accountInfo.trim()) {
      setError(
        "Please enter your account information."
      );
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch(
        "/api/withdraw",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            userId: user.id,
            amount:
              withdrawAmount,
            paymentMethod,
            accountInfo:
              accountInfo.trim(),
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Withdrawal request failed."
        );
      }

      setMessage(
        data?.message ||
          "Withdrawal request submitted successfully."
      );

      setAmount("");
      setAccountInfo("");

      await loadUser(user.id);
    } catch (err) {
      console.error(
        "WITHDRAW ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // -----------------------------
  // LOADING
  // -----------------------------

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />

          <p className="mt-4 text-gray-500">
            Loading account...
          </p>
        </div>
      </main>
    );
  }

  // -----------------------------
  // NO USER
  // -----------------------------

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="rounded-2xl bg-white p-8 text-center shadow">
          <p className="text-red-600">
            Unable to load account.
          </p>

          <button
            onClick={() =>
              (window.location.href =
                "/login")
            }
            className="mt-4 rounded-lg bg-blue-600 px-5 py-2 text-white"
          >
            Login Again
          </button>
        </div>
      </main>
    );
  }

  const referralRequirementMet =
    user.totalReferrals >= 1;

  return (
    <main className="min-h-screen bg-gray-100">

      {/* HEADER */}

      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">

          <div>
            <h1 className="text-2xl font-bold text-blue-600">
              Smart Money Income
            </h1>

            <p className="text-sm text-gray-500">
              Withdraw Funds
            </p>
          </div>

          <button
            onClick={() =>
              (window.location.href =
                "/dashboard")
            }
            className="rounded-lg bg-gray-900 px-5 py-2 font-semibold text-white hover:bg-gray-800"
          >
            Dashboard
          </button>

        </div>
      </header>

      {/* CONTENT */}

      <section className="mx-auto max-w-3xl px-6 py-10">

        {/* BALANCE */}

        <div className="rounded-2xl bg-white p-6 shadow-sm">

          <p className="text-sm text-gray-500">
            Available Wallet Balance
          </p>

          <h2 className="mt-2 text-4xl font-bold text-gray-900">
            ${user.balance.toFixed(2)}
          </h2>

        </div>

        {/* REFERRAL REQUIREMENT */}

        <div
          className={`mt-6 rounded-2xl p-6 shadow-sm ${
            referralRequirementMet
              ? "bg-green-50"
              : "bg-red-50"
          }`}
        >

          <div className="flex items-center justify-between">

            <div>
              <h2
                className={`text-lg font-bold ${
                  referralRequirementMet
                    ? "text-green-800"
                    : "text-red-800"
                }`}
              >
                Withdrawal Eligibility
              </h2>

              <p
                className={`mt-1 text-sm ${
                  referralRequirementMet
                    ? "text-green-700"
                    : "text-red-700"
                }`}
              >
                You need at least 1 referral
                with an approved deposit.
              </p>
            </div>

            <div
              className={`rounded-full px-4 py-2 text-sm font-bold ${
                referralRequirementMet
                  ? "bg-green-200 text-green-800"
                  : "bg-red-200 text-red-800"
              }`}
            >
              {referralRequirementMet
                ? "Referral Found"
                : "Locked"}
            </div>

          </div>

          <div className="mt-4 flex justify-between border-t border-black/10 pt-4">

            <span className="text-sm text-gray-600">
              Your Referrals
            </span>

            <span className="font-bold">
              {user.totalReferrals}
            </span>

          </div>

        </div>

        {/* WITHDRAW FORM */}

        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">

          <h2 className="text-2xl font-bold text-gray-900">
            Request Withdrawal
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Minimum withdrawal amount is $10.
          </p>

          {/* ERROR */}

          {error && (
            <div className="mt-5 rounded-lg bg-red-50 p-4 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          {/* SUCCESS */}

          {message && (
            <div className="mt-5 rounded-lg bg-green-50 p-4 text-sm font-medium text-green-700">
              {message}
            </div>
          )}

          <form
            onSubmit={handleWithdraw}
            className="mt-6 space-y-5"
          >

            {/* AMOUNT */}

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Withdrawal Amount
              </label>

              <input
                type="number"
                min="10"
                step="1"
                value={amount}
                onChange={(event) =>
                  setAmount(
                    event.target.value
                  )
                }
                placeholder="Enter amount"
                disabled={
                  !referralRequirementMet
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-600 disabled:bg-gray-100"
                required
              />
            </div>

            {/* PAYMENT METHOD */}

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Payment Method
              </label>

              <select
                value={paymentMethod}
                onChange={(event) =>
                  setPaymentMethod(
                    event.target.value
                  )
                }
                disabled={
                  !referralRequirementMet
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-600 disabled:bg-gray-100"
              >
                <option value="USDT">
                  USDT
                </option>

                <option value="Bank">
                  Bank Transfer
                </option>

                <option value="Easypaisa">
                  Easypaisa
                </option>

                <option value="JazzCash">
                  JazzCash
                </option>
              </select>
            </div>

            {/* ACCOUNT INFO */}

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Account Information
              </label>

              <textarea
                value={accountInfo}
                onChange={(event) =>
                  setAccountInfo(
                    event.target.value
                  )
                }
                placeholder="Enter wallet address, bank account, Easypaisa number, etc."
                rows={4}
                disabled={
                  !referralRequirementMet
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-600 disabled:bg-gray-100"
                required
              />
            </div>

            {/* SUBMIT */}

            <button
              type="submit"
              disabled={
                submitting ||
                !referralRequirementMet
              }
              className="w-full rounded-lg bg-blue-600 px-6 py-3 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {!referralRequirementMet
                ? "Withdrawal Locked"
                : submitting
                ? "Submitting..."
                : "Submit Withdrawal Request"}
            </button>

          </form>

        </div>

        {/* NOTICE */}

        <div className="mt-6 rounded-2xl bg-yellow-50 p-5 text-sm text-yellow-800">

          <p className="font-bold">
            Important
          </p>

          <p className="mt-1">
            Your withdrawal will remain
            PENDING until an admin reviews
            and processes your request.
          </p>

          <p className="mt-2">
            To withdraw, you must have at
            least one referral who has made
            an approved deposit.
          </p>

        </div>

      </section>

      {/* FOOTER */}

      <footer className="border-t bg-white px-6 py-8 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} Smart Money Income. All rights reserved.
      </footer>

    </main>
  );
}