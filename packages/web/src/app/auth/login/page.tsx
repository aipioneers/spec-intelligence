"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// ---------------------------------------------------------------------------
// Login Page
// ---------------------------------------------------------------------------

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/features";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      if (!email.trim() || !password) {
        setError("Email and password are required.");
        return;
      }

      setLoading(true);

      try {
        const res = await fetch("/api/auth/sign-in/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim(),
            password,
            rememberMe,
          }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => null);
          const message =
            body?.message ??
            body?.error?.message ??
            "Invalid email or password.";
          setError(message);
          setLoading(false);
          return;
        }

        // Successful sign-in — redirect
        router.push(callbackUrl);
        router.refresh();
      } catch {
        setError("An unexpected error occurred. Please try again.");
        setLoading(false);
      }
    },
    [email, password, rememberMe, callbackUrl, router],
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-1 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-12">
            Sign in to Spec Intelligence
          </h1>
          <p className="mt-2 text-sm text-gray-9">
            Enter your credentials to access the dashboard.
          </p>
        </div>

        {/* Error display */}
        {error && (
          <div className="mt-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-11"
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              placeholder="you@example.com"
              className="mt-1 block w-full rounded-md border border-gray-6 bg-white px-3 py-2 text-sm text-gray-12 placeholder:text-gray-8 focus:border-accent-8 focus:outline-none focus:ring-1 focus:ring-accent-8"
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-11"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              placeholder="Enter your password"
              className="mt-1 block w-full rounded-md border border-gray-6 bg-white px-3 py-2 text-sm text-gray-12 placeholder:text-gray-8 focus:border-accent-8 focus:outline-none focus:ring-1 focus:ring-accent-8"
            />
          </div>

          {/* Remember me */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-gray-11">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-gray-6 text-accent-9 focus:ring-accent-8"
              />
              Remember me
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-accent-9 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-10 focus:outline-none focus:ring-2 focus:ring-accent-8 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        {/* Register link */}
        <p className="mt-6 text-center text-sm text-gray-9">
          Don&apos;t have an account?{" "}
          <a
            href="/auth/register"
            className="font-medium text-accent-11 hover:text-accent-12"
          >
            Create one
          </a>
        </p>
      </div>
    </div>
  );
}
