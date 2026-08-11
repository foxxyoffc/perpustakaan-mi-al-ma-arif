"use client";

import Link from "next/link";

export default function AdminForgotPasswordPage() {
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
              <ShieldIcon className="h-4 w-4" />
            </span>

            <span className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-950">
              MI Al-Ma&apos;arif Nusantara
            </span>
          </Link>
        </div>

        {/* Main card */}
        <div className="rounded-3xl border border-emerald-900/10 bg-white p-6 shadow-[0_20px_70px_rgba(15,61,36,0.10)] sm:p-8">
          {/* Icon */}
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
            <KeyIcon className="h-7 w-7" />
          </div>

          {/* Heading */}
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Bantuan Administrator
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-emerald-950">
              Lupa password admin?
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              Akun admin dikelola oleh developer. Jika mengalami
              masalah login, silakan gunakan salah satu opsi bantuan
              berikut.
            </p>
          </div>

          {/* Important notice */}
          <div className="mt-6 flex gap-3 rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
            <div className="mt-0.5 shrink-0 text-amber-700">
              <InfoIcon className="h-5 w-5" />
            </div>

            <p className="text-xs leading-5 text-amber-800">
              Untuk keamanan sistem, password admin tidak dapat
              ditampilkan kembali. Developer akan melakukan
              verifikasi sebelum membantu mengganti password.
            </p>
          </div>

          {/* Options */}
          <div className="mt-6 space-y-3">
            {/* Sign in */}
            <Link
              href="/sign-in"
              className="group flex w-full items-center gap-4 rounded-2xl border border-emerald-900/10 bg-white p-4 transition duration-300 hover:-translate-y-0.5 hover:border-emerald-900/20 hover:bg-emerald-50/50 hover:shadow-md"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-900/10 text-emerald-900">
                <UserPlusIcon className="h-5 w-5" />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-emerald-950">
                  Sign In
                </span>

                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  Kembali ke halaman pendaftaran akun user.
                </span>
              </span>

              <ArrowIcon className="h-5 w-5 shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-emerald-800" />
            </Link>

            {/* Contact developer */}
            <Link
              href="/report?type=admin-forgot-password"
              className="group flex w-full items-center gap-4 rounded-2xl border border-emerald-900/10 bg-white p-4 transition duration-300 hover:-translate-y-0.5 hover:border-emerald-900/20 hover:bg-emerald-50/50 hover:shadow-md"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-900/10 text-emerald-900">
                <MessageIcon className="h-5 w-5" />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-emerald-950">
                  Laporkan / Hubungi Developer
                </span>

                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  Kirim laporan mengenai masalah akun administrator.
                </span>
              </span>

              <ArrowIcon className="h-5 w-5 shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-emerald-800" />
            </Link>
          </div>

          {/* Security */}
          <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex gap-3">
              <div className="mt-0.5 shrink-0 text-emerald-700">
                <ShieldIcon className="h-5 w-5" />
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-700">
                  Keamanan akun
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Jangan membagikan username, password, kode
                  verifikasi, atau informasi akses administrator
                  kepada siapapun.
                </p>
              </div>
            </div>
          </div>

          {/* Back */}
          <div className="mt-7 border-t border-slate-100 pt-6 text-center">
            <Link
              href="/login-admin"
              className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 transition hover:text-emerald-950"
            >
              <BackIcon className="h-4 w-4" />
              Kembali ke Login Admin
            </Link>
          </div>
        </div>

        {/* Other login */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-slate-400">
          <Link
            href="/login"
            className="transition hover:text-emerald-800"
          >
            Login User
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
            Home
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

function ShieldIcon({
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
      <path d="M12 3 4.5 6v5.5c0 4.7 3.1 7.9 7.5 9.5 4.4-1.6 7.5-4.8 7.5-9.5V6L12 3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function KeyIcon({
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
      <circle cx="8" cy="15" r="4" />
      <path d="m11 12 8-8" />
      <path d="m16 5 3 3" />
      <path d="m14 7 3 3" />
    </svg>
  );
}

function UserPlusIcon({
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
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.8-3.2 3.1-5 6.5-5 2.1 0 3.8.7 5 2" />
      <path d="M18 9v6" />
      <path d="M15 12h6" />
    </svg>
  );
}

function MessageIcon({
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
      <path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 8.7 8.7 0 0 1-3.3-.6L4 20l1.5-3.4A7.2 7.2 0 0 1 4.5 12 7.5 7.5 0 0 1 12 4.5a7.5 7.5 0 0 1 8 7Z" />
      <path d="M8 12h.01" />
      <path d="M12 12h.01" />
      <path d="M16 12h.01" />
    </svg>
  );
}

function InfoIcon({
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
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10v6" />
      <path d="M12 7.5h.01" />
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

function BackIcon({
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
      <path d="M19 12H5" />
      <path d="m11 18-6-6 6-6" />
    </svg>
  );
}
