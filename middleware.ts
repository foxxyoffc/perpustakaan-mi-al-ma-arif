import {
  type NextRequest,
  NextResponse,
} from "next/server";

import {
  createServerClient,
} from "@supabase/ssr";

/**
 * =========================================================
 * NEXT.JS MIDDLEWARE
 * =========================================================
 *
 * File:
 * middleware.ts
 *
 * Lokasi:
 * ROOT PROJECT
 *
 * Contoh:
 *
 * /middleware.ts
 *
 * BUKAN:
 *
 * /app/middleware.ts
 *
 * =========================================================
 *
 * Fungsi:
 *
 * - Refresh session Supabase
 * - Menjaga authentication cookie
 * - Melindungi halaman user
 * - Melindungi halaman admin
 * - Melindungi halaman developer
 * - Mencegah user biasa masuk area admin
 * - Mencegah admin masuk area developer
 *
 * =========================================================
 */


/**
 * =========================================================
 * PUBLIC ROUTES
 * =========================================================
 *
 * Halaman yang dapat dibuka tanpa login.
 */

const PUBLIC_ROUTES = [
  "/",
  "/home",
  "/login",
  "/login/forgot-password",
  "/login-admin",
  "/login-admin/forgot-password",
  "/login-developer",
  "/login-developer/forgot-password",
  "/sign-in",
  "/about-us",
  "/contact-us",
];


/**
 * =========================================================
 * PUBLIC PREFIXES
 * =========================================================
 *
 * Digunakan untuk asset/public endpoint tertentu.
 */

const PUBLIC_PREFIXES = [
  "/_next",
  "/favicon.ico",
  "/images",
  "/icons",
  "/api/public",
];


/**
 * =========================================================
 * USER ONLY ROUTES
 * =========================================================
 *
 * Memerlukan login user/admin/developer.
 */

const USER_PROTECTED_PREFIXES = [
  "/category",
  "/history",
  "/my-account",
  "/report",
  "/announcement",
];


/**
 * =========================================================
 * ADMIN ROUTES
 * =========================================================
 *
 * Hanya:
 *
 * - admin
 * - developer
 *
 * yang dapat masuk.
 */

const ADMIN_PREFIXES = [
  "/history-all",
  "/request-all-report",
  "/set-web",
];


/**
 * =========================================================
 * DEVELOPER ROUTES
 * =========================================================
 *
 * Hanya developer.
 */

const DEVELOPER_PREFIXES = [
  "/set-web/developer",
  "/developer",
];


/**
 * =========================================================
 * HELPERS
 * =========================================================
 */

function matchesExact(
  pathname: string,
  routes: string[]
) {
  return routes.includes(
    pathname
  );
}


function matchesPrefix(
  pathname: string,
  prefixes: string[]
) {
  return prefixes.some(
    (prefix) =>
      pathname === prefix ||
      pathname.startsWith(
        `${prefix}/`
      )
  );
}


/**
 * =========================================================
 * MIDDLEWARE
 * =========================================================
 */

export async function middleware(
  request: NextRequest
) {
  const pathname =
    request.nextUrl.pathname;


  /**
   * -------------------------------------------------------
   * PUBLIC FILE / ASSET
   * -------------------------------------------------------
   */

  if (
    matchesPrefix(
      pathname,
      PUBLIC_PREFIXES
    )
  ) {
    return NextResponse.next();
  }


  /**
   * -------------------------------------------------------
   * API
   * -------------------------------------------------------
   *
   * API yang membutuhkan authentication
   * tetap melakukan pengecekan sendiri.
   *
   * Middleware hanya melewatkan request.
   */

  if (
    pathname.startsWith(
      "/api/"
    )
  ) {
    return NextResponse.next();
  }


  /**
   * -------------------------------------------------------
   * CREATE SUPABASE SERVER CLIENT
   * -------------------------------------------------------
   */

  let response =
    NextResponse.next({
      request,
    });


  const supabase =
    createServerClient(
      process.env
        .NEXT_PUBLIC_SUPABASE_URL!,
      process.env
        .NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },

          setAll(
            cookiesToSet
          ) {
            cookiesToSet.forEach(
              ({
                name,
                value,
              }) => {
                request.cookies.set(
                  name,
                  value
                );
              }
            );


            response =
              NextResponse.next({
                request,
              });


            cookiesToSet.forEach(
              ({
                name,
                value,
                options,
              }) => {
                response.cookies.set(
                  name,
                  value,
                  options
                );
              }
            );
          },
        },
      }
    );


  /**
   * -------------------------------------------------------
   * GET USER
   * -------------------------------------------------------
   *
   * getUser() digunakan agar session
   * benar-benar divalidasi oleh Supabase.
   */

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();


  /**
   * -------------------------------------------------------
   * PUBLIC ROUTE
   * -------------------------------------------------------
   */

  if (
    matchesExact(
      pathname,
      PUBLIC_ROUTES
    )
  ) {
    /**
     * Kalau sudah login lalu membuka
     * halaman login, arahkan ke Home.
     *
     * Namun login-admin dan login-developer
     * tetap boleh dibuka agar role-specific
     * login tetap tersedia.
     */

    if (
      user &&
      (
        pathname ===
          "/login" ||
        pathname ===
          "/sign-in"
      )
    ) {
      return NextResponse.redirect(
        new URL(
          "/home",
          request.url
        )
      );
    }


    return response;
  }


  /**
   * -------------------------------------------------------
   * USER PROTECTED
   * -------------------------------------------------------
   */

  if (
    matchesPrefix(
      pathname,
      USER_PROTECTED_PREFIXES
    )
  ) {
    if (!user) {
      const loginUrl =
        new URL(
          "/login",
          request.url
        );


      loginUrl.searchParams.set(
        "redirect",
        pathname
      );


      return NextResponse.redirect(
        loginUrl
      );
    }
  }


  /**
   * -------------------------------------------------------
   * GET ROLE
   * -------------------------------------------------------
   *
   * Role disimpan pada profiles.
   *
   * Middleware menggunakan Service Role
   * tidak diperbolehkan.
   *
   * Karena itu role diambil melalui metadata
   * user terlebih dahulu.
   *
   * Sistem database/RLS tetap menjadi
   * lapisan authorization utama.
   * -------------------------------------------------------
   */

  let role:
    | "user"
    | "admin"
    | "developer"
    | null =
    null;


  if (user) {
    const metadataRole =
      user.user_metadata
        ?.role;


    if (
      metadataRole ===
        "user" ||
      metadataRole ===
        "admin" ||
      metadataRole ===
        "developer"
    ) {
      role =
        metadataRole;
    }
  }


  /**
   * -------------------------------------------------------
   * ADMIN ROUTES
   * -------------------------------------------------------
   */

  if (
    matchesPrefix(
      pathname,
      ADMIN_PREFIXES
    )
  ) {
    /**
     * Belum login.
     */

    if (!user) {
      const loginUrl =
        new URL(
          "/login",
          request.url
        );


      loginUrl.searchParams.set(
        "redirect",
        pathname
      );


      return NextResponse.redirect(
        loginUrl
      );
    }


    /**
     * Bukan admin/developer.
     */

    if (
      role !== "admin" &&
      role !== "developer"
    ) {
      return NextResponse.redirect(
        new URL(
          "/home",
          request.url
        )
      );
    }
  }


  /**
   * -------------------------------------------------------
   * DEVELOPER ROUTES
   * -------------------------------------------------------
   */

  if (
    matchesPrefix(
      pathname,
      DEVELOPER_PREFIXES
    )
  ) {
    /**
     * Belum login.
     */

    if (!user) {
      const loginUrl =
        new URL(
          "/login-developer",
          request.url
        );


      loginUrl.searchParams.set(
        "redirect",
        pathname
      );


      return NextResponse.redirect(
        loginUrl
      );
    }


    /**
     * Hanya developer.
     */

    if (
      role !==
      "developer"
    ) {
      return NextResponse.redirect(
        new URL(
          "/home",
          request.url
        )
      );
    }
  }


  /**
   * -------------------------------------------------------
   * LOGIN ROLE REDIRECT
   * -------------------------------------------------------
   *
   * Jika developer membuka halaman login biasa,
   * tidak otomatis mengubah session.
   *
   * Login page tetap menangani authentication.
   */


  /**
   * -------------------------------------------------------
   * RETURN RESPONSE
   * -------------------------------------------------------
   */

  return response;
}


/**
 * =========================================================
 * MATCHER
 * =========================================================
 *
 * Middleware dijalankan pada halaman aplikasi,
 * tetapi tidak perlu diproses untuk file statis
 * tertentu.
 *
 * =========================================================
 */

export const config = {
  matcher: [
    /*
     * Cocokkan semua request kecuali:
     *
     * - _next/static
     * - _next/image
     * - favicon
     * - file gambar umum
     * - file metadata
     */

    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)",
  ],
};
