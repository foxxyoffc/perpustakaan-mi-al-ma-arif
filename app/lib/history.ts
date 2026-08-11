/**
 * =========================================================
 * HISTORY SERVICE
 * =========================================================
 *
 * File:
 * app/lib/history.ts
 *
 * Fungsi:
 * - Mencatat aktivitas user
 * - Mencatat aktivitas admin
 * - Mencatat aktivitas developer
 * - User hanya dapat melihat history miliknya
 * - Admin dapat melihat history user
 * - Developer dapat melihat history user + admin + developer
 * - History dapat difilter
 *
 * =========================================================
 */

import {
  requireAdmin,
  requireAuth,
} from "@/app/lib/auth";

import {
  supabaseAdmin,
} from "@/app/lib/supabase/admin";

import {
  canViewAllHistory,
  canViewAdminHistory,
  canViewDeveloperHistory,
} from "@/app/lib/permissions";


/**
 * =========================================================
 * TYPES
 * =========================================================
 */

export type HistoryRole =
  | "user"
  | "admin"
  | "developer";


export type HistoryAction =
  | "login"
  | "logout"
  | "login_failed"
  | "register"
  | "profile_update"
  | "password_change"
  | "password_reset"
  | "book_view"
  | "book_download"
  | "book_upload"
  | "book_replace"
  | "book_delete"
  | "book_update"
  | "book_create"
  | "book_activate"
  | "book_deactivate"
  | "report_create"
  | "report_update"
  | "report_delete"
  | "user_create"
  | "user_update"
  | "user_delete"
  | "user_activate"
  | "user_deactivate"
  | "admin_create"
  | "admin_update"
  | "admin_delete"
  | "setting_update"
  | "announcement_create"
  | "announcement_update"
  | "announcement_delete"
  | "system"
  | "other";


export interface History {
  id: string;

  user_id:
    | string
    | null;

  role:
    | HistoryRole
    | null;

  action:
    | HistoryAction;

  description: string;

  target_type:
    | string
    | null;

  target_id:
    | string
    | null;

  metadata:
    | Record<string, unknown>
    | null;

  ip_address:
    | string
    | null;

  user_agent:
    | string
    | null;

  created_at: string;
}


/**
 * =========================================================
 * CONSTANTS
 * =========================================================
 */

const HISTORY_SELECT = `
  id,
  user_id,
  role,
  action,
  description,
  target_type,
  target_id,
  metadata,
  ip_address,
  user_agent,
  created_at
`;


/**
 * =========================================================
 * HELPERS
 * =========================================================
 */

function cleanString(
  value: unknown
) {
  if (
    typeof value !==
    "string"
  ) {
    return "";
  }

  return value.trim();
}


function isHistoryRole(
  value: unknown
): value is HistoryRole {
  return [
    "user",
    "admin",
    "developer",
  ].includes(
    value as string
  );
}


function isHistoryAction(
  value: unknown
): value is HistoryAction {
  return [
    "login",
    "logout",
    "login_failed",
    "register",
    "profile_update",
    "password_change",
    "password_reset",
    "book_view",
    "book_download",
    "book_upload",
    "book_replace",
    "book_delete",
    "book_update",
    "book_create",
    "book_activate",
    "book_deactivate",
    "report_create",
    "report_update",
    "report_delete",
    "user_create",
    "user_update",
    "user_delete",
    "user_activate",
    "user_deactivate",
    "admin_create",
    "admin_update",
    "admin_delete",
    "setting_update",
    "announcement_create",
    "announcement_update",
    "announcement_delete",
    "system",
    "other",
  ].includes(
    value as string
  );
}


/**
 * =========================================================
 * CREATE HISTORY
 * =========================================================
 *
 * Digunakan oleh server-side actions / API.
 *
 * Jangan menerima password atau token sebagai metadata.
 *
 * =========================================================
 */

export async function createHistory(
  input: {
    userId?:
      | string
      | null;

    role?:
      | HistoryRole
      | null;

    action:
      | HistoryAction;

    description: string;

    targetType?:
      | string
      | null;

    targetId?:
      | string
      | null;

    metadata?:
      | Record<string, unknown>;

    ipAddress?:
      | string
      | null;

    userAgent?:
      | string
      | null;
  }
) {
  if (
    !isHistoryAction(
      input.action
    )
  ) {
    return {
      success: false,

      data: null,

      error:
        "Jenis aktivitas tidak valid.",
    };
  }


  const description =
    cleanString(
      input.description
    );


  if (
    !description
  ) {
    return {
      success: false,

      data: null,

      error:
        "Deskripsi aktivitas wajib diisi.",
    };
  }


  if (
    description.length >
    1000
  ) {
    return {
      success: false,

      data: null,

      error:
        "Deskripsi aktivitas terlalu panjang.",
    };
  }


  if (
    input.role !==
      undefined &&
    input.role !==
      null &&
    !isHistoryRole(
      input.role
    )
  ) {
    return {
      success: false,

      data: null,

      error:
        "Role tidak valid.",
    };
  }


  /**
   * Metadata dibersihkan dari
   * field sensitif.
   */

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
          input.userId ??
          null,

        role:
          input.role ??
          null,

        action:
          input.action,

        description,

        target_type:
          cleanString(
            input.targetType
          ) ||
          null,

        target_id:
          cleanString(
            input.targetId
          ) ||
          null,

        metadata,

        ip_address:
          cleanString(
            input.ipAddress
          ) ||
          null,

        user_agent:
          cleanString(
            input.userAgent
          ) ||
          null,
      })
      .select(
        HISTORY_SELECT
      )
      .single();


  if (error) {
    console.error(
      "createHistory error:",
      error
    );

    return {
      success: false,

      data: null,

      error:
        error.message,
    };
  }


  return {
    success: true,

    data:
      data as History,
  };
}


/**
 * =========================================================
 * CREATE HISTORY FOR CURRENT USER
 * =========================================================
 */

export async function createMyHistory(
  input: {
    action:
      | HistoryAction;

    description: string;

    targetType?:
      | string
      | null;

    targetId?:
      | string
      | null;

    metadata?:
      | Record<string, unknown>;

    ipAddress?:
      | string
      | null;

    userAgent?:
      | string
      | null;
  }
) {
  const context =
    await requireAuth();


  return createHistory({
    ...input,

    userId:
      context.userId,

    role:
      context.role,
  });
}


/**
 * =========================================================
 * SANITIZE METADATA
 * =========================================================
 *
 * Jangan pernah menyimpan:
 * - password
 * - access_token
 * - refresh_token
 * - service_role_key
 * - secret
 *
 * =========================================================
 */

function sanitizeMetadata(
  metadata?:
    | Record<string, unknown>
) {
  if (
    !metadata
  ) {
    return null;
  }


  const forbiddenKeys =
    new Set([
      "password",
      "confirm_password",
      "access_token",
      "refresh_token",
      "service_role_key",
      "supabase_service_role_key",
      "token",
      "secret",
      "api_key",
      "apikey",
    ]);


  const result: Record<
    string,
    unknown
  > = {};


  for (
    const [
      key,
      value,
    ] of Object.entries(
      metadata
    )
  ) {
    if (
      forbiddenKeys.has(
        key.toLowerCase()
      )
    ) {
      continue;
    }


    result[key] =
      value;
  }


  return result;
}


/**
 * =========================================================
 * GET MY HISTORY
 * =========================================================
 */

export async function getMyHistory(
  options?: {
    action?:
      | HistoryAction;

    search?: string;

    limit?: number;

    offset?: number;

    from?:
      | string;

    to?:
      | string;
  }
) {
  const context =
    await requireAuth();


  const limit =
    Math.min(
      Math.max(
        options?.limit ??
          50,
        1
      ),
      100
    );


  const offset =
    Math.max(
      options?.offset ??
        0,
      0
    );


  let query =
    supabaseAdmin
      .from("history")
      .select(
        HISTORY_SELECT
      )
      .eq(
        "user_id",
        context.userId
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      );


  if (
    options?.action
  ) {
    if (
      !isHistoryAction(
        options.action
      )
    ) {
      return {
        success: false,

        data: [],

        error:
          "Jenis aktivitas tidak valid.",
      };
    }


    query =
      query.eq(
        "action",
        options.action
      );
  }


  if (
    options?.search
  ) {
    const search =
      cleanString(
        options.search
      );


    if (
      search
    ) {
      query =
        query.ilike(
          "description",
          `%${search}%`
        );
    }
  }


  if (
    options?.from
  ) {
    query =
      query.gte(
        "created_at",
        options.from
      );
  }


  if (
    options?.to
  ) {
    query =
      query.lte(
        "created_at",
        options.to
      );
  }


  query =
    query.range(
      offset,
      offset +
        limit -
        1
    );


  const {
    data,
    error,
  } =
    await query;


  if (error) {
    return {
      success: false,

      data: [],

      error:
        error.message,
    };
  }


  return {
    success: true,

    data:
      (data ??
        []) as History[],
  };
}


/**
 * =========================================================
 * GET ALL USER HISTORY
 * =========================================================
 *
 * Admin:
 *   dapat melihat history user.
 *
 * Developer:
 *   dapat melihat history user.
 *
 * =========================================================
 */

export async function getAllUserHistory(
  options?: {
    userId?:
      | string;

    action?:
      | HistoryAction;

    search?: string;

    limit?: number;

    offset?: number;

    from?:
      | string;

    to?:
      | string;
  }
) {
  const context =
    await requireAdmin();


  if (
    !canViewAllHistory(
      context.role
    )
  ) {
    return {
      success: false,

      data: [],

      error:
        "Anda tidak memiliki akses ke history user.",
    };
  }


  const limit =
    Math.min(
      Math.max(
        options?.limit ??
          100,
        1
      ),
      200
    );


  const offset =
    Math.max(
      options?.offset ??
        0,
      0
    );


  let query =
    supabaseAdmin
      .from("history")
      .select(
        HISTORY_SELECT
      )
      .eq(
        "role",
        "user"
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      );


  if (
    options?.userId
  ) {
    query =
      query.eq(
        "user_id",
        options.userId
      );
  }


  if (
    options?.action
  ) {
    if (
      !isHistoryAction(
        options.action
      )
    ) {
      return {
        success: false,

        data: [],

        error:
          "Jenis aktivitas tidak valid.",
      };
    }


    query =
      query.eq(
        "action",
        options.action
      );
  }


  const search =
    cleanString(
      options?.search
    );


  if (
    search
  ) {
    query =
      query.ilike(
        "description",
        `%${search}%`
      );
  }


  if (
    options?.from
  ) {
    query =
      query.gte(
        "created_at",
        options.from
      );
  }


  if (
    options?.to
  ) {
    query =
      query.lte(
        "created_at",
        options.to
      );
  }


  query =
    query.range(
      offset,
      offset +
        limit -
        1
    );


  const {
    data,
    error,
  } =
    await query;


  if (error) {
    return {
      success: false,

      data: [],

      error:
        error.message,
    };
  }


  return {
    success: true,

    data:
      (data ??
        []) as History[],
  };
}


/**
 * =========================================================
 * GET ADMIN HISTORY
 * =========================================================
 *
 * HANYA DEVELOPER.
 *
 * =========================================================
 */

export async function getAdminHistory(
  options?: {
    userId?:
      | string;

    action?:
      | HistoryAction;

    search?: string;

    limit?: number;

    offset?: number;

    from?:
      | string;

    to?:
      | string;
  }
) {
  const context =
    await requireAdmin();


  if (
    !canViewAdminHistory(
      context.role
    )
  ) {
    return {
      success: false,

      data: [],

      error:
        "Hanya developer yang dapat melihat history admin.",
    };
  }


  const limit =
    Math.min(
      Math.max(
        options?.limit ??
          100,
        1
      ),
      200
    );


  const offset =
    Math.max(
      options?.offset ??
        0,
      0
    );


  let query =
    supabaseAdmin
      .from("history")
      .select(
        HISTORY_SELECT
      )
      .eq(
        "role",
        "admin"
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      );


  if (
    options?.userId
  ) {
    query =
      query.eq(
        "user_id",
        options.userId
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


  const search =
    cleanString(
      options?.search
    );


  if (
    search
  ) {
    query =
      query.ilike(
        "description",
        `%${search}%`
      );
  }


  if (
    options?.from
  ) {
    query =
      query.gte(
        "created_at",
        options.from
      );
  }


  if (
    options?.to
  ) {
    query =
      query.lte(
        "created_at",
        options.to
      );
  }


  query =
    query.range(
      offset,
      offset +
        limit -
        1
    );


  const {
    data,
    error,
  } =
    await query;


  if (error) {
    return {
      success: false,

      data: [],

      error:
        error.message,
    };
  }


  return {
    success: true,

    data:
      (data ??
        []) as History[],
  };
}


/**
 * =========================================================
 * GET DEVELOPER HISTORY
 * =========================================================
 *
 * HANYA DEVELOPER.
 *
 * =========================================================
 */

export async function getDeveloperHistory(
  options?: {
    userId?:
      | string;

    action?:
      | HistoryAction;

    search?: string;

    limit?: number;

    offset?: number;

    from?:
      | string;

    to?:
      | string;
  }
) {
  const context =
    await requireAdmin();


  if (
    !canViewDeveloperHistory(
      context.role
    )
  ) {
    return {
      success: false,

      data: [],

      error:
        "Anda tidak memiliki akses ke history developer.",
    };
  }


  const limit =
    Math.min(
      Math.max(
        options?.limit ??
          100,
        1
      ),
      200
    );


  const offset =
    Math.max(
      options?.offset ??
        0,
      0
    );


  let query =
    supabaseAdmin
      .from("history")
      .select(
        HISTORY_SELECT
      )
      .eq(
        "role",
        "developer"
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      );


  if (
    options?.userId
  ) {
    query =
      query.eq(
        "user_id",
        options.userId
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


  const search =
    cleanString(
      options?.search
    );


  if (
    search
  ) {
    query =
      query.ilike(
        "description",
        `%${search}%`
      );
  }


  if (
    options?.from
  ) {
    query =
      query.gte(
        "created_at",
        options.from
      );
  }


  if (
    options?.to
  ) {
    query =
      query.lte(
        "created_at",
        options.to
      );
  }


  query =
    query.range(
      offset,
      offset +
        limit -
        1
    );


  const {
    data,
    error,
  } =
    await query;


  if (error) {
    return {
      success: false,

      data: [],

      error:
        error.message,
    };
  }


  return {
    success: true,

    data:
      (data ??
        []) as History[],
  };
}


/**
 * =========================================================
 * GET ALL HISTORY
 * =========================================================
 *
 * Developer:
 *   user + admin + developer
 *
 * Admin:
 *   user + admin
 *
 * User:
 *   ditolak.
 *
 * =========================================================
 */

export async function getAllHistory(
  options?: {
    role?:
      | HistoryRole;

    userId?:
      | string;

    action?:
      | HistoryAction;

    search?: string;

    limit?: number;

    offset?: number;

    from?:
      | string;

    to?:
      | string;
  }
) {
  const context =
    await requireAdmin();


  if (
    !canViewAllHistory(
      context.role
    )
  ) {
    return {
      success: false,

      data: [],

      error:
        "Anda tidak memiliki akses.",
    };
  }


  const limit =
    Math.min(
      Math.max(
        options?.limit ??
          100,
        1
      ),
      200
    );


  const offset =
    Math.max(
      options?.offset ??
        0,
      0
    );


  let query =
    supabaseAdmin
      .from("history")
      .select(
        HISTORY_SELECT
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      );


  /**
   * ADMIN:
   * hanya user + admin.
   *
   * DEVELOPER:
   * semua.
   */

  if (
    context.role ===
    "admin"
  ) {
    query =
      query.in(
        "role",
        [
          "user",
          "admin",
        ]
      );
  }


  if (
    options?.role
  ) {
    if (
      !isHistoryRole(
        options.role
      )
    ) {
      return {
        success: false,

        data: [],

        error:
          "Role history tidak valid.",
      };
    }


    if (
      context.role ===
        "admin" &&
      options.role ===
        "developer"
    ) {
      return {
        success: false,

        data: [],

        error:
          "Admin tidak dapat melihat history developer.",
      };
    }


    query =
      query.eq(
        "role",
        options.role
      );
  }


  if (
    options?.userId
  ) {
    query =
      query.eq(
        "user_id",
        options.userId
      );
  }


  if (
    options?.action
  ) {
    if (
      !isHistoryAction(
        options.action
      )
    ) {
      return {
        success: false,

        data: [],

        error:
          "Jenis aktivitas tidak valid.",
      };
    }


    query =
      query.eq(
        "action",
        options.action
      );
  }


  const search =
    cleanString(
      options?.search
    );


  if (
    search
  ) {
    query =
      query.ilike(
        "description",
        `%${search}%`
      );
  }


  if (
    options?.from
  ) {
    query =
      query.gte(
        "created_at",
        options.from
      );
  }


  if (
    options?.to
  ) {
    query =
      query.lte(
        "created_at",
        options.to
      );
  }


  query =
    query.range(
      offset,
      offset +
        limit -
        1
    );


  const {
    data,
    error,
  } =
    await query;


  if (error) {
    return {
      success: false,

      data: [],

      error:
        error.message,
    };
  }


  return {
    success: true,

    data:
      (data ??
        []) as History[],
  };
}


/**
 * =========================================================
 * GET HISTORY BY ID
 * =========================================================
 */

export async function getHistoryById(
  historyId: string
) {
  const context =
    await requireAuth();


  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from("history")
      .select(
        HISTORY_SELECT
      )
      .eq(
        "id",
        historyId
      )
      .maybeSingle();


  if (error) {
    return {
      success: false,

      data: null,

      error:
        error.message,
    };
  }


  if (!data) {
    return {
      success: false,

      data: null,

      error:
        "History tidak ditemukan.",
    };
  }


  const history =
    data as History;


  /**
   * User:
   * hanya history miliknya.
   */

  if (
    context.role ===
    "user"
  ) {
    if (
      history.user_id !==
      context.userId
    ) {
      return {
        success: false,

        data: null,

        error:
          "Anda tidak memiliki akses.",
      };
    }
  }


  /**
   * Admin:
   * tidak dapat melihat developer.
   */

  if (
    context.role ===
      "admin" &&
    history.role ===
      "developer"
  ) {
    return {
      success: false,

      data: null,

      error:
        "Admin tidak dapat melihat history developer.",
    };
  }


  return {
    success: true,

    data:
      history,
  };
}


/**
 * =========================================================
 * DELETE OLD HISTORY
 * =========================================================
 *
 * Hanya developer.
 *
 * Digunakan untuk maintenance database
 * agar tabel history tidak terus membesar.
 *
 * =========================================================
 */

export async function deleteHistoryOlderThan(
  date: string
) {
  const context =
    await requireAdmin();


  if (
    context.role !==
    "developer"
  ) {
    return {
      success: false,

      deleted:
        0,

      error:
        "Hanya developer yang dapat melakukan maintenance history.",
    };
  }


  if (
    !date
  ) {
    return {
      success: false,

      deleted:
        0,

      error:
        "Tanggal wajib diisi.",
    };
  }


  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from("history")
      .delete()
      .lt(
        "created_at",
        date
      )
      .select("id");


  if (error) {
    return {
      success: false,

      deleted:
        0,

      error:
        error.message,
    };
  }


  return {
    success: true,

    deleted:
      data?.length ??
      0,
  };
}


/**
 * =========================================================
 * HISTORY SHORTCUTS
 * =========================================================
 */

export async function logLogin(
  metadata?: Record<string, unknown>
) {
  return createMyHistory({
    action:
      "login",

    description:
      "User berhasil login.",

    metadata,
  });
}


export async function logLogout(
  metadata?: Record<string, unknown>
) {
  return createMyHistory({
    action:
      "logout",

    description:
      "User logout.",

    metadata,
  });
}


export async function logLoginFailed(
  description =
    "Percobaan login gagal.",
  metadata?:
    Record<string, unknown>
) {
  return createHistory({
    action:
      "login_failed",

    description,

    metadata,
  });
}


export async function logBookView(
  bookId: string,
  bookTitle?: string
) {
  return createMyHistory({
    action:
      "book_view",

    description:
      bookTitle
        ? `Membuka buku "${bookTitle}".`
        : "Membuka buku.",

    targetType:
      "book",

    targetId:
      bookId,
  });
}


export async function logBookDownload(
  bookId: string,
  bookTitle?: string
) {
  return createMyHistory({
    action:
      "book_download",

    description:
      bookTitle
        ? `Mendownload buku "${bookTitle}".`
        : "Mendownload buku.",

    targetType:
      "book",

    targetId:
      bookId,
  });
}


/**
 * =========================================================
 * BOOK ADMIN SHORTCUTS
 * =========================================================
 */

export async function logBookCreate(
  bookId: string,
  title: string
) {
  return createMyHistory({
    action:
      "book_create",

    description:
      `Membuat buku "${title}".`,

    targetType:
      "book",

    targetId:
      bookId,
  });
}


export async function logBookUpdate(
  bookId: string,
  title: string
) {
  return createMyHistory({
    action:
      "book_update",

    description:
      `Mengubah buku "${title}".`,

    targetType:
      "book",

    targetId:
      bookId,
  });
}


export async function logBookUpload(
  bookId: string,
  title: string
) {
  return createMyHistory({
    action:
      "book_upload",

    description:
      `Mengupload PDF buku "${title}".`,

    targetType:
      "book",

    targetId:
      bookId,
  });
}


export async function logBookReplace(
  bookId: string,
  title: string
) {
  return createMyHistory({
    action:
      "book_replace",

    description:
      `Mengganti PDF buku "${title}".`,

    targetType:
      "book",

    targetId:
      bookId,
  });
}


export async function logBookDelete(
  bookId: string,
  title: string
) {
  return createMyHistory({
    action:
      "book_delete",

    description:
      `Menghapus buku "${title}".`,

    targetType:
      "book",

    targetId:
      bookId,
  });
}


/**
 * =========================================================
 * REPORT SHORTCUTS
 * =========================================================
 */

export async function logReportCreate(
  reportId: string,
  subject: string
) {
  return createMyHistory({
    action:
      "report_create",

    description:
      `Membuat laporan "${subject}".`,

    targetType:
      "report",

    targetId:
      reportId,
  });
}


export async function logReportUpdate(
  reportId: string,
  status: string
) {
  return createMyHistory({
    action:
      "report_update",

    description:
      `Mengubah status laporan menjadi "${status}".`,

    targetType:
      "report",

    targetId:
      reportId,
  });
}


export async function logReportDelete(
  reportId: string
) {
  return createMyHistory({
    action:
      "report_delete",

    description:
      "Menghapus laporan.",

    targetType:
      "report",

    targetId:
      reportId,
  });
}


/**
 * =========================================================
 * SYSTEM HISTORY
 * =========================================================
 */

export async function logSystemEvent(
  description: string,
  metadata?:
    Record<string, unknown>
) {
  return createHistory({
    action:
      "system",

    description,

    metadata,
  });
}
