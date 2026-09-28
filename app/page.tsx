"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-2xl font-bold text-blue-600">
            Smart Money Income
          </Link>

          <nav className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 font-medium text-slate-700 hover:bg-slate-100"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700"
            >
              Register
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-20 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 inline-flex rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
            Welcome to Smart Money Income
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl">
            Grow Your Money With
            <span className="block text-blue-600">Smart Investments</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            Manage your investments, track your income, make deposits and
            withdrawals, and monitor your financial activity from one simple
            dashboard.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className="rounded-xl bg-blue-600 px-8 py-3.5 font-bold text-white shadow-sm hover:bg-blue-700"
            >
              Get Started
            </Link>

            <Link
              href="/plans"
              className="rounded-xl border border-slate-300 bg-white px-8 py-3.5 font-bold text-slate-700 hover:bg-slate-50"
            >
              View Plans
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 pb-20 md:grid-cols-3">
        <div className="rounded-2xl bg-white p-7 shadow-sm ring-1 ring-slate-200">
          <div className="mb-4 text-3xl">??</div>
          <h2 className="text-xl font-bold">Investment Plans</h2>
          <p className="mt-2 text-slate-600">
            Explore available investment plans and manage your investments.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-7 shadow-sm ring-1 ring-slate-200">
          <div className="mb-4 text-3xl">??</div>
          <h2 className="text-xl font-bold">Track Your Income</h2>
          <p className="mt-2 text-slate-600">
            Monitor your balance, daily income, transactions, and investment
            activity.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-7 shadow-sm ring-1 ring-slate-200">
          <div className="mb-4 text-3xl">??</div>
          <h2 className="text-xl font-bold">Secure Account</h2>
          <p className="mt-2 text-slate-600">
            Access your account through a simple and secure user dashboard.
          </p>
        </div>
      </section>

      <section className="border-y bg-white">
        <div className="mx-auto max-w-7xl px-6 py-16 text-center">
          <h2 className="text-3xl font-bold">Ready to Get Started?</h2>
          <p className="mt-3 text-slate-600">
            Create your account and access your Smart Money Income dashboard.
          </p>

          <Link
            href="/register"
            className="mt-7 inline-block rounded-xl bg-blue-600 px-8 py-3.5 font-bold text-white hover:bg-blue-700"
          >
            Create Account
          </Link>
        </div>
      </section>

      <footer className="bg-slate-900 px-6 py-8 text-center text-sm text-slate-300">
        © {new Date().getFullYear()} Smart Money Income. All rights reserved.
      </footer>
    </main>
  );
}
