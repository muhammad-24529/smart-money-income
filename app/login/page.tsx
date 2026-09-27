"use client";

import { FormEvent, useState } from "react";

type LoginUser = {
  id: string;
  name?: string;
  email?: string;
  balance?: number;
  referralCode?: string | null;
};

type LoginResponse = {
  success?: boolean;
  user?: LoginUser;
  error?: string;
  message?: string;
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setMessage("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setMessage("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: cleanEmail,
          password,
        }),
      });

      let data: LoginResponse = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      console.log("LOGIN:", response.status, data);

      if (!response.ok) {
        setMessage(
          data?.error ||
            data?.message ||
            "Invalid email or password."
        );
        return;
      }

      if (!data?.user?.id) {
        setMessage(
          "Login succeeded, but user information was not returned."
        );
        return;
      }

      // Remove old login data
      localStorage.removeItem("smi_user");
      sessionStorage.removeItem("smi_user");

      // Save current logged-in user
      const userData = JSON.stringify(data.user);

      if (remember) {
        localStorage.setItem("smi_user", userData);
      } else {
        sessionStorage.setItem("smi_user", userData);
      }

      console.log(
        "LOGIN SUCCESS - REDIRECTING TO DASHBOARD"
      );

      // Redirect after successful login
      window.location.replace("/dashboard");
    } catch (error) {
      console.error("LOGIN ERROR:", error);

      setMessage(
        "Unable to connect to the server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <header className="border-b bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
          <a
            href="/"
            className="text-xl font-bold text-blue-600 sm:text-2xl"
          >
            Smart Money Income
          </a>

          <a
            href="/"
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-center text-sm font-semibold text-gray-700 transition hover:bg-gray-50 sm:w-auto"
          >
            Home
          </a>
        </div>
      </header>

      {/* LOGIN SECTION */}
      <section className="flex min-h-[calc(100vh-80px)] items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg sm:p-8">
          {/* TITLE */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              Welcome Back
            </h1>

            <p className="mt-2 text-sm text-gray-500 sm:text-base">
              Login to your Smart Money Income account
            </p>
          </div>

          {/* FORM */}
          <form
            onSubmit={handleLogin}
            className="mt-6 space-y-5 sm:mt-8"
          >
            {/* EMAIL */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Email Address
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                disabled={loading}
                autoComplete="email"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100"
              />
            </div>

            {/* PASSWORD */}
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label className="block text-sm font-medium text-gray-700">
                  Password
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setMessage(
                      "Please contact support to reset your password."
                    );
                  }}
                  className="text-xs font-medium text-blue-600 hover:underline sm:text-sm"
                >
                  Forgot Password?
                </button>
              </div>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                disabled={loading}
                autoComplete="current-password"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100"
              />
            </div>

            {/* REMEMBER ME */}
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                disabled={loading}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />

              <span className="text-sm text-gray-600">
                Remember me
              </span>
            </label>

            {/* ERROR MESSAGE */}
            {message && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center text-sm font-medium text-red-600">
                {message}
              </div>
            )}

            {/* LOGIN BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 active:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          {/* REGISTER LINK */}
          <p className="mt-6 text-center text-sm text-gray-600">
            Don't have an account?{" "}
            <a
              href="/register"
              className="font-semibold text-blue-600 hover:underline"
            >
              Create Account
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}