import {
  supabaseAdmin,
} from "@/app/lib/supabase/admin";

import {
  getAuthUser,
  getAuthProfile,
} from "@/app/lib/auth";

import {
  checkHistoryAccess,
} from "@/app/lib/permissions";


/**
 * =========================================================
 * HISTORY HELPER
 * =========================================================
 *
 * File:
 * app/lib/history.ts
 *
 * Sistem history digunakan untuk mencatat aktivitas:
 *
 * USER
 * - login
 * - logout
 * - gagal login
 * - membaca buku
 * - download buku
 * - report
 * - edit profile
 * - ganti password
 * - dll.
 *
 * ADMIN
 * - login
 * - logout
 * - tambah/edit/hapus buku
 * - upload/ganti PDF
 * - ubah izin download
 * - membuat pengumuman
 * - mengelola user
 * - report
 * - dll.
 *
 * DEVELOPER
 * - seluruh aktivitas yang relevan
 *
 * =========================================================
 */


/**
 * =========================================================
 * TYPES
 * =========================================================
 */

export type HistoryActorRole =
  | "user"
  | "admin"
  | "developer";


export type HistoryAction =
  | "login"
  | "login_failed"
  | "login_locked"
  | "logout"

  | "register"
  | "account_approved"
  | "account_rejected"
  | "account_suspended"
  | "account_unsuspended"

  | "profile_updated"
  | "password_changed"
  | "username_changed"
  | "avatar_updated"

  | "book_viewed"
  | "book_downloaded"

  | "book_created"
  | "book_updated"
  | "book_deleted"

  | "book_title_updated"
  | "book_synopsis_updated"
  | "book_pdf_uploaded"
  | "book_pdf_replaced"
  | "book_pdf_deleted"

  | "book_download_permission_enabled"
  | "book_download_permission_disabled"

  | "announcement_created"
  | "announcement_updated"
  | "announcement_deleted"

  | "report_created"
  | "report_viewed"
  | "report_updated"
  | "report_deleted"

  | "admin_created"
  | "admin_updated"
  | "admin_deleted"

  | "background_updated"
  | "contact_updated"
  | "school_info_updated"
  | "settings_updated"

  | "security_alert"

  | "other";


export type HistoryEntityType =
  | "user"
  | "admin"
  | "developer"
  | "book"
  | "report"
  | "announcement"
  | "settings"
  | "system"
  | "other";


/**
 * =========================================================
 * INPUT
 * =========================================================
 */

export interface CreateHistoryInput {
  action: HistoryAction;

  description: string;

  entityType?:
    | HistoryEntityType
    | null;

  entityId?:
    | string
    | null;

  metadata?:
    | Record<string, unknown>
    | null;

  ipAddress?:
    | string
    | null;

  userAgent?:
    | string
    | null;
}


/**
 * =========================================================
 * RESULT
 * =========================================================
 */

export interface HistoryResult {
  success: boolean;

  id?: string;

  error?: string;
}


/**
 * =========================================================
 * SANITIZE METADATA
 * =========================================================
 *
 * Jangan menyimpan:
 *
 * - password
 * - service role key
 * - access token
 * - refresh token
 * - secret
 *
 * ke history.
 */
function sanitizeMetadata(
  metadata:
    | Record<string, unknown>
    | null
    | undefined
) {
  if (!metadata) {
    return null;
  }


  const sanitized: Record<
    string,
    unknown
  > = {};


  const forbiddenKeys = [
    "password",
    "new_password",
    "old_password",
    "confirm_password",

    "access_token",
    "refresh_token",

    "service_role_key",
    "supabase_service_role_key",

    "secret",
    "api_key",
    "apikey",

    "token",
  ];


  for (
    const [
      key,
      value,
    ] of Object.entries(
      metadata
    )
  ) {
    if (
      forbiddenKeys.includes(
        key.toLowerCase()
      )
    ) {
      continue;
    }


    sanitized[key] =
      value;
  }


  return sanitized;
}


/**
 * =========================================================
 * CREATE HISTORY
 * =========================================================
 *
 * Fungsi utama.
 *
 * Biasanya dipanggil setelah sebuah aktivitas berhasil.
 */
export async function createHistory(
  input: CreateHistoryInput
): Promise<HistoryResult> {
  try {
    const user =
      await getAuthUser();

    const profile =
      await getAuthProfile();


    /**
     * History dapat berasal dari user yang sudah login.
     *
     * Untuk aktivitas seperti login gagal, caller dapat
     * menggunakan createSecurityHistory() karena pada
     * kondisi tersebut session belum tentu tersedia.
     */
    if (!user || !profile) {
      return {
        success: false,

        error:
          "User/session tidak ditemukan.",
      };
    }


    const metadata =
      sanitizeMetadata(
        input.metadata
      );


    /**
     * Struktur mengikuti tabel history.
     *
     * Kolom tambahan seperti ip/user-agent boleh NULL.
     */
    const {
      data,
      error,
    } =
      await supabaseAdmin
        .from("history")
        .insert({
          user_id:
            user.id,

          actor_role:
            profile.role,

          action:
            input.action,

          description:
            input.description,

          entity_type:
            input.entityType ??
            null,

          entity_id:
            input.entityId ??
            null,

          metadata,

          ip_address:
            input.ipAddress ??
            null,

          user_agent:
            input.userAgent ??
            null,
        })
        .select(
          "id"
        )
        .single();


    if (error) {
      console.error(
        "createHistory error:",
        error
      );

      return {
        success: false,

        error:
          error.message,
      };
    }


    return {
      success: true,

      id: data.id,
    };
  } catch (error) {
    console.error(
      "createHistory exception:",
      error
    );


    return {
      success: false,

      error:
        error instanceof Error
          ? error.message
          : "Unknown error.",
    };
  }
}


/**
 * =========================================================
 * CREATE SECURITY HISTORY
 * =========================================================
 *
 * Dipakai untuk aktivitas sebelum user berhasil login.
 *
 * Contoh:
 * - username tidak ditemukan
 * - password salah
 * - login gagal 5x
 * - akun dikunci
 *
 * Jika profileId tersedia, aktivitas dikaitkan dengan
 * akun tersebut.
 */
export async function createSecurityHistory(
  input: {
    action:
      | "login_failed"
      | "login_locked"
      | "security_alert";

    description: string;

    profileId?:
      | string
      | null;

    actorRole?:
      | HistoryActorRole
      | null;

    metadata?:
      | Record<string, unknown>
      | null;

    ipAddress?:
      | string
      | null;

    userAgent?:
      | string
      | null;
  }
): Promise<HistoryResult> {
  try {
    const metadata =
      sanitizeMetadata(
        input.metadata
      );


    const {
      data,
      error,
    } =
      await supabaseAdmin
        .from("history")
        .insert({
          user_id:
            input.profileId ??
            null,

          actor_role:
            input.actorRole ??
            null,

          action:
            input.action,

          description:
            input.description,

          entity_type:
            "system",

          entity_id:
            null,

          metadata,

          ip_address:
            input.ipAddress ??
            null,

          user_agent:
            input.userAgent ??
            null,
        })
        .select(
          "id"
        )
        .single();


    if (error) {
      console.error(
        "createSecurityHistory error:",
        error
      );

      return {
        success: false,

        error:
          error.message,
      };
    }


    return {
      success: true,

      id: data.id,
    };
  } catch (error) {
    console.error(
      "createSecurityHistory exception:",
      error
    );


    return {
      success: false,

      error:
        error instanceof Error
          ? error.message
          : "Unknown error.",
    };
  }
}


/**
 * =========================================================
 * LOGIN HISTORY
 * =========================================================
 */

export async function historyLogin() {
  return createHistory({
    action:
      "login",

    description:
      "Berhasil login ke sistem perpustakaan.",

    entityType:
      "user",
  });
}


/**
 * =========================================================
 * LOGOUT HISTORY
 * =========================================================
 *
 * Dipanggil sebelum signOut.
 */
export async function historyLogout() {
  return createHistory({
    action:
      "logout",

    description:
      "Logout dari sistem perpustakaan.",

    entityType:
      "user",
  });
}


/**
 * =========================================================
 * FAILED LOGIN HISTORY
 * =========================================================
 */

export async function historyLoginFailed(
  profileId:
    | string
    | null,
  description: string,
  metadata?:
    | Record<string, unknown>
    | null
) {
  return createSecurityHistory({
    action:
      "login_failed",

    description,

    profileId,

    metadata,
  });
}


/**
 * =========================================================
 * LOGIN LOCKED HISTORY
 * =========================================================
 */

export async function historyLoginLocked(
  profileId:
    | string
    | null,
  description: string,
  metadata?:
    | Record<string, unknown>
    | null
) {
  return createSecurityHistory({
    action:
      "login_locked",

    description,

    profileId,

    metadata,
  });
}


/**
 * =========================================================
 * BOOK VIEW HISTORY
 * =========================================================
 */

export async function historyBookViewed(
  bookId: string,
  bookTitle?: string
) {
  return createHistory({
    action:
      "book_viewed",

    description:
      bookTitle
        ? `Membuka buku "${bookTitle}".`
        : "Membuka buku.",

    entityType:
      "book",

    entityId:
      bookId,

    metadata: {
      book_title:
        bookTitle ??
        null,
    },
  });
}


/**
 * =========================================================
 * BOOK DOWNLOAD HISTORY
 * =========================================================
 */

export async function historyBookDownloaded(
  bookId: string,
  bookTitle?: string
) {
  return createHistory({
    action:
      "book_downloaded",

    description:
      bookTitle
        ? `Mendownload buku "${bookTitle}".`
        : "Mendownload buku.",

    entityType:
      "book",

    entityId:
      bookId,

    metadata: {
      book_title:
        bookTitle ??
        null,
    },
  });
}


/**
 * =========================================================
 * BOOK CREATED
 * =========================================================
 */

export async function historyBookCreated(
  bookId: string,
  bookTitle: string
) {
  return createHistory({
    action:
      "book_created",

    description:
      `Menambahkan buku "${bookTitle}".`,

    entityType:
      "book",

    entityId:
      bookId,

    metadata: {
      book_title:
        bookTitle,
    },
  });
}


/**
 * =========================================================
 * BOOK UPDATED
 * =========================================================
 */

export async function historyBookUpdated(
  bookId: string,
  description: string,
  metadata?:
    | Record<string, unknown>
    | null
) {
  return createHistory({
    action:
      "book_updated",

    description,

    entityType:
      "book",

    entityId:
      bookId,

    metadata,
  });
}


/**
 * =========================================================
 * BOOK DELETED
 * =========================================================
 */

export async function historyBookDeleted(
  bookId: string,
  bookTitle?: string
) {
  return createHistory({
    action:
      "book_deleted",

    description:
      bookTitle
        ? `Menghapus buku "${bookTitle}".`
        : "Menghapus buku.",

    entityType:
      "book",

    entityId:
      bookId,

    metadata: {
      book_title:
        bookTitle ??
        null,
    },
  });
}


/**
 * =========================================================
 * PDF UPLOADED
 * =========================================================
 */

export async function historyBookPdfUploaded(
  bookId: string,
  bookTitle?: string
) {
  return createHistory({
    action:
      "book_pdf_uploaded",

    description:
      bookTitle
        ? `Mengupload PDF buku "${bookTitle}".`
        : "Mengupload PDF buku.",

    entityType:
      "book",

    entityId:
      bookId,

    metadata: {
      book_title:
        bookTitle ??
        null,
    },
  });
}


/**
 * =========================================================
 * PDF REPLACED
 * =========================================================
 */

export async function historyBookPdfReplaced(
  bookId: string,
  bookTitle?: string
) {
  return createHistory({
    action:
      "book_pdf_replaced",

    description:
      bookTitle
        ? `Mengganti file PDF buku "${bookTitle}".`
        : "Mengganti file PDF buku.",

    entityType:
      "book",

    entityId:
      bookId,

    metadata: {
      book_title:
        bookTitle ??
        null,
    },
  });
}


/**
 * =========================================================
 * PDF DELETED
 * =========================================================
 */

export async function historyBookPdfDeleted(
  bookId: string,
  bookTitle?: string
) {
  return createHistory({
    action:
      "book_pdf_deleted",

    description:
      bookTitle
        ? `Menghapus file PDF buku "${bookTitle}".`
        : "Menghapus file PDF buku.",

    entityType:
      "book",

    entityId:
      bookId,

    metadata: {
      book_title:
        bookTitle ??
        null,
    },
  });
}


/**
 * =========================================================
 * DOWNLOAD PERMISSION
 * =========================================================
 */

export async function historyDownloadPermissionChanged(
  bookId: string,
  allowed: boolean,
  bookTitle?: string
) {
  return createHistory({
    action: allowed
      ? "book_download_permission_enabled"
      : "book_download_permission_disabled",

    description:
      allowed
        ? `Mengizinkan download buku "${bookTitle ?? ""}".`
        : `Menonaktifkan download buku "${bookTitle ?? ""}".`,

    entityType:
      "book",

    entityId:
      bookId,

    metadata: {
      book_title:
        bookTitle ??
        null,

      allow_download:
        allowed,
    },
  });
}


/**
 * =========================================================
 * PROFILE UPDATED
 * =========================================================
 */

export async function historyProfileUpdated(
  changedFields:
    | string[]
    | null
) {
  return createHistory({
    action:
      "profile_updated",

    description:
      "Memperbarui profil akun.",

    entityType:
      "user",

    metadata: {
      changed_fields:
        changedFields ??
        [],
    },
  });
}


/**
 * =========================================================
 * PASSWORD CHANGED
 * =========================================================
 */

export async function historyPasswordChanged() {
  return createHistory({
    action:
      "password_changed",

    description:
      "Mengganti password akun.",

    entityType:
      "user",
  });
}


/**
 * =========================================================
 * USERNAME CHANGED
 * =========================================================
 */

export async function historyUsernameChanged(
  oldUsername?: string,
  newUsername?: string
) {
  return createHistory({
    action:
      "username_changed",

    description:
      "Mengganti username akun.",

    entityType:
      "user",

    metadata: {
      old_username:
        oldUsername ??
        null,

      new_username:
        newUsername ??
        null,
    },
  });
}


/**
 * =========================================================
 * AVATAR UPDATED
 * =========================================================
 */

export async function historyAvatarUpdated() {
  return createHistory({
    action:
      "avatar_updated",

    description:
      "Mengubah foto profil.",

    entityType:
      "user",
  });
}


/**
 * =========================================================
 * REPORT CREATED
 * =========================================================
 */

export async function historyReportCreated(
  reportId: string,
  reportTitle?: string
) {
  return createHistory({
    action:
      "report_created",

    description:
      reportTitle
        ? `Mengirim laporan "${reportTitle}".`
        : "Mengirim laporan.",

    entityType:
      "report",

    entityId:
      reportId,

    metadata: {
      report_title:
        reportTitle ??
        null,
    },
  });
}


/**
 * =========================================================
 * REPORT VIEWED
 * =========================================================
 */

export async function historyReportViewed(
  reportId: string
) {
  return createHistory({
    action:
      "report_viewed",

    description:
      "Melihat laporan.",

    entityType:
      "report",

    entityId:
      reportId,
  });
}


/**
 * =========================================================
 * ANNOUNCEMENT
 * =========================================================
 */

export async function historyAnnouncementCreated(
  announcementId: string,
  title: string
) {
  return createHistory({
    action:
      "announcement_created",

    description:
      `Membuat pengumuman "${title}".`,

    entityType:
      "announcement",

    entityId:
      announcementId,

    metadata: {
      title,
    },
  });
}


export async function historyAnnouncementUpdated(
  announcementId: string,
  title?: string
) {
  return createHistory({
    action:
      "announcement_updated",

    description:
      title
        ? `Mengedit pengumuman "${title}".`
        : "Mengedit pengumuman.",

    entityType:
      "announcement",

    entityId:
      announcementId,

    metadata: {
      title:
        title ??
        null,
    },
  });
}


export async function historyAnnouncementDeleted(
  announcementId: string,
  title?: string
) {
  return createHistory({
    action:
      "announcement_deleted",

    description:
      title
        ? `Menghapus pengumuman "${title}".`
        : "Menghapus pengumuman.",

    entityType:
      "announcement",

    entityId:
      announcementId,

    metadata: {
      title:
        title ??
        null,
    },
  });
}


/**
 * =========================================================
 * ADMIN ACCOUNT
 * =========================================================
 */

export async function historyAdminCreated(
  adminId: string,
  username?: string
) {
  return createHistory({
    action:
      "admin_created",

    description:
      username
        ? `Membuat akun admin "${username}".`
        : "Membuat akun admin.",

    entityType:
      "admin",

    entityId:
      adminId,

    metadata: {
      username:
        username ??
        null,
    },
  });
}


export async function historyAdminUpdated(
  adminId: string,
  username?: string
) {
  return createHistory({
    action:
      "admin_updated",

    description:
      username
        ? `Mengubah akun admin "${username}".`
        : "Mengubah akun admin.",

    entityType:
      "admin",

    entityId:
      adminId,

    metadata: {
      username:
        username ??
        null,
    },
  });
}


export async function historyAdminDeleted(
  adminId: string,
  username?: string
) {
  return createHistory({
    action:
      "admin_deleted",

    description:
      username
        ? `Menghapus akun admin "${username}".`
        : "Menghapus akun admin.",

    entityType:
      "admin",

    entityId:
      adminId,

    metadata: {
      username:
        username ??
        null,
    },
  });
}


/**
 * =========================================================
 * SETTINGS
 * =========================================================
 */

export async function historySettingsUpdated(
  description: string,
  metadata?:
    | Record<string, unknown>
    | null
) {
  return createHistory({
    action:
      "settings_updated",

    description,

    entityType:
      "settings",

    metadata,
  });
}


/**
 * =========================================================
 * GET OWN HISTORY
 * =========================================================
 *
 * User hanya dapat mengambil history miliknya.
 */
export async function getOwnHistory(
  options?: {
    page?: number;

    limit?: number;

    action?:
      | HistoryAction
      | null;
  }
) {
  const profile =
    await getAuthProfile();


  if (!profile) {
    return {
      success: false,

      data: [],

      total: 0,

      error:
        "Belum login.",
    };
  }


  const page =
    Math.max(
      1,
      options?.page ??
        1
    );


  const limit =
    Math.min(
      100,
      Math.max(
        1,
        options?.limit ??
          20
      )
    );


  const from =
    (page - 1) *
    limit;

  const to =
    from +
    limit -
    1;


  let query =
    supabaseAdmin
      .from("history")
      .select(
        "*",
        {
          count:
            "exact",
        }
      )
      .eq(
        "user_id",
        profile.id
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      )
      .range(
        from,
        to
      );


  if (
    options?.action
  ) {
    query =
      query.eq(
        "action",
        options.action
      );
  }


  const {
    data,
    count,
    error,
  } =
    await query;


  if (error) {
    return {
      success: false,

      data: [],

      total: 0,

      error:
        error.message,
    };
  }


  return {
    success: true,

    data:
      data ?? [],

    total:
      count ?? 0,

    page,

    limit,
  };
}


/**
 * =========================================================
 * GET USER HISTORY
 * =========================================================
 *
 * Digunakan admin/developer.
 *
 * Permission dicek terlebih dahulu.
 */
export async function getUserHistory(
  targetUserId: string,
  options?: {
    page?: number;

    limit?: number;

    action?:
      | HistoryAction
      | null;
  }
) {
  const access =
    await checkHistoryAccess(
      targetUserId
    );


  if (
    !access.allowed
  ) {
    return {
      success: false,

      data: [],

      total: 0,

      error:
        access.reason ??
        "Tidak memiliki akses.",
    };
  }


  const page =
    Math.max(
      1,
      options?.page ??
        1
    );


  const limit =
    Math.min(
      100,
      Math.max(
        1,
        options?.limit ??
          20
      )
    );


  const from =
    (page - 1) *
    limit;

  const to =
    from +
    limit -
    1;


  let query =
    supabaseAdmin
      .from("history")
      .select(
        "*",
        {
          count:
            "exact",
        }
      )
      .eq(
        "user_id",
        targetUserId
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      )
      .range(
        from,
        to
      );


  if (
    options?.action
  ) {
    query =
      query.eq(
        "action",
        options.action
      );
  }


  const {
    data,
    count,
    error,
  } =
    await query;


  if (error) {
    return {
      success: false,

      data: [],

      total: 0,

      error:
        error.message,
    };
  }


  return {
    success: true,

    data:
      data ?? [],

    total:
      count ?? 0,

    page,

    limit,
  };
}


/**
 * =========================================================
 * GET ALL USER HISTORY
 * =========================================================
 *
 * Admin:
 * - user biasa saja
 *
 * Developer:
 * - user + admin
 *
 * Tidak mengambil history developer.
 */
export async function getAllUserHistory(
  options?: {
    page?: number;

    limit?: number;

    role?:
      | HistoryActorRole
      | null;

    action?:
      | HistoryAction
      | null;
  }
) {
  const profile =
    await getAuthProfile();


  if (!profile) {
    return {
      success: false,

      data: [],

      total: 0,

      error:
        "Belum login.",
    };
  }


  const role =
    profile.role as HistoryActorRole;


  if (
    role !== "admin" &&
    role !== "developer"
  ) {
    return {
      success: false,

      data: [],

      total: 0,

      error:
        "Tidak memiliki akses.",
    };
  }


  const page =
    Math.max(
      1,
      options?.page ??
        1
    );


  const limit =
    Math.min(
      100,
      Math.max(
        1,
        options?.limit ??
          50
      )
    );


  const from =
    (page - 1) *
    limit;

  const to =
    from +
    limit -
    1;


  /**
   * Admin:
   *
   * hanya melihat history user.
   *
   * Developer:
   *
   * melihat user + admin.
   *
   * Developer sendiri tidak ditampilkan.
   */
  const allowedRoles =
    role === "developer"
      ? [
          "user",
          "admin",
        ]
      : [
          "user",
        ];


  let query =
    supabaseAdmin
      .from("history")
      .select(
        "*",
        {
          count:
            "exact",
        }
      )
      .in(
        "actor_role",
        allowedRoles
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      )
      .range(
        from,
        to
      );


  /**
   * Filter role tambahan.
   */
  if (
    options?.role &&
    allowedRoles.includes(
      options.role
    )
  ) {
    query =
      query.eq(
        "actor_role",
        options.role
      );
  }


  /**
   * Filter action.
   */
  if (
    options?.action
  ) {
    query =
      query.eq(
        "action",
        options.action
      );
  }


  const {
    data,
    count,
    error,
  } =
    await query;


  if (error) {
    return {
      success: false,

      data: [],

      total: 0,

      error:
        error.message,
    };
  }


  return {
    success: true,

    data:
      data ?? [],

    total:
      count ?? 0,

    page,

    limit,
  };
}


/**
 * =========================================================
 * GET DEVELOPER FULL HISTORY
 * =========================================================
 *
 * Hanya developer.
 *
 * Bisa melihat:
 *
 * - user
 * - admin
 *
 * Namun tetap TIDAK menampilkan password/token.
 * Metadata sudah disanitasi ketika disimpan.
 */
export async function getDeveloperHistory(
  options?: {
    page?: number;

    limit?: number;

    role?:
      | HistoryActorRole
      | null;

    action?:
      | HistoryAction
      | null;

    entityType?:
      | HistoryEntityType
      | null;
  }
) {
  const profile =
    await getAuthProfile();


  if (!profile) {
    return {
      success: false,

      data: [],

      total: 0,

      error:
        "Belum login.",
    };
  }


  if (
    profile.role !==
    "developer"
  ) {
    return {
      success: false,

      data: [],

      total: 0,

      error:
        "Hanya developer yang dapat mengakses history penuh.",
    };
  }


  const page =
    Math.max(
      1,
      options?.page ??
        1
    );


  const limit =
    Math.min(
      100,
      Math.max(
        1,
        options?.limit ??
          50
      )
    );


  const from =
    (page - 1) *
    limit;

  const to =
    from +
    limit -
    1;


  let query =
    supabaseAdmin
      .from("history")
      .select(
        "*",
        {
          count:
            "exact",
        }
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      )
      .range(
        from,
        to
      );


  /**
   * Developer tetap tidak perlu melihat aktivitas
   * developer lain.
   */
  query =
    query.neq(
      "actor_role",
      "developer"
    );


  if (
    options?.role
  ) {
    query =
      query.eq(
        "actor_role",
        options.role
      );
  }


  if (
    options?.action
  ) {
    query =
      query.eq(
        "action",
        options.action
      );
  }


  if (
    options?.entityType
  ) {
    query =
      query.eq(
        "entity_type",
        options.entityType
      );
  }


  const {
    data,
    count,
    error,
  } =
    await query;


  if (error) {
    return {
      success: false,

      data: [],

      total: 0,

      error:
        error.message,
    };
  }


  return {
    success: true,

    data:
      data ?? [],

    total:
      count ?? 0,

    page,

    limit,
  };
}


/**
 * =========================================================
 * DELETE HISTORY
 * =========================================================
 *
 * Tidak digunakan oleh user/admin biasa.
 *
 * Untuk menjaga audit trail, sebaiknya history
 * TIDAK dihapus sembarangan.
 *
 * Hanya developer yang dapat menghapus history
 * apabila memang dibutuhkan.
 */
export async function deleteHistory(
  historyId: string
) {
  const profile =
    await getAuthProfile();


  if (!profile) {
    return {
      success: false,

      error:
        "Belum login.",
    };
  }


  if (
    profile.role !==
    "developer"
  ) {
    return {
      success: false,

      error:
        "Hanya developer yang dapat menghapus history.",
    };
  }


  const {
    error,
  } =
    await supabaseAdmin
      .from("history")
      .delete()
      .eq(
        "id",
        historyId
      );


  if (error) {
    return {
      success: false,

      error:
        error.message,
    };
  }


  return {
    success: true,
  };
}
