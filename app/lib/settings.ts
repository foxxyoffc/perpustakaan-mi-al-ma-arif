"use server";

/**
 * =========================================================
 * SETTINGS SERVICE
 * =========================================================
 *
 * File:
 * app/lib/settings.ts
 *
 * Fungsi:
 * - Mengambil setting website
 * - Mengubah setting
 * - Membuat setting
 * - Menghapus setting
 * - Public setting
 * - Admin setting
 * - Developer-only setting
 * - Mengelompokkan setting berdasarkan category
 *
 * =========================================================
 */

import {
  requireAdmin,
} from "@/app/lib/auth";

import {
  supabaseAdmin,
} from "@/app/lib/supabase/admin";

import {
  canManageSettings,
  canManageSensitiveSettings,
} from "@/app/lib/permissions";


/**
 * =========================================================
 * TYPES
 * =========================================================
 */

export type SettingType =
  | "string"
  | "number"
  | "boolean"
  | "json";


export type SettingCategory =
  | "general"
  | "appearance"
  | "books"
  | "registration"
  | "security"
  | "storage"
  | "system"
  | "developer";


export interface Setting {
  id: string;

  key: string;

  value:
    | string
    | number
    | boolean
    | Record<string, unknown>
    | unknown[]
    | null;

  type:
    | SettingType;

  category:
    | SettingCategory;

  description:
    | string
    | null;

  is_public: boolean;

  updated_by:
    | string
    | null;

  updated_by_role:
    | "user"
    | "admin"
    | "developer"
    | null;

  created_at: string;

  updated_at: string;
}


/**
 * =========================================================
 * SELECT
 * =========================================================
 */

const SETTING_SELECT = `
  id,
  key,
  value,
  type,
  category,
  description,
  is_public,
  updated_by,
  updated_by_role,
  created_at,
  updated_at
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


function isSettingType(
  value: unknown
): value is SettingType {
  return [
    "string",
    "number",
    "boolean",
    "json",
  ].includes(
    value as string
  );
}


function isSettingCategory(
  value: unknown
): value is SettingCategory {
  return [
    "general",
    "appearance",
    "books",
    "registration",
    "security",
    "storage",
    "system",
    "developer",
  ].includes(
    value as string
  );
}


function isObject(
  value: unknown
) {
  return (
    typeof value ===
      "object" &&
    value !== null &&
    !Array.isArray(
      value
    )
  );
}


/**
 * =========================================================
 * VALIDATE VALUE
 * =========================================================
 */

function validateSettingValue(
  value: unknown,
  type: SettingType
) {
  switch (
    type
  ) {
    case "string":
      return (
        typeof value ===
        "string"
      );

    case "number":
      return (
        typeof value ===
          "number" &&
        Number.isFinite(
          value
        )
      );

    case "boolean":
      return (
        typeof value ===
        "boolean"
      );

    case "json":
      return (
        isObject(
          value
        ) ||
        Array.isArray(
          value
        ) ||
        typeof value ===
          "string" ||
        typeof value ===
          "number" ||
        typeof value ===
          "boolean" ||
        value === null
      );

    default:
      return false;
  }
}


/**
 * =========================================================
 * SENSITIVE SETTINGS
 * =========================================================
 *
 * Setting berikut tidak boleh diubah oleh admin biasa.
 *
 * Developer saja.
 *
 * =========================================================
 */

const SENSITIVE_SETTING_KEYS =
  new Set([
    "maintenance_mode",

    "maintenance_message",

    "registration_enabled",

    "max_login_attempts",

    "login_lockout_minutes",

    "storage_max_file_size",

    "storage_allowed_types",

    "security_headers",

    "rate_limit_enabled",

    "rate_limit_requests",

    "rate_limit_window",

    "developer_mode",

    "debug_mode",
  ]);


/**
 * =========================================================
 * CHECK SENSITIVE KEY
 * =========================================================
 */

function isSensitiveSetting(
  key: string
) {
  return SENSITIVE_SETTING_KEYS.has(
    key
  );
}


/**
 * =========================================================
 * GET PUBLIC SETTINGS
 * =========================================================
 *
 * Tidak membutuhkan login.
 *
 * Hanya mengambil:
 *
 * is_public = true
 *
 * =========================================================
 */

export async function getPublicSettings() {
  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from(
        "settings"
      )
      .select(
        SETTING_SELECT
      )
      .eq(
        "is_public",
        true
      )
      .order(
        "key",
        {
          ascending:
            true,
        }
      );


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
        []) as Setting[],
  };
}


/**
 * =========================================================
 * GET SETTING BY KEY
 * =========================================================
 */

export async function getSetting(
  key: string
) {
  const cleanKey =
    cleanString(
      key
    );


  if (
    !cleanKey
  ) {
    return {
      success: false,

      data: null,

      error:
        "Key setting tidak valid.",
    };
  }


  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from(
        "settings"
      )
      .select(
        SETTING_SELECT
      )
      .eq(
        "key",
        cleanKey
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


  return {
    success: true,

    data:
      (data ??
        null) as
        | Setting
        | null,
  };
}


/**
 * =========================================================
 * GET PUBLIC SETTING BY KEY
 * =========================================================
 */

export async function getPublicSetting(
  key: string
) {
  const cleanKey =
    cleanString(
      key
    );


  if (
    !cleanKey
  ) {
    return {
      success: false,

      data: null,

      error:
        "Key setting tidak valid.",
    };
  }


  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from(
        "settings"
      )
      .select(
        SETTING_SELECT
      )
      .eq(
        "key",
        cleanKey
      )
      .eq(
        "is_public",
        true
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


  return {
    success: true,

    data:
      (data ??
        null) as
        | Setting
        | null,
  };
}


/**
 * =========================================================
 * GET ALL SETTINGS
 * =========================================================
 *
 * Admin + Developer.
 *
 * =========================================================
 */

export async function getAllSettings(
  options?: {
    category?:
      | SettingCategory;

    includeSensitive?:
      | boolean;
  }
) {
  const context =
    await requireAdmin();


  if (
    !canManageSettings(
      context.role
    )
  ) {
    return {
      success: false,

      data: [],

      error:
        "Anda tidak memiliki akses ke pengaturan.",
    };
  }


  let query =
    supabaseAdmin
      .from(
        "settings"
      )
      .select(
        SETTING_SELECT
      )
      .order(
        "category",
        {
          ascending:
            true,
        }
      )
      .order(
        "key",
        {
          ascending:
            true,
        }
      );


  if (
    options?.category
  ) {
    if (
      !isSettingCategory(
        options.category
      )
    ) {
      return {
        success: false,

        data: [],

        error:
          "Kategori setting tidak valid.",
      };
    }


    query =
      query.eq(
        "category",
        options.category
      );
  }


  /**
   * Admin tidak mendapatkan
   * setting developer/sensitif.
   */

  if (
    context.role ===
    "admin"
  ) {
    query =
      query.neq(
        "category",
        "developer"
      );
  }


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


  let settings =
    (data ??
      []) as Setting[];


  if (
    context.role ===
      "admin" &&
    options?.includeSensitive
  ) {
    settings =
      settings.filter(
        setting =>
          !isSensitiveSetting(
            setting.key
          )
      );
  }


  return {
    success: true,

    data:
      settings,
  };
}


/**
 * =========================================================
 * GET SETTINGS BY CATEGORY
 * =========================================================
 */

export async function getSettingsByCategory(
  category: SettingCategory
) {
  return getAllSettings({
    category,
  });
}


/**
 * =========================================================
 * CREATE SETTING
 * =========================================================
 */

export async function createSetting(
  input: {
    key: string;

    value:
      | string
      | number
      | boolean
      | Record<string, unknown>
      | unknown[]
      | null;

    type:
      | SettingType;

    category:
      | SettingCategory;

    description?:
      | string
      | null;

    isPublic?:
      | boolean;
  }
) {
  const context =
    await requireAdmin();


  if (
    !canManageSettings(
      context.role
    )
  ) {
    return {
      success: false,

      data: null,

      error:
        "Anda tidak memiliki akses.",
    };
  }


  const key =
    cleanString(
      input.key
    );


  if (
    !key
  ) {
    return {
      success: false,

      data: null,

      error:
        "Key setting wajib diisi.",
    };
  }


  /**
   * Key hanya boleh:
   *
   * a-z
   * 0-9
   * _
   * -
   */

  if (
    !/^[a-z0-9_-]+$/.test(
      key
    )
  ) {
    return {
      success: false,

      data: null,

      error:
        "Key hanya boleh menggunakan huruf kecil, angka, underscore, dan tanda minus.",
    };
  }


  if (
    key.length >
    100
  ) {
    return {
      success: false,

      data: null,

      error:
        "Key terlalu panjang.",
    };
  }


  if (
    !isSettingType(
      input.type
    )
  ) {
    return {
      success: false,

      data: null,

      error:
        "Tipe setting tidak valid.",
    };
  }


  if (
    !isSettingCategory(
      input.category
    )
  ) {
    return {
      success: false,

      data: null,

      error:
        "Kategori setting tidak valid.",
    };
  }


  /**
   * Setting developer/sensitif
   * hanya developer.
   */

  if (
    (
      input.category ===
      "developer"
    ) ||
    isSensitiveSetting(
      key
    )
  ) {
    if (
      !canManageSensitiveSettings(
        context.role
      )
    ) {
      return {
        success: false,

        data: null,

        error:
          "Setting sensitif hanya dapat dikelola developer.",
      };
    }
  }


  if (
    !validateSettingValue(
      input.value,
      input.type
    )
  ) {
    return {
      success: false,

      data: null,

      error:
        "Value tidak sesuai dengan tipe setting.",
    };
  }


  const description =
    input.description !==
    undefined
      ? cleanString(
          input.description
        ) ||
        null
      : null;


  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from(
        "settings"
      )
      .insert({
        key,

        value:
          input.value,

        type:
          input.type,

        category:
          input.category,

        description,

        is_public:
          input.isPublic ??
          false,

        updated_by:
          context.userId,

        updated_by_role:
          context.role,
      })
      .select(
        SETTING_SELECT
      )
      .single();


  if (error) {
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
      data as Setting,
  };
}


/**
 * =========================================================
 * UPDATE SETTING
 * =========================================================
 */

export async function updateSetting(
  key: string,
  input: {
    value?:
      | string
      | number
      | boolean
      | Record<string, unknown>
      | unknown[]
      | null;

    type?:
      | SettingType;

    category?:
      | SettingCategory;

    description?:
      | string
      | null;

    isPublic?:
      | boolean;
  }
) {
  const context =
    await requireAdmin();


  if (
    !canManageSettings(
      context.role
    )
  ) {
    return {
      success: false,

      data: null,

      error:
        "Anda tidak memiliki akses.",
    };
  }


  const cleanKey =
    cleanString(
      key
    );


  if (
    !cleanKey
  ) {
    return {
      success: false,

      data: null,

      error:
        "Key setting tidak valid.",
    };
  }


  const sensitive =
    isSensitiveSetting(
      cleanKey
    );


  if (
    sensitive
  ) {
    if (
      !canManageSensitiveSettings(
        context.role
      )
    ) {
      return {
        success: false,

        data: null,

        error:
          "Setting ini hanya dapat diubah developer.",
      };
    }
  }


  /**
   * Ambil setting lama.
   */

  const {
    data:
      existing,
    error:
      fetchError,
  } =
    await supabaseAdmin
      .from(
        "settings"
      )
      .select(
        SETTING_SELECT
      )
      .eq(
        "key",
        cleanKey
      )
      .maybeSingle();


  if (
    fetchError
  ) {
    return {
      success: false,

      data: null,

      error:
        fetchError.message,
    };
  }


  if (
    !existing
  ) {
    return {
      success: false,

      data: null,

      error:
        "Setting tidak ditemukan.",
    };
  }


  const existingSetting =
    existing as Setting;


  if (
    existingSetting.category ===
    "developer"
  ) {
    if (
      !canManageSensitiveSettings(
        context.role
      )
    ) {
      return {
        success: false,

        data: null,

        error:
          "Setting developer hanya dapat diubah developer.",
      };
    }
  }


  const type =
    input.type ??
    existingSetting.type;


  if (
    !isSettingType(
      type
    )
  ) {
    return {
      success: false,

      data: null,

      error:
        "Tipe setting tidak valid.",
    };
  }


  if (
    input.value !==
    undefined
  ) {
    if (
      !validateSettingValue(
        input.value,
        type
      )
    ) {
      return {
        success: false,

        data: null,

        error:
          "Value tidak sesuai dengan tipe setting.",
      };
    }
  }


  const updateData: Record<
    string,
    unknown
  > = {
    updated_by:
      context.userId,

    updated_by_role:
      context.role,

    updated_at:
      new Date().toISOString(),
  };


  if (
    input.value !==
    undefined
  ) {
    updateData.value =
      input.value;
  }


  if (
    input.type !==
    undefined
  ) {
    updateData.type =
      input.type;
  }


  if (
    input.category !==
    undefined
  ) {
    if (
      !isSettingCategory(
        input.category
      )
    ) {
      return {
        success: false,

        data: null,

        error:
          "Kategori setting tidak valid.",
      };
    }


    if (
      input.category ===
      "developer"
    ) {
      if (
        !canManageSensitiveSettings(
          context.role
        )
      ) {
        return {
          success: false,

          data: null,

          error:
            "Hanya developer yang dapat menggunakan kategori developer.",
        };
      }
    }


    updateData.category =
      input.category;
  }


  if (
    input.description !==
    undefined
  ) {
    updateData.description =
      cleanString(
        input.description
      ) ||
      null;
  }


  if (
    input.isPublic !==
    undefined
  ) {
    updateData.is_public =
      input.isPublic;
  }


  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from(
        "settings"
      )
      .update(
        updateData
      )
      .eq(
        "key",
        cleanKey
      )
      .select(
        SETTING_SELECT
      )
      .single();


  if (error) {
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
      data as Setting,
  };
}


/**
 * =========================================================
 * UPSERT SETTING
 * =========================================================
 *
 * Jika key sudah ada:
 *   update
 *
 * Jika belum:
 *   create
 *
 * =========================================================
 */

export async function upsertSetting(
  input: {
    key: string;

    value:
      | string
      | number
      | boolean
      | Record<string, unknown>
      | unknown[]
      | null;

    type:
      | SettingType;

    category:
      | SettingCategory;

    description?:
      | string
      | null;

    isPublic?:
      | boolean;
  }
) {
  const context =
    await requireAdmin();


  if (
    !canManageSettings(
      context.role
    )
  ) {
    return {
      success: false,

      data: null,

      error:
        "Anda tidak memiliki akses.",
    };
  }


  const key =
    cleanString(
      input.key
    );


  const {
    data:
      existing,
  } =
    await supabaseAdmin
      .from(
        "settings"
      )
      .select(
        "key"
      )
      .eq(
        "key",
        key
      )
      .maybeSingle();


  if (
    existing
  ) {
    return updateSetting(
      key,
      {
        value:
          input.value,

        type:
          input.type,

        category:
          input.category,

        description:
          input.description,

        isPublic:
          input.isPublic,
      }
    );
  }


  return createSetting(
    input
  );
}


/**
 * =========================================================
 * DELETE SETTING
 * =========================================================
 *
 * Hanya developer.
 *
 * =========================================================
 */

export async function deleteSetting(
  key: string
) {
  const context =
    await requireAdmin();


  if (
    !canManageSensitiveSettings(
      context.role
    )
  ) {
    return {
      success: false,

      error:
        "Hanya developer yang dapat menghapus setting.",
    };
  }


  const cleanKey =
    cleanString(
      key
    );


  if (
    !cleanKey
  ) {
    return {
      success: false,

      error:
        "Key setting tidak valid.",
    };
  }


  const {
    error,
  } =
    await supabaseAdmin
      .from(
        "settings"
      )
      .delete()
      .eq(
        "key",
        cleanKey
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


/**
 * =========================================================
 * COMMON SETTINGS
 * =========================================================
 *
 * Helper untuk mengambil setting
 * dengan fallback.
 *
 * =========================================================
 */

export async function getSettingValue<T>(
  key: string,
  fallback: T
): Promise<T> {
  const result =
    await getSetting(
      key
    );


  if (
    !result.success ||
    !result.data
  ) {
    return fallback;
  }


  const value =
    result.data.value;


  if (
    value ===
    null ||
    value ===
      undefined
  ) {
    return fallback;
  }


  return value as T;
}


/**
 * =========================================================
 * PUBLIC SETTING VALUE
 * =========================================================
 */

export async function getPublicSettingValue<T>(
  key: string,
  fallback: T
): Promise<T> {
  const result =
    await getPublicSetting(
      key
    );


  if (
    !result.success ||
    !result.data
  ) {
    return fallback;
  }


  const value =
    result.data.value;


  if (
    value ===
    null ||
    value ===
      undefined
  ) {
    return fallback;
  }


  return value as T;
}


/**
 * =========================================================
 * WEBSITE CONFIG
 * =========================================================
 *
 * Helper praktis untuk halaman utama.
 *
 * =========================================================
 */

export async function getWebsiteConfig() {
  const [
    siteName,
    siteDescription,
    registrationEnabled,
    maintenanceMode,
    maintenanceMessage,
  ] =
    await Promise.all([
      getPublicSettingValue(
        "site_name",
        "Library"
      ),

      getPublicSettingValue(
        "site_description",
        "Digital Library"
      ),

      getPublicSettingValue(
        "registration_enabled",
        true
      ),

      getPublicSettingValue(
        "maintenance_mode",
        false
      ),

      getPublicSettingValue(
        "maintenance_message",
        "Website sedang dalam pemeliharaan."
      ),
    ]);


  return {
    siteName,

    siteDescription,

    registrationEnabled,

    maintenanceMode,

    maintenanceMessage,
  };
}


/**
 * =========================================================
 * BOOK SETTINGS
 * =========================================================
 */

export async function getBookSettings() {
  const [
    allowDownloads,
    maxFileSize,
    allowedTypes,
  ] =
    await Promise.all([
      getSettingValue(
        "book_download_enabled",
        true
      ),

      getSettingValue(
        "storage_max_file_size",
        52428800
      ),

      getSettingValue<
        string[]
      >(
        "storage_allowed_types",
        [
          "application/pdf",
        ]
      ),
    ]);


  return {
    allowDownloads,

    maxFileSize,

    allowedTypes,
  };
}


/**
 * =========================================================
 * SECURITY SETTINGS
 * =========================================================
 */

export async function getSecuritySettings() {
  const [
    maxLoginAttempts,
    lockoutMinutes,
    rateLimitEnabled,
    rateLimitRequests,
    rateLimitWindow,
  ] =
    await Promise.all([
      getSettingValue(
        "max_login_attempts",
        5
      ),

      getSettingValue(
        "login_lockout_minutes",
        15
      ),

      getSettingValue(
        "rate_limit_enabled",
        true
      ),

      getSettingValue(
        "rate_limit_requests",
        60
      ),

      getSettingValue(
        "rate_limit_window",
        60
      ),
    ]);


  return {
    maxLoginAttempts,

    lockoutMinutes,

    rateLimitEnabled,

    rateLimitRequests,

    rateLimitWindow,
  };
}


/**
 * =========================================================
 * STORAGE SETTINGS
 * =========================================================
 */

export async function getStorageSettings() {
  const [
    maxFileSize,
    allowedTypes,
  ] =
    await Promise.all([
      getSettingValue(
        "storage_max_file_size",
        52428800
      ),

      getSettingValue<
        string[]
      >(
        "storage_allowed_types",
        [
          "application/pdf",
        ]
      ),
    ]);


  return {
    maxFileSize,

    allowedTypes,
  };
}
