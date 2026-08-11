"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type HomeSettings = {
  title: string;
  subtitle: string;
  motivation: string;
  background_url: string;
};

const DEFAULT_SETTINGS: HomeSettings = {
  title: "Perpustakaan Digital",
  subtitle: "MI Al-Ma'arif Nusantara",
  motivation:
    "Membaca adalah jendela ilmu. Mari tumbuh, belajar, dan menemukan inspirasi melalui setiap halaman.",
  background_url: "/images/school-background.jpg",
};

export default function HomePage() {
  const [settings, setSettings] =
    useState<HomeSettings>(DEFAULT_SETTINGS);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const fetchSettings = async () => {
      try {
        const response = await fetch("/api/settings/home", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Unable to load home settings");
        }

        const result = await response.json();

        if (active && result?.settings) {
          setSettings({
            ...DEFAULT_SETTINGS,
            ...result.settings,
          });
        }
      } catch {
        if (active) {
          setSettings(DEFAULT_SETTINGS);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchSettings();

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-slate-800">
      {/* =====================================================
          HERO
      ====================================================== */}

      <section className="relative flex min-h-[calc(100vh-1px)] items-center overflow-hidden">
        {/* Background */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url("${settings.background_url}")`,
          }}
          aria-hidden="true"
        />

        {/* White veil */}
        <div
          className="absolute inset-0 bg-white/70 backdrop-blur-[3px]"
          aria-hidden="true"
        />

        {/* Green atmospheric gradient */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-white/85 via-white/60 to-emerald-950/20"
          aria-hidden="true"
        />

        {/* Decorative lights */}
        <div
          className="absolute -left-32 top-20 h-80 w-80 rounded-full bg-emerald-200/30 blur-3xl"
          aria-hidden="true"
        />

        <div
          className="absolute -right-32 bottom-10 h-96 w-96 rounded-full bg-emerald-900/10 blur-3xl"
          aria-hidden="true"
        />

        {/* Content */}
        <div className="relative z-10 mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 lg:px-12">
          <div className="max-w-4xl">
            {/* Institution label */}
            <div className="mb-7 inline-flex items-center gap-3 rounded-full border border-emerald-900/10 bg-white/70 px-4 py-2 shadow-sm backdrop-blur-xl">
              <span className="h-2 w-2 rounded-full bg-emerald-700 shadow-[0_0_0_4px_rgba(21,128,61,0.08)]" />

              <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-950">
                MI Al-Ma&apos;arif Nusantara • Jimbaran
              </span>
            </div>

            {/* Main title */}
            <h1 className="max-w-4xl text-4xl font-semibold leading-[1.08] tracking-tight text-emerald-950 sm:text-5xl md:text-6xl lg:text-7xl">
              {loading ? (
                <>
                  Perpustakaan
                  <br />
                  <span className="text-emerald-700">
                    Digital
                  </span>
                </>
              ) : (
                <>
                  {settings.title}
                  <br />
                  <span className="text-emerald-700">
                    {settings.subtitle}
                  </span>
                </>
              )}
            </h1>

            {/* Motivation */}
            <p className="mt-7 max-w-2xl text-base leading-8 text-slate-700 sm:text-lg">
              {settings.motivation}
            </p>

            {/* CTA */}
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-emerald-900 px-7 text-sm font-semibold text-white shadow-lg shadow-emerald-950/10 transition duration-300 hover:-translate-y-0.5 hover:bg-emerald-800 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2"
              >
                Masuk ke Perpustakaan
              </Link>

              <Link
                href="/sign-in"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-emerald-900/15 bg-white/75 px-7 text-sm font-semibold text-emerald-950 shadow-sm backdrop-blur-md transition duration-300 hover:-translate-y-0.5 hover:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2"
              >
                Daftar Akun
              </Link>

              <Link
                href="/about"
                className="inline-flex min-h-12 items-center justify-center rounded-xl px-5 text-sm font-semibold text-emerald-900 transition duration-300 hover:bg-white/50 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2"
              >
                Tentang Kami
              </Link>
            </div>
          </div>

          {/* =================================================
              FEATURE CARDS
          ================================================== */}

          <div className="mt-16 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={
                <BookIcon className="h-5 w-5" />
              }
              title="Koleksi Buku"
              description="Temukan berbagai koleksi buku siswa dan buku guru dalam satu tempat."
            />

            <FeatureCard
              icon={
                <SearchIcon className="h-5 w-5" />
              }
              title="Mudah Diakses"
              description="Cari dan baca koleksi perpustakaan dengan tampilan yang sederhana dan nyaman."
            />

            <FeatureCard
              icon={
                <ShieldIcon className="h-5 w-5" />
              }
              title="Teratur & Aman"
              description="Pengelolaan akun, buku, laporan, dan aktivitas dilakukan secara terstruktur."
            />
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-7 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 sm:flex">
          <span className="text-[10px] font-medium uppercase tracking-[0.25em] text-slate-500">
            Scroll
          </span>

          <span className="h-8 w-px bg-gradient-to-b from-emerald-800/50 to-transparent" />
        </div>
      </section>

      {/* =====================================================
          INTRODUCTION
      ====================================================== */}

      <section className="border-t border-emerald-900/5 bg-white">
        <div className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 lg:px-12">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-center">
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                Tentang Perpustakaan
              </span>

              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-emerald-950 sm:text-4xl">
                Ruang untuk belajar,
                <br />
                membaca, dan berkembang.
              </h2>
            </div>

            <div className="max-w-2xl">
              <p className="text-base leading-8 text-slate-600">
                Perpustakaan Digital MI Al-Ma&apos;arif Nusantara
                hadir sebagai sarana pendukung pembelajaran yang
                memudahkan siswa dan guru dalam menemukan sumber
                bacaan yang dibutuhkan.
              </p>

              <p className="mt-4 text-base leading-8 text-slate-600">
                Dengan pengelolaan koleksi yang teratur dan akses
                yang nyaman di berbagai perangkat, perpustakaan ini
                diharapkan dapat menjadi bagian dari budaya literasi
                di lingkungan sekolah.
              </p>

              <Link
                href="/about"
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 transition hover:text-emerald-950"
              >
                Pelajari lebih lanjut
                <ArrowIcon className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          CONTACT CTA
      ====================================================== */}

      <section className="bg-emerald-950">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-7 px-5 py-14 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
              Butuh bantuan?
            </p>

            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Hubungi kami apabila mengalami kendala.
            </h2>

            <p className="mt-2 max-w-xl text-sm leading-6 text-emerald-100/75">
              Tim perpustakaan siap membantu apabila terdapat
              masalah terkait buku, akun, atau layanan website.
            </p>
          </div>

          <Link
            href="/contact"
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-white px-6 text-sm font-semibold text-emerald-950 transition hover:-translate-y-0.5 hover:bg-emerald-50"
          >
            Hubungi Kami
          </Link>
        </div>
      </section>
    </main>
  );
}

/* ============================================================
   FEATURE CARD
============================================================ */

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/65 p-5 shadow-sm backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/80 hover:shadow-lg">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-900/10 text-emerald-900">
        {icon}
      </div>

      <h3 className="text-sm font-semibold text-emerald-950">
        {title}
      </h3>

      <p className="mt-1.5 text-xs leading-6 text-slate-600">
        {description}
      </p>
    </div>
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
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
    </svg>
  );
}

function SearchIcon({
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
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
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
