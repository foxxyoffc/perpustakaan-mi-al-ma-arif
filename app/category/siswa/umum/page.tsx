"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type UserRole =
  | "guest"
  | "user"
  | "teacher"
  | "admin"
  | "developer";

type Book = {
  id: string;
  title: string;
  synopsis: string | null;
  cover_url: string | null;
  pdf_url?: string | null;
  pdf_path?: string | null;
  download_allowed: boolean;
  category: string;
  created_at?: string;
};

export default function BukuUmumPage() {
  const [role, setRole] = useState<UserRole>("guest");
  const [books, setBooks] = useState<Book[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadBooks() {
      try {
        setLoading(true);
        setError("");

        /*
         * Cek session user.
         */
        const sessionResponse = await fetch(
          "/api/auth/session",
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }
        );

        if (!sessionResponse.ok) {
          if (!mounted) return;

          setRole("guest");
          setBooks([]);
          return;
        }

        const sessionData = await sessionResponse.json();

        if (!mounted) return;

        const detectedRole = normalizeRole(
          sessionData?.user?.role
        );

        setRole(detectedRole);

        /*
         * Hanya user yang sudah login yang boleh
         * mengambil daftar buku.
         */
        if (detectedRole === "guest") {
          setBooks([]);
          return;
        }

        /*
         * Ambil metadata buku dari API.
         *
         * Jangan menggunakan SUPABASE_SERVICE_ROLE_KEY
         * di client/browser.
         */
        const booksResponse = await fetch(
          "/api/books?category=student-general",
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }
        );

        if (!booksResponse.ok) {
          throw new Error(
            "Gagal mengambil koleksi Buku Umum."
          );
        }

        const booksData = await booksResponse.json();

        if (!mounted) return;

        setBooks(
          Array.isArray(booksData?.books)
            ? booksData.books
            : []
        );
      } catch (err) {
        if (!mounted) return;

        setError(
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan saat mengambil koleksi buku."
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadBooks();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredBooks = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return books;
    }

    return books.filter((book) => {
      const title =
        book.title?.toLowerCase() || "";

      const synopsis =
        book.synopsis?.toLowerCase() || "";

      return (
        title.includes(keyword) ||
        synopsis.includes(keyword)
      );
    });
  }, [books, search]);

  const isLoggedIn = role !== "guest";

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

          <Link
            href="/category/siswa"
            className="transition hover:text-emerald-800"
          >
            Buku Siswa
          </Link>

          <ChevronRightIcon className="h-3.5 w-3.5" />

          <span className="font-medium text-emerald-900">
            Buku Umum
          </span>
        </nav>

        {/* Header */}
        <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-900/10 bg-white px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800 shadow-sm">
              <BookIcon className="h-4 w-4" />
              Koleksi Siswa
            </div>

            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-emerald-950 sm:text-4xl lg:text-5xl">
              Buku Umum
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">
              Jelajahi koleksi buku umum yang tersedia
              untuk mendukung pembelajaran dan menambah
              wawasan siswa.
            </p>
          </div>

          <Link
            href="/category/siswa"
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-emerald-900/10 bg-white px-4 text-xs font-semibold text-emerald-900 shadow-sm transition hover:bg-emerald-50"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Kembali
          </Link>
        </div>

        {/* Login required */}
        {!loading && !isLoggedIn && (
          <section className="mt-10 rounded-3xl border border-emerald-900/10 bg-white p-6 shadow-[0_20px_70px_rgba(15,61,36,0.08)] sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-900/10 text-emerald-900">
                <LockIcon className="h-7 w-7" />
              </div>

              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  Login diperlukan
                </p>

                <h2 className="mt-1.5 text-xl font-semibold text-emerald-950">
                  Koleksi buku hanya dapat diakses setelah login
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Silakan masuk menggunakan akun
                  perpustakaan sekolah Anda untuk melihat
                  koleksi Buku Umum.
                </p>
              </div>

              <Link
                href="/login"
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-900 px-5 text-sm font-semibold text-white transition hover:bg-emerald-800"
              >
                Login
                <ArrowIcon className="h-4 w-4" />
              </Link>
            </div>
          </section>
        )}

        {isLoggedIn && (
          <>
            {/* Search */}
            <section className="mt-10 rounded-3xl border border-emerald-900/10 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
                    <SearchIcon className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-emerald-950">
                      Cari buku
                    </p>

                    <p className="text-xs text-slate-400">
                      Cari berdasarkan judul atau sinopsis.
                    </p>
                  </div>
                </div>

                <div className="relative w-full md:max-w-md">
                  <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    type="search"
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder="Cari judul buku..."
                    aria-label="Cari judul buku"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-10 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:bg-white focus:ring-4 focus:ring-emerald-900/5"
                  />

                  {search && (
                    <button
                      type="button"
                      aria-label="Hapus pencarian"
                      onClick={() => setSearch("")}
                      className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                    >
                      <CloseIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </section>

            {/* Collection info */}
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-emerald-950">
                  Koleksi Buku Umum
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  {loading
                    ? "Memuat koleksi..."
                    : `${filteredBooks.length} buku ditemukan`}
                </p>
              </div>

              {search && !loading && (
                <p className="text-xs text-slate-400">
                  Hasil pencarian untuk{" "}
                  <span className="font-semibold text-slate-600">
                    &quot;{search}&quot;
                  </span>
                </p>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="mt-5 flex gap-3 rounded-2xl border border-red-100 bg-red-50 p-4">
                <AlertIcon className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />

                <div>
                  <p className="text-sm font-semibold text-red-800">
                    Koleksi belum dapat dimuat
                  </p>

                  <p className="mt-1 text-xs leading-5 text-red-600">
                    {error}
                  </p>
                </div>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map(
                  (_, index) => (
                    <BookSkeleton key={index} />
                  )
                )}
              </div>
            )}

            {/* Books */}
            {!loading &&
              !error &&
              filteredBooks.length > 0 && (
                <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredBooks.map((book) => (
                    <BookCard
                      key={book.id}
                      book={book}
                    />
                  ))}
                </div>
              )}

            {/* Empty */}
            {!loading &&
              !error &&
              filteredBooks.length === 0 && (
                <section className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                    <BookIcon className="h-7 w-7" />
                  </div>

                  <h2 className="mt-5 text-lg font-semibold text-slate-700">
                    {search
                      ? "Buku tidak ditemukan"
                      : "Belum ada koleksi buku"}
                  </h2>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
                    {search
                      ? "Coba gunakan kata kunci lain atau hapus pencarian untuk melihat seluruh koleksi."
                      : "Belum ada Buku Umum yang ditambahkan oleh administrator."}
                  </p>

                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="mt-5 inline-flex h-10 items-center justify-center rounded-xl bg-emerald-900 px-4 text-xs font-semibold text-white transition hover:bg-emerald-800"
                    >
                      Tampilkan semua buku
                    </button>
                  )}
                </section>
              )}

            {/* Report */}
            <div className="mt-10 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-3">
                <InfoIcon className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />

                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    Menemukan masalah pada buku?
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Laporkan jika file tidak dapat dibuka,
                    informasi buku tidak sesuai, atau terdapat
                    masalah lainnya.
                  </p>
                </div>
              </div>

              <Link
                href="/report"
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-600 transition hover:border-emerald-900/10 hover:bg-emerald-50 hover:text-emerald-900"
              >
                Buat laporan
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
   BOOK CARD
============================================================ */

function BookCard({ book }: { book: Book }) {
  const hasPdf = Boolean(book.pdf_path || book.pdf_url);

  return (
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-3xl border border-emerald-900/10 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(15,61,36,0.10)]">
      {/* Cover */}
      <div className="relative aspect-[3/4] overflow-hidden bg-slate-100">
        {book.cover_url ? (
          <img
            src={book.cover_url}
            alt={`Sampul ${book.title}`}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-emerald-950 to-emerald-800 px-6 text-center text-white">
            <BookIcon className="h-12 w-12 opacity-80" />

            <p className="mt-4 line-clamp-3 text-sm font-semibold leading-5">
              {book.title}
            </p>
          </div>
        )}

        <div className="absolute left-3 top-3">
          <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-emerald-900 shadow-sm backdrop-blur">
            Buku Umum
          </span>
        </div>

        {/* Hanya informasi status download */}
        {hasPdf && !book.download_allowed && (
          <div className="absolute right-3 top-3">
            <span className="flex items-center gap-1.5 rounded-full bg-slate-950/75 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur">
              <LockIcon className="h-3 w-3" />
              Baca online
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        <h2 className="line-clamp-2 text-base font-semibold leading-6 text-emerald-950">
          {book.title}
        </h2>

        <p className="mt-3 line-clamp-4 text-xs leading-5 text-slate-500">
          {book.synopsis ||
            "Sinopsis buku belum tersedia."}
        </p>

        <div className="mt-auto pt-5">
          <div className="flex gap-2">
            {/* ==================================================
                BACA
                TIDAK TERGANTUNG download_allowed
            ================================================== */}
            {hasPdf ? (
              <Link
                href={`/reader/${encodeURIComponent(book.id)}`}
                className="inline-flex h-10 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-900 px-3 text-xs font-semibold text-white transition hover:bg-emerald-800"
              >
                <EyeIcon className="h-4 w-4" />
                Baca Online
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="inline-flex h-10 min-w-0 flex-1 cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-slate-100 px-3 text-xs font-semibold text-slate-400"
              >
                <EyeIcon className="h-4 w-4" />
                PDF Tidak Tersedia
              </button>
            )}

            {/* ==================================================
                DOWNLOAD
                HANYA TERSEDIA JIKA download_allowed = true
            ================================================== */}
            {hasPdf && book.download_allowed ? (
              <a
                href={`/api/books/${encodeURIComponent(
                  book.id
                )}/download`}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-900/10 bg-white text-emerald-900 transition hover:bg-emerald-50"
                aria-label={`Download ${book.title}`}
                title="Download PDF"
              >
                <DownloadIcon className="h-4 w-4" />
              </a>
            ) : (
              <div
                className="inline-flex h-10 w-10 shrink-0 cursor-not-allowed items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-slate-300"
                title="Buku hanya dapat dibaca online"
                aria-label="Buku hanya dapat dibaca online"
              >
                <LockIcon className="h-4 w-4" />
              </div>
            )}
          </div>

          {/* Penjelasan kecil */}
          {hasPdf && !book.download_allowed && (
            <p className="mt-2 text-center text-[10px] leading-4 text-slate-400">
              Buku ini hanya dapat dibaca melalui website.
            </p>
          )}
        </div>
      </div>
    </article>
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

          <NavLink
            href="/category"
            active
          >
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
          aria-label={
            menuOpen ? "Tutup menu" : "Buka menu"
          }
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
            Hak Cipta MI Al-Ma&apos;arif Nusantara ©2026
            All Right Reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ============================================================
   NAVIGATION
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

function BookSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white">
      <div className="aspect-[3/4] animate-pulse bg-slate-100" />

      <div className="p-5">
        <div className="h-5 w-4/5 animate-pulse rounded bg-slate-100" />

        <div className="mt-4 space-y-2">
          <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
          <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
          <div className="h-3 w-3/4 animate-pulse rounded bg-slate-100" />
        </div>

        <div className="mt-5 flex gap-2">
          <div className="h-10 flex-1 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-100" />
        </div>
      </div>
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
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
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
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m6 6 12 12" />
      <path d="M18 6 6 18" />
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

function ArrowLeftIcon({
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
      <path d="M2.5 12s3.2-5 9.5-5 9.5 5 9.5 5-3.2 5-9.5 5-9.5-5-9.5-5Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

function DownloadIcon({
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
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
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
      <path d="M12 3 2.8 20h18.4L12 3Z" />
      <path d="M12 9v5" />
      <path d="M12 17h.01" />
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
