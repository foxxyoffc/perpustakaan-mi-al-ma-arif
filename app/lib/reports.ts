/**
 * =========================================================
 * REPORT SERVICE
 * =========================================================
 *
 * File:
 * app/lib/reports.ts
 *
 * Fungsi:
 * - User mengirim report
 * - Admin melihat report user
 * - Developer melihat semua report
 * - Admin/developer dapat memperbarui status report
 * - Sistem otomatis membuat report setelah 5x login gagal
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
  canViewAllReports,
  canViewAdminReports,
} from "@/app/lib/permissions";


/**
 * =========================================================
 * TYPES
 * =========================================================
 */

export type ReportType =
  | "bug"
  | "book"
  | "account"
  | "login"
  | "website"
  | "other"
  | "registration"
  | "security";


export type ReportPriority =
  | "low"
  | "normal"
  | "high"
  | "critical";


export type ReportStatus =
  | "pending"
  | "reviewed"
  | "processing"
  | "resolved"
  | "rejected";


export type ReporterRole =
  | "user"
  | "admin"
  | "developer";


export interface Report {
  id: string;

  reporter_id:
    | string
    | null;

  reporter_role:
    | ReporterRole
    | null;

  type:
    | ReportType;

  priority:
    | ReportPriority;

  subject: string;

  message: string;

  status:
    | ReportStatus;

  admin_note:
    | string
    | null;

  metadata:
    | Record<string, unknown>
    | null;

  created_at: string;

  updated_at: string;

  resolved_at:
    | string
    | null;
}


/**
 * =========================================================
 * CONSTANTS
 * =========================================================
 */

const REPORT_SELECT = `
  id,
  reporter_id,
  reporter_role,
  type,
  priority,
  subject,
  message,
  status,
  admin_note,
  metadata,
  created_at,
  updated_at,
  resolved_at
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


function isReportType(
  value: unknown
): value is ReportType {
  return [
    "bug",
    "book",
    "account",
    "login",
    "website",
    "other",
    "registration",
    "security",
  ].includes(
    value as string
  );
}


function isReportPriority(
  value: unknown
): value is ReportPriority {
  return [
    "low",
    "normal",
    "high",
    "critical",
  ].includes(
    value as string
  );
}


function isReportStatus(
  value: unknown
): value is ReportStatus {
  return [
    "pending",
    "reviewed",
    "processing",
    "resolved",
    "rejected",
  ].includes(
    value as string
  );
}


/**
 * =========================================================
 * CREATE REPORT
 * =========================================================
 *
 * Semua user yang sudah login dapat membuat report.
 *
 * =========================================================
 */

export async function createReport(
  input: {
    type: ReportType;

    subject: string;

    message: string;

    priority?:
      | ReportPriority;

    metadata?:
      | Record<string, unknown>;
  }
) {
  const context =
    await requireAuth();


  if (
    !isReportType(
      input.type
    )
  ) {
    return {
      success: false,

      data: null,

      error:
        "Jenis laporan tidak valid.",
    };
  }


  const subject =
    cleanString(
      input.subject
    );

  const message =
    cleanString(
      input.message
    );


  if (
    !subject
  ) {
    return {
      success: false,

      data: null,

      error:
        "Judul laporan wajib diisi.",
    };
  }


  if (
    subject.length >
    255
  ) {
    return {
      success: false,

      data: null,

      error:
        "Judul laporan maksimal 255 karakter.",
    };
  }


  if (
    !message
  ) {
    return {
      success: false,

      data: null,

      error:
        "Isi laporan wajib diisi.",
    };
  }


  if (
    message.length >
    20000
  ) {
    return {
      success: false,

      data: null,

      error:
        "Isi laporan terlalu panjang.",
    };
  }


  const priority =
    input.priority ??
    "normal";


  if (
    !isReportPriority(
      priority
    )
  ) {
    return {
      success: false,

      data: null,

      error:
        "Prioritas laporan tidak valid.",
    };
  }


  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from("reports")
      .insert({
        reporter_id:
          context.userId,

        reporter_role:
          context.role,

        type:
          input.type,

        priority,

        subject,

        message,

        status:
          "pending",

        metadata:
          input.metadata ??
          null,
      })
      .select(
        REPORT_SELECT
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
      data as Report,
  };
}


/**
 * =========================================================
 * CREATE REPORT WITHOUT USER
 * =========================================================
 *
 * Untuk kasus tertentu seperti:
 * - login gagal
 * - percobaan login berulang
 * - sistem
 *
 * Tidak menggunakan requireAuth().
 *
 * Hanya server yang boleh memanggil function ini.
 *
 * =========================================================
 */

export async function createSystemReport(
  input: {
    type: ReportType;

    subject: string;

    message: string;

    priority?:
      | ReportPriority;

    reporterId?:
      | string
      | null;

    reporterRole?:
      | ReporterRole
      | null;

    metadata?:
      | Record<string, unknown>;
  }
) {
  if (
    !isReportType(
      input.type
    )
  ) {
    return {
      success: false,

      data: null,

      error:
        "Jenis laporan tidak valid.",
    };
  }


  const subject =
    cleanString(
      input.subject
    );

  const message =
    cleanString(
      input.message
    );


  if (
    !subject ||
    !message
  ) {
    return {
      success: false,

      data: null,

      error:
        "Subject dan message wajib diisi.",
    };
  }


  const priority =
    input.priority ??
    "high";


  if (
    !isReportPriority(
      priority
    )
  ) {
    return {
      success: false,

      data: null,

      error:
        "Prioritas tidak valid.",
    };
  }


  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from("reports")
      .insert({
        reporter_id:
          input.reporterId ??
          null,

        reporter_role:
          input.reporterRole ??
          null,

        type:
          input.type,

        priority,

        subject,

        message,

        status:
          "pending",

        metadata:
          input.metadata ??
          null,
      })
      .select(
        REPORT_SELECT
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
      data as Report,
  };
}


/**
 * =========================================================
 * GET MY REPORTS
 * =========================================================
 *
 * User hanya melihat laporan miliknya sendiri.
 *
 * =========================================================
 */

export async function getMyReports(
  options?: {
    limit?: number;

    offset?: number;
  }
) {
  const context =
    await requireAuth();


  const limit =
    Math.min(
      Math.max(
        options?.limit ??
          20,
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


  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from("reports")
      .select(
        REPORT_SELECT
      )
      .eq(
        "reporter_id",
        context.userId
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      )
      .range(
        offset,
        offset +
          limit -
          1
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
        []) as Report[],
  };
}


/**
 * =========================================================
 * GET REPORT BY ID
 * =========================================================
 */

export async function getReportById(
  reportId: string
) {
  const context =
    await requireAuth();


  if (
    !reportId
  ) {
    return {
      success: false,

      data: null,

      error:
        "Report ID tidak valid.",
    };
  }


  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from("reports")
      .select(
        REPORT_SELECT
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


  if (!data) {
    return {
      success: false,

      data: null,

      error:
        "Laporan tidak ditemukan.",
    };
  }


  const report =
    data as Report;


  /**
   * User hanya boleh melihat report miliknya.
   */

  if (
    context.role ===
    "user"
  ) {
    if (
      report.reporter_id !==
      context.userId
    ) {
      return {
        success: false,

        data: null,

        error:
          "Anda tidak memiliki akses ke laporan ini.",
      };
    }
  }


  /**
   * Admin tidak boleh melihat
   * laporan milik developer.
   */

  if (
    context.role ===
    "admin"
  ) {
    if (
      report.reporter_role ===
      "developer"
    ) {
      return {
        success: false,

        data: null,

        error:
          "Laporan developer tidak dapat diakses admin.",
      };
    }
  }


  return {
    success: true,

    data:
      report,
  };
}


/**
 * =========================================================
 * GET ALL REPORTS
 * =========================================================
 *
 * ADMIN:
 * - user
 * - admin
 *
 * DEVELOPER:
 * - user
 * - admin
 * - developer
 *
 * =========================================================
 */

export async function getAllReports(
  options?: {
    status?:
      | ReportStatus;

    type?:
      | ReportType;

    priority?:
      | ReportPriority;

    reporterRole?:
      | ReporterRole;

    search?: string;

    limit?: number;

    offset?: number;
  }
) {
  const context =
    await requireAdmin();


  if (
    !canViewAllReports(
      context.role
    )
  ) {
    return {
      success: false,

      data: [],

      error:
        "Anda tidak memiliki akses ke seluruh laporan.",
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
      .from("reports")
      .select(
        REPORT_SELECT
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      );


  /**
   * Admin tidak melihat report developer.
   */

  if (
    context.role ===
    "admin"
  ) {
    query =
      query.neq(
        "reporter_role",
        "developer"
      );
  }


  /**
   * Developer dapat melihat
   * semua role.
   */

  if (
    options?.reporterRole
  ) {
    if (
      context.role ===
        "admin" &&
      options.reporterRole ===
        "developer"
    ) {
      return {
        success: false,

        data: [],

        error:
          "Admin tidak dapat melihat report developer.",
      };
    }


    query =
      query.eq(
        "reporter_role",
        options.reporterRole
      );
  }


  if (
    options?.status
  ) {
    if (
      !isReportStatus(
        options.status
      )
    ) {
      return {
        success: false,

        data: [],

        error:
          "Status tidak valid.",
      };
    }


    query =
      query.eq(
        "status",
        options.status
      );
  }


  if (
    options?.type
  ) {
    if (
      !isReportType(
        options.type
      )
    ) {
      return {
        success: false,

        data: [],

        error:
          "Jenis report tidak valid.",
      };
    }


    query =
      query.eq(
        "type",
        options.type
      );
  }


  if (
    options?.priority
  ) {
    if (
      !isReportPriority(
        options.priority
      )
    ) {
      return {
        success: false,

        data: [],

        error:
          "Prioritas tidak valid.",
      };
    }


    query =
      query.eq(
        "priority",
        options.priority
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
        `subject.ilike.%${search}%,message.ilike.%${search}%`
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
        []) as Report[],
  };
}


/**
 * =========================================================
 * GET ADMIN REPORTS
 * =========================================================
 *
 * Hanya developer.
 *
 * Digunakan untuk monitoring report
 * yang dibuat oleh admin.
 *
 * =========================================================
 */

export async function getAdminReports(
  options?: {
    status?:
      | ReportStatus;

    limit?: number;

    offset?: number;
  }
) {
  const context =
    await requireAdmin();


  if (
    !canViewAdminReports(
      context.role
    )
  ) {
    return {
      success: false,

      data: [],

      error:
        "Hanya developer yang dapat melihat laporan admin.",
    };
  }


  let query =
    supabaseAdmin
      .from("reports")
      .select(
        REPORT_SELECT
      )
      .eq(
        "reporter_role",
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
    options?.status
  ) {
    query =
      query.eq(
        "status",
        options.status
      );
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
        []) as Report[],
  };
}


/**
 * =========================================================
 * UPDATE REPORT STATUS
 * =========================================================
 */

export async function updateReportStatus(
  reportId: string,
  status: ReportStatus,
  adminNote?: string
) {
  const context =
    await requireAdmin();


  if (
    !canViewAllReports(
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
    !isReportStatus(
      status
    )
  ) {
    return {
      success: false,

      data: null,

      error:
        "Status report tidak valid.",
    };
  }


  /**
   * Admin tidak boleh mengubah
   * report milik developer.
   */

  const {
    data:
      existingReport,
    error:
      fetchError,
  } =
    await supabaseAdmin
      .from("reports")
      .select(
        `
          id,
          reporter_role
        `
      )
      .eq(
        "id",
        reportId
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
    !existingReport
  ) {
    return {
      success: false,

      data: null,

      error:
        "Laporan tidak ditemukan.",
    };
  }


  if (
    context.role ===
      "admin" &&
    existingReport.reporter_role ===
      "developer"
  ) {
    return {
      success: false,

      data: null,

      error:
        "Admin tidak dapat mengubah report developer.",
    };
  }


  const updateData: Record<
    string,
    unknown
  > = {
    status,

    updated_at:
      new Date().toISOString(),
  };


  if (
    adminNote !==
    undefined
  ) {
    updateData.admin_note =
      cleanString(
        adminNote
      ) ||
      null;
  }


  if (
    status ===
      "resolved" ||
    status ===
      "rejected"
  ) {
    updateData.resolved_at =
      new Date().toISOString();
  } else {
    updateData.resolved_at =
      null;
  }


  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from("reports")
      .update(
        updateData
      )
      .eq(
        "id",
        reportId
      )
      .select(
        REPORT_SELECT
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
      data as Report,
  };
}


/**
 * =========================================================
 * DELETE REPORT
 * =========================================================
 *
 * Hanya developer.
 *
 * Admin tidak boleh menghapus report.
 *
 * =========================================================
 */

export async function deleteReport(
  reportId: string
) {
  const context =
    await requireAdmin();


  if (
    context.role !==
    "developer"
  ) {
    return {
      success: false,

      error:
        "Hanya developer yang dapat menghapus report.",
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
 * AUTOMATIC FAILED LOGIN REPORT
 * =========================================================
 *
 * Dipanggil ketika akun mencapai 5x login gagal.
 *
 * PENTING:
 *
 * Function ini sengaja tidak memakai requireAuth()
 * karena user mungkin belum berhasil login.
 *
 * =========================================================
 */

export async function createFailedLoginReport(
  input: {
    username:
      | string;

    role:
      | ReporterRole;

    failedAttempts:
      | number;

    ipAddress?:
      | string
      | null;

    userAgent?:
      | string
      | null;

    accountId?:
      | string
      | null;
  }
) {
  const username =
    cleanString(
      input.username
    );


  const failedAttempts =
    Number(
      input.failedAttempts
    );


  if (
    !username
  ) {
    return {
      success: false,

      data: null,

      error:
        "Username tidak valid.",
    };
  }


  if (
    failedAttempts <
    5
  ) {
    return {
      success: false,

      data: null,

      error:
        "Laporan otomatis hanya dibuat setelah minimal 5 kali percobaan gagal.",
    };
  }


  if (
    ![
      "user",
      "admin",
      "developer",
    ].includes(
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
   * Jangan menyimpan password.
   *
   * Jangan pernah memasukkan password
   * ke metadata laporan.
   */

  const metadata: Record<
    string,
    unknown
  > = {
    username,

    failed_attempts:
      failedAttempts,

    ip_address:
      input.ipAddress ??
      null,

    user_agent:
      input.userAgent ??
      null,

    automatic:
      true,

    event:
      "failed_login_threshold",
  };


  const result =
    await createSystemReport({
      type:
        "login",

      priority:
        "high",

      subject:
        `Peringatan: ${failedAttempts}x percobaan login gagal`,

      message:
        `Terdeteksi ${failedAttempts} kali percobaan login gagal pada akun/username "${username}". Sistem membuat laporan otomatis untuk ditinjau admin/developer.`,

      reporterId:
        input.accountId ??
        null,

      reporterRole:
        input.role,

      metadata,
    });


  return result;
}


/**
 * =========================================================
 * REGISTRATION REPORT
 * =========================================================
 *
 * Saat user melakukan Sign In/pendaftaran,
 * data pendaftaran dapat dibuat sebagai report
 * agar masuk ke Request & All Report.
 *
 * =========================================================
 */

export async function createRegistrationReport(
  input: {
    fullName: string;

    address: string;

    birthPlace:
      | string;

    birthDate:
      | string;

    parentWhatsapp:
      | string;

    gmail:
      | string;

    classLevel:
      | number;

    registrationId?:
      | string
      | null;
  }
) {
  const fullName =
    cleanString(
      input.fullName
    );

  const address =
    cleanString(
      input.address
    );

  const birthPlace =
    cleanString(
      input.birthPlace
    );

  const birthDate =
    cleanString(
      input.birthDate
    );

  const parentWhatsapp =
    cleanString(
      input.parentWhatsapp
    );

  const gmail =
    cleanString(
      input.gmail
    );

  const classLevel =
    Number(
      input.classLevel
    );


  if (
    !fullName ||
    !address ||
    !birthPlace ||
    !birthDate ||
    !parentWhatsapp ||
    !gmail
  ) {
    return {
      success: false,

      data: null,

      error:
        "Semua data pendaftaran wajib diisi.",
    };
  }


  if (
    ![
      1,
      2,
      3,
      4,
      5,
      6,
    ].includes(
      classLevel
    )
  ) {
    return {
      success: false,

      data: null,

      error:
        "Kelas harus antara 1 sampai 6.",
    };
  }


  /**
   * Email validation sederhana.
   */

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      gmail
    )
  ) {
    return {
      success: false,

      data: null,

      error:
        "Format Gmail tidak valid.",
    };
  }


  const metadata = {
    registration_id:
      input.registrationId ??
      null,

    full_name:
      fullName,

    address,

    birth_place:
      birthPlace,

    birth_date:
      birthDate,

    parent_whatsapp:
      parentWhatsapp,

    gmail,

    class_level:
      classLevel,

    registration:
      true,
  };


  return createSystemReport({
    type:
      "registration",

    priority:
      "normal",

    subject:
      `Pendaftaran akun baru - ${fullName}`,

    message:
      `Terdapat permintaan pendaftaran akun baru dari ${fullName}. Silakan periksa data pendaftaran dan lakukan persetujuan melalui halaman Set Web.`,

    metadata,
  });
}


/**
 * =========================================================
 * REPORT STATISTICS
 * =========================================================
 *
 * Untuk dashboard admin/developer.
 *
 * =========================================================
 */

export async function getReportStatistics() {
  const context =
    await requireAdmin();


  if (
    !canViewAllReports(
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


  let query =
    supabaseAdmin
      .from("reports")
      .select(
        `
          id,
          reporter_role,
          type,
          priority,
          status
        `
      );


  /**
   * Admin tidak melihat statistik developer.
   */

  if (
    context.role ===
    "admin"
  ) {
    query =
      query.neq(
        "reporter_role",
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

      data: null,

      error:
        error.message,
    };
  }


  const reports =
    data ?? [];


  const countBy =
    (
      key:
        | "type"
        | "priority"
        | "status"
        | "reporter_role"
    ) => {
      return reports.reduce(
        (
          result:
            Record<
              string,
              number
            >,
          report
        ) => {
          const value =
            String(
              report[
                key
              ] ??
              "unknown"
            );

          result[value] =
            (
              result[value] ??
              0
            ) + 1;

          return result;
        },
        {}
      );
    };


  return {
    success: true,

    data: {
      total:
        reports.length,

      pending:
        reports.filter(
          report =>
            report.status ===
            "pending"
        ).length,

      reviewed:
        reports.filter(
          report =>
            report.status ===
            "reviewed"
        ).length,

      processing:
        reports.filter(
          report =>
            report.status ===
            "processing"
        ).length,

      resolved:
        reports.filter(
          report =>
            report.status ===
            "resolved"
        ).length,

      rejected:
        reports.filter(
          report =>
            report.status ===
            "rejected"
        ).length,

      byType:
        countBy(
          "type"
        ),

      byPriority:
        countBy(
          "priority"
        ),

      byStatus:
        countBy(
          "status"
        ),

      byReporterRole:
        countBy(
          "reporter_role"
        ),
    },
  };
}


/**
 * =========================================================
 * CHECK IF AUTOMATIC LOGIN REPORT EXISTS
 * =========================================================
 *
 * Mencegah satu akun membuat report otomatis
 * setiap kali mencoba login setelah melewati 5x.
 *
 * Kita cek report otomatis terbaru.
 *
 * =========================================================
 */

export async function hasRecentFailedLoginReport(
  username: string,
  minutes = 30
) {
  const cleanUsername =
    cleanString(
      username
    );


  if (
    !cleanUsername
  ) {
    return false;
  }


  const since =
    new Date(
      Date.now() -
        minutes *
          60 *
          1000
    ).toISOString();


  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from("reports")
      .select(
        "id, metadata"
      )
      .eq(
        "type",
        "login"
      )
      .gte(
        "created_at",
        since
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      )
      .limit(50);


  if (error) {
    console.error(
      "Failed login report check error:",
      error
    );

    return false;
  }


  return (
    data ??
    []
  ).some(
    report => {
      const metadata =
        report.metadata as
          | Record<
              string,
              unknown
            >
          | null;

      return (
        metadata?.automatic ===
          true &&
        metadata?.event ===
          "failed_login_threshold" &&
        metadata?.username ===
          cleanUsername
      );
    }
  );
}


/**
 * =========================================================
 * CREATE FAILED LOGIN REPORT IF NEEDED
 * =========================================================
 *
 * Helper utama untuk login system.
 *
 * =========================================================
 */

export async function reportFailedLoginIfNeeded(
  input: {
    username:
      | string;

    role:
      | ReporterRole;

    failedAttempts:
      | number;

    ipAddress?:
      | string
      | null;

    userAgent?:
      | string
      | null;

    accountId?:
      | string
      | null;
  }
) {
  const attempts =
    Number(
      input.failedAttempts
    );


  if (
    attempts <
    5
  ) {
    return {
      success: true,

      created: false,
    };
  }


  /**
   * Hindari spam report.
   */

  const alreadyReported =
    await hasRecentFailedLoginReport(
      input.username
    );


  if (
    alreadyReported
  ) {
    return {
      success: true,

      created: false,
    };
  }


  const result =
    await createFailedLoginReport(
      input
    );


  return {
    success:
      result.success,

    created:
      result.success,

    report:
      result.data ?? null,

    error:
      result.error,
  };
    }
