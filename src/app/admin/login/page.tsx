"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
      setLoading(false);
    } else {
      router.push("/admin");
      router.refresh();
    }
  };

  return (
    <div className="flex min-h-screen min-h-[100dvh]">
      {/* Left panel — brand (centered content on large screens) */}
      <div className="hidden lg:flex lg:w-1/2 bg-black flex-col justify-between p-12 xl:p-16">
        <div className="mx-auto w-full max-w-lg animate-fade-up">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://casezy.in/cdn/shop/files/caeszy-ssaw_1_1.png?v=1766555791&width=200"
            alt="Casezy"
            className="h-10 brightness-0 invert"
          />
        </div>
        <div className="mx-auto w-full max-w-lg">
          <h2 className="font-display text-4xl xl:text-5xl font-bold text-white leading-tight animate-fade-up" style={{ animationDelay: "100ms" }}>
            WhatsApp Commerce
            <br />
            <span className="text-brand-400">Made Simple.</span>
          </h2>
          <p className="mt-5 text-gray-400 text-sm leading-relaxed max-w-sm animate-fade-up" style={{ animationDelay: "200ms" }}>
            Manage orders, payments, and customer conversations — all from one dashboard.
          </p>
          <div className="mt-8 flex gap-6 text-xs text-gray-500 animate-fade-up" style={{ animationDelay: "350ms" }}>
            <div>
              <p className="text-2xl font-bold text-white font-display">100%</p>
              <p className="mt-0.5">WhatsApp Native</p>
            </div>
            <div className="w-px bg-white/10" />
            <div>
              <p className="text-2xl font-bold text-white font-display">Auto</p>
              <p className="mt-0.5">Payment Recovery</p>
            </div>
            <div className="w-px bg-white/10" />
            <div>
              <p className="text-2xl font-bold text-white font-display">Live</p>
              <p className="mt-0.5">Order Tracking</p>
            </div>
          </div>
        </div>
        <div className="mx-auto w-full max-w-lg flex items-center justify-between">
          <span className="text-xs text-gray-600">
            &copy; {new Date().getFullYear()} Casezy
          </span>
          <div className="text-right">
            <p className="text-xs text-gray-600">Product Extension of Chatmint</p>
            <p className="text-[10px] text-gray-600">Powered by Xava Web Services Pvt Ltd</p>
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo + brand */}
          <div className="mb-8 lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://casezy.in/cdn/shop/files/caeszy-ssaw_1_1.png?v=1766555791&width=200"
              alt="Casezy"
              className="h-8"
            />
            <p className="mt-3 text-sm text-gray-400">WhatsApp Commerce Admin</p>
          </div>

          <div className="mb-8 animate-fade-up" style={{ animationDelay: "100ms" }}>
            <h1 className="font-display text-2xl font-bold text-black">
              Sign in
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Enter your credentials to access the admin panel
            </p>
          </div>

          {error && (
            <div className="mb-6 border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5 animate-fade-up" style={{ animationDelay: "200ms" }}>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-field"
                placeholder="admin@casezy.in"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input-field"
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
