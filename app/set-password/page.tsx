"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { KeyRound, Eye, EyeOff, CheckCircle } from "lucide-react";

export default function SetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!token) {
      setError("Missing token. Please use the link from your email.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push("/login"), 3000);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="mx-auto w-full max-w-md animate-fade-in-up text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-success-100">
            <CheckCircle className="h-8 w-8 text-success-600" />
          </div>
          <h1 className="text-2xl font-bold text-surface-900">Password Set Successfully!</h1>
          <p className="mt-3 text-surface-500">
            You can now sign in with your new password. Redirecting to login...
          </p>
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
              <KeyRound className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-surface-900">Set Your Password</h1>
              <p className="text-sm text-surface-500">Choose a secure password for your account</p>
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
              <label className="text-sm font-medium text-surface-600" htmlFor="password">
                New Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  className="w-full rounded-xl border-0 bg-surface-50/80 px-4 py-3.5 text-surface-900 shadow-sm ring-1 ring-inset ring-surface-200 placeholder:text-surface-400 focus:ring-2 focus:ring-inset focus:ring-primary-500 focus:bg-white sm:text-sm sm:leading-6 transition-all duration-200 pr-12"
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-surface-600" htmlFor="confirm">
                Confirm Password
              </label>
              <input
                id="confirm"
                className="w-full rounded-xl border-0 bg-surface-50/80 px-4 py-3.5 text-surface-900 shadow-sm ring-1 ring-inset ring-surface-200 placeholder:text-surface-400 focus:ring-2 focus:ring-inset focus:ring-primary-500 focus:bg-white sm:text-sm sm:leading-6 transition-all duration-200"
                type={showPassword ? "text" : "password"}
                placeholder="Re-enter your password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-gradient w-full rounded-xl px-4 py-3.5 text-sm font-semibold text-white shadow-sm disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? "Setting password..." : "Set Password & Continue"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
