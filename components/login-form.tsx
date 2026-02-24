"use client";

import { getSession, signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { getPostLoginRedirectPath } from "@/lib/auth/redirects";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const nextPath = searchParams.get("next");
    const callbackUrl = nextPath || "/";

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    setLoading(false);

    if (!result || result.error) {
      setError("Invalid email or password");
      return;
    }

    if (nextPath) {
      router.push(result.url ?? nextPath);
      router.refresh();
      return;
    }

    const session = await getSession();
    router.push(getPostLoginRedirectPath(session?.user?.role));
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error ? (
        <div className="rounded-xl bg-danger-50 p-4 text-sm text-danger-600 ring-1 ring-danger-200/60 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-danger-500 shrink-0" />
          {error}
        </div>
      ) : null}
      
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-surface-600" htmlFor="email">
          Email Address
        </label>
        <input
          id="email"
          className="w-full rounded-xl border-0 bg-surface-50/80 px-4 py-3.5 text-surface-900 shadow-sm ring-1 ring-inset ring-surface-200 placeholder:text-surface-400 focus:ring-2 focus:ring-inset focus:ring-primary-500 focus:bg-white sm:text-sm sm:leading-6 transition-all duration-200"
          type="email"
          placeholder="admin@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>
      
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-surface-600" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          className="w-full rounded-xl border-0 bg-surface-50/80 px-4 py-3.5 text-surface-900 shadow-sm ring-1 ring-inset ring-surface-200 placeholder:text-surface-400 focus:ring-2 focus:ring-inset focus:ring-primary-500 focus:bg-white sm:text-sm sm:leading-6 transition-all duration-200"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </div>
      
      <button 
        className="mt-6 btn-gradient w-full rounded-xl px-4 py-3.5 text-sm font-semibold text-white shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:opacity-50 disabled:cursor-not-allowed" 
        disabled={loading}
      >
        {loading ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
