import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * =========================================================
 * MI AL-MA'ARIF NUSANTARA
 * LIBRARY WEBSITE - MIDDLEWARE
 * =========================================================
 *
 * File:
 * middleware.ts
 *
 * Fungsi:
 * - Refresh session Supabase
 * - Mengecek login
 * - Membatasi halaman berdasarkan role
 * - Melindungi halaman user
 * - Melindungi halaman admin
 * - Melindungi halaman developer
 *
 * ROLE:
 * - user
 * - admin
 * - developer
 *
 * CATATAN:
 * Middleware bukan satu-satunya lapisan keamanan.
 * Semua API/server action tetap wajib melakukan
 * pengecekan authentication + authorization.
 * =========================================================
 */


/**
 * Halaman yang boleh dibuka tanpa login.
 */
const PUBLIC_PATHS = [
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
  "/announcement",
];


/**
 * Prefix halaman yang membutuhkan login user.
 *
 * User biasa juga dapat mengakses beberapa halaman
 * milik admin/developer? TIDAK.
 */
const AUTHENTICATED_PATHS = [
  "/category",
  "/history",
  "/my-account",
  "/report",
];


/**
 * Halaman khusus admin.
 */
const ADMIN_PATHS = [
  "/admin",
  "/admin/set-web",
  "/admin/reports",
  "/admin/history",
];


/**
 * Halaman khusus developer.
 */
const DEVELOPER_PATHS = [
  "/developer",
  "/developer/set-web",
  "/developer/monitoring",
  "/developer/reports",
  "/developer/history",
];


/**
 * Halaman yang dapat diakses admin DAN developer.
 */
const ADMIN_DEVELOPER_PATHS = [
  "/reports",
  "/history-all",
];


/**
 * Mengecek apakah pathname sama dengan path
 * atau merupakan child route dari path tersebut.
 *
 * Contoh:
 *
 * /admin
 * /admin/books
 * /admin/books/add
 *
 * semuanya dianggap bagian dari /admin.
 */
function matchesPath(
  pathname: string,
  path: string
) {
  return (
    pathname === path ||
    pathname.startsWith(`${path}/`)
  );
}


/**
 * Mengecek beberapa path sekaligus.
 */
function matchesAnyPath(
  pathname: string,
  paths: string[]
) {
  return paths.some((path) =>
    matchesPath(pathname, path)
  );
}


/**
 * Mengecek apakah route merupakan file/static resource.
 */
function isStaticFile(
  pathname: string
) {
  return /\.[^/]+$/.test(pathname);
}


/**
 * Membuat redirect ke login user.
 */
function redirectToLogin(
  request: NextRequest
) {
  const url =
    request.nextUrl.clone();

  url.pathname = "/login";

  /**
   * Simpan halaman sebelumnya supaya setelah login
   * user dapat diarahkan kembali.
   */
  url.searchParams.set(
    "redirect",
    request.nextUrl.pathname +
      request.nextUrl.search
  );

  return NextResponse.redirect(
    url
  );
}


/**
 * Redirect ketika user tidak mempunyai izin.
 */
function redirectForbidden(
  request: NextRequest
) {
  const url =
    request.nextUrl.clone();

  /**
   * Untuk sementara diarahkan ke home.
   *
   * Nanti bisa kita buat halaman /403 khusus.
   */
  url.pathname = "/home";

  url.search = "";

  return NextResponse.redirect(
    url
  );
}


/**
 * Redirect admin ke dashboard admin.
 */
function redirectAdmin(
  request: NextRequest
) {
  const url =
    request.nextUrl.clone();

  url.pathname =
    "/admin/set-web";

  url.search = "";

  return NextResponse.redirect(
    url
  );
}


/**
 * Redirect developer ke dashboard developer.
 */
function redirectDeveloper(
  request: NextRequest
) {
  const url =
    request.nextUrl.clone();

  url.pathname =
    "/developer/set-web";

  url.search = "";

  return NextResponse.redirect(
    url
  );
}


/**
 * =========================================================
 * MAIN MIDDLEWARE
 * =========================================================
 */
export async function middleware(
  request: NextRequest
) {
  const pathname =
    request.nextUrl.pathname;


  /**
   * Jangan proses:
   *
   * - _next
   * - favicon
   * - static files
   * - images
   * - robots
   * - sitemap
   */
  if (
    pathname.startsWith(
      "/_next"
    ) ||
    pathname ===
      "/favicon.ico" ||
    pathname ===
      "/robots.txt" ||
    pathname ===
      "/sitemap.xml" ||
    isStaticFile(pathname)
  ) {
    return NextResponse.next();
  }


  /**
   * Response awal.
   *
   * Supabase akan menggunakan response ini
   * untuk memperbarui cookie session jika diperlukan.
   */
  let response =
    NextResponse.next({
      request,
    });


  /**
   * =======================================================
   * SUPABASE SERVER CLIENT
   * =======================================================
   */
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
                options,
              }) => {
                request.cookies.set(
                  name,
                  value
                );

                response =
                  NextResponse.next(
                    {
                      request,
                    }
                  );

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
   * =======================================================
   * AMBIL USER
   * =======================================================
   *
   * getUser() digunakan karena Supabase dapat
   * memverifikasi user pada server.
   */
  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();


  /**
   * =======================================================
   * ROUTE PUBLIC
   * =======================================================
   */
  const isPublic =
    matchesAnyPath(
      pathname,
      PUBLIC_PATHS
    );


  /**
   * =======================================================
   * API ROUTE
   * =======================================================
   *
   * API tidak kita blokir secara umum di middleware.
   *
   * Setiap API nanti akan melakukan:
   *
   * - getUser()
   * - cek role
   * - cek permission
   *
   * sendiri.
   *
   * Ini penting agar endpoint seperti:
   *
   * /api/admin/books
   *
   * tetap memiliki authorization yang benar.
   */
  if (
    pathname.startsWith(
      "/api/"
    )
  ) {
    return response;
  }


  /**
   * =======================================================
   * PUBLIC PAGE
   * =======================================================
   *
   * Kalau belum login dan halaman public,
   * langsung lanjut.
   */
  if (
    isPublic &&
    !user
  ) {
    return response;
  }


  /**
   * =======================================================
   * USER BELUM LOGIN
   * =======================================================
   *
   * Semua halaman yang bukan public membutuhkan
   * authentication.
   */
  if (!user) {
    return redirectToLogin(
      request
    );
  }


  /**
   * =======================================================
   * AMBIL PROFILE / ROLE
   * =======================================================
   *
   * Profile berada di:
   *
   * public.profiles
   *
   * Role:
   * user
   * admin
   * developer
   */
  const {
    data: profile,
  } =
    await supabase
      .from("profiles")
      .select(
        "id, role, status"
      )
      .eq(
        "id",
        user.id
      )
      .maybeSingle();


  /**
   * Tidak mempunyai profile.
   *
   * Ini biasanya berarti akun belum selesai
   * diproses atau data profile bermasalah.
   */
  if (!profile) {
    /**
     * Login page tetap boleh dibuka.
     */
    if (
      pathname ===
        "/login" ||
      pathname ===
        "/login/forgot-password"
    ) {
      return response;
    }

    return redirectToLogin(
      request
    );
  }


  /**
   * =======================================================
   * STATUS AKUN
   * =======================================================
   *
   * Untuk user yang pendaftarannya masih menunggu
   * persetujuan admin, status dapat berupa:
   *
   * pending
   *
   * Untuk akun yang dinonaktifkan:
   *
   * suspended
   *
   * Akun active:
   *
   * active
   */
  const accountStatus =
    profile.status;


  /**
   * =======================================================
   * PENDING ACCOUNT
   * =======================================================
   *
   * User yang belum disetujui admin tidak boleh
   * masuk ke area perpustakaan.
   */
  if (
    accountStatus ===
      "pending"
  ) {
    /**
     * Biarkan halaman login dan sign-in.
     */
    if (
      pathname ===
        "/login" ||
      pathname ===
        "/sign-in" ||
      pathname ===
        "/login/forgot-password"
    ) {
      return response;
    }


    /**
     * Nanti kita bisa membuat:
     *
     * /account-pending
     *
     * untuk halaman khusus.
     *
     * Untuk sementara kembali ke login.
     */
    return redirectToLogin(
      request
    );
  }


  /**
   * =======================================================
   * SUSPENDED ACCOUNT
   * =======================================================
   */
  if (
    accountStatus ===
    "suspended"
  ) {
    if (
      pathname ===
        "/login" ||
      pathname ===
        "/login/forgot-password"
    ) {
      return response;
    }

    return redirectToLogin(
      request
    );
  }


  /**
   * =======================================================
   * ADMIN-ONLY ROUTES
   * =======================================================
   */
  if (
    matchesAnyPath(
      pathname,
      ADMIN_PATHS
    )
  ) {
    if (
      profile.role !==
      "admin"
    ) {
      /**
       * Developer juga memiliki akses administratif,
       * tetapi developer diarahkan ke area developer
       * agar pemisahan role tetap jelas.
       */
      if (
        profile.role ===
        "developer"
      ) {
        return redirectDeveloper(
          request
        );
      }

      return redirectForbidden(
        request
      );
    }


    return response;
  }


  /**
   * =======================================================
   * DEVELOPER-ONLY ROUTES
   * =======================================================
   */
  if (
    matchesAnyPath(
      pathname,
      DEVELOPER_PATHS
    )
  ) {
    if (
      profile.role !==
      "developer"
    ) {
      return redirectForbidden(
        request
      );
    }


    return response;
  }


  /**
   * =======================================================
   * ADMIN + DEVELOPER ROUTES
   * =======================================================
   */
  if (
    matchesAnyPath(
      pathname,
      ADMIN_DEVELOPER_PATHS
    )
  ) {
    if (
      profile.role !==
        "admin" &&
      profile.role !==
        "developer"
    ) {
      return redirectForbidden(
        request
      );
    }


    return response;
  }


  /**
   * =======================================================
   * USER AUTHENTICATED ROUTES
   * =======================================================
   *
   * User, admin, dan developer dapat mengakses
   * halaman umum yang membutuhkan login.
   */
  if (
    matchesAnyPath(
      pathname,
      AUTHENTICATED_PATHS
    )
  ) {
    return response;
  }


  /**
   * =======================================================
   * LOGIN REDIRECT
   * =======================================================
   *
   * Kalau user yang sudah login membuka:
   *
   * /login
   * /login-admin
   * /login-developer
   *
   * kita arahkan sesuai role.
   */
  if (
    pathname ===
      "/login" ||
    pathname ===
      "/login-admin" ||
    pathname ===
      "/login-developer"
  ) {
    if (
      profile.role ===
      "developer"
    ) {
      return redirectDeveloper(
        request
      );
    }


    if (
      profile.role ===
      "admin"
    ) {
      return redirectAdmin(
        request
      );
    }


    return NextResponse.redirect(
      new URL(
        "/home",
        request.url
      )
    );
  }


  /**
   * =======================================================
   * DEFAULT
   * =======================================================
   */
  return response;
}


/**
 * =========================================================
 * MATCHER
 * =========================================================
 *
 * Middleware hanya dijalankan untuk halaman yang relevan.
 *
 * API sengaja ikut di-match agar session cookie tetap
 * dapat diperbarui, tetapi API authorization tetap
 * dilakukan di masing-masing route handler.
 */
export const config = {
  matcher: [
    /*
     * Semua route kecuali:
     * - _next/static
     * - _next/image
     * - favicon
     * - file static tertentu
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
