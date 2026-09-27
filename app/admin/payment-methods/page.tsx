"use client";

import { FormEvent, useEffect, useState } from "react";

type PaymentMethod = {
  id: string;
  name: string;
  methodType: string;
  accountInfo: string;
  instructions: string | null;
  active: boolean;
};

const methods = [
  "JazzCash",
  "Easypaisa",
  "Bank Transfer",
  "USDT (TRC20)",
];

export default function PaymentMethodsPage() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  const [name, setName] = useState("");
  const [methodType, setMethodType] = useState("");
  const [accountInfo, setAccountInfo] = useState("");
  const [instructions, setInstructions] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMethods, setLoadingMethods] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  async function loadPaymentMethods() {
    try {
      setLoadingMethods(true);
      setMessage("");

      const response = await fetch(
        "/api/admin/payment-methods",
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (response.ok) {
        setPaymentMethods(
          data.paymentMethods || []
        );
      } else {
        setMessage(
          data.error ||
            "Unable to load payment methods."
        );
      }
    } catch {
      setMessage("Unable to connect to server.");
    } finally {
      setLoadingMethods(false);
    }
  }

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  function resetForm() {
    setName("");
    setMethodType("");
    setAccountInfo("");
    setInstructions("");
    setEditingId(null);
  }

  function startEdit(method: PaymentMethod) {
    setEditingId(method.id);
    setName(method.name);
    setMethodType(method.methodType);
    setAccountInfo(method.accountInfo);
    setInstructions(method.instructions || "");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleSubmit(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setMessage("");
    setLoading(true);

    try {
      const url = editingId
        ? `/api/admin/payment-methods/${editingId}`
        : "/api/admin/payment-methods";

      const response = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          methodType,
          accountInfo,
          instructions,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.error ||
            (editingId
              ? "Failed to update payment method."
              : "Failed to create payment method.")
        );
        return;
      }

      setMessage(
        editingId
          ? "Payment method updated successfully."
          : "Payment method added successfully."
      );

      resetForm();

      await loadPaymentMethods();
    } catch {
      setMessage("Unable to connect to server.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(
    method: PaymentMethod
  ) {
    setMessage("");

    try {
      const response = await fetch(
        `/api/admin/payment-methods/${method.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            active: !method.active,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.error ||
            "Unable to change status."
        );
        return;
      }

      setMessage(
        method.active
          ? "Payment method deactivated."
          : "Payment method activated."
      );

      await loadPaymentMethods();
    } catch {
      setMessage("Unable to connect to server.");
    }
  }

  async function deletePaymentMethod(
    id: string
  ) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this payment method?"
    );

    if (!confirmed) {
      return;
    }

    setMessage("");

    try {
      const response = await fetch(
        `/api/admin/payment-methods/${id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.error ||
            "Unable to delete payment method."
        );
        return;
      }

      setMessage(
        "Payment method deleted successfully."
      );

      if (editingId === id) {
        resetForm();
      }

      await loadPaymentMethods();
    } catch {
      setMessage("Unable to connect to server.");
    }
  }

  async function logoutAdmin() {
    try {
      setLoggingOut(true);
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
    } catch (error) {
      setLoggingOut(false);

      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to logout."
      );
    }
  }

  return (
    <main className="min-h-screen bg-gray-100">
      {/* HEADER */}
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold text-blue-600">
              Smart Money Income
            </h1>

            <p className="text-sm text-gray-500">
              Admin — Payment Methods
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
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
              type="button"
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
              type="button"
              onClick={() => {
                window.location.href =
                  "/admin/withdrawals";
              }}
              disabled={loggingOut}
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              Withdrawals
            </button>

            <button
              type="button"
              onClick={loadPaymentMethods}
              disabled={
                loadingMethods ||
                loggingOut
              }
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-blue-700 disabled:opacity-50"
            >
              {loadingMethods
                ? "Loading..."
                : "Refresh"}
            </button>

            <button
              type="button"
              onClick={logoutAdmin}
              disabled={loggingOut}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-red-700 disabled:opacity-50"
            >
              {loggingOut
                ? "Logging out..."
                : "Logout"}
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* FORM */}
          <div className="rounded-2xl bg-white p-8 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingId
                  ? "Edit Payment Method"
                  : "Add Payment Method"}
              </h2>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={loggingOut}
                  className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
              )}
            </div>

            <form
              onSubmit={handleSubmit}
              className="mt-6 space-y-5"
            >
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Payment Method
                </label>

                <select
                  value={methodType}
                  onChange={(e) => {
                    setMethodType(
                      e.target.value
                    );

                    if (!editingId) {
                      setName(
                        e.target.value
                      );
                    }
                  }}
                  required
                  disabled={loggingOut}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-600 disabled:bg-gray-100"
                >
                  <option value="">
                    Select payment method
                  </option>

                  {methods.map((method) => (
                    <option
                      key={method}
                      value={method}
                    >
                      {method}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Display Name
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(e) =>
                    setName(
                      e.target.value
                    )
                  }
                  placeholder="Example: JazzCash"
                  required
                  disabled={loggingOut}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-600 disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Account / Wallet Information
                </label>

                <textarea
                  value={accountInfo}
                  onChange={(e) =>
                    setAccountInfo(
                      e.target.value
                    )
                  }
                  placeholder="Enter account number, bank details or USDT wallet address"
                  required
                  rows={4}
                  disabled={loggingOut}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-600 disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Instructions
                </label>

                <textarea
                  value={instructions}
                  onChange={(e) =>
                    setInstructions(
                      e.target.value
                    )
                  }
                  placeholder="Payment instructions for users"
                  rows={4}
                  disabled={loggingOut}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-600 disabled:bg-gray-100"
                />
              </div>

              <button
                type="submit"
                disabled={
                  loading ||
                  loggingOut
                }
                className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-gray-900 hover:bg-blue-700 disabled:opacity-50"
              >
                {loading
                  ? "Saving..."
                  : editingId
                  ? "Update Payment Method"
                  : "Add Payment Method"}
              </button>
            </form>

            {message && (
              <div className="mt-5 rounded-lg bg-blue-50 p-4 text-center text-sm font-medium text-blue-700">
                {message}
              </div>
            )}
          </div>

          {/* LIST */}
          <div className="rounded-2xl bg-white p-8 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                Payment Methods
              </h2>

              <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-600">
                {paymentMethods.length}
              </span>
            </div>

            <div className="mt-6 space-y-4">
              {loadingMethods ? (
                <div className="py-10 text-center">
                  <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />

                  <p className="mt-4 text-gray-500">
                    Loading payment methods...
                  </p>
                </div>
              ) : paymentMethods.length === 0 ? (
                <p className="text-gray-500">
                  No payment methods added yet.
                </p>
              ) : (
                paymentMethods.map(
                  (method) => (
                    <div
                      key={method.id}
                      className="rounded-xl border p-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">
                            {method.name}
                          </h3>

                          <p className="mt-1 text-sm text-gray-500">
                            {method.methodType}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            method.active
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {method.active
                            ? "ACTIVE"
                            : "INACTIVE"}
                        </span>
                      </div>

                      <div className="mt-4 rounded-lg bg-gray-50 p-3">
                        <p className="text-sm font-medium text-gray-700">
                          Account Information
                        </p>

                        <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">
                          {method.accountInfo}
                        </p>
                      </div>

                      {method.instructions && (
                        <div className="mt-3 rounded-lg bg-gray-50 p-3">
                          <p className="text-sm font-medium text-gray-700">
                            Instructions
                          </p>

                          <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">
                            {method.instructions}
                          </p>
                        </div>
                      )}

                      <div className="mt-5 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            startEdit(
                              method
                            )
                          }
                          disabled={loggingOut}
                          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-blue-700 disabled:opacity-50"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            toggleActive(
                              method
                            )
                          }
                          disabled={loggingOut}
                          className={`rounded-lg px-4 py-2 text-sm font-semibold text-gray-900 disabled:opacity-50 ${
                            method.active
                              ? "bg-orange-500 hover:bg-orange-600"
                              : "bg-green-600 hover:bg-green-700"
                          }`}
                        >
                          {method.active
                            ? "Deactivate"
                            : "Activate"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            deletePaymentMethod(
                              method.id
                            )
                          }
                          disabled={loggingOut}
                          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-red-700 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )
                )
              )}
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t bg-white px-6 py-8 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} Smart Money Income.
        All rights reserved.
      </footer>
    </main>
  );
}
