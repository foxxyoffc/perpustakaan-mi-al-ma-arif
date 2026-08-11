"use server";

/**
 * =========================================================
 * ANNOUNCEMENTS SERVICE
 * =========================================================
 *
 * File:
 * app/lib/announcements.ts
 *
 * Fungsi:
 * - Membuat pengumuman
 * - Mengubah pengumuman
 * - Menghapus pengumuman
 * - Publish / unpublish
 * - User melihat pengumuman aktif
 * - Admin mengelola pengumuman
 * - Developer dapat mengelola seluruh pengumuman
 * - Mendukung prioritas
 * - Mendukung tanggal mulai dan berakhir
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
  canManageAnnouncements,
} from "@/app/lib/permissions";


/**
 * =========================================================
 * TYPES
 * =========================================================
 */

export type AnnouncementPriority =
  | "low"
  | "normal"
  | "high"
  | "critical";


export interface Announcement {
  id: string;

  title: string;

  content: string;

  priority:
    | AnnouncementPriority;

  is_published: boolean;

  start_at:
    | string
    | null;

  end_at:
    | string
    | null;

  created_by:
    | string
    | null;

  created_by_role:
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

const ANNOUNCEMENT_SELECT = `
  id,
  title,
  content,
  priority,
  is_published,
  start_at,
  end_at,
  created_by,
  created_by_role,
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


function isPriority(
  value: unknown
): value is AnnouncementPriority {
  return [
    "low",
    "normal",
    "high",
    "critical",
  ].includes(
    value as string
  );
}


function isValidDate(
  value:
    | string
    | null
    | undefined
) {
  if (
    value ===
      null ||
    value ===
      undefined ||
    value === ""
  ) {
    return true;
  }

  return (
    !Number.isNaN(
      new Date(
        value
      ).getTime()
    )
  );
}


/**
 * =========================================================
 * CREATE ANNOUNCEMENT
 * =========================================================
 */

export async function createAnnouncement(
  input: {
    title: string;

    content: string;

    priority?:
      | AnnouncementPriority;

    isPublished?:
      | boolean;

    startAt?:
      | string
      | null;

    endAt?:
      | string
      | null;
  }
) {
  const context =
    await requireAdmin();


  if (
    !canManageAnnouncements(
      context.role
    )
  ) {
    return {
      success: false,

      data: null,

      error:
        "Anda tidak memiliki izin mengelola pengumuman.",
    };
  }


  const title =
    cleanString(
      input.title
    );

  const content =
    cleanString(
      input.content
    );


  if (
    !title
  ) {
    return {
      success: false,

      data: null,

      error:
        "Judul pengumuman wajib diisi.",
    };
  }


  if (
    title.length >
    255
  ) {
    return {
      success: false,

      data: null,

      error:
        "Judul pengumuman maksimal 255 karakter.",
    };
  }


  if (
    !content
  ) {
    return {
      success: false,

      data: null,

      error:
        "Isi pengumuman wajib diisi.",
    };
  }


  if (
    content.length >
    20000
  ) {
    return {
      success: false,

      data: null,

      error:
        "Isi pengumuman terlalu panjang.",
    };
  }


  const priority =
    input.priority ??
    "normal";


  if (
    !isPriority(
      priority
    )
  ) {
    return {
      success: false,

      data: null,

      error:
        "Prioritas pengumuman tidak valid.",
    };
  }


  if (
    !isValidDate(
      input.startAt
    )
  ) {
    return {
      success: false,

      data: null,

      error:
        "Tanggal mulai tidak valid.",
    };
  }


  if (
    !isValidDate(
      input.endAt
    )
  ) {
    return {
      success: false,

      data: null,

      error:
        "Tanggal berakhir tidak valid.",
    };
  }


  if (
    input.startAt &&
    input.endAt
  ) {
    const start =
      new Date(
        input.startAt
      ).getTime();

    const end =
      new Date(
        input.endAt
      ).getTime();


    if (
      end <=
      start
    ) {
      return {
        success: false,

        data: null,

        error:
          "Tanggal berakhir harus setelah tanggal mulai.",
      };
    }
  }


  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from(
        "announcements"
      )
      .insert({
        title,

        content,

        priority,

        is_published:
          input.isPublished ??
          false,

        start_at:
          input.startAt ??
          null,

        end_at:
          input.endAt ??
          null,

        created_by:
          context.userId,

        created_by_role:
          context.role,
      })
      .select(
        ANNOUNCEMENT_SELECT
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
      data as Announcement,
  };
}


/**
 * =========================================================
 * GET ACTIVE ANNOUNCEMENTS
 * =========================================================
 *
 * Dipakai halaman publik/user.
 *
 * Hanya pengumuman yang:
 *
 * is_published = true
 *
 * dan:
 *
 * start_at <= sekarang
 *
 * dan:
 *
 * end_at >= sekarang
 *
 * =========================================================
 */

export async function getActiveAnnouncements(
  limit = 20
) {
  const now =
    new Date().toISOString();


  const safeLimit =
    Math.min(
      Math.max(
        Number(limit) ||
          20,
        1
      ),
      50
    );


  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from(
        "announcements"
      )
      .select(
        ANNOUNCEMENT_SELECT
      )
      .eq(
        "is_published",
        true
      )
      .or(
        `start_at.is.null,start_at.lte.${now}`
      )
      .or(
        `end_at.is.null,end_at.gte.${now}`
      )
      .order(
        "priority",
        {
          ascending:
            false,
        }
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      )
      .limit(
        safeLimit
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
        []) as Announcement[],
  };
}


/**
 * =========================================================
 * GET ANNOUNCEMENT BY ID
 * =========================================================
 */

export async function getAnnouncementById(
  id: string
) {
  await requireAuth();


  if (
    !id
  ) {
    return {
      success: false,

      data: null,

      error:
        "ID pengumuman tidak valid.",
    };
  }


  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from(
        "announcements"
      )
      .select(
        ANNOUNCEMENT_SELECT
      )
      .eq(
        "id",
        id
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
        "Pengumuman tidak ditemukan.",
    };
  }


  return {
    success: true,

    data:
      data as Announcement,
  };
}


/**
 * =========================================================
 * GET ALL ANNOUNCEMENTS
 * =========================================================
 *
 * Admin + Developer.
 *
 * =========================================================
 */

export async function getAllAnnouncements(
  options?: {
    published?:
      | boolean;

    search?: string;

    limit?: number;

    offset?: number;
  }
) {
  const context =
    await requireAdmin();


  if (
    !canManageAnnouncements(
      context.role
    )
  ) {
    return {
      success: false,

      data: [],

      error:
        "Anda tidak memiliki izin.",
    };
  }


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
      .from(
        "announcements"
      )
      .select(
        ANNOUNCEMENT_SELECT
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      );


  if (
    options?.published !==
    undefined
  ) {
    query =
      query.eq(
        "is_published",
        options.published
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
      query.or(
        `title.ilike.%${search}%,content.ilike.%${search}%`
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
        []) as Announcement[],
  };
}


/**
 * =========================================================
 * UPDATE ANNOUNCEMENT
 * =========================================================
 */

export async function updateAnnouncement(
  id: string,
  input: {
    title?:
      | string;

    content?:
      | string;

    priority?:
      | AnnouncementPriority;

    isPublished?:
      | boolean;

    startAt?:
      | string
      | null;

    endAt?:
      | string
      | null;
  }
) {
  const context =
    await requireAdmin();


  if (
    !canManageAnnouncements(
      context.role
    )
  ) {
    return {
      success: false,

      data: null,

      error:
        "Anda tidak memiliki izin.",
    };
  }


  if (
    !id
  ) {
    return {
      success: false,

      data: null,

      error:
        "ID pengumuman tidak valid.",
    };
  }


  const updateData: Record<
    string,
    unknown
  > = {};


  if (
    input.title !==
    undefined
  ) {
    const title =
      cleanString(
        input.title
      );


    if (
      !title
    ) {
      return {
        success: false,

        data: null,

        error:
          "Judul tidak boleh kosong.",
      };
    }


    if (
      title.length >
      255
    ) {
      return {
        success: false,

        data: null,

        error:
          "Judul maksimal 255 karakter.",
      };
    }


    updateData.title =
      title;
  }


  if (
    input.content !==
    undefined
  ) {
    const content =
      cleanString(
        input.content
      );


    if (
      !content
    ) {
      return {
        success: false,

        data: null,

        error:
          "Isi pengumuman tidak boleh kosong.",
      };
    }


    if (
      content.length >
      20000
    ) {
      return {
        success: false,

        data: null,

        error:
          "Isi pengumuman terlalu panjang.",
      };
    }


    updateData.content =
      content;
  }


  if (
    input.priority !==
    undefined
  ) {
    if (
      !isPriority(
        input.priority
      )
    ) {
      return {
        success: false,

        data: null,

        error:
          "Prioritas tidak valid.",
      };
    }


    updateData.priority =
      input.priority;
  }


  if (
    input.isPublished !==
    undefined
  ) {
    updateData.is_published =
      input.isPublished;
  }


  if (
    input.startAt !==
    undefined
  ) {
    if (
      !isValidDate(
        input.startAt
      )
    ) {
      return {
        success: false,

        data: null,

        error:
          "Tanggal mulai tidak valid.",
      };
    }


    updateData.start_at =
      input.startAt ??
      null;
  }


  if (
    input.endAt !==
    undefined
  ) {
    if (
      !isValidDate(
        input.endAt
      )
    ) {
      return {
        success: false,

        data: null,

        error:
          "Tanggal berakhir tidak valid.",
      };
    }


    updateData.end_at =
      input.endAt ??
      null;
  }


  /**
   * Jika dua tanggal tersedia,
   * pastikan urutannya benar.
   */

  if (
    updateData.start_at !==
      undefined &&
    updateData.end_at !==
      undefined &&
    updateData.start_at &&
    updateData.end_at
  ) {
    const start =
      new Date(
        String(
          updateData.start_at
        )
      ).getTime();

    const end =
      new Date(
        String(
          updateData.end_at
        )
      ).getTime();


    if (
      end <=
      start
    ) {
      return {
        success: false,

        data: null,

        error:
          "Tanggal berakhir harus setelah tanggal mulai.",
      };
    }
  }


  if (
    Object.keys(
      updateData
    ).length ===
    0
  ) {
    return {
      success: false,

      data: null,

      error:
        "Tidak ada data yang diubah.",
    };
  }


  updateData.updated_at =
    new Date().toISOString();


  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from(
        "announcements"
      )
      .update(
        updateData
      )
      .eq(
        "id",
        id
      )
      .select(
        ANNOUNCEMENT_SELECT
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
      data as Announcement,
  };
}


/**
 * =========================================================
 * PUBLISH ANNOUNCEMENT
 * =========================================================
 */

export async function publishAnnouncement(
  id: string
) {
  return updateAnnouncement(
    id,
    {
      isPublished:
        true,
    }
  );
}


/**
 * =========================================================
 * UNPUBLISH ANNOUNCEMENT
 * =========================================================
 */

export async function unpublishAnnouncement(
  id: string
) {
  return updateAnnouncement(
    id,
    {
      isPublished:
        false,
    }
  );
}


/**
 * =========================================================
 * DELETE ANNOUNCEMENT
 * =========================================================
 */

export async function deleteAnnouncement(
  id: string
) {
  const context =
    await requireAdmin();


  if (
    !canManageAnnouncements(
      context.role
    )
  ) {
    return {
      success: false,

      error:
        "Anda tidak memiliki izin.",
    };
  }


  if (
    !id
  ) {
    return {
      success: false,

      error:
        "ID pengumuman tidak valid.",
    };
  }


  const {
    error,
  } =
    await supabaseAdmin
      .from(
        "announcements"
      )
      .delete()
      .eq(
        "id",
        id
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
 * GET CURRENT PRIORITY ANNOUNCEMENTS
 * =========================================================
 *
 * Mengambil hanya announcement penting.
 *
 * Cocok untuk banner / alert di halaman utama.
 *
 * =========================================================
 */

export async function getImportantAnnouncements(
  limit = 5
) {
  const result =
    await getActiveAnnouncements(
      Math.min(
        Math.max(
          limit,
          1
        ),
        10
      )
    );


  if (
    !result.success
  ) {
    return result;
  }


  return {
    success: true,

    data:
      result.data.filter(
        announcement =>
          announcement.priority ===
            "high" ||
          announcement.priority ===
            "critical"
      ),
  };
}


/**
 * =========================================================
 * CHECK ANNOUNCEMENT VISIBILITY
 * =========================================================
 */

export function isAnnouncementActive(
  announcement: Announcement,
  now = new Date()
) {
  if (
    !announcement.is_published
  ) {
    return false;
  }


  const timestamp =
    now.getTime();


  if (
    announcement.start_at
  ) {
    const start =
      new Date(
        announcement.start_at
      ).getTime();


    if (
      timestamp <
      start
    ) {
      return false;
    }
  }


  if (
    announcement.end_at
  ) {
    const end =
      new Date(
        announcement.end_at
      ).getTime();


    if (
      timestamp >
      end
    ) {
      return false;
    }
  }


  return true;
  }
