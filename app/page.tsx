"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type HomeSettings = {
  title?: string;
  subtitle?: string;
  motivation?: string;
  background_url?: string;
};

const defaultSettings: HomeSettings = {
  title: "Perpustakaan Digital",
  subtitle: "MI Al-Ma'arif Nusantara",
  motivation:
    "Membaca adalah jendela ilmu. Mari tumbuh, belajar, dan menemukan inspirasi melalui setiap halaman.",
  background_url: "/images/school-background.jpg",
};

export default function HomePage() {
  const [settings, setSettings] = useState<HomeSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadSettings = async () => {
      try {
        const response = await fetch("/api/settings/home", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Gagal mengambil pengaturan Home");
        }

        const data = await response.json();

        if (mounted && data?.settings) {
          setSettings({
            ...defaultSettings,
            ...data.settings,
          });
        }
      } catch {
        if (mounted) {
          setSettings(defaultSettings);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadSettings();

    return () => {
      mounted = false;
    };
  }, []);

  const backgroundImage =
    settings.background_url || defaultSettings.background_url;

  return (
    <main className="min-h-screen bg-white text-slate-800">
      {/* HERO */}
      <section className="relative flex min-h-screen items-center overflow-hidden">
        {/* Background */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url("${backgroundImage}")`,
          }}
        />

        {/* White overlay */}
        <div className="absolute inset-0 bg-white/70 backdrop-blur-[3px]" />

        {/* Soft green overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-white/55 to-emerald-950/20" />

        {/* Decorative blur */}
        <div className="absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-emerald-200/30 blur-3xl" />
        <div className="absolute -right-24 bottom-1/4 h-80 w-80 rounded-full bg-emerald-900/10 blur-3xl" />

        {/* Content */}
        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col px-5 py-24 sm:px-8 lg:px-12">
          <div className="max-w-3xl">
            {/* Small label */}
            <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-emerald-900/10 bg-white/70 px-4 py-2 shadow-sm backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-emerald-700" />
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-900">
                MI Al-Ma&apos;arif Nusantara
              </span>
            </div>

            {/* Heading */}
            <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight text-emerald-950 sm:text-5xl md:text-6xl lg:text-7xl">
              {loading ? (
                <>
                  Perpustakaan
                  <br />
                  <span className="text-emerald-700">Digital</span>
                </>
              ) : (
                <>
                  {settings.title || defaultSettings.title}
                  <br />
                  <span className="text-emerald-700">
                    {settings.subtitle || defaultSettings.subtitle}
                  </span>
                </>
              )}
            </h1>

            {/* Description */}
            <p className="mt-7 max-w-2xl text-base leading-8 text-slate-700 sm:text-lg">
              {settings.motivation || defaultSettings.motivation}
            </p>

            {/* Buttons */}
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-emerald-900 px-7 text-sm font-semibold text-white shadow-lg shadow-emerald-950/10 transition-all duration-300 hover:-translate-y-0.5 hover:bg-emerald-800 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2"
              >
                Masuk ke Perpustakaan
              </Link>

              <Link
                href="/about"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-emerald-900/15 bg-white/75 px-7 text-sm font-semibold text-emerald-950 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2"
              >
                Tentang Kami
              </Link>
            </div>
          </div>

          {/* Bottom information cards */}
          <div className="mt-16 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/70 bg-white/65 p-5 shadow-sm backdrop-blur-xl">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-900/10 text-emerald-900">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-5 w-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"
                  />
                </svg>
              </div>

              <h2 className="text-sm font-semibold text-emerald-950">
                Koleksi Buku
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                Buku siswa dan guru dalam satu perpustakaan digital.
              </p>
            </div>

            <div className="rounded-2xl border border-white/70 bg-white/65 p-5 shadow-sm backdrop-blur-xl">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-900/10 text-emerald-900">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-5 w-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.9 1.9-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.55V20H12.2v-.01a1.7 1.7 0 0 0-1.03-1.55 1.7 1.7 0 0 0-1.88.34l-.06.06-1.9-1.9.06-.06A1.7 1.7 0 0 0 7.73 15a1.7 1.7 0 0 0-1.55-1.03H6v-2.7h.18A1.7 1.7 0 0 0 7.73 10a1.7 1.7 0 0 0-.34-1.88l-.06-.06 1.9-1.9.06.06a1.7 1.7 0 0 0 1.88.34A1.7 1.7 0 0 0 12.2 5V5h2.7v.01a1.7 1.7 0 0 0 1.03 1.55 1.7 1.7 0 0 0 1.88-.34l.06-.06 1.9 1.9-.06.06A1.7 1.7 0 0 0 19.37 10a1.7 1.7 0 0 0 1.55 1.03H21v2.7h-.08A1.7 1.7 0 0 0 19.4 15Z"
                  />
                </svg>
              </div>

              <h2 className="text-sm font-semibold text-emerald-950">
                Akses Teratur
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                Sistem perpustakaan yang tertata dan mudah digunakan.
              </p>
            </div>

            <div className="rounded-2xl border border-white/70 bg-white/65 p-5 shadow-sm backdrop-blur-xl">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-900/10 text-emerald-900">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-5 w-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 3 4.5 6v5.5c0 4.7 3.1 7.9 7.5 9.5 4.4-1.6 7.5-4.8 7.5-9.5V6L12 3Z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m9 12 2 2 4-4"
                  />
                </svg>
              </div>

              <h2 className="text-sm font-semibold text-emerald-950">
                Untuk Sekolah
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                Dibangun untuk mendukung kegiatan belajar dan literasi siswa.
              </p>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-7 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-slate-500 sm:flex">
          <span className="text-[10px] font-medium uppercase tracking-[0.25em]">
            Scroll
          </span>

          <span className="h-8 w-px bg-gradient-to-b from-emerald-800/50 to-transparent" />
        </div>
      </section>
    </main>
  );
}
