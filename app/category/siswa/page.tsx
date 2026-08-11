"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type UserRole =
  | "guest"
  | "user"
  | "teacher"
  | "admin"
  | "developer";

export default function SiswaCategoryPage() {
  const [role, setRole] = useState<UserRole>("guest");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      try {
        const response = await fetch("/api/auth/session", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          if (mounted) setRole("guest");
          return;
        }

        const data = await response.json();

        if (!mounted) return;

        const detectedRole = normalizeRole(data?.user?.role);
        setRole(detectedRole);
      } catch {
        if (mounted) {
          setRole("guest");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadSession();

    return () => {
      mounted = false;
    };
  }, []);

  const loggedIn = role !== "guest";

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-emerald-200/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-[30rem] w-[30rem] rounded-full bg-emerald-950/10 blur-3xl" />
      </div>

      <SiteHeader role={role} />

      <section className="mx-auto w-full max-w-7xl px-4 pb-20 pt-10 sm:px-6 lg:px-8 lg:pt-14">
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="mb-7 flex flex-wrap items-center gap-2 text-xs text-slate-400"
        >
          <Link
            href="/"
            className="transition hover:text-emerald-800"
          >
            Home
          </Link>

          <ChevronRightIcon className="h-3.5 w-3.5" />

          <Link
            href="/category"
            className="transition hover:text-emerald-800"
          >
            Category
          </Link>

          <ChevronRightIcon className="h-3.5 w-3.5" />

          <span className="font-medium text-emerald-900">
            Buku Siswa
          </span>
        </nav>

        {/* Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-900/10 bg-white px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800 shadow-sm">
            <BookIcon className="h-4 w-4" />
            Koleksi Siswa
          </div>

          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-emerald-950 sm:text-4xl lg:text-5xl">
            Buku Siswa
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">
            Pilih kategori koleksi yang ingin Anda baca. Semua
            koleksi disusun untuk mendukung kegiatan belajar siswa
            MI Al-Ma&apos;arif Nusantara.
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {/* Login required */}
        {!loading && !loggedIn && (
          <section className="mt-10 overflow-hidden rounded-3xl border border-emerald-900/10 bg-white shadow-[0_20px_70px_rgba(15,61,36,0.08)]">
            <div className="relative p-6 sm:p-8 lg:p-10">
              <div
                className="pointer-events-none absolute -right-10 -top-20 h-56 w-56 rounded-full bg-emerald-100/60 blur-3xl"
                aria-hidden="true"
              />

              <div className="relative flex flex-col gap-7 md:flex-row md:items-center md:justify-between">
                <div className="flex gap-5">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-900/10 text-emerald-900">
                    <LockIcon className="h-7 w-7" />
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                      Login diperlukan
                    </p>

                    <h2 className="mt-1.5 text-xl font-semibold text-emerald-950 sm:text-2xl">
                      Akses koleksi siswa
                    </h2>

                    <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                      Silakan login menggunakan akun perpustakaan
                      Anda untuk melihat koleksi Buku Umum dan Buku
                      PAI/Agama.
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
                  <Link
                    href="/login"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-900 px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-emerald-800 hover:shadow-lg"
                  >
                    Login
                    <ArrowIcon className="h-4 w-4" />
                  </Link>

                  <Link
                    href="/sign-in"
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-emerald-900/10 bg-white px-5 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-50"
                  >
                    Daftar Akun
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Categories */}
        {!loading && loggedIn && (
          <>
            <div className="mt-10 flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 sm:p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-900 text-white">
                <BookOpenIcon className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-semibold text-emerald-950">
                  Pilih jenis koleksi
                </p>

                <p className="mt-0.5 text-xs leading-5 text-emerald-800/70">
                  Buku siswa dapat dibaca oleh seluruh pengguna yang
                  memiliki akun aktif.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <CollectionCard
                href="/category/siswa/umum"
                title="Buku Umum"
                description="Kumpulan buku umum dan bahan bacaan yang dapat membantu menambah wawasan serta mendukung proses pembelajaran siswa."
                icon="book"
              />

              <CollectionCard
                href="/category/siswa/pai"
                title="Buku PAI / Agama"
                description="Kumpulan buku Pendidikan Agama Islam dan bahan pembelajaran keagamaan yang tersedia di perpustakaan sekolah."
                icon="religion"
              />
            </div>

            <div className="mt-7 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-3">
                <InfoIcon className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />

                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    Tentang koleksi buku
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Ketersediaan buku, sinopsis, gambar sampul, file
                    PDF, serta izin download dikelola melalui sistem
                    administrasi perpustakaan.
                  </p>
                </div>
              </div>

              <Link
                href="/report"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:border-emerald-900/10 hover:bg-emerald-50 hover:text-emerald-900"
              >
                Laporkan masalah
                <ArrowUpRightIcon className="h-4 w-4" />
              </Link>
            </div>
          </>
        )}
      </section>

      <SiteFooter />
    </main>
  );
}

/* ============================================================
   COLLECTION CARD
============================================================ */

function CollectionCard({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: "book" | "religion";
}) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-3xl border border-emerald-900/10 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-emerald-900/15 hover:shadow-[0_20px_50px_rgba(15,61,36,0.10)] sm:p-8"
    >
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-100/40 blur-3xl transition group-hover:bg-emerald-100/70"
        aria-hidden="true"
      />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-900/10 text-emerald-900">
            {icon === "religion" ? (
              <MosqueIcon className="h-7 w-7" />
            ) : (
              <BookIcon className="h-7 w-7" />
            )}
          </div>

          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-800 transition group-hover:bg-emerald-900 group-hover:text-white">
            <ArrowUpRightIcon className="h-4 w-4" />
          </span>
        </div>

        <h2 className="mt-7 text-2xl font-semibold text-emerald-950">
          {title}
        </h2>

        <p className="mt-3 max-w-xl text-sm leading-7 text-slate-500">
          {description}
        </p>

        <div className="mt-7 flex items-center justify-between border-t border-slate-100 pt-5">
          <span className="text-xs font-semibold text-emerald-800">
            Lihat koleksi
          </span>

          <ArrowIcon className="h-4 w-4 text-emerald-800 transition group-hover:translate-x-1" />
        </div>
      </div>
    </Link>
  );
}

/* ============================================================
   HEADER
============================================================ */

function SiteHeader({ role }: { role: UserRole }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const loggedIn = role !== "guest";

  return (
    <header className="sticky top-0 z-50 border-b border-emerald-900/10 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          onClick={() => setMenuOpen(false)}
          className="flex min-w-0 items-center gap-3"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-900 text-white">
            <BookIcon className="h-5 w-5" />
          </span>

          <span className="min-w-0">
            <span className="block truncate text-xs font-semibold uppercase tracking-[0.12em] text-emerald-950 sm:text-sm">
              MI Al-Ma&apos;arif Nusantara
            </span>

            <span className="hidden text-[10px] text-slate-400 sm:block">
              Perpustakaan Digital
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          <NavLink href="/home">Home</NavLink>

          <NavLink href="/category" active>
            Category
          </NavLink>

          {loggedIn && (
            <NavLink href="/history">
              History
            </NavLink>
          )}

          <NavLink href="/announcement">
            Announcement
          </NavLink>

          <NavLink href="/report">
            Report
          </NavLink>

          <NavLink href="/about-us">
            About Us
          </NavLink>

          <NavLink href="/contact-us">
            Contact Us
          </NavLink>

          {role === "admin" && (
            <NavLink href="/set-web/admin">
              Set Web
            </NavLink>
          )}

          {role === "developer" && (
            <NavLink href="/set-web/developer">
              Developer
            </NavLink>
          )}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          {!loggedIn ? (
            <>
              <Link
                href="/login"
                className="inline-flex h-9 items-center justify-center rounded-xl px-3 text-xs font-semibold text-emerald-900 transition hover:bg-emerald-50"
              >
                Login
              </Link>

              <Link
                href="/sign-in"
                className="inline-flex h-9 items-center justify-center rounded-xl bg-emerald-900 px-3.5 text-xs font-semibold text-white transition hover:bg-emerald-800"
              >
                Sign In
              </Link>
            </>
          ) : (
            <Link
              href="/my-account"
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-emerald-900/10 px-3 text-xs font-semibold text-emerald-900 transition hover:bg-emerald-50"
            >
              <UserIcon className="h-4 w-4" />
              My Account
            </Link>
          )}
        </div>

        <button
          type="button"
          aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((value) => !value)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-900/10 text-emerald-900 lg:hidden"
        >
          {menuOpen ? (
            <CloseIcon className="h-5 w-5" />
          ) : (
            <MenuIcon className="h-5 w-5" />
          )}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-emerald-900/10 bg-white lg:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col px-4 py-3 sm:px-6">
            <MobileNavLink
              href="/home"
              onClick={() => setMenuOpen(false)}
            >
              Home
            </MobileNavLink>

            <MobileNavLink
              href="/category"
              active
              onClick={() => setMenuOpen(false)}
            >
              Category
            </MobileNavLink>

            {loggedIn && (
              <MobileNavLink
                href="/history"
                onClick={() => setMenuOpen(false)}
              >
                History
              </MobileNavLink>
            )}

            <MobileNavLink
              href="/announcement"
              onClick={() => setMenuOpen(false)}
            >
              Announcement
            </MobileNavLink>

            <MobileNavLink
              href="/report"
              onClick={() => setMenuOpen(false)}
            >
              Report
            </MobileNavLink>

            <MobileNavLink
              href="/about-us"
              onClick={() => setMenuOpen(false)}
            >
              About Us
            </MobileNavLink>

            <MobileNavLink
              href="/contact-us"
              onClick={() => setMenuOpen(false)}
            >
              Contact Us
            </MobileNavLink>

            {role === "admin" && (
              <MobileNavLink
                href="/set-web/admin"
                onClick={() => setMenuOpen(false)}
              >
                Set Web
              </MobileNavLink>
            )}

            {role === "developer" && (
              <MobileNavLink
                href="/set-web/developer"
                onClick={() => setMenuOpen(false)}
              >
                Developer
              </MobileNavLink>
            )}

            <div className="mt-2 border-t border-slate-100 pt-3">
              {!loggedIn ? (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    className="flex h-10 items-center justify-center rounded-xl border border-emerald-900/10 text-xs font-semibold text-emerald-900"
                  >
                    Login
                  </Link>

                  <Link
                    href="/sign-in"
                    onClick={() => setMenuOpen(false)}
                    className="flex h-10 items-center justify-center rounded-xl bg-emerald-900 text-xs font-semibold text-white"
                  >
                    Sign In
                  </Link>
                </div>
              ) : (
                <Link
                  href="/my-account"
                  onClick={() => setMenuOpen(false)}
                  className="flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-900 text-xs font-semibold text-white"
                >
                  <UserIcon className="h-4 w-4" />
                  My Account
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

/* ============================================================
   FOOTER
============================================================ */

function SiteFooter() {
  return (
    <footer className="border-t border-emerald-900/10 bg-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 text-center sm:flex-row sm:text-left">
          <div>
            <p className="text-sm font-semibold text-emerald-950">
              MI Al-Ma&apos;arif Nusantara
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Perpustakaan Digital Sekolah
            </p>
          </div>

          <Link
            href="/contact-us"
            className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-800 transition hover:text-emerald-950"
          >
            Hubungi Kami
            <ArrowIcon className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-7 border-t border-slate-100 pt-5">
          <p className="text-center text-[11px] leading-5 text-slate-400">
            Hak Cipta MI Al-Ma&apos;arif Nusantara ©2026 All Right
            Reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ============================================================
   NAV
============================================================ */

function NavLink({
  href,
  children,
  active = false,
}: {
  href: string;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-xl px-2.5 py-2 text-xs font-medium transition ${
        active
          ? "bg-emerald-50 text-emerald-900"
          : "text-slate-500 hover:bg-emerald-50 hover:text-emerald-900"
      }`}
    >
      {children}
    </Link>
  );
}

function MobileNavLink({
  href,
  children,
  active = false,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`rounded-xl px-3 py-3 text-sm font-medium transition ${
        active
          ? "bg-emerald-50 text-emerald-900"
          : "text-slate-600 hover:bg-slate-50 hover:text-emerald-900"
      }`}
    >
      {children}
    </Link>
  );
}

/* ============================================================
   SKELETON
============================================================ */

function SkeletonCard() {
  return (
    <div className="h-64 animate-pulse rounded-3xl border border-slate-100 bg-white p-7">
      <div className="h-14 w-14 rounded-2xl bg-slate-100" />
      <div className="mt-7 h-7 w-40 rounded-lg bg-slate-100" />
      <div className="mt-4 h-4 w-full rounded bg-slate-100" />
      <div className="mt-2 h-4 w-4/5 rounded bg-slate-100" />
      <div className="mt-8 h-px w-full bg-slate-100" />
    </div>
  );
}

/* ============================================================
   HELPERS
============================================================ */

function normalizeRole(value: unknown): UserRole {
  if (
    value === "user" ||
    value === "teacher" ||
    value === "admin" ||
    value === "developer"
  ) {
    return value;
  }

  return "guest";
}

/* ============================================================
   ICONS
============================================================ */

function BookIcon({ className = "" }: { className?: string }) {
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

function BookOpenIcon({ className = "" }: { className?: string }) {
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
      <path d="M3 5.5A2.5 2.5 0 0 1 5.5 3H11v17H5.5A2.5 2.5 0 0 0 3 22V5.5Z" />
      <path d="M21 5.5A2.5 2.5 0 0 0 18.5 3H13v17h5.5A2.5 2.5 0 0 1 21 22V5.5Z" />
    </svg>
  );
}

function LockIcon({ className = "" }: { className?: string }) {
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
      <path d="M12 14v2" />
    </svg>
  );
}

function MosqueIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 20h16" />
      <path d="M6 20v-7h12v7" />
      <path d="M5 13c1.7-1.2 2.7-2.8 3.2-5.2C9.4 9.1 10.5 10 12 10s2.6-.9 3.8-2.2C16.3 10.2 17.3 11.8 19 13" />
      <path d="M10 20v-4h4v4" />
      <path d="M12 4v2" />
      <path d="M11 5h2" />
    </svg>
  );
}

function ArrowIcon({ className = "" }: { className?: string }) {
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

function ArrowUpRightIcon({
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
      <path d="M7 17 17 7" />
      <path d="M7 7h10v10" />
    </svg>
  );
}

function ChevronRightIcon({
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
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

function InfoIcon({ className = "" }: { className?: string }) {
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

function UserIcon({ className = "" }: { className?: string }) {
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
      <path d="M4.5 20c.9-3.3 3.4-5.2 7.5-5.2s6.6 1.9 7.5 5.2" />
    </svg>
  );
}

function MenuIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  );
}

function CloseIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m6 6 12 12" />
      <path d="M18 6 6 18" />
    </svg>
  );
}
