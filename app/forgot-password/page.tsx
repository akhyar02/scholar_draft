"use client";

import Link from "next/link";
import { useState } from "react";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      setSent(true);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="mx-auto w-full max-w-md animate-fade-in-up text-center">
          <div className="rounded-2xl bg-white/80 p-8 shadow-xl ring-1 ring-surface-200/60 backdrop-blur-sm">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-success-100">
              <CheckCircle className="h-8 w-8 text-success-600" />
            </div>
            <h1 className="text-2xl font-bold text-surface-900">Check Your Email</h1>
            <p className="mt-3 text-surface-500 leading-relaxed">
              If an account exists for <span className="font-medium text-surface-700">{email}</span>,
              we&apos;ve sent a password reset link. Check your inbox (and spam folder).
            </p>
            <div className="mt-8">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="mx-auto w-full max-w-md animate-fade-in-up">
        <div className="rounded-2xl bg-white/80 p-8 shadow-xl ring-1 ring-surface-200/60 backdrop-blur-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100">
              <Mail className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-surface-900">Forgot Password?</h1>
              <p className="text-sm text-surface-500">We&apos;ll send you a reset link</p>
            </div>
          </div>

          {error ? (
            <div className="mb-5 rounded-xl bg-danger-50 p-4 text-sm text-danger-600 ring-1 ring-danger-200/60 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-danger-500 shrink-0" />
              {error}
            </div>
          ) : null}

          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-surface-600" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                className="w-full rounded-xl border-0 bg-surface-50/80 px-4 py-3.5 text-surface-900 shadow-sm ring-1 ring-inset ring-surface-200 placeholder:text-surface-400 focus:ring-2 focus:ring-inset focus:ring-primary-500 focus:bg-white sm:text-sm sm:leading-6 transition-all duration-200"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-gradient w-full rounded-xl px-4 py-3.5 text-sm font-semibold text-white shadow-sm disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
