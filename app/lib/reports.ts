import {
  supabaseAdmin,
} from "@/app/lib/supabase/admin";

import {
  getAuthProfile,
} from "@/app/lib/auth";

import {
  historyReportCreated,
} from "@/app/lib/history";

import {
  UserRole,
} from "@/app/lib/permissions";


/**
 * =========================================================
 * REPORT & REQUEST HELPER
 * =========================================================
 *
 * File:
 * app/lib/reports.ts
 *
 * Digunakan untuk:
 *
 * USER
 * - membuat laporan
 * - mengirim request
 *
 * ADMIN
 * - melihat laporan user
 * - melihat request pendaftaran
 * - memproses laporan
 *
 * DEVELOPER
 * - melihat semua laporan
 * - melihat laporan admin
 * - melihat request
 * - memproses seluruh laporan
 *
 * SECURITY
 * - otomatis membuat laporan setelah login gagal 5x
 *
 * =========================================================
 */


/**
 * =========================================================
 * TYPES
 * =========================================================
 */

export type ReportType =
  | "bug"
  | "book_problem"
  | "website_problem"
  | "account_problem"
  | "login_problem"
  | "security"
  | "request"
  | "registration"
  | "other";


export type ReportPriority =
  | "low"
  | "normal"
  | "high"
  | "critical";


export type ReportStatus =
  | "pending"
  | "reviewing"
  | "resolved"
  | "rejected";


export interface CreateReportInput {
  type: ReportType;

  title: string;

  description: string;

  priority?:
    | ReportPriority
    | null;

  metadata?:
    | Record<string, unknown>
    | null;
}


export interface ReportResult {
  success: boolean;

  data?: unknown;

  error?: string;
}


/**
 * =========================================================
 * SANITIZE METADATA
 * =========================================================
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


  const forbidden = [
    "password",
    "new_password",
    "old_password",
    "confirm_password",

    "access_token",
    "refresh_token",

    "service_role_key",

    "api_key",
    "apikey",

    "secret",
    "token",
  ];


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
      forbidden.includes(
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
 * VALIDATE REPORT
 * =========================================================
 */

function validateReportInput(
  input: CreateReportInput
) {
  if (
    !input.type
  ) {
    return "Jenis laporan wajib dipilih.";
  }


  if (
    !input.title ||
    input.title.trim().length <
      3
  ) {
    return "Judul laporan minimal 3 karakter.";
  }


  if (
    input.title.trim().length >
      150
  ) {
    return "Judul laporan terlalu panjang.";
  }


  if (
    !input.description ||
    input.description.trim().length <
      5
  ) {
    return "Deskripsi laporan minimal 5 karakter.";
  }


  if (
    input.description.trim().length >
      5000
  ) {
    return "Deskripsi laporan terlalu panjang.";
  }


  return null;
}


/**
 * =========================================================
 * CREATE REPORT
 * =========================================================
 *
 * User/admin yang sedang login dapat mengirim report.
 */
export async function createReport(
  input: CreateReportInput
): Promise<ReportResult> {
  try {
    const profile =
      await getAuthProfile();


    if (!profile) {
      return {
        success: false,

        error:
          "Silakan login terlebih dahulu.",
      };
    }


    if (
      profile.status !==
      "active"
    ) {
      return {
        success: false,

        error:
          "Akun belum aktif atau telah dinonaktifkan.",
      };
    }


    const validation =
      validateReportInput(
        input
      );


    if (validation) {
      return {
        success: false,

        error:
          validation,
      };
    }


    const metadata =
      sanitizeMetadata(
        input.metadata
      );


    const {
      data,
      error,
    } =
      await supabaseAdmin
        .from("reports")
        .insert({
          reporter_id:
            profile.id,

          reporter_role:
            profile.role,

          type:
            input.type,

          title:
            input.title.trim(),

          description:
            input.description.trim(),

          priority:
            input.priority ??
            "normal",

          status:
            "pending",

          metadata,
        })
        .select(
          "*"
        )
        .single();


    if (error) {
      console.error(
        "createReport error:",
        error
      );

      return {
        success: false,

        error:
          error.message,
      };
    }


    /**
     * Catat ke history.
     */
    await historyReportCreated(
      data.id,
      data.title
    );


    return {
      success: true,

      data,
    };
  } catch (error) {
    console.error(
      "createReport exception:",
      error
    );


    return {
      success: false,

      error:
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan.",
    };
  }
}


/**
 * =========================================================
 * CREATE REGISTRATION REQUEST
 * =========================================================
 *
 * Digunakan halaman Sign In.
 *
 * User belum mempunyai akun.
 *
 * Data pendaftaran masuk ke reports,
 * sehingga admin/developer dapat memprosesnya.
 */
export async function createRegistrationRequest(
  input: {
    fullName: string;

    address: string;

    birthPlace: string;

    birthDate: string;

    parentWhatsapp: string;

    gmail: string;

    classLevel:
      | 1
      | 2
      | 3
      | 4
      | 5
      | 6;
  }
): Promise<ReportResult> {
  try {
    /**
     * Validasi nama.
     */
    if (
      !input.fullName ||
      input.fullName.trim().length <
        3
    ) {
      return {
        success: false,

        error:
          "Nama lengkap wajib diisi.",
      };
    }


    /**
     * Validasi alamat.
     */
    if (
      !input.address ||
      input.address.trim().length <
        5
    ) {
      return {
        success: false,

        error:
          "Alamat wajib diisi.",
      };
    }


    /**
     * Validasi tempat lahir.
     */
    if (
      !input.birthPlace ||
      input.birthPlace.trim().length <
        2
    ) {
      return {
        success: false,

        error:
          "Tempat lahir wajib diisi.",
      };
    }


    /**
     * Validasi tanggal lahir.
     */
    if (
      !input.birthDate
    ) {
      return {
        success: false,

        error:
          "Tanggal lahir wajib diisi.",
      };
    }


    /**
     * Validasi WhatsApp.
     */
    if (
      !input.parentWhatsapp ||
      input.parentWhatsapp
        .replace(
          /\D/g,
          ""
        )
        .length <
        8
    ) {
      return {
        success: false,

        error:
          "Nomor WhatsApp orang tua wajib aktif.",
      };
    }


    /**
     * Validasi Gmail.
     */
    const email =
      input.gmail
        .trim()
        .toLowerCase();


    if (
      !email ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
      )
    ) {
      return {
        success: false,

        error:
          "Alamat Gmail tidak valid.",
      };
    }


    /**
     * Validasi kelas.
     */
    if (
      ![
        1,
        2,
        3,
        4,
        5,
        6,
      ].includes(
        Number(
          input.classLevel
        )
      )
    ) {
      return {
        success: false,

        error:
          "Tingkatan kelas tidak valid.",
      };
    }


    /**
     * Metadata tidak menyimpan password
     * karena akun belum dibuat.
     */
    const metadata = {
      full_name:
        input.fullName.trim(),

      address:
        input.address.trim(),

      birth_place:
        input.birthPlace.trim(),

      birth_date:
        input.birthDate,

      parent_whatsapp:
        input.parentWhatsapp.trim(),

      gmail:
        email,

      class_level:
        Number(
          input.classLevel
        ),
    };


    const {
      data,
      error,
    } =
      await supabaseAdmin
        .from("reports")
        .insert({
          reporter_id:
            null,

          reporter_role:
            "user",

          type:
            "registration",

          title:
            `Permintaan pendaftaran akun - ${input.fullName.trim()}`,

          description:
            "Pengajuan pendaftaran akun perpustakaan sekolah.",

          priority:
            "normal",

          status:
            "pending",

          metadata:
            sanitizeMetadata(
              metadata
            ),
        })
        .select(
          "*"
        )
        .single();


    if (error) {
      console.error(
        "createRegistrationRequest error:",
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

      data,
    };
  } catch (error) {
    console.error(
      "createRegistrationRequest exception:",
      error
    );


    return {
      success: false,

      error:
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan.",
    };
  }
}


/**
 * =========================================================
 * CREATE AUTOMATIC LOGIN FAILURE REPORT
 * =========================================================
 *
 * Dipanggil ketika login gagal sampai 5 kali.
 *
 * Report masuk ke admin/developer.
 *
 * Tidak menyimpan password.
 */
export async function createLoginFailureReport(
  input: {
    username?: string | null;

    profileId?:
      | string
      | null;

    attemptCount: number;

    loginType?:
      | "user"
      | "admin"
      | "developer";

    ipAddress?:
      | string
      | null;

    userAgent?:
      | string
      | null;
  }
): Promise<ReportResult> {
  try {
    if (
      input.attemptCount <
      5
    ) {
      return {
        success: false,

        error:
          "Laporan otomatis hanya dibuat setelah 5 kali percobaan login gagal.",
      };
    }


    /**
     * Jangan menyimpan password.
     */
    const metadata = {
      username:
        input.username ??
        null,

      profile_id:
        input.profileId ??
        null,

      attempt_count:
        input.attemptCount,

      login_type:
        input.loginType ??
        "user",

      ip_address:
        input.ipAddress ??
        null,

      user_agent:
        input.userAgent ??
        null,

      automatic:
        true,
    };


    const {
      data,
      error,
    } =
      await supabaseAdmin
        .from("reports")
        .insert({
          reporter_id:
            input.profileId ??
            null,

          reporter_role:
            input.loginType ??
            "user",

          type:
            "security",

          title:
            "Peringatan: 5 kali percobaan login gagal",

          description:
            `Terdeteksi ${input.attemptCount} kali percobaan login gagal pada akun ${input.username ?? "tidak diketahui"}.`,

          priority:
            "high",

          status:
            "pending",

          metadata:
            sanitizeMetadata(
              metadata
            ),
        })
        .select(
          "*"
        )
        .single();


    if (error) {
      console.error(
        "createLoginFailureReport error:",
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

      data,
    };
  } catch (error) {
    console.error(
      "createLoginFailureReport exception:",
      error
    );


    return {
      success: false,

      error:
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan.",
    };
  }
}


/**
 * =========================================================
 * GET OWN REPORTS
 * =========================================================
 *
 * User/admin dapat melihat laporan miliknya sendiri
 * jika nantinya UI membutuhkan fitur tersebut.
 */
export async function getOwnReports(
  options?: {
    page?: number;

    limit?: number;

    status?:
      | ReportStatus
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
      .from("reports")
      .select(
        "*",
        {
          count:
            "exact",
        }
      )
      .eq(
        "reporter_id",
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
    options?.status
  ) {
    query =
      query.eq(
        "status",
        options.status
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
 * GET ALL REPORTS
 * =========================================================
 *
 * ADMIN:
 * - melihat report user
 *
 * DEVELOPER:
 * - melihat report user
 * - melihat report admin
 *
 * Developer tidak dibatasi oleh reporter_role user/admin.
 */
export async function getAllReports(
  options?: {
    page?: number;

    limit?: number;

    status?:
      | ReportStatus
      | null;

    type?:
      | ReportType
      | null;

    reporterRole?:
      | UserRole
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
    profile.role as UserRole;


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


  let query =
    supabaseAdmin
      .from("reports")
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
   * Admin tidak boleh melihat laporan
   * yang dibuat oleh admin lain.
   *
   * Developer boleh melihat user + admin.
   */
  if (
    role === "admin"
  ) {
    query =
      query.eq(
        "reporter_role",
        "user"
      );
  }


  if (
    options?.status
  ) {
    query =
      query.eq(
        "status",
        options.status
      );
  }


  if (
    options?.type
  ) {
    query =
      query.eq(
        "type",
        options.type
      );
  }


  /**
   * Filter reporter role hanya boleh digunakan
   * sesuai hak akses.
   */
  if (
    options?.reporterRole
  ) {
    if (
      role === "developer"
    ) {
      query =
        query.eq(
          "reporter_role",
          options.reporterRole
        );
    } else {
      /**
       * Admin tetap dipaksa hanya user.
       */
      query =
        query.eq(
          "reporter_role",
          "user"
        );
    }
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
 * GET SINGLE REPORT
 * =========================================================
 */

export async function getReportById(
  reportId: string
) {
  const profile =
    await getAuthProfile();


  if (!profile) {
    return {
      success: false,

      data: null,

      error:
        "Belum login.",
    };
  }


  const role =
    profile.role as UserRole;


  const {
    data: report,
    error,
  } =
    await supabaseAdmin
      .from("reports")
      .select(
        "*"
      )
      .eq(
        "id",
        reportId
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


  if (!report) {
    return {
      success: false,

      data: null,

      error:
        "Laporan tidak ditemukan.",
    };
  }


  /**
   * User hanya boleh melihat report miliknya.
   */
  if (
    role === "user"
  ) {
    if (
      report.reporter_id !==
      profile.id
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
   * Admin tidak boleh melihat report admin.
   */
  if (
    role === "admin"
  ) {
    if (
      report.reporter_role !==
      "user"
    ) {
      return {
        success: false,

        data: null,

        error:
          "Admin tidak memiliki akses ke laporan admin/developer.",
      };
    }
  }


  /**
   * Developer dapat melihat report user/admin.
   */
  if (
    role !== "user" &&
    role !== "admin" &&
    role !== "developer"
  ) {
    return {
      success: false,

      data: null,

      error:
        "Role tidak valid.",
    };
  }


  return {
    success: true,

    data: report,
  };
}


/**
 * =========================================================
 * UPDATE REPORT STATUS
 * =========================================================
 *
 * Admin:
 * - dapat mengubah status report user
 *
 * Developer:
 * - dapat mengubah semua report user/admin
 */
export async function updateReportStatus(
  reportId: string,
  status: ReportStatus
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


  const role =
    profile.role as UserRole;


  if (
    role !== "admin" &&
    role !== "developer"
  ) {
    return {
      success: false,

      error:
        "Tidak memiliki akses.",
    };
  }


  const validStatuses: ReportStatus[] =
    [
      "pending",
      "reviewing",
      "resolved",
      "rejected",
    ];


  if (
    !validStatuses.includes(
      status
    )
  ) {
    return {
      success: false,

      error:
        "Status laporan tidak valid.",
    };
  }


  /**
   * Ambil report dahulu untuk memastikan
   * admin tidak memproses report admin.
   */
  const {
    data: report,
    error: findError,
  } =
    await supabaseAdmin
      .from("reports")
      .select(
        "id, reporter_role, title"
      )
      .eq(
        "id",
        reportId
      )
      .maybeSingle();


  if (findError) {
    return {
      success: false,

      error:
        findError.message,
    };
  }


  if (!report) {
    return {
      success: false,

      error:
        "Laporan tidak ditemukan.",
    };
  }


  if (
    role === "admin" &&
    report.reporter_role !==
      "user"
  ) {
    return {
      success: false,

      error:
        "Admin tidak dapat memproses laporan admin/developer.",
    };
  }


  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from("reports")
      .update({
        status,

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        reportId
      )
      .select(
        "*"
      )
      .single();


  if (error) {
    return {
      success: false,

      error:
        error.message,
    };
  }


  return {
    success: true,

    data,
  };
}


/**
 * =========================================================
 * DELETE REPORT
 * =========================================================
 *
 * Hanya developer.
 */
export async function deleteReport(
  reportId: string
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
        "Hanya developer yang dapat menghapus laporan.",
    };
  }


  const {
    error,
  } =
    await supabaseAdmin
      .from("reports")
      .delete()
      .eq(
        "id",
        reportId
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
 * REPORT COUNT
 * =========================================================
 *
 * Berguna untuk badge:
 *
 * "Report (5)"
 *
 * Admin:
 * - hanya report user
 *
 * Developer:
 * - user + admin
 */
export async function getPendingReportCount() {
  const profile =
    await getAuthProfile();


  if (!profile) {
    return {
      success: false,

      count: 0,
    };
  }


  const role =
    profile.role as UserRole;


  if (
    role !== "admin" &&
    role !== "developer"
  ) {
    return {
      success: false,

      count: 0,
    };
  }


  let query =
    supabaseAdmin
      .from("reports")
      .select(
        "id",
        {
          count:
            "exact",
          head: true,
        }
      )
      .eq(
        "status",
        "pending"
      );


  if (
    role === "admin"
  ) {
    query =
      query.eq(
        "reporter_role",
        "user"
      );
  }


  const {
    count,
    error,
  } =
    await query;


  if (error) {
    return {
      success: false,

      count: 0,

      error:
        error.message,
    };
  }


  return {
    success: true,

    count:
      count ?? 0,
  };
        }
