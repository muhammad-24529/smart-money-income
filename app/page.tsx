"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-slate-950/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-lg font-black">
              S
            </div>
            <div>
              <div className="text-lg font-bold tracking-tight">
                Smart Money
              </div>
              <div className="text-xs text-slate-400">INCOME</div>
            </div>
          </Link>

          <nav className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/plans"
              className="hidden rounded-lg px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white sm:block"
            >
              Plans
            </Link>

            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/5"
            >
              Login
            </Link>

            <Link
              href="/register"
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500"
            >
              Register
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(37,99,235,0.22),_transparent_40%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_rgba(14,165,233,0.12),_transparent_35%)]" />

        <div className="relative mx-auto max-w-7xl px-6 py-24 sm:py-32">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-300">
              <span className="h-2 w-2 rounded-full bg-blue-400" />
              Smart Money Income Platform
            </div>

            <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-6xl lg:text-7xl">
              Manage Your Money.
              <span className="block text-blue-500">
                Build Your Future.
              </span>
            </h1>

            <p className="mx-auto mt-7 max-w-2xl text-base leading-8 text-slate-400 sm:text-lg">
              A simple platform to manage your account, explore investment
              plans, track income, deposits, withdrawals, referrals and
              transactions.
            </p>

            <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">
              <Link
                href="/register"
                className="rounded-xl bg-blue-600 px-8 py-4 font-bold text-white shadow-xl shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-500"
              >
                Create Your Account
              </Link>

              <Link
                href="/plans"
                className="rounded-xl border border-white/10 bg-white/5 px-8 py-4 font-bold text-white transition hover:bg-white/10"
              >
                Explore Plans
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-white/10 bg-white/[0.03]">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-white/10 md:grid-cols-4">
          <div className="px-6 py-8 text-center">
            <div className="text-2xl font-black">24/7</div>
            <div className="mt-1 text-sm text-slate-400">Account Access</div>
          </div>

          <div className="px-6 py-8 text-center">
            <div className="text-2xl font-black">Secure</div>
            <div className="mt-1 text-sm text-slate-400">User Accounts</div>
          </div>

          <div className="px-6 py-8 text-center">
            <div className="text-2xl font-black">Easy</div>
            <div className="mt-1 text-sm text-slate-400">Money Management</div>
          </div>

          <div className="px-6 py-8 text-center">
            <div className="text-2xl font-black">Simple</div>
            <div className="mt-1 text-sm text-slate-400">Dashboard</div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-slate-50 py-20 text-slate-900">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-sm font-bold uppercase tracking-widest text-blue-600">
              Platform Features
            </div>

            <h2 className="mt-3 text-3xl font-black sm:text-4xl">
              Everything in one place
            </h2>

            <p className="mt-4 text-slate-600">
              Manage your financial activity through a clean and easy-to-use
              platform.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <FeatureCard
              icon="01"
              title="Investment Plans"
              description="Explore available plans and manage your investment activity from your account."
            />

            <FeatureCard
              icon="02"
              title="Income Tracking"
              description="Keep track of your balance, daily income, investments and transactions."
            />

            <FeatureCard
              icon="03"
              title="Deposits & Withdrawals"
              description="Submit deposits and withdrawal requests and monitor their status."
            />

            <FeatureCard
              icon="04"
              title="Referral Program"
              description="Invite users through your referral system and monitor referral activity."
            />

            <FeatureCard
              icon="05"
              title="Notifications"
              description="Stay updated with account activity and important platform notifications."
            />

            <FeatureCard
              icon="06"
              title="Support Chat"
              description="Communicate with the support team through the built-in chat system."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-slate-950 px-6 py-20">
        <div className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-gradient-to-br from-blue-600/20 to-slate-900 p-10 text-center sm:p-14">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-xl font-black">
            S
          </div>

          <h2 className="mt-6 text-3xl font-black sm:text-4xl">
            Start managing your account today
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-slate-400">
            Create your Smart Money Income account and access your personalized
            dashboard.
          </p>

          <Link
            href="/register"
            className="mt-8 inline-block rounded-xl bg-blue-600 px-8 py-4 font-bold text-white hover:bg-blue-500"
          >
            Get Started
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-slate-950">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-slate-400 sm:flex-row">
          <div>
            © {new Date().getFullYear()} Smart Money Income. All rights
            reserved.
          </div>

          <div className="flex gap-5">
            <Link href="/plans" className="hover:text-white">
              Plans
            </Link>
            <Link href="/login" className="hover:text-white">
              Login
            </Link>
            <Link href="/register" className="hover:text-white">
              Register
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-sm font-black text-blue-600">
        {icon}
      </div>

      <h3 className="mt-5 text-xl font-bold">{title}</h3>

      <p className="mt-3 leading-7 text-slate-600">{description}</p>
    </div>
  );
}
