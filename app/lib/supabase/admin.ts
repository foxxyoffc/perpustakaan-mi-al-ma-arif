import { createClient } from "@supabase/supabase-js";

/**
 * =========================================================
 * SUPABASE ADMIN / SERVICE ROLE CLIENT
 * =========================================================
 *
 * FILE:
 * app/lib/supabase/admin.ts
 *
 * KHUSUS SERVER-SIDE.
 *
 * Digunakan untuk:
 * - Upload PDF buku
 * - Menghapus PDF lama
 * - Mengganti PDF
 * - Menghapus cover
 * - Operasi Storage yang membutuhkan service role
 * - Operasi administratif tertentu
 *
 * JANGAN:
 * - Import file ini dari Client Component
 * - Menggunakan SERVICE_ROLE_KEY di browser
 * - Menaruh SERVICE_ROLE_KEY dengan prefix NEXT_PUBLIC_
 *
 * Environment:
 *
 * NEXT_PUBLIC_SUPABASE_URL
 * SUPABASE_SERVICE_ROLE_KEY
 *
 * =========================================================
 */

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL belum diatur."
  );
}

if (!serviceRoleKey) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY belum diatur."
  );
}


/**
 * Admin Supabase client.
 *
 * auth:
 * - autoRefreshToken false
 * - persistSession false
 *
 * Karena client ini hanya digunakan di server.
 */
export const supabaseAdmin =
  createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );


/**
 * =========================================================
 * STORAGE CONFIGURATION
 * =========================================================
 *
 * Nama bucket ini harus sama dengan yang dibuat
 * pada migration 008_storage.sql.
 *
 * Jika pada migration kamu menggunakan nama berbeda,
 * ubah nilai BOOKS_BUCKET.
 */
export const BOOKS_BUCKET =
  "books";

export const COVERS_BUCKET =
  "book-covers";


/**
 * =========================================================
 * UPLOAD PDF
 * =========================================================
 */

export async function uploadBookPdf(
  file: File,
  storagePath: string
) {
  if (!file) {
    throw new Error(
      "File PDF tidak ditemukan."
    );
  }

  if (!storagePath) {
    throw new Error(
      "Storage path tidak boleh kosong."
    );
  }

  /**
   * Validasi MIME type.
   */
  if (
    file.type !==
    "application/pdf"
  ) {
    throw new Error(
      "File buku harus berformat PDF."
    );
  }


  /**
   * Batas aplikasi.
   *
   * Nilai ini bukan pengganti limit Supabase.
   * Kita sengaja memberi batas agar file yang terlalu
   * besar tidak diproses secara tidak sengaja.
   *
   * 50 MB.
   */
  const MAX_FILE_SIZE =
    50 * 1024 * 1024;

  if (
    file.size >
    MAX_FILE_SIZE
  ) {
    throw new Error(
      "Ukuran PDF maksimal 50 MB."
    );
  }


  const arrayBuffer =
    await file.arrayBuffer();

  const buffer =
    Buffer.from(arrayBuffer);


  const {
    data,
    error,
  } =
    await supabaseAdmin.storage
      .from(BOOKS_BUCKET)
      .upload(
        storagePath,
        buffer,
        {
          contentType:
            "application/pdf",

          cacheControl:
            "3600",

          upsert: false,
        }
      );


  if (error) {
    throw new Error(
      `Gagal upload PDF: ${error.message}`
    );
  }


  return data;
}


/**
 * =========================================================
 * REPLACE PDF
 * =========================================================
 *
 * Menghapus file lama kemudian upload file baru.
 *
 * Dipakai ketika admin/developer:
 * "Ganti file PDF".
 *
 * Catatan:
 * Fungsi ini menerima oldPath dan newPath.
 *
 * Jika ingin menggunakan path yang sama,
 * gunakan uploadBookPdf dengan upsert true
 * pada fungsi terpisah.
 */
export async function replaceBookPdf(
  oldStoragePath: string | null,
  newFile: File,
  newStoragePath: string
) {
  if (!newFile) {
    throw new Error(
      "File PDF baru tidak ditemukan."
    );
  }


  /**
   * Upload file baru terlebih dahulu.
   *
   * Ini lebih aman daripada menghapus file lama
   * terlebih dahulu.
   */
  const uploaded =
    await uploadBookPdf(
      newFile,
      newStoragePath
    );


  /**
   * Setelah file baru berhasil di-upload,
   * hapus file lama.
   */
  if (
    oldStoragePath &&
    oldStoragePath !== newStoragePath
  ) {
    const {
      error,
    } =
      await supabaseAdmin.storage
        .from(BOOKS_BUCKET)
        .remove([
          oldStoragePath,
        ]);


    /**
     * File baru sudah berhasil.
     *
     * Jika penghapusan file lama gagal,
     * jangan membatalkan seluruh operasi.
     *
     * Nanti error ini dapat dicatat ke history.
     */
    if (error) {
      console.error(
        "PDF baru berhasil diupload, tetapi PDF lama gagal dihapus:",
        error
      );
    }
  }

  return uploaded;
}


/**
 * =========================================================
 * DELETE PDF
 * =========================================================
 */

export async function deleteBookPdf(
  storagePath: string | null
) {
  if (!storagePath) {
    return {
      success: true,
      deleted: false,
    };
  }


  const {
    error,
  } =
    await supabaseAdmin.storage
      .from(BOOKS_BUCKET)
      .remove([
        storagePath,
      ]);


  if (error) {
    throw new Error(
      `Gagal menghapus PDF: ${error.message}`
    );
  }


  return {
    success: true,
    deleted: true,
  };
}


/**
 * =========================================================
 * UPLOAD BOOK COVER
 * =========================================================
 */

export async function uploadBookCover(
  file: File,
  storagePath: string
) {
  if (!file) {
    throw new Error(
      "File cover tidak ditemukan."
    );
  }


  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ];


  if (
    !allowedTypes.includes(
      file.type
    )
  ) {
    throw new Error(
      "Cover harus berupa JPG, PNG, atau WEBP."
    );
  }


  const MAX_COVER_SIZE =
    5 * 1024 * 1024;


  if (
    file.size >
    MAX_COVER_SIZE
  ) {
    throw new Error(
      "Ukuran cover maksimal 5 MB."
    );
  }


  const arrayBuffer =
    await file.arrayBuffer();

  const buffer =
    Buffer.from(arrayBuffer);


  const {
    data,
    error,
  } =
    await supabaseAdmin.storage
      .from(COVERS_BUCKET)
      .upload(
        storagePath,
        buffer,
        {
          contentType:
            file.type,

          cacheControl:
            "3600",

          upsert: false,
        }
      );


  if (error) {
    throw new Error(
      `Gagal upload cover: ${error.message}`
    );
  }


  return data;
}


/**
 * =========================================================
 * DELETE BOOK COVER
 * =========================================================
 */

export async function deleteBookCover(
  storagePath: string | null
) {
  if (!storagePath) {
    return {
      success: true,
      deleted: false,
    };
  }


  const {
    error,
  } =
    await supabaseAdmin.storage
      .from(COVERS_BUCKET)
      .remove([
        storagePath,
      ]);


  if (error) {
    throw new Error(
      `Gagal menghapus cover: ${error.message}`
    );
  }


  return {
    success: true,
    deleted: true,
  };
}


/**
 * =========================================================
 * CREATE SIGNED PDF URL
 * =========================================================
 *
 * Dipakai oleh server API setelah melakukan pengecekan
 * permission terhadap buku.
 *
 * expiresIn dalam detik.
 *
 * Default:
 * 5 menit.
 */
export async function createAdminSignedPdfUrl(
  storagePath: string,
  expiresIn = 300
) {
  if (!storagePath) {
    throw new Error(
      "Storage path PDF kosong."
    );
  }


  const {
    data,
    error,
  } =
    await supabaseAdmin.storage
      .from(BOOKS_BUCKET)
      .createSignedUrl(
        storagePath,
        expiresIn
      );


  if (error) {
    throw new Error(
      `Gagal membuat signed URL PDF: ${error.message}`
    );
  }


  return data.signedUrl;
}


/**
 * =========================================================
 * CHECK STORAGE FILE
 * =========================================================
 */

export async function storageFileExists(
  storagePath: string
) {
  if (!storagePath) {
    return false;
  }


  const parts =
    storagePath.split("/");

  const fileName =
    parts.pop();

  const folder =
    parts.join("/");


  const {
    data,
    error,
  } =
    await supabaseAdmin.storage
      .from(BOOKS_BUCKET)
      .list(
        folder,
        {
          search: fileName,
          limit: 100,
        }
      );


  if (error) {
    return false;
  }


  return Boolean(
    data?.some(
      (file) =>
        file.name ===
        fileName
    )
  );
}


/**
 * =========================================================
 * DELETE MULTIPLE STORAGE FILES
 * =========================================================
 *
 * Berguna untuk cleanup ketika sebuah operasi gagal
 * atau ketika menghapus data buku.
 */
export async function deleteStorageFiles(
  bucket: string,
  paths: string[]
) {
  const validPaths =
    paths.filter(
      (path) =>
        typeof path ===
          "string" &&
        path.trim() !== ""
    );


  if (
    validPaths.length ===
    0
  ) {
    return {
      success: true,
      deleted: 0,
    };
  }


  const {
    error,
  } =
    await supabaseAdmin.storage
      .from(bucket)
      .remove(
        validPaths
      );


  if (error) {
    throw new Error(
      `Gagal menghapus file Storage: ${error.message}`
    );
  }


  return {
    success: true,
    deleted:
      validPaths.length,
  };
}


/**
 * =========================================================
 * GENERATE BOOK STORAGE PATH
 * =========================================================
 *
 * Membuat path yang relatif aman dan konsisten.
 *
 * Contoh:
 *
 * books/uuid/buku-pelajaran.pdf
 *
 * UUID buku dipakai agar dua buku dengan judul sama
 * tidak bentrok.
 */
export function generateBookPdfPath(
  bookId: string,
  originalFileName: string
) {
  const safeName =
    originalFileName
      .replace(
        /[^a-zA-Z0-9._-]/g,
        "-"
      )
      .replace(
        /-+/g,
        "-"
      )
      .toLowerCase();


  return `${bookId}/${Date.now()}-${safeName}`;
}


/**
 * =========================================================
 * GENERATE COVER STORAGE PATH
 * =========================================================
 */

export function generateBookCoverPath(
  bookId: string,
  originalFileName: string
) {
  const safeName =
    originalFileName
      .replace(
        /[^a-zA-Z0-9._-]/g,
        "-"
      )
      .replace(
        /-+/g,
        "-"
      )
      .toLowerCase();


  return `${bookId}/${Date.now()}-${safeName}`;
    }
