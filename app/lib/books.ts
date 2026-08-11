import {
  createDownloadSignedUrl,
  createStorageSignedUrl,
  deleteBookPdf,
  deleteBookStorageFolder,
  replaceBookPdf,
  uploadBookCover,
  uploadBookPdf,
  validatePdfFile,
} from "@/app/lib/storage";

import {
  requireAdmin,
  requireAuth,
} from "@/app/lib/auth";

import {
  canManageBooks,
  canChangeDownloadPermission,
} from "@/app/lib/permissions";

import {
  supabaseAdmin,
} from "@/app/lib/supabase/admin";


/**
 * =========================================================
 * BOOK TYPES
 * =========================================================
 */

export type BookAudience =
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


export interface Book {
  id: string;

  title: string;

  slug: string | null;

  synopsis: string | null;

  cover_path: string | null;

  pdf_path: string | null;

  allow_download: boolean;

  audience: BookAudience;

  student_category:
    | StudentBookCategory
    | null;

  teacher_class:
    | TeacherClass
    | null;

  is_active: boolean;

  created_at: string;

  updated_at: string;
}


/**
 * =========================================================
 * BOOK VIEW RESULT
 * =========================================================
 */

export interface BookPdfResult {
  success: boolean;

  url: string | null;

  error?: string;
}


/**
 * =========================================================
 * CONSTANTS
 * =========================================================
 */

const BOOK_SELECT = `
  id,
  title,
  slug,
  synopsis,
  cover_path,
  pdf_path,
  allow_download,
  audience,
  student_category,
  teacher_class,
  is_active,
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


function createSlug(
  title: string
) {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[^a-z0-9]+/g,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      ""
    )
    .substring(
      0,
      120
    );
}


/**
 * =========================================================
 * VALIDATE BOOK DATA
 * =========================================================
 */

function validateBookData(
  input: {
    title?: string;

    synopsis?: string;

    audience?: BookAudience;

    studentCategory?:
      | StudentBookCategory
      | null;

    teacherClass?:
      | TeacherClass
      | null;
  }
) {
  const title =
    cleanString(
      input.title
    );

  if (
    title.length <
    1
  ) {
    return {
      valid: false,

      error:
        "Judul buku wajib diisi.",
    };
  }


  if (
    title.length >
    255
  ) {
    return {
      valid: false,

      error:
        "Judul buku maksimal 255 karakter.",
    };
  }


  const synopsis =
    cleanString(
      input.synopsis
    );


  if (
    synopsis.length >
    10000
  ) {
    return {
      valid: false,

      error:
        "Sinopsis terlalu panjang.",
    };
  }


  if (
    input.audience !==
      "student" &&
    input.audience !==
      "teacher"
  ) {
    return {
      valid: false,

      error:
        "Kategori buku tidak valid.",
    };
  }


  if (
    input.audience ===
    "student"
  ) {
    if (
      input.studentCategory !==
        "general" &&
      input.studentCategory !==
        "religion"
    ) {
      return {
        valid: false,

        error:
          "Kategori Buku Siswa tidak valid.",
      };
    }
  }


  if (
    input.audience ===
    "teacher"
  ) {
    const classLevel =
      Number(
        input.teacherClass
      );


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
        valid: false,

        error:
          "Kelas Buku Guru harus 1 sampai 6.",
      };
    }
  }


  return {
    valid: true,

    error: null,
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
  if (
    !bookId
  ) {
    return {
      success: false,

      data: null,

      error:
        "Book ID tidak valid.",
    };
  }


  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from("books")
      .select(
        BOOK_SELECT
      )
      .eq(
        "id",
        bookId
      )
      .eq(
        "is_active",
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


  if (!data) {
    return {
      success: false,

      data: null,

      error:
        "Buku tidak ditemukan.",
    };
  }


  return {
    success: true,

    data:
      data as Book,
  };
}


/**
 * =========================================================
 * GET ALL BOOKS
 * =========================================================
 */

export async function getBooks(
  filters?: {
    audience?:
      | BookAudience;

    studentCategory?:
      | StudentBookCategory;

    teacherClass?:
      | TeacherClass;

    search?: string;

    includeInactive?: boolean;
  }
) {
  const context =
    await requireAuth();


  let query =
    supabaseAdmin
      .from("books")
      .select(
        BOOK_SELECT
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      );


  /**
   * Normal user hanya melihat
   * buku aktif.
   *
   * Admin/developer dapat melihat
   * buku inactive ketika diminta.
   */

  if (
    !filters?.includeInactive ||
    (
      context.role !==
        "admin" &&
      context.role !==
        "developer"
    )
  ) {
    query =
      query.eq(
        "is_active",
        true
      );
  }


  if (
    filters?.audience
  ) {
    query =
      query.eq(
        "audience",
        filters.audience
      );
  }


  if (
    filters?.studentCategory
  ) {
    query =
      query.eq(
        "student_category",
        filters.studentCategory
      );
  }


  if (
    filters?.teacherClass
  ) {
    query =
      query.eq(
        "teacher_class",
        filters.teacherClass
      );
  }


  const search =
    cleanString(
      filters?.search
    );


  if (search) {
    query =
      query.ilike(
        "title",
        `%${search}%`
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


  return {
    success: true,

    data:
      (data ??
        []) as Book[],
  };
}


/**
 * =========================================================
 * GET STUDENT BOOKS
 * =========================================================
 */

export async function getStudentBooks(
  category?:
    | StudentBookCategory
) {
  return getBooks({
    audience:
      "student",

    studentCategory:
      category,
  });
}


/**
 * =========================================================
 * GET TEACHER BOOKS
 * =========================================================
 */

export async function getTeacherBooks(
  teacherClass?:
    | TeacherClass
) {
  return getBooks({
    audience:
      "teacher",

    teacherClass,
  });
}


/**
 * =========================================================
 * SEARCH BOOKS
 * =========================================================
 */

export async function searchBooks(
  search: string
) {
  return getBooks({
    search,
  });
}


/**
 * =========================================================
 * CREATE BOOK
 * =========================================================
 *
 * Admin + Developer.
 *
 * PDF optional saat membuat data buku.
 * Setelah data dibuat, PDF dapat diupload.
 * =========================================================
 */

export async function createBook(
  input: {
    title: string;

    synopsis?: string;

    audience: BookAudience;

    studentCategory?:
      | StudentBookCategory
      | null;

    teacherClass?:
      | TeacherClass
      | null;

    allowDownload?: boolean;
  }
) {
  const context =
    await requireAdmin();


  if (
    !canManageBooks(
      context.role
    )
  ) {
    return {
      success: false,

      data: null,

      error:
        "Anda tidak memiliki izin mengelola buku.",
    };
  }


  const validation =
    validateBookData(
      input
    );


  if (
    !validation.valid
  ) {
    return {
      success: false,

      data: null,

      error:
        validation.error ??
        "Data buku tidak valid.",
    };
  }


  const title =
    cleanString(
      input.title
    );


  const synopsis =
    cleanString(
      input.synopsis
    );


  let slug =
    createSlug(
      title
    );


  /**
   * Pastikan slug unik.
   */

  const {
    data:
      existingSlug,
  } =
    await supabaseAdmin
      .from("books")
      .select("id")
      .eq(
        "slug",
        slug
      )
      .maybeSingle();


  if (
    existingSlug
  ) {
    slug =
      `${slug}-${Date.now()}`;
  }


  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from("books")
      .insert({
        title,

        slug,

        synopsis:
          synopsis ||
          null,

        audience:
          input.audience,

        student_category:
          input.audience ===
          "student"
            ? input.studentCategory
            : null,

        teacher_class:
          input.audience ===
          "teacher"
            ? input.teacherClass
            : null,

        allow_download:
          input.allowDownload ??
          true,

        is_active:
          true,
      })
      .select(
        BOOK_SELECT
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
      data as Book,
  };
}


/**
 * =========================================================
 * UPDATE BOOK
 * =========================================================
 */

export async function updateBook(
  bookId: string,
  input: {
    title?: string;

    synopsis?: string;

    audience?:
      | BookAudience;

    studentCategory?:
      | StudentBookCategory
      | null;

    teacherClass?:
      | TeacherClass
      | null;

    allowDownload?: boolean;

    isActive?: boolean;
  }
) {
  const context =
    await requireAdmin();


  if (
    !canManageBooks(
      context.role
    )
  ) {
    return {
      success: false,

      data: null,

      error:
        "Anda tidak memiliki izin mengelola buku.",
    };
  }


  if (
    !bookId
  ) {
    return {
      success: false,

      data: null,

      error:
        "Book ID tidak valid.",
    };
  }


  const current =
    await getBookById(
      bookId
    );


  if (
    !current.success ||
    !current.data
  ) {
    return {
      success: false,

      data: null,

      error:
        current.error ??
        "Buku tidak ditemukan.",
    };
  }


  const currentBook =
    current.data;


  const nextAudience =
    input.audience ??
    currentBook.audience;


  const nextStudentCategory =
    input.studentCategory !==
      undefined
      ? input.studentCategory
      : currentBook.student_category;


  const nextTeacherClass =
    input.teacherClass !==
      undefined
      ? input.teacherClass
      : currentBook.teacher_class;


  const validation =
    validateBookData({
      title:
        input.title ??
        currentBook.title,

      synopsis:
        input.synopsis ??
        currentBook.synopsis ??
        "",

      audience:
        nextAudience,

      studentCategory:
        nextStudentCategory,

      teacherClass:
        nextTeacherClass,
    });


  if (
    !validation.valid
  ) {
    return {
      success: false,

      data: null,

      error:
        validation.error ??
        "Data buku tidak valid.",
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


    updateData.title =
      title;


    updateData.slug =
      createSlug(
        title
      );
  }


  if (
    input.synopsis !==
    undefined
  ) {
    updateData.synopsis =
      cleanString(
        input.synopsis
      ) ||
      null;
  }


  if (
    input.audience !==
    undefined
  ) {
    updateData.audience =
      input.audience;


    if (
      input.audience ===
      "student"
    ) {
      updateData.teacher_class =
        null;
    }


    if (
      input.audience ===
      "teacher"
    ) {
      updateData.student_category =
        null;
    }
  }


  if (
    input.studentCategory !==
    undefined
  ) {
    updateData.student_category =
      input.studentCategory;
  }


  if (
    input.teacherClass !==
    undefined
  ) {
    updateData.teacher_class =
      input.teacherClass;
  }


  if (
    input.allowDownload !==
    undefined
  ) {
    if (
      !canChangeDownloadPermission(
        context.role
      )
    ) {
      return {
        success: false,

        data: null,

        error:
          "Anda tidak memiliki izin mengubah izin download.",
      };
    }


    updateData.allow_download =
      input.allowDownload;
  }


  if (
    input.isActive !==
    undefined
  ) {
    updateData.is_active =
      input.isActive;
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
      .select(
        BOOK_SELECT
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
      data as Book,
  };
}


/**
 * =========================================================
 * DELETE BOOK
 * =========================================================
 */

export async function deleteBook(
  bookId: string
) {
  const context =
    await requireAdmin();


  if (
    !canManageBooks(
      context.role
    )
  ) {
    return {
      success: false,

      error:
        "Anda tidak memiliki izin menghapus buku.",
    };
  }


  const {
    data:
      book,
    error:
      fetchError,
  } =
    await supabaseAdmin
      .from("books")
      .select(
        `
          id,
          pdf_path,
          cover_path
        `
      )
      .eq(
        "id",
        bookId
      )
      .maybeSingle();


  if (
    fetchError
  ) {
    return {
      success: false,

      error:
        fetchError.message,
    };
  }


  if (!book) {
    return {
      success: false,

      error:
        "Buku tidak ditemukan.",
    };
  }


  /**
   * Hapus record database terlebih dahulu.
   */

  const {
    error:
      deleteError,
  } =
    await supabaseAdmin
      .from("books")
      .delete()
      .eq(
        "id",
        bookId
      );


  if (
    deleteError
  ) {
    return {
      success: false,

      error:
        deleteError.message,
    };
  }


  /**
   * Bersihkan file Storage.
   */

  const cleanup =
    await deleteBookStorageFolder(
      bookId
    );


  if (
    !cleanup.success
  ) {
    console.error(
      "Book storage cleanup error:",
      cleanup.error
    );
  }


  return {
    success: true,
  };
}


/**
 * =========================================================
 * UPLOAD BOOK PDF
 * =========================================================
 */

export async function uploadPdfToBook(
  bookId: string,
  file: File
) {
  const context =
    await requireAdmin();


  if (
    !canManageBooks(
      context.role
    )
  ) {
    return {
      success: false,

      error:
        "Anda tidak memiliki izin mengupload PDF.",
    };
  }


  const validation =
    validatePdfFile(
      file
    );


  if (
    !validation.valid
  ) {
    return {
      success: false,

      error:
        validation.error ??
        "PDF tidak valid.",
    };
  }


  const {
    data:
      book,
    error:
      fetchError,
  } =
    await supabaseAdmin
      .from("books")
      .select(
        `
          id,
          pdf_path
        `
      )
      .eq(
        "id",
        bookId
      )
      .maybeSingle();


  if (
    fetchError
  ) {
    return {
      success: false,

      error:
        fetchError.message,
    };
  }


  if (!book) {
    return {
      success: false,

      error:
        "Buku tidak ditemukan.",
    };
  }


  /**
   * Upload PDF baru.
   *
   * PDF lama otomatis dihapus setelah
   * upload baru berhasil.
   */

  const result =
    await replaceBookPdf(
      file,
      bookId,
      book.pdf_path
    );


  if (
    !result.success ||
    !result.path
  ) {
    return {
      success: false,

      error:
        result.error ??
        "Gagal mengupload PDF.",
    };
  }


  const {
    error:
      updateError,
  } =
    await supabaseAdmin
      .from("books")
      .update({
        pdf_path:
          result.path,

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        bookId
      );


  if (
    updateError
  ) {
    /**
     * Jika database gagal diperbarui,
     * file baru tetap ada.
     *
     * Jangan menghapus file baru secara
     * otomatis karena bisa menyebabkan
     * kehilangan data.
     */

    return {
      success: false,

      error:
        updateError.message,
    };
  }


  return {
    success: true,

    path:
      result.path,
  };
}


/**
 * =========================================================
 * REPLACE PDF ALIAS
 * =========================================================
 */

export async function replacePdf(
  bookId: string,
  file: File
) {
  return uploadPdfToBook(
    bookId,
    file
  );
}


/**
 * =========================================================
 * DELETE PDF ONLY
 * =========================================================
 *
 * Menghapus PDF tetapi mempertahankan
 * data buku.
 * =========================================================
 */

export async function removeBookPdf(
  bookId: string
) {
  const context =
    await requireAdmin();


  if (
    !canManageBooks(
      context.role
    )
  ) {
    return {
      success: false,

      error:
        "Anda tidak memiliki izin.",
    };
  }


  const {
    data:
      book,
    error:
      fetchError,
  } =
    await supabaseAdmin
      .from("books")
      .select(
        `
          id,
          pdf_path
        `
      )
      .eq(
        "id",
        bookId
      )
      .maybeSingle();


  if (
    fetchError
  ) {
    return {
      success: false,

      error:
        fetchError.message,
    };
  }


  if (!book) {
    return {
      success: false,

      error:
        "Buku tidak ditemukan.",
    };
  }


  if (
    book.pdf_path
  ) {
    const result =
      await deleteBookPdf(
        book.pdf_path
      );


    if (
      !result.success
    ) {
      return {
        success: false,

        error:
          result.error ??
          "Gagal menghapus PDF.",
      };
    }
  }


  const {
    error:
      updateError,
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
      );


  if (
    updateError
  ) {
    return {
      success: false,

      error:
        updateError.message,
    };
  }


  return {
    success: true,
  };
}


/**
 * =========================================================
 * UPLOAD BOOK COVER
 * =========================================================
 */

export async function uploadCoverToBook(
  bookId: string,
  file: File
) {
  const context =
    await requireAdmin();


  if (
    !canManageBooks(
      context.role
    )
  ) {
    return {
      success: false,

      error:
        "Anda tidak memiliki izin mengupload cover.",
    };
  }


  const {
    data:
      book,
    error:
      fetchError,
  } =
    await supabaseAdmin
      .from("books")
      .select(
        `
          id,
          cover_path
        `
      )
      .eq(
        "id",
        bookId
      )
      .maybeSingle();


  if (
    fetchError
  ) {
    return {
      success: false,

      error:
        fetchError.message,
    };
  }


  if (!book) {
    return {
      success: false,

      error:
        "Buku tidak ditemukan.",
    };
  }


  const result =
    await uploadBookCover(
      file,
      bookId
    );


  if (
    !result.success ||
    !result.path
  ) {
    return {
      success: false,

      error:
        result.error ??
        "Gagal mengupload cover.",
    };
  }


  /**
   * Hapus cover lama setelah cover baru
   * berhasil diupload.
   */

  if (
    book.cover_path
  ) {
    const {
      error:
        removeError,
    } =
      await supabaseAdmin
        .storage
        .from("book-covers")
        .remove([
          book.cover_path,
        ]);


    if (
      removeError
    ) {
      console.error(
        "Gagal menghapus cover lama:",
        removeError
      );
    }
  }


  const {
    error:
      updateError,
  } =
    await supabaseAdmin
      .from("books")
      .update({
        cover_path:
          result.path,

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        bookId
      );


  if (
    updateError
  ) {
    return {
      success: false,

      error:
        updateError.message,
    };
  }


  return {
    success: true,

    path:
      result.path,
  };
}


/**
 * =========================================================
 * GET BOOK PDF FOR VIEWING
 * =========================================================
 *
 * INI UNTUK MEMBACA PDF DI WEBSITE.
 *
 * User TIDAK perlu mendownload PDF terlebih dahulu.
 *
 * Browser akan menerima signed URL kemudian
 * PDF dapat dibuka melalui PDF viewer/browser.
 *
 * =========================================================
 */

export async function getBookPdfForViewing(
  bookId: string
): Promise<BookPdfResult> {
  await requireAuth();


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

      url: null,

      error:
        result.error ??
        "Buku tidak ditemukan.",
    };
  }


  const book =
    result.data;


  if (
    !book.pdf_path
  ) {
    return {
      success: false,

      url: null,

      error:
        "PDF buku belum tersedia.",
    };
  }


  /**
   * Signed URL untuk membaca.
   *
   * Tidak tergantung allow_download.
   *
   * allow_download hanya menentukan apakah
   * user boleh melakukan download.
   */

  const signed =
    await createStorageSignedUrl(
      "books",
      book.pdf_path,
      60 * 30
    );


  if (
    !signed.success ||
    !signed.url
  ) {
    return {
      success: false,

      url: null,

      error:
        signed.error ??
        "Gagal membuat URL PDF.",
    };
  }


  return {
    success: true,

    url:
      signed.url,
  };
}


/**
 * =========================================================
 * GET BOOK PDF FOR DOWNLOAD
 * =========================================================
 *
 * Download hanya jika:
 *
 * book.allow_download === true
 *
 * Jika false:
 *
 * -> PDF tetap dapat dibaca
 * -> download ditolak
 *
 * =========================================================
 */

export async function getBookPdfForDownload(
  bookId: string
): Promise<BookPdfResult> {
  const context =
    await requireAuth();


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

      url: null,

      error:
        result.error ??
        "Buku tidak ditemukan.",
    };
  }


  const book =
    result.data;


  if (
    !book.pdf_path
  ) {
    return {
      success: false,

      url: null,

      error:
        "PDF buku belum tersedia.",
    };
  }


  /**
   * Cek permission download.
   */

  if (
    !book.allow_download
  ) {
    return {
      success: false,

      url: null,

      error:
        "Buku ini hanya dapat dibaca di website dan tidak diizinkan untuk didownload.",
    };
  }


  /**
   * Signed URL khusus download.
   */

  const signed =
    await createDownloadSignedUrl(
      "books",
      book.pdf_path,
      60 * 10
    );


  if (
    !signed.success ||
    !signed.url
  ) {
    return {
      success: false,

      url: null,

      error:
        signed.error ??
        "Gagal membuat link download.",
    };
  }


  return {
    success: true,

    url:
      signed.url,
  };
}


/**
 * =========================================================
 * CHECK DOWNLOAD PERMISSION
 * ========================================================= */

export async function canDownloadBook(
  bookId: string
) {
  await requireAuth();


  const result =
    await getBookById(
      bookId
    );


  if (
    !result.success ||
    !result.data
  ) {
    return false;
  }


  return Boolean(
    result.data
      .allow_download &&
      result.data
        .pdf_path
  );
}


/**
 * =========================================================
 * GET BOOK COVER URL
 * =========================================================
 */

export async function getBookCoverUrl(
  bookId: string
) {
  await requireAuth();


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

      url: null,
    };
  }


  const book =
    result.data;


  if (
    !book.cover_path
  ) {
    return {
      success: true,

      url: null,
    };
  }


  const signed =
    await createStorageSignedUrl(
      "book-covers",
      book.cover_path,
      60 * 60
    );


  if (
    !signed.success
  ) {
    return {
      success: false,

      url: null,

      error:
        signed.error,
    };
  }


  return {
    success: true,

    url:
      signed.url,
  };
}


/**
 * =========================================================
 * UPDATE DOWNLOAD PERMISSION
 * =========================================================
 */

export async function setBookDownloadPermission(
  bookId: string,
  allowDownload: boolean
) {
  const context =
    await requireAdmin();


  if (
    !canChangeDownloadPermission(
      context.role
    )
  ) {
    return {
      success: false,

      error:
        "Anda tidak memiliki izin mengubah perizinan download.",
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
          Boolean(
            allowDownload
          ),

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        bookId
      )
      .select(
        BOOK_SELECT
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
      data as Book,
  };
}


/**
 * =========================================================
 * ACTIVATE / DEACTIVATE BOOK
 * =========================================================
 */

export async function setBookActive(
  bookId: string,
  active: boolean
) {
  const context =
    await requireAdmin();


  if (
    !canManageBooks(
      context.role
    )
  ) {
    return {
      success: false,

      error:
        "Anda tidak memiliki izin.",
    };
  }


  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from("books")
      .update({
        is_active:
          Boolean(
            active
          ),

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        bookId
      )
      .select(
        BOOK_SELECT
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
      data as Book,
  };
}


/**
 * =========================================================
 * GET BOOK STATISTICS
 * =========================================================
 *
 * Digunakan untuk dashboard admin/developer.
 *
 * =========================================================
 */

export async function getBookStatistics() {
  const context =
    await requireAdmin();


  if (
    !canManageBooks(
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


  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from("books")
      .select(
        `
          id,
          audience,
          student_category,
          teacher_class,
          is_active,
          allow_download
        `
      );


  if (error) {
    return {
      success: false,

      data: null,

      error:
        error.message,
    };
  }


  const books =
    data ?? [];


  return {
    success: true,

    data: {
      total:
        books.length,

      active:
        books.filter(
          book =>
            book.is_active
        ).length,

      inactive:
        books.filter(
          book =>
            !book.is_active
        ).length,

      student:
        books.filter(
          book =>
            book.audience ===
            "student"
        ).length,

      teacher:
        books.filter(
          book =>
            book.audience ===
            "teacher"
        ).length,

      downloadable:
        books.filter(
          book =>
            book.allow_download
        ).length,

      readOnly:
        books.filter(
          book =>
            !book.allow_download
        ).length,
    },
  };
    }
