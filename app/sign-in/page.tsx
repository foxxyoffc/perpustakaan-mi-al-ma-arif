"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

type RegisterResponse = {
  success?: boolean;
  message?: string;
  requestId?: string;
};

const CLASS_OPTIONS = [
  { value: "1", label: "Kelas 1" },
  { value: "2", label: "Kelas 2" },
  { value: "3", label: "Kelas 3" },
  { value: "4", label: "Kelas 4" },
  { value: "5", label: "Kelas 5" },
  { value: "6", label: "Kelas 6" },
];

export default function SignInPage() {
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [birthPlace, setBirthPlace] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [parentWhatsapp, setParentWhatsapp] = useState("");
  const [gmail, setGmail] = useState("");
  const [classLevel, setClassLevel] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const cleanFullName = fullName.trim();
    const cleanAddress = address.trim();
    const cleanBirthPlace = birthPlace.trim();
    const cleanWhatsapp = parentWhatsapp.replace(/[^\d+]/g, "");
    const cleanGmail = gmail.trim().toLowerCase();

    if (!cleanFullName) {
      setError("Nama lengkap wajib diisi.");
      return;
    }

    if (cleanFullName.length < 3) {
      setError("Nama lengkap minimal 3 karakter.");
      return;
    }

    if (!cleanAddress) {
      setError("Alamat wajib diisi.");
      return;
    }

    if (!cleanBirthPlace) {
      setError("Tempat lahir wajib diisi.");
      return;
    }

    if (!birthDate) {
      setError("Tanggal lahir wajib diisi.");
      return;
    }

    const selectedBirthDate = new Date(`${birthDate}T00:00:00`);
    const today = new Date();

    if (
      Number.isNaN(selectedBirthDate.getTime()) ||
      selectedBirthDate > today
    ) {
      setError("Tanggal lahir tidak valid.");
      return;
    }

    if (!cleanWhatsapp) {
      setError("Nomor WhatsApp orang tua wajib diisi.");
      return;
    }

    const whatsappDigits = cleanWhatsapp.replace(/\D/g, "");

    if (whatsappDigits.length < 9 || whatsappDigits.length > 15) {
      setError("Nomor WhatsApp orang tua tidak valid.");
      return;
    }

    if (!cleanGmail) {
      setError("Gmail wajib diisi.");
      return;
    }

    if (!/^[^\s@]+@gmail\.com$/i.test(cleanGmail)) {
      setError("Gunakan alamat Gmail yang valid dan aktif.");
      return;
    }

    if (!classLevel) {
      setError("Silakan pilih tingkatan kelas.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: cleanFullName,
          address: cleanAddress,
          birthPlace: cleanBirthPlace,
          birthDate,
          parentWhatsapp: cleanWhatsapp,
          gmail: cleanGmail,
          classLevel,
        }),
      });

      const data: RegisterResponse = await response.json().catch(() => ({
        success: false,
        message: "Terjadi kesalahan pada server.",
      }));

      if (!response.ok || !data.success) {
        setError(
          data.message ||
            "Pendaftaran belum dapat diproses. Silakan coba lagi."
        );
        return;
      }

      setSuccess(
        data.message ||
          "Pendaftaran berhasil dikirim. Tunggu maksimal 24 jam untuk persetujuan admin."
      );

      setFullName("");
      setAddress("");
      setBirthPlace("");
      setBirthDate("");
      setParentWhatsapp("");
      setGmail("");
      setClassLevel("");
    } catch {
      setError(
        "Tidak dapat terhubung ke server. Periksa koneksi internet lalu coba lagi."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 px-4 py-8 sm:py-12">
      {/* Background decoration */}
      <div
        className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-emerald-200/25 blur-3xl"
        aria-hidden="true"
      />

      <div
        className="pointer-events-none absolute -bottom-48 -right-40 h-[30rem] w-[30rem] rounded-full bg-emerald-900/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto w-full max-w-2xl">
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
        <div className="rounded-3xl border border-emerald-900/10 bg-white p-6 shadow-[0_20px_70px_rgba(15,61,36,0.10)] sm:p-8 lg:p-10">
          {/* Header */}
          <div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-900/10 text-emerald-900">
              <UserPlusIcon className="h-7 w-7" />
            </div>

            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Pendaftaran Akun
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-emerald-950 sm:text-4xl">
              Sign In
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">
              Isi data berikut dengan benar dan pastikan nomor
              WhatsApp orang tua serta Gmail yang digunakan masih
              aktif.
            </p>
          </div>

          {/* Information */}
          <div className="mt-6 flex gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
            <div className="mt-0.5 shrink-0 text-emerald-700">
              <InfoIcon className="h-5 w-5" />
            </div>

            <p className="text-xs leading-5 text-emerald-900">
              Setelah formulir dikirim, data akan masuk ke halaman
              laporan/request admin dan developer untuk diperiksa.
              Persetujuan membutuhkan waktu maksimal 24 jam.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div
              role="alert"
              className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4"
            >
              <div className="flex gap-3">
                <AlertIcon className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

                <div>
                  <p className="text-sm font-semibold text-red-800">
                    Pendaftaran belum berhasil
                  </p>

                  <p className="mt-1 text-xs leading-5 text-red-700">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Success */}
          {success && (
            <div
              role="status"
              className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"
            >
              <div className="flex gap-3">
                <CheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />

                <div>
                  <p className="text-sm font-semibold text-emerald-900">
                    Pendaftaran berhasil dikirim
                  </p>

                  <p className="mt-1 text-xs leading-5 text-emerald-800">
                    {success}
                  </p>

                  <p className="mt-2 text-xs font-medium leading-5 text-emerald-900">
                    Data login akan dikirim melalui Gmail atau
                    WhatsApp setelah akun disetujui.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            noValidate
            className="mt-7 space-y-6"
          >
            {/* Full name */}
            <div>
              <label
                htmlFor="full-name"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Nama Lengkap
                <span className="ml-1 text-red-500">*</span>
              </label>

              <input
                id="full-name"
                name="fullName"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Masukkan nama lengkap"
                disabled={loading}
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:bg-white focus:ring-4 focus:ring-emerald-900/5 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            {/* Address */}
            <div>
              <label
                htmlFor="address"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Alamat
                <span className="ml-1 text-red-500">*</span>
              </label>

              <textarea
                id="address"
                name="address"
                rows={3}
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="Masukkan alamat tempat tinggal"
                disabled={loading}
                className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:bg-white focus:ring-4 focus:ring-emerald-900/5 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            {/* Birth place/date */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="birth-place"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Tempat Lahir
                  <span className="ml-1 text-red-500">*</span>
                </label>

                <input
                  id="birth-place"
                  name="birthPlace"
                  type="text"
                  value={birthPlace}
                  onChange={(event) =>
                    setBirthPlace(event.target.value)
                  }
                  placeholder="Contoh: Jimbaran"
                  disabled={loading}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:bg-white focus:ring-4 focus:ring-emerald-900/5 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              <div>
                <label
                  htmlFor="birth-date"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Tanggal Lahir
                  <span className="ml-1 text-red-500">*</span>
                </label>

                <input
                  id="birth-date"
                  name="birthDate"
                  type="date"
                  value={birthDate}
                  onChange={(event) =>
                    setBirthDate(event.target.value)
                  }
                  max={new Date().toISOString().split("T")[0]}
                  disabled={loading}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-emerald-700 focus:bg-white focus:ring-4 focus:ring-emerald-900/5 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
            </div>

            {/* Parent WhatsApp */}
            <div>
              <label
                htmlFor="parent-whatsapp"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Nomor WhatsApp Orang Tua
                <span className="ml-1 text-red-500">*</span>
              </label>

              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <WhatsappIcon className="h-5 w-5" />
                </span>

                <input
                  id="parent-whatsapp"
                  name="parentWhatsapp"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={parentWhatsapp}
                  onChange={(event) =>
                    setParentWhatsapp(event.target.value)
                  }
                  placeholder="Contoh: 081234567890"
                  disabled={loading}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:bg-white focus:ring-4 focus:ring-emerald-900/5 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              <p className="mt-2 text-xs leading-5 text-slate-400">
                Nomor wajib aktif karena dapat digunakan untuk
                pengiriman informasi akun.
              </p>
            </div>

            {/* Gmail */}
            <div>
              <label
                htmlFor="gmail"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Gmail
                <span className="ml-1 text-red-500">*</span>
              </label>

              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <MailIcon className="h-5 w-5" />
                </span>

                <input
                  id="gmail"
                  name="gmail"
                  type="email"
                  autoComplete="email"
                  value={gmail}
                  onChange={(event) => setGmail(event.target.value)}
                  placeholder="nama@gmail.com"
                  disabled={loading}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:bg-white focus:ring-4 focus:ring-emerald-900/5 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              <p className="mt-2 text-xs leading-5 text-slate-400">
                Gunakan Gmail yang benar-benar aktif.
              </p>
            </div>

            {/* Class */}
            <div>
              <label
                htmlFor="class-level"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Tingkatan Kelas
                <span className="ml-1 text-red-500">*</span>
              </label>

              <div className="relative">
                <select
                  id="class-level"
                  name="classLevel"
                  value={classLevel}
                  onChange={(event) =>
                    setClassLevel(event.target.value)
                  }
                  disabled={loading}
                  className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 pr-11 text-sm outline-none transition focus:border-emerald-700 focus:bg-white focus:ring-4 focus:ring-emerald-900/5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="">Pilih kelas</option>

                  {CLASS_OPTIONS.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>

                <ChevronIcon className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            {/* Consent */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex gap-3">
                <div className="mt-0.5 shrink-0 text-emerald-700">
                  <ShieldIcon className="h-5 w-5" />
                </div>

                <p className="text-xs leading-5 text-slate-500">
                  Pastikan seluruh data yang dimasukkan benar.
                  Data pendaftaran akan digunakan untuk proses
                  verifikasi akun perpustakaan sekolah.
                </p>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-900 px-5 text-sm font-semibold text-white shadow-lg shadow-emerald-950/10 transition duration-300 hover:-translate-y-0.5 hover:bg-emerald-800 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Spinner className="h-5 w-5" />
                  Mengirim pendaftaran...
                </>
              ) : (
                <>
                  Daftar Akun
                  <ArrowIcon className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Login */}
          <div className="mt-7 border-t border-slate-100 pt-6 text-center">
            <p className="text-xs text-slate-400">
              Sudah memiliki akun?
            </p>

            <Link
              href="/login"
              className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 transition hover:text-emerald-950 hover:underline"
            >
              Login User
              <ArrowIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Other links */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-slate-400">
          <Link
            href="/"
            className="transition hover:text-emerald-800"
          >
            Home
          </Link>

          <span aria-hidden="true">•</span>

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
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21V5.5Z" />
      <path d="M4 19a2.5 2.5 0 0 1 2.5-2.5H20" />
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

function WhatsappIcon({
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
      <path d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.5-4.1A8 8 0 1 1 20 11.5Z" />
      <path d="M8.5 8.5c.3-.6.6-.7 1-.7h.4c.2 0 .4.1.5.4l.7 1.6c.1.2.1.4-.1.6l-.6.7c.7 1.2 1.5 2 2.7 2.7l.7-.6c.2-.2.4-.2.6-.1l1.6.7c.3.1.4.3.4.5v.4c0 .4-.1.7-.7 1-.5.2-1.1.2-1.7 0-2.8-.8-5-3-5.8-5.8-.2-.6-.2-1.2 0-1.7Z" />
    </svg>
  );
}

function MailIcon({
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
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

function ChevronIcon({
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
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

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
