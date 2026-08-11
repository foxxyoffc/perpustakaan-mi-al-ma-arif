import { createClient } from "@/app/lib/supabase/server";
import {
  supabaseAdmin,
} from "@/app/lib/supabase/admin";
import {
  getAuthProfile,
} from "@/app/lib/auth";

/**
 * =========================================================
 * PERMISSIONS HELPER
 * =========================================================
 *
 * File:
 * app/lib/permissions.ts
 *
 * Mengatur:
 *
 * - Permission user
 * - Permission admin
 * - Permission developer
 * - Akses buku siswa
 * - Akses buku guru
 * - Permission membaca PDF
 * - Permission download PDF
 * - Permission laporan
 * - Permission history
 * - Permission setting web
 *
 * =========================================================
 */


/**
 * =========================================================
 * TYPES
 * =========================================================
 */

export type UserRole =
  | "user"
  | "admin"
  | "developer";


export type BookType =
  | "student"
  | "teacher";


export type StudentBookCategory =
  | "general"
  | "religion";


export type TeacherClass =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6;


export type BookAction =
  | "read"
  | "download";


/**
 * =========================================================
 * BOOK PERMISSION INTERFACE
 * =========================================================
 */

export interface BookPermission {
  canRead: boolean;

  canDownload: boolean;

  reason?: string;
}


/**
 * =========================================================
 * BASIC ROLE CHECK
 * =========================================================
 */

export function isUserRole(
  role: string | null | undefined
) {
  return role === "user";
}


export function isAdminRole(
  role: string | null | undefined
) {
  return role === "admin";
}


export function isDeveloperRole(
  role: string | null | undefined
) {
  return role === "developer";
}


export function isStaffRole(
  role: string | null | undefined
) {
  return (
    role === "admin" ||
    role === "developer"
  );
}


/**
 * =========================================================
 * CAN ACCESS CATEGORY
 * =========================================================
 *
 * Category membutuhkan login.
 */
export function canAccessCategory(
  role: UserRole | null
) {
  return Boolean(role);
}


/**
 * =========================================================
 * CAN ACCESS STUDENT BOOKS
 * =========================================================
 *
 * Buku siswa dapat dibaca oleh:
 *
 * - user
 * - admin
 * - developer
 */
export function canAccessStudentBooks(
  role: UserRole | null
) {
  return (
    role === "user" ||
    role === "admin" ||
    role === "developer"
  );
}


/**
 * =========================================================
 * CAN ACCESS TEACHER BOOKS
 * =========================================================
 *
 * Buku guru tidak boleh diakses user biasa.
 *
 * Hanya:
 * - admin
 * - developer
 *
 * yang dapat mengelola/mengakses area buku guru.
 *
 * Nantinya jika sekolah ingin guru memiliki role
 * khusus "teacher", type dan logic ini bisa diperluas.
 */
export function canAccessTeacherBooks(
  role: UserRole | null
) {
  return (
    role === "admin" ||
    role === "developer"
  );
}


/**
 * =========================================================
 * CAN MANAGE BOOKS
 * =========================================================
 *
 * Admin dan developer dapat:
 *
 * - tambah buku
 * - edit judul
 * - edit sinopsis
 * - ganti PDF
 * - hapus buku
 * - ubah permission download
 */
export function canManageBooks(
  role: UserRole | null
) {
  return (
    role === "admin" ||
    role === "developer"
  );
}


/**
 * =========================================================
 * CAN MANAGE ANNOUNCEMENT
 * =========================================================
 */

export function canManageAnnouncement(
  role: UserRole | null
) {
  return (
    role === "admin" ||
    role === "developer"
  );
}


/**
 * =========================================================
 * CAN MANAGE REPORT
 * =========================================================
 *
 * User:
 * - dapat membuat report
 *
 * Admin:
 * - dapat melihat semua report
 *
 * Developer:
 * - dapat melihat semua report termasuk report admin
 */
export function canCreateReport(
  role: UserRole | null
) {
  return Boolean(role);
}


export function canViewAllReports(
  role: UserRole | null
) {
  return (
    role === "admin" ||
    role === "developer"
  );
}


export function canViewAdminReports(
  role: UserRole | null
) {
  return role === "developer";
}


/**
 * =========================================================
 * HISTORY PERMISSION
 * =========================================================
 *
 * User:
 * - hanya history sendiri
 *
 * Admin:
 * - history seluruh user
 * - tidak termasuk aktivitas sesama admin
 *
 * Developer:
 * - history user
 * - history admin
 * - seluruh aktivitas sistem yang diperbolehkan
 */
export function canViewOwnHistory(
  role: UserRole | null
) {
  return Boolean(role);
}


export function canViewAllUserHistory(
  role: UserRole | null
) {
  return (
    role === "admin" ||
    role === "developer"
  );
}


export function canViewAdminHistory(
  role: UserRole | null
) {
  return role === "developer";
}


/**
 * =========================================================
 * WEB SETTINGS
 * =========================================================
 */

export function canAccessAdminSettings(
  role: UserRole | null
) {
  return role === "admin";
}


export function canAccessDeveloperSettings(
  role: UserRole | null
) {
  return role === "developer";
}


/**
 * =========================================================
 * ADMIN ACCOUNT MANAGEMENT
 * =========================================================
 *
 * Hanya developer:
 *
 * - add admin
 * - delete admin
 * - edit admin
 * - reset admin password
 */
export function canManageAdminAccounts(
  role: UserRole | null
) {
  return role === "developer";
}


/**
 * =========================================================
 * DEVELOPER SETTINGS
 * =========================================================
 */

export function canManageDeveloperSettings(
  role: UserRole | null
) {
  return role === "developer";
}


/**
 * =========================================================
 * USER PROFILE
 * =========================================================
 *
 * User:
 * - edit profile sendiri
 *
 * Admin/developer:
 * - tidak menggunakan halaman profile user
 * - account admin/developer hanya username/password
 */
export function canEditOwnProfile(
  role: UserRole | null
) {
  return role === "user";
}


/**
 * =========================================================
 * DOWNLOAD PERMISSION
 * =========================================================
 *
 * Admin/developer dapat mengelola permission.
 *
 * User hanya boleh download apabila:
 *
 * book.allow_download === true
 */
export function canManageDownloadPermission(
  role: UserRole | null
) {
  return (
    role === "admin" ||
    role === "developer"
  );
}


/**
 * =========================================================
 * BOOK ACCESS RESULT
 * =========================================================
 */

export interface BookAccessResult {
  allowed: boolean;

  reason?: string;

  role?: UserRole;

  action?: BookAction;
}


/**
 * =========================================================
 * GET CURRENT ROLE
 * =========================================================
 */

export async function getCurrentRole() {
  const profile =
    await getAuthProfile();

  if (!profile) {
    return null;
  }

  if (
    profile.status !==
    "active"
  ) {
    return null;
  }

  return profile.role as UserRole;
}


/**
 * =========================================================
 * CHECK BOOK ACCESS
 * =========================================================
 *
 * Fungsi utama permission buku.
 *
 * Ini akan digunakan nanti oleh:
 *
 * /api/books/[id]/read
 *
 * /api/books/[id]/download
 *
 * Contoh:
 *
 * checkBookAccess(bookId, "read")
 *
 * checkBookAccess(bookId, "download")
 *
 * =========================================================
 */
export async function checkBookAccess(
  bookId: string,
  action: BookAction
): Promise<BookAccessResult> {
  if (!bookId) {
    return {
      allowed: false,

      reason:
        "ID buku tidak valid.",

      action,
    };
  }


  const profile =
    await getAuthProfile();


  if (!profile) {
    return {
      allowed: false,

      reason:
        "Silakan login terlebih dahulu.",

      action,
    };
  }


  if (
    profile.status !==
    "active"
  ) {
    return {
      allowed: false,

      reason:
        "Akun belum aktif atau telah dinonaktifkan.",

      role:
        profile.role as UserRole,

      action,
    };
  }


  const role =
    profile.role as UserRole;


  /**
   * Ambil data buku.
   */
  const {
    data: book,
    error,
  } =
    await supabaseAdmin
      .from("books")
      .select(
        `
          id,
          title,
          book_type,
          student_category,
          teacher_class,
          pdf_path,
          allow_download,
          is_active
        `
      )
      .eq(
        "id",
        bookId
      )
      .maybeSingle();


  if (error) {
    console.error(
      "checkBookAccess book error:",
      error
    );

    return {
      allowed: false,

      reason:
        "Gagal memeriksa data buku.",

      role,

      action,
    };
  }


  if (!book) {
    return {
      allowed: false,

      reason:
        "Buku tidak ditemukan.",

      role,

      action,
    };
  }


  /**
   * Buku tidak aktif.
   */
  if (
    book.is_active ===
    false
  ) {
    return {
      allowed: false,

      reason:
        "Buku sedang tidak tersedia.",

      role,

      action,
    };
  }


  /**
   * Tidak ada PDF.
   */
  if (!book.pdf_path) {
    return {
      allowed: false,

      reason:
        "File PDF buku belum tersedia.",

      role,

      action,
    };
  }


  /**
   * =======================================================
   * BUKU GURU
   * =======================================================
   */
  if (
    book.book_type ===
    "teacher"
  ) {
    /**
     * User biasa tidak dapat mengakses.
     */
    if (
      role === "user"
    ) {
      return {
        allowed: false,

        reason:
          "Buku Guru hanya dapat diakses oleh akun yang memiliki izin.",

        role,

        action,
      };
    }
  }


  /**
   * =======================================================
   * READ
   * =======================================================
   *
   * Semua role yang sudah lolos pengecekan
   * dapat membaca buku.
   *
   * Permission download TIDAK mempengaruhi
   * permission membaca.
   */
  if (
    action === "read"
  ) {
    return {
      allowed: true,

      role,

      action,
    };
  }


  /**
   * =======================================================
   * DOWNLOAD
   * =======================================================
   *
   * Download bergantung pada:
   *
   * books.allow_download
   */
  if (
    action === "download"
  ) {
    /**
     * Admin/developer tetap boleh download
     * untuk kebutuhan pengelolaan.
     */
    if (
      role === "admin" ||
      role === "developer"
    ) {
      return {
        allowed: true,

        role,

        action,
      };
    }


    /**
     * User biasa hanya boleh download
     * jika buku mengizinkan download.
     */
    if (
      book.allow_download ===
      true
    ) {
      return {
        allowed: true,

        role,

        action,
      };
    }


    return {
      allowed: false,

      reason:
        "Buku ini hanya dapat dibaca melalui website dan tidak dapat didownload.",

      role,

      action,
    };
  }


  return {
    allowed: false,

    reason:
      "Aksi buku tidak dikenali.",

    role,

    action,
  };
}


/**
 * =========================================================
 * CAN READ BOOK
 * =========================================================
 */

export async function canReadBook(
  bookId: string
) {
  const result =
    await checkBookAccess(
      bookId,
      "read"
    );

  return result.allowed;
}


/**
 * =========================================================
 * CAN DOWNLOAD BOOK
 * =========================================================
 */

export async function canDownloadBook(
  bookId: string
) {
  const result =
    await checkBookAccess(
      bookId,
      "download"
    );

  return result.allowed;
}


/**
 * =========================================================
 * GET BOOK PERMISSION
 * =========================================================
 *
 * Berguna untuk UI.
 *
 * Contoh hasil:
 *
 * {
 *   canRead: true,
 *   canDownload: false
 * }
 */
export async function getBookPermission(
  bookId: string
): Promise<BookPermission> {
  const readResult =
    await checkBookAccess(
      bookId,
      "read"
    );


  if (
    !readResult.allowed
  ) {
    return {
      canRead: false,

      canDownload: false,

      reason:
        readResult.reason,
    };
  }


  const downloadResult =
    await checkBookAccess(
      bookId,
      "download"
    );


  return {
    canRead:
      readResult.allowed,

    canDownload:
      downloadResult.allowed,

    reason:
      downloadResult.allowed
        ? undefined
        : downloadResult.reason,
  };
}


/**
 * =========================================================
 * CATEGORY ACCESS
 * =========================================================
 */

export async function checkCategoryAccess() {
  const profile =
    await getAuthProfile();


  if (!profile) {
    return {
      allowed: false,

      reason:
        "Silakan login terlebih dahulu.",
    };
  }


  if (
    profile.status !==
    "active"
  ) {
    return {
      allowed: false,

      reason:
        "Akun belum aktif.",
    };
  }


  return {
    allowed: true,

    role:
      profile.role as UserRole,
  };
}


/**
 * =========================================================
 * STUDENT CATEGORY ACCESS
 * =========================================================
 */

export async function checkStudentCategoryAccess() {
  const profile =
    await getAuthProfile();


  if (!profile) {
    return {
      allowed: false,

      reason:
        "Silakan login terlebih dahulu.",
    };
  }


  if (
    profile.status !==
    "active"
  ) {
    return {
      allowed: false,

      reason:
        "Akun belum aktif.",
    };
  }


  return {
    allowed:
      canAccessStudentBooks(
        profile.role as UserRole
      ),

    role:
      profile.role as UserRole,
  };
}


/**
 * =========================================================
 * TEACHER CATEGORY ACCESS
 * =========================================================
 */

export async function checkTeacherCategoryAccess() {
  const profile =
    await getAuthProfile();


  if (!profile) {
    return {
      allowed: false,

      reason:
        "Silakan login terlebih dahulu.",
    };
  }


  if (
    profile.status !==
    "active"
  ) {
    return {
      allowed: false,

      reason:
        "Akun belum aktif.",
    };
  }


  const allowed =
    canAccessTeacherBooks(
      profile.role as UserRole
    );


  return {
    allowed,

    role:
      profile.role as UserRole,

    reason: allowed
      ? undefined
      : "Buku Guru hanya dapat diakses oleh akun admin/developer.",
  };
}


/**
 * =========================================================
 * REPORT ACCESS
 * =========================================================
 */

export async function checkReportAccess() {
  const profile =
    await getAuthProfile();


  if (!profile) {
    return {
      allowed: false,

      reason:
        "Silakan login terlebih dahulu.",
    };
  }


  if (
    profile.status !==
    "active"
  ) {
    return {
      allowed: false,

      reason:
        "Akun belum aktif.",
    };
  }


  return {
    allowed: canCreateReport(
      profile.role as UserRole
    ),

    role:
      profile.role as UserRole,
  };
}


/**
 * =========================================================
 * ALL REPORT ACCESS
 * =========================================================
 */

export async function checkAllReportAccess() {
  const profile =
    await getAuthProfile();


  if (!profile) {
    return {
      allowed: false,

      reason:
        "Silakan login terlebih dahulu.",
    };
  }


  if (
    profile.status !==
    "active"
  ) {
    return {
      allowed: false,

      reason:
        "Akun tidak aktif.",
    };
  }


  const role =
    profile.role as UserRole;


  return {
    allowed:
      canViewAllReports(
        role
      ),

    role,
  };
}


/**
 * =========================================================
 * ADMIN REPORT ACCESS
 * =========================================================
 *
 * Report admin hanya dapat dipantau developer.
 */
export async function checkAdminReportAccess() {
  const profile =
    await getAuthProfile();


  if (!profile) {
    return {
      allowed: false,

      reason:
        "Silakan login terlebih dahulu.",
    };
  }


  const role =
    profile.role as UserRole;


  return {
    allowed:
      canViewAdminReports(
        role
      ),

    role,
  };
}


/**
 * =========================================================
 * HISTORY ACCESS
 * =========================================================
 */

export async function checkHistoryAccess(
  targetUserId?: string
) {
  const profile =
    await getAuthProfile();


  if (!profile) {
    return {
      allowed: false,

      reason:
        "Silakan login terlebih dahulu.",
    };
  }


  if (
    profile.status !==
    "active"
  ) {
    return {
      allowed: false,

      reason:
        "Akun tidak aktif.",
    };
  }


  const role =
    profile.role as UserRole;


  /**
   * Tidak ada target =
   * history milik sendiri.
   */
  if (
    !targetUserId ||
    targetUserId ===
      profile.id
  ) {
    return {
      allowed:
        canViewOwnHistory(
          role
        ),

      role,

      own: true,
    };
  }


  /**
   * History orang lain.
   */
  if (
    role === "developer"
  ) {
    return {
      allowed: true,

      role,

      own: false,
    };
  }


  if (
    role === "admin"
  ) {
    /**
     * Admin hanya dapat memantau user biasa.
     *
     * Untuk memastikan target benar-benar user,
     * pengecekan database dilakukan di bawah.
     */
    const {
      data: target,
    } =
      await supabaseAdmin
        .from("profiles")
        .select(
          "id, role"
        )
        .eq(
          "id",
          targetUserId
        )
        .maybeSingle();


    if (
      !target
    ) {
      return {
        allowed: false,

        reason:
          "User tidak ditemukan.",

        role,

        own: false,
      };
    }


    /**
     * Admin TIDAK boleh memantau admin lain.
     * Developer yang dapat memantau admin.
     */
    if (
      target.role !==
      "user"
    ) {
      return {
        allowed: false,

        reason:
          "Admin tidak memiliki akses history akun admin/developer.",

        role,

        own: false,
      };
    }


    return {
      allowed: true,

      role,

      own: false,
    };
  }


  return {
    allowed: false,

    reason:
      "Anda tidak memiliki izin melihat history user lain.",

    role,

    own: false,
  };
}


/**
 * =========================================================
 * SET WEB ACCESS
 * =========================================================
 */

export async function checkSetWebAccess(
  area:
    | "admin"
    | "developer"
) {
  const profile =
    await getAuthProfile();


  if (!profile) {
    return {
      allowed: false,

      reason:
        "Silakan login terlebih dahulu.",
    };
  }


  if (
    profile.status !==
    "active"
  ) {
    return {
      allowed: false,

      reason:
        "Akun tidak aktif.",
    };
  }


  if (
    area === "developer"
  ) {
    return {
      allowed:
        profile.role ===
        "developer",

      role:
        profile.role as UserRole,
    };
  }


  return {
    allowed:
      profile.role ===
      "admin",

    role:
      profile.role as UserRole,
  };
}


/**
 * =========================================================
 * ADMIN ACCOUNT MANAGEMENT
 * =========================================================
 */

export async function checkAdminManagementAccess() {
  const profile =
    await getAuthProfile();


  if (!profile) {
    return {
      allowed: false,

      reason:
        "Silakan login terlebih dahulu.",
    };
  }


  if (
    profile.status !==
    "active"
  ) {
    return {
      allowed: false,

      reason:
        "Akun tidak aktif.",
    };
  }


  return {
    allowed:
      profile.role ===
      "developer",

    role:
      profile.role as UserRole,
  };
    }
