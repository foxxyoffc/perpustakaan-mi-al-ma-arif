"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

type LoginResponse = {
  success?: boolean;
  message?: string;
  redirect?: string;
  attemptsRemaining?: number;
  locked?: boolean;
  reportCreated?: boolean;
};

export default function UserLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(
    null
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");
    setSuccess("");
    setAttemptsRemaining(null);

    const cleanUsername = username.trim();

    if (!cleanUsername) {
      setError("Username wajib diisi.");
      return;
    }

    if (!password) {
      setError("Password wajib diisi.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: cleanUsername,
          password,
          role: "user",
        }),
      });

      const data: LoginResponse = await response.json().catch(() => ({
        success: false,
        message: "Terjadi kesalahan pada server.",
      }));

      if (!response.ok || !data.success) {
        if (
          typeof data.attemptsRemaining === "number" &&
          data.attemptsRemaining > 0
        ) {
          setAttemptsRemaining(data.attemptsRemaining);
        }

        if (data.locked || data.reportCreated) {
          setError(
            data.message ||
              "Terlalu banyak percobaan login gagal. Aktivitas telah dilaporkan kepada admin."
          );
        } else {
          setError(data.message || "Username atau password salah.");
        }

        return;
      }

      setSuccess("Login berhasil. Mengarahkan ke perpustakaan...");

      const redirectTo = data.redirect || "/category";

      window.location.href = redirectTo;
    } catch {
      setError(
        "Tidak dapat terhubung ke server. Silakan periksa koneksi internet dan coba lagi."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-10">
      {/* Background decoration */}
      <div
        className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-emerald-200/30 blur-3xl"
        aria-hidden="true"
      />

      <div
        className="pointer-events-none absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-emerald-900/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Brand */}
        <div className="mb-7 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-3 rounded-full border border-emerald-900/10 bg-white px-4 py-2 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-900 text-white">
              <BookIcon className="h-4 w-4" />
            </span>

            <span className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-950">
              MI Al-Ma&apos;arif Nusantara
            </span>
          </Link>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-emerald-900/10 bg-white p-6 shadow-[0_20px_70px_rgba(15,61,36,0.10)] sm:p-8">
          {/* Heading */}
          <div className="mb-7">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Perpustakaan Digital
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-emerald-950">
              Selamat datang kembali
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Masuk menggunakan akun perpustakaan yang telah disetujui.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
            >
              <div className="flex gap-3">
                <div className="mt-0.5 shrink-0 text-red-600">
                  <AlertIcon className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-medium text-red-800">
                    Login gagal
                  </p>

                  <p className="mt-1 text-xs leading-5 text-red-700">
                    {error}
                  </p>

                  {attemptsRemaining !== null && (
                    <p className="mt-2 text-xs font-semibold text-red-800">
                      Sisa percobaan: {attemptsRemaining}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Success */}
          {success && (
            <div
              role="status"
              className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3"
            >
              <div className="flex gap-3">
                <div className="mt-0.5 shrink-0 text-emerald-700">
                  <CheckIcon className="h-5 w-5" />
                </div>

                <p className="text-sm leading-6 text-emerald-800">
                  {success}
                </p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate>
            {/* Username */}
            <div>
              <label
                htmlFor="username"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Username
              </label>

              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <UserIcon className="h-5 w-5" />
                </span>

                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="Masukkan username"
                  disabled={loading}
                  className="h-12 rounded-xl border-slate-200 bg-slate-50 pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:bg-white focus:ring-4 focus:ring-emerald-900/5 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
            </div>

            {/* Password */}
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between gap-3">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-slate-700"
                >
                  Password
                </label>

                <Link
                  href="/login/forgot-password"
                  className="text-xs font-medium text-emerald-700 transition hover:text-emerald-950 hover:underline"
                >
                  Lupa password?
                </Link>
              </div>

              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <LockIcon className="h-5 w-5" />
                </span>

                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Masukkan password"
                  disabled={loading}
                  className="h-12 rounded-xl border-slate-200 bg-slate-50 pl-11 pr-12 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:bg-white focus:ring-4 focus:ring-emerald-900/5 disabled:cursor-not-allowed disabled:opacity-60"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  disabled={loading}
                  aria-label={
                    showPassword
                      ? "Sembunyikan password"
                      : "Tampilkan password"
                  }
                  className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-emerald-800 disabled:cursor-not-allowed"
                >
                  {showPassword ? (
                    <EyeOffIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-900 px-5 text-sm font-semibold text-white shadow-lg shadow-emerald-950/10 transition duration-300 hover:-translate-y-0.5 hover:bg-emerald-800 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Spinner className="h-5 w-5" />
                  Memproses...
                </>
              ) : (
                <>
                  Masuk
                  <ArrowIcon className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Register */}
          <div className="mt-7 border-t border-slate-100 pt-6 text-center">
            <p className="text-sm text-slate-500">
              Belum memiliki akun?
            </p>

            <Link
              href="/sign-in"
              className="mt-1 inline-block text-sm font-semibold text-emerald-800 transition hover:text-emerald-950 hover:underline"
            >
              Daftar akun perpustakaan
            </Link>
          </div>
        </div>

        {/* Other login */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-slate-400">
          <Link
            href="/login-admin"
            className="transition hover:text-emerald-800"
          >
            Login Admin
          </Link>

          <span aria-hidden="true">•</span>

          <Link
            href="/login-developer"
            className="transition hover:text-emerald-800"
          >
            Login Developer
          </Link>

          <span aria-hidden="true">•</span>

          <Link
            href="/"
            className="transition hover:text-emerald-800"
          >
            Kembali ke Home
          </Link>
        </div>

        {/* Copyright */}
        <p className="mt-6 px-4 text-center text-[11px] leading-5 text-slate-400">
          Hak Cipta MI Al-Ma&apos;arif Nusantara ©2026 All Right Reserved.
        </p>
      </div>
    </main>
  );
}

/* ============================================================
   ICONS
============================================================ */

function UserIcon({
  className = "",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c.8-3.2 3.1-5 7-5s6.2 1.8 7 5" />
    </svg>
  );
}

function LockIcon({
  className = "",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function EyeIcon({
  className = "",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

function EyeOffIcon({
  className = "",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m3 3 18 18" />
      <path d="M10.6 6.2A10.7 10.7 0 0 1 12 6c6 0 9.5 6 9.5 6a16.5 16.5 0 0 1-3 3.6" />
      <path d="M6.3 6.3C3.8 8 2.5 12 2.5 12s3.5 6 9.5 6c1.3 0 2.5-.3 3.6-.8" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}

function AlertIcon({
  className = "",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 3 2.8 19a1.5 1.5 0 0 0 1.3 2.25h15.8A1.5 1.5 0 0 0 21.2 19L12 3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function CheckIcon({
  className = "",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function Spinner({
  className = "",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={`animate-spin ${className}`}
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="3"
        className="opacity-25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        className="opacity-90"
      />
    </svg>
  );
}

function ArrowIcon({
  className = "",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function BookIcon({
  className = "",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
    </svg>
  );
}
