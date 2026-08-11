"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type UserRole =
  | "guest"
  | "user"
  | "admin"
  | "developer"
  | "teacher";

type BookCategory = {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: "book" | "religion" | "teacher";
  available: boolean;
};

export default function CategoryPage() {
  const [role, setRole] = useState<UserRole>("guest");
  const [loadingRole, setLoadingRole] = useState(true);

  /*
   * Role sementara diambil dari endpoint session.
   *
   * Backend/API yang sebenarnya nanti akan menentukan role
   * berdasarkan session Supabase, bukan berdasarkan data dari
   * client.
   */
  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        const response = await fetch("/api/auth/session", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          if (mounted) {
            setRole("guest");
          }
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
          setLoadingRole(false);
        }
      }
    };

    checkSession();

    return () => {
      mounted = false;
    };
  }, []);

  const isLoggedIn = role !== "guest";

  const canAccessTeacherBooks =
    role === "teacher" ||
    role === "admin" ||
    role === "developer";

  const categories = useMemo<BookCategory[]>(
    () => [
      {
        id: "student-general",
        title: "Buku Umum",
        description:
          "Koleksi buku umum dan bahan bacaan untuk mendukung pembelajaran siswa.",
        href: "/category/student/general",
        icon: "book",
        available: isLoggedIn,
      },
      {
        id: "student-religion",
        title: "Buku PAI / Agama",
        description:
          "Koleksi buku Pendidikan Agama Islam dan bahan pembelajaran keagamaan.",
        href: "/category/student/religion",
        icon: "religion",
        available: isLoggedIn,
      },
      {
        id: "teacher",
        title: "Buku Guru",
        description:
          "Koleksi buku dan bahan pembelajaran khusus untuk guru kelas 1 sampai kelas 6.",
        href: "/category/teacher",
        icon: "teacher",
        available: canAccessTeacherBooks,
      },
    ],
    [isLoggedIn, canAccessTeacherBooks]
  );

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* Ambient background */}
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
          className="mb-7 flex items-center gap-2 text-xs text-slate-400"
        >
          <Link
            href="/"
            className="transition hover:text-emerald-800"
          >
            Home
          </Link>

          <ChevronRightIcon className="h-3.5 w-3.5" />

          <span className="font-medium text-emerald-900">
            Category
          </span>
        </nav>

        {/* Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-900/10 bg-white px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800 shadow-sm">
            <BookIcon className="h-4 w-4" />
            Koleksi Perpustakaan
          </div>

          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-emerald-950 sm:text-4xl lg:text-5xl">
            Kategori Buku
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">
            Temukan koleksi buku yang tersedia di perpustakaan
            digital MI Al-Ma&apos;arif Nusantara dengan lebih mudah
            berdasarkan jenis dan peruntukannya.
          </p>
        </div>

        {/* Guest */}
        {!loadingRole && !isLoggedIn && (
          <section className="mt-10 overflow-hidden rounded-3xl border border-emerald-900/10 bg-white shadow-[0_20px_70px_rgba(15,61,36,0.08)]">
            <div className="relative p-6 sm:p-8 lg:p-10">
              <div
                className="absolute right-0 top-0 h-48 w-48 rounded-full bg-emerald-100/50 blur-3xl"
                aria-hidden="true"
              />

              <div className="relative flex flex-col gap-7 md:flex-row md:items-center md:justify-between">
                <div className="flex gap-5">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-900/10 text-emerald-900">
                    <LockIcon className="h-7 w-7" />
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                      Akses diperlukan
                    </p>

                    <h2 className="mt-1.5 text-xl font-semibold text-emerald-950 sm:text-2xl">
                      Silakan login terlebih dahulu
                    </h2>

                    <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                      Kategori buku hanya dapat digunakan oleh
                      pengguna yang sudah memiliki akun dan berhasil
                      login ke perpustakaan digital.
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 flex-col gap-3 sm:flex-row md:flex-col lg:flex-row">
                  <Link
                    href="/login"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-900 px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-emerald-800 hover:shadow-lg"
                  >
                    Login User
                    <ArrowIcon className="h-4 w-4" />
                  </Link>

                  <Link
                    href="/sign-in"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-emerald-900/10 bg-white px-5 text-sm font-semibold text-emerald-900 transition hover:border-emerald-900/20 hover:bg-emerald-50"
                  >
                    Daftar Akun
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Loading */}
        {loadingRole && (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-64 animate-pulse rounded-3xl border border-slate-100 bg-white"
              />
            ))}
          </div>
        )}

        {/* Logged-in category */}
        {!loadingRole && isLoggedIn && (
          <>
            {/* User access information */}
            <div className="mt-10 flex flex-col gap-4 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-900 text-white">
                  <UserIcon className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-sm font-semibold text-emerald-950">
                    Akses perpustakaan aktif
                  </p>

                  <p className="text-xs text-emerald-800/70">
                    Anda login sebagai {getRoleLabel(role)}.
                  </p>
                </div>
              </div>

              <Link
                href="/history"
                className="inline-flex items-center justify-center gap-2 text-xs font-semibold text-emerald-800 transition hover:text-emerald-950"
              >
                Lihat riwayat
                <ArrowIcon className="h-4 w-4" />
              </Link>
            </div>

            {/* Category cards */}
            <div className="mt-7 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {categories.map((category) => {
                const disabled = !category.available;

                return (
                  <CategoryCard
                    key={category.id}
                    category={category}
                    disabled={disabled}
                  />
                );
              })}
            </div>

            {/* Teacher notice */}
            {!canAccessTeacherBooks && (
              <div className="mt-6 flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <InfoIcon className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />

                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    Tentang Buku Guru
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Koleksi Buku Guru diperuntukkan bagi akun guru,
                    admin, dan developer. Jika Anda membutuhkan akses
                    tersebut, silakan hubungi administrator
                    perpustakaan.
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {/* Footer note */}
        <div className="mt-12 border-t border-slate-200 pt-7">
          <p className="text-center text-xs leading-5 text-slate-400">
            Koleksi dan hak akses buku dikelola oleh administrator
            perpustakaan MI Al-Ma&apos;arif Nusantara.
          </p>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

/* ============================================================
   CATEGORY CARD
============================================================ */

function CategoryCard({
  category,
  disabled,
}: {
  category: BookCategory;
  disabled: boolean;
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
            disabled
              ? "bg-slate-100 text-slate-400"
              : "bg-emerald-900/10 text-emerald-900"
          }`}
        >
          {category.icon === "religion" ? (
            <MosqueIcon className="h-7 w-7" />
          ) : category.icon === "teacher" ? (
            <TeacherIcon className="h-7 w-7" />
          ) : (
            <BookIcon className="h-7 w-7" />
          )}
        </div>

        {!disabled && (
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-800">
            <ArrowUpRightIcon className="h-4 w-4" />
          </span>
        )}
      </div>

      <div className="mt-7">
        <h2
          className={`text-xl font-semibold ${
            disabled ? "text-slate-500" : "text-emerald-950"
          }`}
        >
          {category.title}
        </h2>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          {category.description}
        </p>
      </div>

      <div className="mt-7 flex items-center justify-between border-t border-slate-100 pt-5">
        <span
          className={`text-xs font-semibold ${
            disabled ? "text-slate-400" : "text-emerald-800"
          }`}
        >
          {disabled ? "Akses terbatas" : "Lihat koleksi"}
        </span>

        {!disabled && (
          <ArrowIcon className="h-4 w-4 text-emerald-800" />
        )}
      </div>
    </>
  );

  if (disabled) {
    return (
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 opacity-75 sm:p-7">
        {content}

        <div className="absolute right-5 top-5">
          <LockIcon className="h-4 w-4 text-slate-300" />
        </div>
      </div>
    );
  }

  return (
    <Link
      href={category.href}
      className="group relative overflow-hidden rounded-3xl border border-emerald-900/10 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-emerald-900/15 hover:shadow-[0_20px_50px_rgba(15,61,36,0.10)] sm:p-7"
    >
      <div
        className="pointer-events-none absolute -right-20 -top-20 h-44 w-44 rounded-full bg-emerald-100/40 blur-3xl transition group-hover:bg-emerald-100/70"
        aria-hidden="true"
      />

      <div className="relative">{content}</div>
    </Link>
  );
}

/* ============================================================
   HEADER
============================================================ */

function SiteHeader({ role }: { role: UserRole }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const isLoggedIn = role !== "guest";

  return (
    <header className="sticky top-0 z-50 border-b border-emerald-900/10 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href="/"
          className="flex min-w-0 items-center gap-3"
          onClick={() => setMenuOpen(false)}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-900 text-white shadow-sm">
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

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 lg:flex">
          <NavLink href="/home">Home</NavLink>
          <NavLink href="/category" active>
            Category
          </NavLink>

          {isLoggedIn && (
            <NavLink href="/history">History</NavLink>
          )}

          <NavLink href="/announcement">Announcement</NavLink>
          <NavLink href="/report">Report</NavLink>
          <NavLink href="/about-us">About Us</NavLink>
          <NavLink href="/contact-us">Contact Us</NavLink>

          {role === "admin" && (
            <NavLink href="/set-web/admin">Set Web</NavLink>
          )}

          {role === "developer" && (
            <NavLink href="/set-web/developer">
              Developer
            </NavLink>
          )}
        </nav>

        {/* Desktop account */}
        <div className="hidden items-center gap-2 lg:flex">
          {role === "guest" ? (
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

        {/* Mobile button */}
        <button
          type="button"
          aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((value) => !value)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-900/10 text-emerald-900 transition hover:bg-emerald-50 lg:hidden"
        >
          {menuOpen ? (
            <CloseIcon className="h-5 w-5" />
          ) : (
            <MenuIcon className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t border-emerald-900/10 bg-white lg:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col px-4 py-3 sm:px-6">
            <MobileNavLink href="/home" onClick={() => setMenuOpen(false)}>
              Home
            </MobileNavLink>

            <MobileNavLink
              href="/category"
              active
              onClick={() => setMenuOpen(false)}
            >
              Category
            </MobileNavLink>

            {isLoggedIn && (
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
              {role === "guest" ? (
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
   NAVIGATION COMPONENTS
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
   HELPERS
============================================================ */

function normalizeRole(value: unknown): UserRole {
  if (
    value === "admin" ||
    value === "developer" ||
    value === "teacher" ||
    value === "user"
  ) {
    return value;
  }

  return "guest";
}

function getRoleLabel(role: UserRole) {
  switch (role) {
    case "developer":
      return "Developer";
    case "admin":
      return "Admin";
    case "teacher":
      return "Guru";
    case "user":
      return "User";
    default:
      return "Guest";
  }
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
      <path d="M12 14v2" />
    </svg>
  );
}

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
      <path d="M4.5 20c.9-3.3 3.4-5.2 7.5-5.2s6.6 1.9 7.5 5.2" />
    </svg>
  );
}

function TeacherIcon({
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
      <path d="M7 9h10" />
      <path d="M7 13h6" />
      <path d="M7 16h4" />
      <path d="M17 13h.01" />
    </svg>
  );
}

function MosqueIcon({
  className = "",
}: {
  className?: string;
}) {
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

function MenuIcon({
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
      className={className}
      aria-hidden="true"
    >
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  );
}

function CloseIcon({
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
      className={className}
      aria-hidden="true"
    >
      <path d="m6 6 12 12" />
      <path d="M18 6 6 18" />
    </svg>
  );
}
