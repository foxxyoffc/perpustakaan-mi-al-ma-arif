import { supabaseAdmin } from "@/app/lib/supabase/admin";
import { getAuthProfile } from "@/app/lib/auth";
import {
  historyBookCreated,
  historyBookDeleted,
  historyBookPdfDeleted,
  historyBookPdfReplaced,
  historyBookPdfUploaded,
  historyBookUpdated,
  historyBookViewed,
  historyBookDownloaded,
  historyDownloadPermissionChanged,
} from "@/app/lib/history";

import type { UserRole } from "@/app/lib/permissions";

/**
 * =========================================================
 * BOOK MANAGEMENT
 * =========================================================
 *
 * File:
 * app/lib/books.ts
 *
 * Menangani:
 *
 * - Buku Siswa
 * - Buku Guru
 * - Buku Umum
 * - Buku PAI/Agama
 * - Kelas 1 - 6
 * - Judul
 * - Sinopsis
 * - Cover
 * - PDF
 * - Preview PDF di website
 * - Permission download
 * - Tambah/edit/hapus buku
 *
 * PDF TIDAK harus didownload untuk dibaca.
 *
 * Jika allow_download = false:
 * - user tetap dapat membuka PDF
 * - user tidak diberikan tombol download
 *
 * Jika allow_download = true:
 * - user dapat membaca PDF
 * - user dapat mendownload PDF
 *
 * =========================================================
 */


/**
 * =========================================================
 * TYPES
 * =========================================================
 */

export type BookCategory =
  | "siswa_umum"
  | "siswa_pai"
  | "guru_kelas_1"
  | "guru_kelas_2"
  | "guru_kelas_3"
  | "guru_kelas_4"
  | "guru_kelas_5"
  | "guru_kelas_6";


export type BookStatus =
  | "active"
  | "hidden"
  | "archived";


export interface Book {
  id: string;

  title: string;

  synopsis: string | null;

  category: BookCategory;

  cover_url: string | null;

  pdf_path: string | null;

  allow_download: boolean;

  status: BookStatus;

  created_at: string;

  updated_at: string;
}


export interface CreateBookInput {
  title: string;

  synopsis?: string | null;

  category: BookCategory;

  coverUrl?: string | null;

  pdfPath?: string | null;

  allowDownload?: boolean;

  status?: BookStatus;
}


export interface UpdateBookInput {
  title?: string;

  synopsis?: string | null;

  category?: BookCategory;

  coverUrl?: string | null;

  pdfPath?: string | null;

  allowDownload?: boolean;

  status?: BookStatus;
}


/**
 * =========================================================
 * CONSTANTS
 * =========================================================
 */

export const STUDENT_CATEGORIES: BookCategory[] = [
  "siswa_umum",
  "siswa_pai",
];


export const TEACHER_CATEGORIES: BookCategory[] = [
  "guru_kelas_1",
  "guru_kelas_2",
  "guru_kelas_3",
  "guru_kelas_4",
  "guru_kelas_5",
  "guru_kelas_6",
];


export const ALL_BOOK_CATEGORIES: BookCategory[] = [
  ...STUDENT_CATEGORIES,
  ...TEACHER_CATEGORIES,
];


export const CATEGORY_LABELS: Record<
  BookCategory,
  string
> = {
  siswa_umum:
    "Buku Siswa - Buku Umum",

  siswa_pai:
    "Buku Siswa - PAI / Agama",

  guru_kelas_1:
    "Buku Guru - Kelas 1",

  guru_kelas_2:
    "Buku Guru - Kelas 2",

  guru_kelas_3:
    "Buku Guru - Kelas 3",

  guru_kelas_4:
    "Buku Guru - Kelas 4",

  guru_kelas_5:
    "Buku Guru - Kelas 5",

  guru_kelas_6:
    "Buku Guru - Kelas 6",
};


/**
 * =========================================================
 * VALIDATION
 * =========================================================
 */

function isValidCategory(
  category: string
): category is BookCategory {
  return ALL_BOOK_CATEGORIES.includes(
    category as BookCategory
  );
}


function validateBookInput(
  input: CreateBookInput
): string | null {
  if (
    !input.title ||
    input.title.trim().length < 2
  ) {
    return "Judul buku wajib diisi.";
  }

  if (
    input.title.trim().length > 200
  ) {
    return "Judul buku terlalu panjang.";
  }

  if (
    !isValidCategory(
      input.category
    )
  ) {
    return "Kategori buku tidak valid.";
  }

  if (
    input.synopsis &&
    input.synopsis.length > 10000
  ) {
    return "Sinopsis terlalu panjang.";
  }

  return null;
}


/**
 * =========================================================
 * ACCESS CONTROL
 * =========================================================
 *
 * User:
 * - boleh membaca Buku Siswa
 * - TIDAK boleh membaca Buku Guru
 *
 * Admin:
 * - dapat mengelola buku sesuai sistem
 *
 * Developer:
 * - dapat mengelola seluruh buku
 */

async function requireBookManager() {
  const profile =
    await getAuthProfile();

  if (!profile) {
    return {
      allowed: false,
      profile: null,
      error: "Silakan login terlebih dahulu.",
    };
  }

  const role =
    profile.role as UserRole;

  if (
    role !== "admin" &&
    role !== "developer"
  ) {
    return {
      allowed: false,
      profile,
      error:
        "Anda tidak memiliki akses untuk mengelola buku.",
    };
  }

  return {
    allowed: true,
    profile,
    error: null,
  };
}


/**
 * =========================================================
 * GET BOOKS
 * =========================================================
 */

export async function getBooks(
  options?: {
    category?: BookCategory | null;

    search?: string | null;

    includeHidden?: boolean;

    page?: number;

    limit?: number;
  }
) {
  const page = Math.max(
    1,
    options?.page ?? 1
  );

  const limit = Math.min(
    100,
    Math.max(
      1,
      options?.limit ?? 20
    )
  );

  const from =
    (page - 1) * limit;

  const to =
    from + limit - 1;

  let query =
    supabaseAdmin
      .from("books")
      .select(
        "*",
        {
          count: "exact",
        }
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      )
      .range(
        from,
        to
      );

  /**
   * Secara default hanya buku aktif.
   */
  if (
    !options?.includeHidden
  ) {
    query =
      query.eq(
        "status",
        "active"
      );
  }

  if (
    options?.category
  ) {
    query =
      query.eq(
        "category",
        options.category
      );
  }

  if (
    options?.search
  ) {
    const search =
      options.search
        .trim()
        .replace(
          /[%_]/g,
          ""
        );

    if (search) {
      query =
        query.ilike(
          "title",
          `%${search}%`
        );
    }
  }

  const {
    data,
    count,
    error,
  } = await query;

  if (error) {
    return {
      success: false,
      data: [],
      total: 0,
      error: error.message,
    };
  }

  return {
    success: true,
    data:
      (data ?? []) as Book[],
    total:
      count ?? 0,
    page,
    limit,
  };
}


/**
 * =========================================================
 * GET BOOK BY ID
 * =========================================================
 */

export async function getBookById(
  bookId: string
) {
  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from("books")
      .select("*")
      .eq(
        "id",
        bookId
      )
      .maybeSingle();

  if (error) {
    return {
      success: false,
      data: null,
      error: error.message,
    };
  }

  if (!data) {
    return {
      success: false,
      data: null,
      error: "Buku tidak ditemukan.",
    };
  }

  return {
    success: true,
    data: data as Book,
  };
}


/**
 * =========================================================
 * GET BOOKS BY CATEGORY
 * =========================================================
 */

export async function getBooksByCategory(
  category: BookCategory,
  options?: {
    search?: string | null;
    page?: number;
    limit?: number;
  }
) {
  return getBooks({
    category,
    search:
      options?.search ?? null,
    page:
      options?.page ?? 1,
    limit:
      options?.limit ?? 20,
  });
}


/**
 * =========================================================
 * CREATE BOOK
 * =========================================================
 */

export async function createBook(
  input: CreateBookInput
) {
  const access =
    await requireBookManager();

  if (!access.allowed) {
    return {
      success: false,
      error:
        access.error ??
        "Tidak memiliki akses.",
    };
  }

  const validation =
    validateBookInput(
      input
    );

  if (validation) {
    return {
      success: false,
      error: validation,
    };
  }

  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from("books")
      .insert({
        title:
          input.title.trim(),

        synopsis:
          input.synopsis?.trim() ??
          null,

        category:
          input.category,

        cover_url:
          input.coverUrl ??
          null,

        pdf_path:
          input.pdfPath ??
          null,

        allow_download:
          input.allowDownload ??
          true,

        status:
          input.status ??
          "active",
      })
      .select("*")
      .single();

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  await historyBookCreated(
    data.id,
    data.title
  );

  return {
    success: true,
    data: data as Book,
  };
}


/**
 * =========================================================
 * UPDATE BOOK
 * =========================================================
 */

export async function updateBook(
  bookId: string,
  input: UpdateBookInput
) {
  const access =
    await requireBookManager();

  if (!access.allowed) {
    return {
      success: false,
      error:
        access.error ??
        "Tidak memiliki akses.",
    };
  }

  if (
    input.title !== undefined &&
    (
      !input.title.trim() ||
      input.title.trim().length < 2
    )
  ) {
    return {
      success: false,
      error:
        "Judul buku tidak valid.",
    };
  }

  if (
    input.category !== undefined &&
    !isValidCategory(
      input.category
    )
  ) {
    return {
      success: false,
      error:
        "Kategori buku tidak valid.",
    };
  }

  const updateData: Record<
    string,
    unknown
  > = {};

  if (
    input.title !== undefined
  ) {
    updateData.title =
      input.title.trim();
  }

  if (
    input.synopsis !== undefined
  ) {
    updateData.synopsis =
      input.synopsis?.trim() ??
      null;
  }

  if (
    input.category !== undefined
  ) {
    updateData.category =
      input.category;
  }

  if (
    input.coverUrl !== undefined
  ) {
    updateData.cover_url =
      input.coverUrl;
  }

  if (
    input.pdfPath !== undefined
  ) {
    updateData.pdf_path =
      input.pdfPath;
  }

  if (
    input.allowDownload !== undefined
  ) {
    updateData.allow_download =
      input.allowDownload;
  }

  if (
    input.status !== undefined
  ) {
    updateData.status =
      input.status;
  }

  updateData.updated_at =
    new Date().toISOString();

  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from("books")
      .update(
        updateData
      )
      .eq(
        "id",
        bookId
      )
      .select("*")
      .single();

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  await historyBookUpdated(
    bookId,
    `Memperbarui buku "${data.title}".`
  );

  return {
    success: true,
    data: data as Book,
  };
}


/**
 * =========================================================
 * UPDATE BOOK TITLE
 * =========================================================
 */

export async function updateBookTitle(
  bookId: string,
  title: string
) {
  return updateBook(
    bookId,
    {
      title,
    }
  );
}


/**
 * =========================================================
 * UPDATE BOOK SYNOPSIS
 * =========================================================
 */

export async function updateBookSynopsis(
  bookId: string,
  synopsis: string
) {
  return updateBook(
    bookId,
    {
      synopsis,
    }
  );
}


/**
 * =========================================================
 * UPDATE BOOK CATEGORY
 * =========================================================
 */

export async function updateBookCategory(
  bookId: string,
  category: BookCategory
) {
  return updateBook(
    bookId,
    {
      category,
    }
  );
}


/**
 * =========================================================
 * UPDATE PDF PATH
 * =========================================================
 *
 * Fungsi ini hanya mengubah referensi PDF.
 *
 * Upload file sebenarnya dilakukan oleh
 * app/lib/storage.ts.
 */

export async function updateBookPdfPath(
  bookId: string,
  pdfPath: string
) {
  const existing =
    await getBookById(
      bookId
    );

  if (
    !existing.success ||
    !existing.data
  ) {
    return existing;
  }

  const hadPdf =
    Boolean(
      existing.data.pdf_path
    );

  const result =
    await updateBook(
      bookId,
      {
        pdfPath,
      }
    );

  if (
    !result.success
  ) {
    return result;
  }

  if (hadPdf) {
    await historyBookPdfReplaced(
      bookId,
      result.data?.title
    );
  } else {
    await historyBookPdfUploaded(
      bookId,
      result.data?.title
    );
  }

  return result;
}


/**
 * =========================================================
 * DELETE BOOK
 * =========================================================
 */

export async function deleteBook(
  bookId: string
) {
  const access =
    await requireBookManager();

  if (!access.allowed) {
    return {
      success: false,
      error:
        access.error ??
        "Tidak memiliki akses.",
    };
  }

  const existing =
    await getBookById(
      bookId
    );

  if (
    !existing.success ||
    !existing.data
  ) {
    return {
      success: false,
      error:
        existing.error ??
        "Buku tidak ditemukan.",
    };
  }

  const {
    error,
  } =
    await supabaseAdmin
      .from("books")
      .delete()
      .eq(
        "id",
        bookId
      );

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  await historyBookDeleted(
    bookId,
    existing.data.title
  );

  return {
    success: true,
  };
}


/**
 * =========================================================
 * ARCHIVE BOOK
 * =========================================================
 *
 * Alternatif lebih aman daripada menghapus.
 */

export async function archiveBook(
  bookId: string
) {
  return updateBook(
    bookId,
    {
      status:
        "archived",
    }
  );
}


/**
 * =========================================================
 * HIDE BOOK
 * =========================================================
 */

export async function hideBook(
  bookId: string
) {
  return updateBook(
    bookId,
    {
      status:
        "hidden",
    }
  );
}


/**
 * =========================================================
 * SHOW BOOK
 * =========================================================
 */

export async function showBook(
  bookId: string
) {
  return updateBook(
    bookId,
    {
      status:
        "active",
    }
  );
}


/**
 * =========================================================
 * DOWNLOAD PERMISSION
 * =========================================================
 */

export async function setDownloadPermission(
  bookId: string,
  allowed: boolean
) {
  const access =
    await requireBookManager();

  if (!access.allowed) {
    return {
      success: false,
      error:
        access.error ??
        "Tidak memiliki akses.",
    };
  }

  const existing =
    await getBookById(
      bookId
    );

  if (
    !existing.success ||
    !existing.data
  ) {
    return {
      success: false,
      error:
        existing.error ??
        "Buku tidak ditemukan.",
    };
  }

  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from("books")
      .update({
        allow_download:
          allowed,

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        bookId
      )
      .select("*")
      .single();

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  await historyDownloadPermissionChanged(
    bookId,
    allowed,
    existing.data.title
  );

  return {
    success: true,
    data: data as Book,
  };
}


/**
 * =========================================================
 * GET PDF ACCESS
 * =========================================================
 *
 * PENTING:
 *
 * Fungsi ini tidak otomatis mendownload PDF.
 *
 * Tujuannya adalah menghasilkan URL sementara
 * untuk ditampilkan di PDF viewer/browser.
 *
 * allow_download HANYA mengatur tombol download.
 *
 * Jadi:
 *
 * allow_download = false
 * -> PDF tetap bisa dibaca
 * -> tombol download tidak diberikan
 *
 * allow_download = true
 * -> PDF bisa dibaca
 * -> tombol download diberikan
 *
 * =========================================================
 */

export async function getBookPdfAccess(
  bookId: string
) {
  const profile =
    await getAuthProfile();

  if (!profile) {
    return {
      success: false,
      previewUrl: null,
      downloadUrl: null,
      allowDownload: false,
      error:
        "Silakan login terlebih dahulu.",
    };
  }

  const result =
    await getBookById(
      bookId
    );

  if (
    !result.success ||
    !result.data
  ) {
    return {
      success: false,
      previewUrl: null,
      downloadUrl: null,
      allowDownload: false,
      error:
        result.error ??
        "Buku tidak ditemukan.",
    };
  }

  const book =
    result.data;

  /**
   * Buku harus mempunyai PDF.
   */
  if (
    !book.pdf_path
  ) {
    return {
      success: false,
      previewUrl: null,
      downloadUrl: null,
      allowDownload:
        book.allow_download,
      error:
        "File PDF buku belum tersedia.",
    };
  }

  /**
   * User biasa hanya boleh membuka
   * Buku Siswa.
   *
   * Buku Guru khusus guru/admin/developer.
   */
  const isTeacherBook =
    TEACHER_CATEGORIES.includes(
      book.category
    );

  if (
    profile.role === "user" &&
    isTeacherBook
  ) {
    return {
      success: false,
      previewUrl: null,
      downloadUrl: null,
      allowDownload: false,
      error:
        "Buku Guru hanya dapat diakses oleh pihak yang berwenang.",
    };
  }

  /**
   * Signed URL.
   *
   * Masa berlaku dibuat pendek agar file
   * tidak menggunakan URL publik permanen.
   */
  const expiresIn =
    60 * 15;

  const {
    data,
    error,
  } =
    await supabaseAdmin
      .storage
      .from("books")
      .createSignedUrl(
        book.pdf_path,
        expiresIn
      );

  if (error) {
    return {
      success: false,
      previewUrl: null,
      downloadUrl: null,
      allowDownload:
        book.allow_download,
      error:
        error.message,
    };
  }

  await historyBookViewed(
    book.id,
    book.title
  );

  return {
    success: true,

    /**
     * Browser/PDF viewer membuka URL ini.
     */
    previewUrl:
      data.signedUrl,

    /**
     * HANYA dikembalikan jika download
     * memang diperbolehkan.
     */
    downloadUrl:
      book.allow_download
        ? data.signedUrl
        : null,

    allowDownload:
      book.allow_download,

    expiresIn,

    book,
  };
}


/**
 * =========================================================
 * REGISTER DOWNLOAD
 * =========================================================
 *
 * Dipanggil ketika user benar-benar menekan
 * tombol download.
 *
 * Fungsi ini TIDAK memberikan izin download.
 *
 * Izin tetap berasal dari:
 *
 * book.allow_download
 *
 * =========================================================
 */

export async function registerBookDownload(
  bookId: string
) {
  const profile =
    await getAuthProfile();

  if (!profile) {
    return {
      success: false,
      error:
        "Silakan login terlebih dahulu.",
    };
  }

  const result =
    await getBookById(
      bookId
    );

  if (
    !result.success ||
    !result.data
  ) {
    return {
      success: false,
      error:
        result.error ??
        "Buku tidak ditemukan.",
    };
  }

  const book =
    result.data;

  if (
    !book.allow_download
  ) {
    return {
      success: false,
      error:
        "Download buku ini tidak diizinkan.",
    };
  }

  if (
    !book.pdf_path
  ) {
    return {
      success: false,
      error:
        "File PDF belum tersedia.",
    };
  }

  const isTeacherBook =
    TEACHER_CATEGORIES.includes(
      book.category
    );

  if (
    profile.role === "user" &&
    isTeacherBook
  ) {
    return {
      success: false,
      error:
        "Anda tidak memiliki akses ke buku guru.",
    };
  }

  await historyBookDownloaded(
    book.id,
    book.title
  );

  return {
    success: true,
  };
}


/**
 * =========================================================
 * DELETE PDF REFERENCE
 * =========================================================
 *
 * Hanya menghapus referensi dari database.
 *
 * File Storage sebaiknya dihapus melalui
 * app/lib/storage.ts terlebih dahulu.
 */

export async function deleteBookPdfReference(
  bookId: string
) {
  const access =
    await requireBookManager();

  if (!access.allowed) {
    return {
      success: false,
      error:
        access.error ??
        "Tidak memiliki akses.",
    };
  }

  const existing =
    await getBookById(
      bookId
    );

  if (
    !existing.success ||
    !existing.data
  ) {
    return {
      success: false,
      error:
        existing.error ??
        "Buku tidak ditemukan.",
    };
  }

  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from("books")
      .update({
        pdf_path:
          null,

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        bookId
      )
      .select("*")
      .single();

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  await historyBookPdfDeleted(
    bookId,
    existing.data.title
  );

  return {
    success: true,
    data: data as Book,
  };
}


/**
 * =========================================================
 * CATEGORY HELPERS
 * =========================================================
 */

export function isStudentBookCategory(
  category: BookCategory
) {
  return STUDENT_CATEGORIES.includes(
    category
  );
}


export function isTeacherBookCategory(
  category: BookCategory
) {
  return TEACHER_CATEGORIES.includes(
    category
  );
}


export function getCategoryLabel(
  category: BookCategory
) {
  return (
    CATEGORY_LABELS[category] ??
    category
  );
}


/**
 * =========================================================
 * CHECK BOOK ACCESS
 * =========================================================
 */

export async function canAccessBook(
  book: Book
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

  /**
   * Admin dan developer dapat mengakses
   * seluruh kategori.
   */
  if (
    profile.role === "admin" ||
    profile.role === "developer"
  ) {
    return {
      allowed: true,
      reason: null,
    };
  }

  /**
   * User biasa hanya Buku Siswa.
   */
  if (
    profile.role === "user"
  ) {
    if (
      isStudentBookCategory(
        book.category
      )
    ) {
      return {
        allowed: true,
        reason: null,
      };
    }

    return {
      allowed: false,
      reason:
        "Buku Guru hanya dapat diakses oleh pihak yang berwenang.",
    };
  }

  return {
    allowed: false,
    reason:
      "Role tidak valid.",
  };
}


/**
 * =========================================================
 * SEARCH BOOKS
 * =========================================================
 */

export async function searchBooks(
  search: string,
  options?: {
    category?: BookCategory | null;

    page?: number;

    limit?: number;
  }
) {
  return getBooks({
    search,
    category:
      options?.category ??
      null,
    page:
      options?.page ?? 1,
    limit:
      options?.limit ?? 20,
  });
    }
