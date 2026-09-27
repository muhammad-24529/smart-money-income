"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

type User = {
  id: string;
  name: string;
  email: string;
};

type PaymentMethod = {
  id: string;
  name: string;
  methodType: string;
  accountInfo: string;
  instructions: string | null;
  active: boolean;
};

type Deposit = {
  id: string;
  paymentMethod: string;
  amount: number;
  pkrAmount: number;
  usdtRate: number;
  referenceId: string;
  screenshotUrl: string | null;
  status: string;
  createdAt: string;
};

const FIXED_USDT_RATE = 285;

export default function DepositPage() {
  const [user, setUser] = useState<User | null>(null);

  const [paymentMethods, setPaymentMethods] =
    useState<PaymentMethod[]>([]);

  const [deposits, setDeposits] =
    useState<Deposit[]>([]);

  const [paymentMethodId, setPaymentMethodId] =
    useState("");

  const [amount, setAmount] = useState("");
  const [referenceId, setReferenceId] =
    useState("");

  const [screenshot, setScreenshot] =
    useState<File | null>(null);

  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const [loading, setLoading] =
    useState(false);

  const [methodsLoading, setMethodsLoading] =
    useState(true);

  const [historyLoading, setHistoryLoading] =
    useState(true);

  const [copied, setCopied] =
    useState(false);

  // ==============================
  // LOAD LOGGED-IN USER
  // ==============================

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

      setUser({
        id: parsed.id,
        name: parsed.name || "",
        email: parsed.email || "",
      });
    } catch {
      localStorage.removeItem("smi_user");
      sessionStorage.removeItem("smi_user");

      window.location.href = "/login";
    }
  }, []);

  // ==============================
  // LOAD PAYMENT METHODS
  // ==============================

  useEffect(() => {
    async function loadPaymentMethods() {
      try {
        setMethodsLoading(true);

        const response = await fetch(
          "/api/payment-methods",
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok) {
          setPaymentMethods([]);

          setMessage(
            data?.error ||
              "Unable to load payment methods."
          );

          return;
        }

        const methods = Array.isArray(
          data?.paymentMethods
        )
          ? data.paymentMethods
          : [];

        const activeMethods =
          methods.filter(
            (method: PaymentMethod) =>
              method.active === true
          );

        setPaymentMethods(activeMethods);
      } catch (error) {
        console.error(
          "PAYMENT METHODS ERROR:",
          error
        );

        setPaymentMethods([]);

        setMessage(
          "Unable to load payment methods."
        );
      } finally {
        setMethodsLoading(false);
      }
    }

    loadPaymentMethods();
  }, []);

  // ==============================
  // LOAD DEPOSIT HISTORY
  // ==============================

  useEffect(() => {
    if (!user?.id) return;

    loadDeposits(user.id);
  }, [user?.id]);

  async function loadDeposits(
    userId: string
  ) {
    try {
      setHistoryLoading(true);

      const response = await fetch(
        `/api/user/${userId}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to load deposit history."
        );
      }

      setDeposits(
        Array.isArray(data?.deposits)
          ? data.deposits
          : []
      );
    } catch (error) {
      console.error(
        "DEPOSIT HISTORY ERROR:",
        error
      );
    } finally {
      setHistoryLoading(false);
    }
  }

  // ==============================
  // SELECTED PAYMENT METHOD
  // ==============================

  const selectedMethod =
    paymentMethods.find(
      (method) =>
        method.id === paymentMethodId
    );

  const numericAmount = Number(amount);

  const isBinance =
    selectedMethod?.name
      ?.toLowerCase()
      .includes("binance") ||
    selectedMethod?.methodType
      ?.toLowerCase()
      .includes("binance") ||
    selectedMethod?.methodType
      ?.toLowerCase()
      .includes("trc20");

  const calculatedPkr =
    !isBinance &&
    Number.isFinite(numericAmount) &&
    numericAmount > 0
      ? numericAmount * FIXED_USDT_RATE
      : 0;

  // ==============================
  // COPY ACCOUNT INFORMATION
  // ==============================

  async function copyAccountInfo() {
    if (!selectedMethod?.accountInfo) {
      return;
    }

    const value =
      selectedMethod.accountInfo.trim();

    if (!value) {
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(
          value
        );
      } else {
        const textarea =
          document.createElement("textarea");

        textarea.value = value;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";

        document.body.appendChild(
          textarea
        );

        textarea.focus();
        textarea.select();

        document.execCommand("copy");

        textarea.remove();
      }

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error(
        "COPY ACCOUNT INFO ERROR:",
        error
      );

      setMessage(
        "Unable to copy account information. Please copy it manually."
      );

      setSuccess(false);
    }
  }

  // ==============================
  // SUBMIT DEPOSIT
  // ==============================

  async function handleSubmit(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setMessage("");
    setSuccess(false);

    if (!user) {
      setMessage(
        "Please login first."
      );
      return;
    }

    if (!selectedMethod) {
      setMessage(
        "Please select a payment method."
      );
      return;
    }

    if (
      !amount ||
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      setMessage(
        "Please enter a valid USDT amount."
      );
      return;
    }

    if (
      !Number.isInteger(numericAmount)
    ) {
      setMessage(
        "USDT amount must be a whole number."
      );
      return;
    }

    if (!referenceId.trim()) {
      setMessage(
        "Please enter your transaction/reference ID."
      );
      return;
    }

    if (!screenshot) {
      setMessage(
        "Please upload your payment screenshot."
      );
      return;
    }

    if (
      ![
        "image/jpeg",
        "image/png",
        "image/webp",
      ].includes(screenshot.type)
    ) {
      setMessage(
        "Please upload a JPG, PNG or WebP image."
      );
      return;
    }

    if (
      screenshot.size >
      5 * 1024 * 1024
    ) {
      setMessage(
        "Screenshot must be 5 MB or smaller."
      );
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();

      formData.append(
        "userId",
        user.id
      );

      formData.append(
        "paymentMethod",
        isBinance
          ? "Binance"
          : selectedMethod.methodType
      );

      formData.append(
        "amount",
        String(numericAmount)
      );

      formData.append(
        "referenceId",
        referenceId.trim()
      );

      formData.append(
        "screenshot",
        screenshot
      );

      const response = await fetch(
        "/api/deposit",
        {
          method: "POST",
          body: formData,
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        setMessage(
          data?.error ||
            "Deposit submission failed."
        );
        return;
      }

      setSuccess(true);

      setMessage(
        "Deposit submitted successfully. It is pending admin verification."
      );

      setAmount("");
      setPaymentMethodId("");
      setReferenceId("");
      setScreenshot(null);
      setCopied(false);

      const fileInput =
        document.getElementById(
          "deposit-screenshot"
        ) as HTMLInputElement | null;

      if (fileInput) {
        fileInput.value = "";
      }

      await loadDeposits(user.id);
    } catch (error) {
      console.error(
        "DEPOSIT ERROR:",
        error
      );

      setMessage(
        "Unable to connect to the server."
      );
    } finally {
      setLoading(false);
    }
  }

  // ==============================
  // STATUS STYLE
  // ==============================

  function getStatusClass(
    status: string
  ) {
    switch (
      status.toUpperCase()
    ) {
      case "APPROVED":
        return "bg-green-100 text-green-700";

      case "REJECTED":
        return "bg-red-100 text-red-700";

      case "PENDING":
        return "bg-yellow-100 text-yellow-700";

      default:
        return "bg-gray-100 text-gray-700";
    }
  }

  // ==============================
  // DATE FORMAT
  // ==============================

  function formatDateTime(
    value: string
  ) {
    if (!value) {
      return "N/A";
    }

    const date = new Date(value);

    if (
      Number.isNaN(date.getTime())
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

  // ==============================
  // LOADING
  // ==============================

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-gray-500">
          Loading...
        </p>
      </main>
    );
  }

  // ==============================
  // PAGE
  // ==============================

  return (
    <main className="min-h-screen bg-gray-100">

      {/* HEADER */}

      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">

          <div>
            <h1 className="text-2xl font-bold text-blue-600">
              Smart Money Income
            </h1>

            <p className="text-sm text-gray-500">
              Deposit Funds
            </p>
          </div>

          <a
            href="/dashboard"
            className="w-full rounded-lg border px-4 py-2 text-center hover:bg-gray-50 sm:w-auto"
          >
            Dashboard
          </a>

        </div>
      </header>

      {/* MAIN */}

      <section className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">

        {/* DEPOSIT CARD */}

        <div className="rounded-2xl bg-white p-5 shadow-sm sm:p-8">

          <h2 className="text-3xl font-bold text-gray-900">
            Make a Deposit
          </h2>

          <p className="mt-2 text-gray-500">
            Enter the amount in USDT and select your payment method.
          </p>

          {/* INSTRUCTIONS */}

          <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-5">

            <h3 className="font-bold text-blue-900">
              Pakistan Deposit Instructions
            </h3>

            <p className="mt-2 text-sm leading-6 text-blue-800">
              Enter your deposit amount in
              USDT. For example, if you
              enter{" "}
              <strong>20 USDT</strong>,
              you will receive{" "}
              <strong>20 USDT</strong>{" "}
              in your account after approval.
            </p>

            {!isBinance && (
              <>
                <p className="mt-2 text-sm leading-6 text-blue-800">
                  For{" "}
                  <strong>JazzCash</strong>{" "}
                  or{" "}
                  <strong>Easypaisa</strong>,
                  the payment amount is
                  calculated at the fixed rate of{" "}
                  <strong>
                    1 USDT = 285 PKR
                  </strong>.
                </p>

                <p className="mt-2 text-sm leading-6 text-blue-800">
                  Example:{" "}
                  <strong>
                    20 USDT = 5,700 PKR
                  </strong>.
                </p>
              </>
            )}

            {isBinance && (
              <p className="mt-2 text-sm leading-6 text-blue-800">
                For{" "}
                <strong>
                  Binance — USDT (TRC20)
                </strong>,
                send the same USDT amount.
                No PKR conversion is applied.
              </p>
            )}

          </div>

          {/* FORM */}

          <form
            onSubmit={handleSubmit}
            className="mt-8 space-y-6"
          >

            {/* PAYMENT METHOD */}

            <div>

              <label className="mb-2 block text-sm font-medium text-gray-700">
                Payment Method
              </label>

              {methodsLoading ? (

                <div className="rounded-lg border bg-gray-50 px-4 py-3 text-gray-500">
                  Loading payment methods...
                </div>

              ) : paymentMethods.length ===
                0 ? (

                <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
                  No active payment methods are currently available.
                </div>

              ) : (

                <select
                  value={paymentMethodId}
                  onChange={(e) => {
                    setPaymentMethodId(
                      e.target.value
                    );
                    setCopied(false);
                    setMessage("");
                    setSuccess(false);
                  }}
                  required
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-600"
                >

                  <option value="">
                    Select payment method
                  </option>

                  {paymentMethods.map(
                    (method) => (
                      <option
                        key={method.id}
                        value={method.id}
                      >
                        {method.name} —{" "}
                        {method.methodType}
                      </option>
                    )
                  )}

                </select>

              )}

            </div>

            {/* PAYMENT DETAILS */}

            {selectedMethod && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">

                <div className="flex flex-col gap-4">

                  <div>
                    <h3 className="font-bold text-blue-900">
                      Payment Details
                    </h3>

                    <p className="mt-1 text-sm text-blue-700">
                      {isBinance
                        ? "USDT (TRC20)"
                        : selectedMethod.methodType}
                    </p>
                  </div>

                  {/* ACCOUNT INFO + COPY */}

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">

                    <div className="min-w-0 flex-1 rounded-xl border border-blue-200 bg-white px-4 py-3">

                      <p className="break-all text-base font-bold text-gray-900 sm:text-lg">
                        {selectedMethod.accountInfo ||
                          "Account information not available."}
                      </p>

                    </div>

                    {selectedMethod.accountInfo && (
                      <button
                        type="button"
                        onClick={
                          copyAccountInfo
                        }
                        className={`shrink-0 rounded-xl px-5 py-3 font-bold text-white transition active:scale-95 ${
                          copied
                            ? "bg-green-600 hover:bg-green-700"
                            : "bg-blue-600 hover:bg-blue-700"
                        }`}
                      >
                        {copied
                          ? "✅ Copied!"
                          : "📋 Copy"}
                      </button>
                    )}

                  </div>

                  <p className="text-xs text-blue-700">
                    Copy the address/account number above and use it to make your payment.
                  </p>

                  {/* BINANCE QR CODE */}

                  {isBinance && (
                    <div className="mt-2 rounded-xl border border-yellow-200 bg-white p-5 text-center">

                      <h4 className="text-lg font-bold text-gray-900">
                        Binance USDT (TRC20) QR Code
                      </h4>

                      <p className="mt-1 text-sm text-gray-500">
                        Scan this QR code from your Binance app
                      </p>

                      <div className="mt-4 flex justify-center">

                        <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">

                          <img
                            src="/qr/binance-qr.png"
                            alt="Binance USDT TRC20 QR Code"
                            className="h-64 w-64 object-contain"
                          />

                        </div>

                      </div>

                      <p className="mt-4 text-xs font-medium text-gray-600">
                        Make sure the network is TRC20 before sending USDT.
                      </p>

                    </div>
                  )}

                </div>

                {/* INSTRUCTIONS */}

                {selectedMethod.instructions && (
                  <div className="mt-4 rounded-lg bg-white p-4">

                    <p className="text-sm font-medium text-gray-700">
                      Instructions
                    </p>

                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-gray-600">
                      {selectedMethod.instructions}
                    </p>

                  </div>
                )}

              </div>
            )}

            {/* AMOUNT */}

            <div>

              <label className="mb-2 block text-sm font-medium text-gray-700">
                Amount (USDT)
              </label>

              <div className="relative">

                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-gray-500">
                  $
                </span>

                <input
                  type="number"
                  min="1"
                  step="1"
                  value={amount}
                  onChange={(e) =>
                    setAmount(
                      e.target.value
                    )
                  }
                  placeholder="Enter USDT amount, e.g. 20"
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 pl-9 outline-none focus:border-blue-600"
                />

              </div>

              <p className="mt-2 text-xs text-gray-500">
                Enter the amount you want to
                add to your account in USDT.
              </p>

            </div>

            {/* PAYMENT CALCULATION */}

            {numericAmount > 0 &&
              Number.isInteger(
                numericAmount
              ) &&
              selectedMethod && (

                <div className="rounded-xl border border-green-200 bg-green-50 p-5">

                  <h3 className="font-bold text-green-900">
                    Payment Amount
                  </h3>

                  {isBinance ? (

                    <>
                      <div className="mt-3 flex items-center justify-between">

                        <span className="text-sm text-green-800">
                          Deposit Amount
                        </span>

                        <strong className="text-lg text-green-900">
                          {numericAmount} USDT
                        </strong>

                      </div>

                      <div className="mt-3 rounded-lg bg-white p-4">

                        <p className="text-sm text-gray-500">
                          Send to Binance
                        </p>

                        <p className="mt-1 break-all text-2xl font-bold text-gray-900">
                          {numericAmount} USDT{" "}
                          <span className="text-lg">
                            (TRC20)
                          </span>
                        </p>

                      </div>

                      <p className="mt-3 text-xs text-green-700">
                        Send exactly{" "}
                        <strong>
                          {numericAmount} USDT (TRC20)
                        </strong>
                        . No PKR conversion is applied.
                      </p>
                    </>

                  ) : (

                    <>
                      <div className="mt-3 flex items-center justify-between">

                        <span className="text-sm text-green-800">
                          Deposit Amount
                        </span>

                        <strong className="text-lg text-green-900">
                          {numericAmount} USDT
                        </strong>

                      </div>

                      <div className="mt-3 flex items-center justify-between">

                        <span className="text-sm text-green-800">
                          Exchange Rate
                        </span>

                        <strong className="text-lg text-green-900">
                          1 USDT ={" "}
                          {FIXED_USDT_RATE} PKR
                        </strong>

                      </div>

                      <div className="mt-3 rounded-lg bg-white p-4">

                        <p className="text-sm text-gray-500">
                          You need to send
                        </p>

                        <p className="mt-1 text-2xl font-bold text-gray-900">
                          {calculatedPkr.toLocaleString(
                            "en-PK"
                          )}{" "}
                          PKR
                        </p>

                      </div>

                      <p className="mt-3 text-xs text-green-700">
                        Your account will receive{" "}
                        <strong>
                          {numericAmount} USDT
                        </strong>{" "}
                        after admin approval.
                      </p>
                    </>

                  )}

                </div>

              )}

            {/* REFERENCE ID */}

            <div>

              <label className="mb-2 block text-sm font-medium text-gray-700">
                Transaction / Reference ID
              </label>

              <input
                type="text"
                value={referenceId}
                onChange={(e) =>
                  setReferenceId(
                    e.target.value
                  )
                }
                placeholder="Enter transaction ID"
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-600"
              />

            </div>

            {/* SCREENSHOT */}

            <div>

              <label
                htmlFor="deposit-screenshot"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Payment Screenshot
              </label>

              <input
                id="deposit-screenshot"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                required
                onChange={(e) => {
                  const file =
                    e.target.files?.[0] ||
                    null;

                  setScreenshot(file);
                }}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none file:mr-4 file:rounded-md file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-blue-700 focus:border-blue-600"
              />

              <p className="mt-2 text-xs text-gray-500">
                JPG, PNG or WebP — maximum 5 MB.
              </p>

              {screenshot && (
                <div className="mt-3 rounded-lg border bg-gray-50 p-3">

                  <p className="text-sm font-medium text-gray-700">
                    Selected file:
                  </p>

                  <p className="mt-1 break-all text-sm text-gray-600">
                    {screenshot.name}
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    {(
                      screenshot.size /
                      1024 /
                      1024
                    ).toFixed(2)}{" "}
                    MB
                  </p>

                </div>
              )}

            </div>

            {/* SUBMIT */}

            <button
              type="submit"
              disabled={
                loading ||
                methodsLoading ||
                paymentMethods.length ===
                  0 ||
                !screenshot
              }
              className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Uploading & Submitting..."
                : "Submit Deposit"}
            </button>

          </form>

          {/* MESSAGE */}

          {message && (
            <div
              className={`mt-5 rounded-lg p-4 text-center text-sm font-medium ${
                success
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-600"
              }`}
            >
              {message}
            </div>
          )}

        </div>

        {/* DEPOSIT HISTORY */}

        <div className="mt-8 rounded-2xl bg-white p-5 shadow-sm sm:p-6">

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <h2 className="text-2xl font-bold text-gray-900">
                Deposit History
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Your submitted deposit requests.
              </p>

            </div>

            <button
              type="button"
              onClick={() =>
                loadDeposits(user.id)
              }
              disabled={historyLoading}
              className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
            >
              {historyLoading
                ? "Refreshing..."
                : "Refresh"}
            </button>

          </div>

          {historyLoading ? (

            <div className="mt-6 rounded-xl bg-gray-50 p-5 text-center text-gray-500">
              Loading deposit history...
            </div>

          ) : deposits.length === 0 ? (

            <div className="mt-6 rounded-xl bg-gray-50 p-5 text-center text-gray-500">
              No deposits found.
            </div>

          ) : (

            <div className="mt-6 space-y-4">

              {deposits.map(
                (deposit) => (

                  <div
                    key={deposit.id}
                    className="rounded-xl border border-gray-200 p-5"
                  >

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                      <div>

                        <p className="text-xl font-bold text-gray-900">
                          $
                          {Number(
                            deposit.amount || 0
                          ).toFixed(2)}{" "}
                          USDT
                        </p>

                        {Number(
                          deposit.pkrAmount || 0
                        ) > 0 && (
                          <p className="mt-1 text-sm font-semibold text-gray-600">
                            Paid:{" "}
                            {Number(
                              deposit.pkrAmount || 0
                            ).toLocaleString(
                              "en-PK"
                            )}{" "}
                            PKR
                          </p>
                        )}

                        <p className="mt-1 text-sm text-gray-500">
                          {
                            deposit.paymentMethod
                          }
                        </p>

                      </div>

                      <span
                        className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(
                          deposit.status
                        )}`}
                      >
                        {deposit.status}
                      </span>

                    </div>

                    <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">

                      <div>

                        <p className="text-gray-500">
                          Reference ID
                        </p>

                        <p className="mt-1 break-all font-medium text-gray-900">
                          {
                            deposit.referenceId
                          }
                        </p>

                      </div>

                      <div>

                        <p className="text-gray-500">
                          Deposit ID
                        </p>

                        <p className="mt-1 break-all font-medium text-gray-900">
                          {deposit.id}
                        </p>

                      </div>

                      <div>

                        <p className="text-gray-500">
                          Date & Time
                        </p>

                        <p className="mt-1 font-medium text-gray-900">
                          {formatDateTime(
                            deposit.createdAt
                          )}
                        </p>

                      </div>

                      {Number(
                        deposit.pkrAmount || 0
                      ) > 0 && (

                        <div>

                          <p className="text-gray-500">
                            Exchange Rate
                          </p>

                          <p className="mt-1 font-medium text-gray-900">
                            1 USDT ={" "}
                            {Number(
                              deposit.usdtRate ||
                                FIXED_USDT_RATE
                            )}{" "}
                            PKR
                          </p>

                        </div>

                      )}

                    </div>

                    {deposit.screenshotUrl && (

                      <div className="mt-4">

                        <a
                          href={
                            deposit.screenshotUrl
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex rounded-lg bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-100"
                        >
                          View Payment Screenshot
                        </a>

                      </div>

                    )}

                  </div>

                )
              )}

            </div>

          )}

        </div>

      </section>

      {/* FOOTER */}

      <footer className="border-t bg-white px-6 py-8 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} Smart Money Income. All rights reserved.
      </footer>

    </main>
  );
}