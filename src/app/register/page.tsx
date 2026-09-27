"use client";

import { useState } from "react";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setMessage("");

    if (!name.trim() || !email.trim()) {
      setMessage("Please enter your name and email.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
        }),
      });

      const data = await response.json();

      console.log("REGISTER:", response.status, data);

      if (response.status === 409) {
        setMessage("This email is already registered.");
        return;
      }

      if (!response.ok) {
        setMessage(data?.error || "Registration failed.");
        return;
      }

      setMessage(
        `Account created successfully!\nWelcome ${data?.user?.name || name}.`
      );

      setName("");
      setEmail("");
    } catch (error) {
      console.error("REGISTER ERROR:", error);
      setMessage("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 px-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">

        <h1 className="text-3xl font-bold text-blue-600">
          Smart Money Income
        </h1>

        <h2 className="mt-6 text-2xl font-bold text-gray-900">
          Create Account
        </h2>

        <p className="mt-2 text-gray-500">
          Register your account to continue.
        </p>

        <form onSubmit={handleRegister} className="mt-6 space-y-4">

          <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-600"
          />

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-600"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Register"}
          </button>

        </form>

        {message && (
          <div className="mt-6 whitespace-pre-wrap rounded-lg bg-gray-900 p-4 text-sm text-white">
            {message}
          </div>
        )}

      </div>
    </main>
  );
}