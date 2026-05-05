"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Eye, EyeOff, Phone, Lock } from "lucide-react";

interface Props {
  callbackUrl?: string;
}

export default function LoginForm({ callbackUrl = "/" }: Props) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [adminPhone, setAdminPhone] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setIsPending(false);
    setAdminPhone(null);

    const result = await signIn("credentials", {
      identifier,
      password,
      redirect: false,
    });

    if (!result?.error) {
      router.push(callbackUrl);
      router.refresh();
      return;
    }

    // signIn failed — check if it's a pending-approval account
    const check = await fetch("/api/auth/pending-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });
    const { pending, adminPhone } = await check.json();

    setLoading(false);

    if (pending) {
      setIsPending(true);
      setAdminPhone(adminPhone ?? null);
    } else {
      setError("Invalid email or password");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email or Phone Number</label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            placeholder="you@example.com or +94 77 123 4567"
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type={showPass ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-sm"
          />
          <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isPending && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-4 space-y-2">
          <p className="text-sm font-semibold text-amber-800">Profile Pending Approval</p>
          <p className="text-sm text-amber-700 leading-relaxed">
            Your profile is not approved yet. It will be approved within 24 hours.
          </p>
          {adminPhone && (
            <p className="text-sm text-amber-700">
              If urgent, give us a call at{" "}
              <a
                href={`tel:${adminPhone}`}
                className="font-semibold text-amber-900 whitespace-nowrap hover:underline"
              >
                {adminPhone}
              </a>
            </p>
          )}
        </div>
      )}

      {error && !isPending && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-200">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors"
      >
        {loading ? "Signing in…" : "Sign In"}
      </button>

      <p className="text-center text-sm text-gray-600">
        Don't have an account?{" "}
        <Link href="/register" className="text-teal-600 font-semibold hover:underline">
          Sign up
        </Link>
      </p>
    </form>
  );
}
