import { supabaseAdmin } from "@/app/lib/supabase/admin";
import { getAuthProfile } from "@/app/lib/auth";

/**
 * =========================================================
 * STORAGE HELPER
 * =========================================================
 *
 * File:
 * app/lib/storage.ts
 *
 * Storage bucket:
 * - books       -> file PDF buku
 * - book-covers -> cover/gambar buku
 * - avatars     -> foto profil user
 * - home        -> background halaman Home
 *
 * CATATAN:
 *
 * PDF tidak dibuat public.
 *
 * Akses PDF menggunakan Signed URL.
 *
 * Jadi:
 *
 * User -> membuka buku
 *      -> server membuat signed URL
 *      -> PDF tampil di browser
 *
 * User -> download
 *      -> hanya jika allow_download = true
 *
 * =========================================================
 */


/**
 * =========================================================
 * CONSTANTS
 * =========================================================
 */

export const STORAGE_BUCKETS = {
  BOOKS: "books",
  BOOK_COVERS: "book-covers",
  AVATARS: "avatars",
  HOME: "home",
} as const;


/**
 * Batas ukuran file.
 *
 * Sesuaikan dengan limit Storage Supabase
 * dan kebutuhan project.
 *
 * 100 MB per PDF adalah batas aplikasi,
 * bukan berarti quota Supabase otomatis 100 MB.
 */
export const MAX_BOOK_PDF_SIZE =
  100 * 1024 * 1024;


/**
 * Cover maksimal 5 MB.
 */
export const MAX_BOOK_COVER_SIZE =
  5 * 1024 * 1024;


/**
 * Avatar maksimal 3 MB.
 */
export const MAX_AVATAR_SIZE =
  3 * 1024 * 1024;


/**
 * Background Home maksimal 15 MB.
 */
export const MAX_HOME_BACKGROUND_SIZE =
  15 * 1024 * 1024;


/**
 * =========================================================
 * TYPES
 * =========================================================
 */

export interface UploadResult {
  success: boolean;

  path?: string;

  publicUrl?: string | null;

  error?: string;
}


/**
 * =========================================================
 * FILE VALIDATION
 * =========================================================
 */

function validateFileSize(
  file: File,
  maxSize: number
) {
  if (
    file.size >
    maxSize
  ) {
    return `Ukuran file terlalu besar. Maksimal ${formatBytes(maxSize)}.`;
  }

  return null;
}


function formatBytes(
  bytes: number
) {
  if (
    bytes === 0
  ) {
    return "0 Bytes";
  }

  const units = [
    "Bytes",
    "KB",
    "MB",
    "GB",
  ];

  const index =
    Math.floor(
      Math.log(bytes) /
        Math.log(1024)
    );

  return `${(
    bytes /
    Math.pow(
      1024,
      index
    )
  ).toFixed(2)} ${units[index]}`;
}


/**
 * =========================================================
 * PDF VALIDATION
 * =========================================================
 */

export function validatePdfFile(
  file: File
) {
  const sizeError =
    validateFileSize(
      file,
      MAX_BOOK_PDF_SIZE
    );

  if (sizeError) {
    return {
      valid: false,
      error: sizeError,
    };
  }


  const isPdfMime =
    file.type ===
    "application/pdf";


  const isPdfName =
    file.name
      .toLowerCase()
      .endsWith(".pdf");


  if (
    !isPdfMime &&
    !isPdfName
  ) {
    return {
      valid: false,
      error:
        "File buku harus berformat PDF.",
    };
  }


  return {
    valid: true,
    error: null,
  };
}


/**
 * =========================================================
 * IMAGE VALIDATION
 * =========================================================
 */

export function validateImageFile(
  file: File,
  maxSize: number
) {
  const sizeError =
    validateFileSize(
      file,
      maxSize
    );

  if (sizeError) {
    return {
      valid: false,
      error: sizeError,
    };
  }


  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
  ];


  if (
    !allowedTypes.includes(
      file.type
    )
  ) {
    return {
      valid: false,
      error:
        "Format gambar harus JPG, JPEG, PNG, atau WEBP.",
    };
  }


  return {
    valid: true,
    error: null,
  };
}


/**
 * =========================================================
 * AUTHORIZATION
 * =========================================================
 */

async function requireStorageManager() {
  const profile =
    await getAuthProfile();


  if (!profile) {
    return {
      allowed: false,

      profile: null,

      error:
        "Silakan login terlebih dahulu.",
    };
  }


  if (
    profile.role !==
      "admin" &&
    profile.role !==
      "developer"
  ) {
    return {
      allowed: false,

      profile,

      error:
        "Anda tidak memiliki akses untuk mengelola file.",
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
 * CREATE SAFE FILE NAME
 * =========================================================
 */

function safeFileName(
  name: string
) {
  return name
    .normalize("NFKD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[^a-zA-Z0-9._-]/g,
      "-"
    )
    .replace(
      /-+/g,
      "-"
    )
    .replace(
      /^-|-$/g,
      ""
    );
}


/**
 * =========================================================
 * CREATE UNIQUE FILE PATH
 * =========================================================
 */

function createUniquePath(
  folder: string,
  fileName: string
) {
  const timestamp =
    Date.now();

  const random =
    Math.random()
      .toString(36)
      .substring(
        2,
        10
      );

  return `${folder}/${timestamp}-${random}-${safeFileName(
    fileName
  )}`;
}


/**
 * =========================================================
 * UPLOAD PDF
 * =========================================================
 */

export async function uploadBookPdf(
  file: File,
  bookId: string
): Promise<UploadResult> {
  const access =
    await requireStorageManager();


  if (
    !access.allowed
  ) {
    return {
      success: false,

      error:
        access.error ??
        "Tidak memiliki akses.",
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
        "File PDF tidak valid.",
    };
  }


  if (
    !bookId
  ) {
    return {
      success: false,

      error:
        "Book ID tidak valid.",
    };
  }


  const path =
    createUniquePath(
      `books/${bookId}`,
      file.name
    );


  const arrayBuffer =
    await file.arrayBuffer();


  const buffer =
    Buffer.from(
      arrayBuffer
    );


  const {
    error,
  } =
    await supabaseAdmin
      .storage
      .from(
        STORAGE_BUCKETS.BOOKS
      )
      .upload(
        path,
        buffer,
        {
          contentType:
            "application/pdf",

          upsert:
            false,

          cacheControl:
            "3600",
        }
      );


  if (error) {
    console.error(
      "uploadBookPdf error:",
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

    path,

    publicUrl:
      null,
  };
}


/**
 * =========================================================
 * REPLACE BOOK PDF
 * =========================================================
 *
 * Proses:
 *
 * 1. Upload PDF baru
 * 2. Jika berhasil -> hapus PDF lama
 * 3. Return path baru
 *
 * Dengan urutan ini, jika upload baru gagal,
 * PDF lama tetap aman.
 *
 * =========================================================
 */

export async function replaceBookPdf(
  newFile: File,
  bookId: string,
  oldPath?:
    | string
    | null
): Promise<UploadResult> {
  const upload =
    await uploadBookPdf(
      newFile,
      bookId
    );


  if (
    !upload.success ||
    !upload.path
  ) {
    return upload;
  }


  /**
   * Setelah file baru sukses,
   * file lama boleh dihapus.
   */
  if (
    oldPath &&
    oldPath !==
      upload.path
  ) {
    const deleteResult =
      await deleteStorageFile(
        STORAGE_BUCKETS.BOOKS,
        oldPath
      );


    /**
     * Jangan batalkan PDF baru hanya karena
     * file lama gagal dihapus.
     *
     * Namun error dicatat.
     */
    if (
      !deleteResult.success
    ) {
      console.error(
        "Gagal menghapus PDF lama:",
        deleteResult.error
      );
    }
  }


  return upload;
}


/**
 * =========================================================
 * DELETE BOOK PDF
 * =========================================================
 */

export async function deleteBookPdf(
  path: string
) {
  const access =
    await requireStorageManager();


  if (
    !access.allowed
  ) {
    return {
      success: false,

      error:
        access.error ??
        "Tidak memiliki akses.",
    };
  }


  if (
    !path
  ) {
    return {
      success: true,
    };
  }


  return deleteStorageFile(
    STORAGE_BUCKETS.BOOKS,
    path
  );
}


/**
 * =========================================================
 * UPLOAD BOOK COVER
 * =========================================================
 */

export async function uploadBookCover(
  file: File,
  bookId: string
): Promise<UploadResult> {
  const access =
    await requireStorageManager();


  if (
    !access.allowed
  ) {
    return {
      success: false,

      error:
        access.error ??
        "Tidak memiliki akses.",
    };
  }


  const validation =
    validateImageFile(
      file,
      MAX_BOOK_COVER_SIZE
    );


  if (
    !validation.valid
  ) {
    return {
      success: false,

      error:
        validation.error ??
        "File gambar tidak valid.",
    };
  }


  const path =
    createUniquePath(
      `books/${bookId}/cover`,
      file.name
    );


  const arrayBuffer =
    await file.arrayBuffer();


  const buffer =
    Buffer.from(
      arrayBuffer
    );


  const {
    error,
  } =
    await supabaseAdmin
      .storage
      .from(
        STORAGE_BUCKETS.BOOK_COVERS
      )
      .upload(
        path,
        buffer,
        {
          contentType:
            file.type,

          upsert:
            false,

          cacheControl:
            "3600",
        }
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

    path,

    publicUrl:
      null,
  };
}


/**
 * =========================================================
 * UPLOAD AVATAR
 * =========================================================
 */

export async function uploadAvatar(
  file: File,
  userId: string
): Promise<UploadResult> {
  const profile =
    await getAuthProfile();


  if (!profile) {
    return {
      success: false,

      error:
        "Silakan login terlebih dahulu.",
    };
  }


  /**
   * User hanya boleh upload avatar miliknya sendiri.
   */
  if (
    profile.id !==
      userId &&
    profile.role !==
      "admin" &&
    profile.role !==
      "developer"
  ) {
    return {
      success: false,

      error:
        "Anda tidak memiliki akses.",
    };
  }


  const validation =
    validateImageFile(
      file,
      MAX_AVATAR_SIZE
    );


  if (
    !validation.valid
  ) {
    return {
      success: false,

      error:
        validation.error ??
        "File avatar tidak valid.",
    };
  }


  const path =
    createUniquePath(
      `users/${userId}`,
      file.name
    );


  const buffer =
    Buffer.from(
      await file.arrayBuffer()
    );


  const {
    error,
  } =
    await supabaseAdmin
      .storage
      .from(
        STORAGE_BUCKETS.AVATARS
      )
      .upload(
        path,
        buffer,
        {
          contentType:
            file.type,

          upsert:
            false,

          cacheControl:
            "3600",
        }
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

    path,

    publicUrl:
      null,
  };
}


/**
 * =========================================================
 * UPLOAD HOME BACKGROUND
 * =========================================================
 *
 * Hanya developer.
 */

export async function uploadHomeBackground(
  file: File
): Promise<UploadResult> {
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
    profile.role !==
    "developer"
  ) {
    return {
      success: false,

      error:
        "Hanya developer yang dapat mengganti background Home.",
    };
  }


  const validation =
    validateImageFile(
      file,
      MAX_HOME_BACKGROUND_SIZE
    );


  if (
    !validation.valid
  ) {
    return {
      success: false,

      error:
        validation.error ??
        "File background tidak valid.",
    };
  }


  const path =
    createUniquePath(
      "home",
      file.name
    );


  const buffer =
    Buffer.from(
      await file.arrayBuffer()
    );


  const {
    error,
  } =
    await supabaseAdmin
      .storage
      .from(
        STORAGE_BUCKETS.HOME
      )
      .upload(
        path,
        buffer,
        {
          contentType:
            file.type,

          upsert:
            false,

          cacheControl:
            "3600",
        }
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

    path,

    publicUrl:
      null,
  };
}


/**
 * =========================================================
 * DELETE STORAGE FILE
 * =========================================================
 */

export async function deleteStorageFile(
  bucket: string,
  path: string
) {
  const access =
    await requireStorageManager();


  if (
    !access.allowed
  ) {
    return {
      success: false,

      error:
        access.error ??
        "Tidak memiliki akses.",
    };
  }


  if (
    !path
  ) {
    return {
      success: true,
    };
  }


  const {
    error,
  } =
    await supabaseAdmin
      .storage
      .from(bucket)
      .remove([
        path,
      ]);


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
 * DELETE FILE WITHOUT AUTH CHECK
 * =========================================================
 *
 * INTERNAL ONLY.
 *
 * Digunakan oleh proses server yang sudah
 * melakukan authorization sebelumnya.
 *
 * Jangan dipanggil langsung dari client.
 */

export async function deleteStorageFileInternal(
  bucket: string,
  path: string
) {
  if (
    !path
  ) {
    return {
      success: true,
    };
  }


  const {
    error,
  } =
    await supabaseAdmin
      .storage
      .from(bucket)
      .remove([
        path,
      ]);


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
 * CREATE SIGNED URL
 * =========================================================
 *
 * URL sementara.
 *
 * Default 15 menit.
 */

export async function createStorageSignedUrl(
  bucket: string,
  path: string,
  expiresIn = 60 * 15
) {
  const profile =
    await getAuthProfile();


  if (!profile) {
    return {
      success: false,

      url: null,

      error:
        "Silakan login terlebih dahulu.",
    };
  }


  if (
    !path
  ) {
    return {
      success: false,

      url: null,

      error:
        "Path file tidak valid.",
    };
  }


  const {
    data,
    error,
  } =
    await supabaseAdmin
      .storage
      .from(bucket)
      .createSignedUrl(
        path,
        expiresIn
      );


  if (error) {
    return {
      success: false,

      url: null,

      error:
        error.message,
    };
  }


  return {
    success: true,

    url:
      data.signedUrl,

    expiresIn,
  };
}


/**
 * =========================================================
 * CREATE DOWNLOAD SIGNED URL
 * =========================================================
 *
 * Digunakan setelah permission download
 * sudah diperiksa oleh books.ts.
 *
 * Fungsi ini sendiri tidak menentukan
 * apakah user boleh mendownload.
 */

export async function createDownloadSignedUrl(
  bucket: string,
  path: string,
  expiresIn = 60 * 10
) {
  return createStorageSignedUrl(
    bucket,
    path,
    expiresIn
  );
}


/**
 * =========================================================
 * GET FILE METADATA
 * =========================================================
 */

export async function getStorageFileMetadata(
  bucket: string,
  path: string
) {
  const access =
    await requireStorageManager();


  if (
    !access.allowed
  ) {
    return {
      success: false,

      data: null,

      error:
        access.error ??
        "Tidak memiliki akses.",
    };
  }


  const lastSlash =
    path.lastIndexOf(
      "/"
    );


  const folder =
    lastSlash >= 0
      ? path.substring(
          0,
          lastSlash
        )
      : "";


  const fileName =
    lastSlash >= 0
      ? path.substring(
          lastSlash + 1
        )
      : path;


  const {
    data,
    error,
  } =
    await supabaseAdmin
      .storage
      .from(bucket)
      .list(
        folder,
        {
          search:
            fileName,
        }
      );


  if (error) {
    return {
      success: false,

      data: null,

      error:
        error.message,
    };
  }


  const file =
    data?.find(
      item =>
        item.name ===
        fileName
    );


  return {
    success: true,

    data:
      file ?? null,
  };
}


/**
 * =========================================================
 * DELETE OLD FILE THEN UPLOAD
 * =========================================================
 *
 * Utility generik untuk file yang ingin
 * diganti total.
 */

export async function replaceStorageFile(
  bucket: string,
  newFile: File,
  oldPath?:
    | string
    | null,
  folder = ""
) {
  const access =
    await requireStorageManager();


  if (
    !access.allowed
  ) {
    return {
      success: false,

      path: undefined,

      error:
        access.error ??
        "Tidak memiliki akses.",
    };
  }


  const path =
    createUniquePath(
      folder,
      newFile.name
    );


  const buffer =
    Buffer.from(
      await newFile.arrayBuffer()
    );


  const {
    error: uploadError,
  } =
    await supabaseAdmin
      .storage
      .from(bucket)
      .upload(
        path,
        buffer,
        {
          contentType:
            newFile.type,

          upsert:
            false,

          cacheControl:
            "3600",
        }
      );


  if (uploadError) {
    return {
      success: false,

      path: undefined,

      error:
        uploadError.message,
    };
  }


  /**
   * Upload baru sudah aman.
   * Sekarang hapus file lama.
   */
  if (
    oldPath &&
    oldPath !==
      path
  ) {
    const {
      error:
        deleteError,
    } =
      await supabaseAdmin
        .storage
        .from(bucket)
        .remove([
          oldPath,
        ]);


    if (
      deleteError
    ) {
      console.error(
        "Gagal menghapus file lama:",
        deleteError
      );
    }
  }


  return {
    success: true,

    path,
  };
}


/**
 * =========================================================
 * STORAGE CLEANUP
 * =========================================================
 *
 * Hapus seluruh file dalam folder buku.
 *
 * Berguna ketika buku dihapus.
 */

export async function deleteBookStorageFolder(
  bookId: string
) {
  const access =
    await requireStorageManager();


  if (
    !access.allowed
  ) {
    return {
      success: false,

      error:
        access.error ??
        "Tidak memiliki akses.",
    };
  }


  const buckets = [
    STORAGE_BUCKETS.BOOKS,
    STORAGE_BUCKETS.BOOK_COVERS,
  ];


  const errors: string[] = [];


  for (
    const bucket of buckets
  ) {
    const folder =
      `books/${bookId}`;


    const {
      data,
      error:
        listError,
    } =
      await supabaseAdmin
        .storage
        .from(bucket)
        .list(
          folder,
          {
            limit:
              1000,
          }
        );


    if (
      listError
    ) {
      errors.push(
        `${bucket}: ${listError.message}`
      );

      continue;
    }


    if (
      !data ||
      data.length ===
        0
    ) {
      continue;
    }


    const paths =
      data.map(
        item =>
          `${folder}/${item.name}`
      );


    const {
      error:
        removeError,
    } =
      await supabaseAdmin
        .storage
        .from(bucket)
        .remove(
          paths
        );


    if (
      removeError
    ) {
      errors.push(
        `${bucket}: ${removeError.message}`
      );
    }
  }


  if (
    errors.length
  ) {
    return {
      success: false,

      error:
        errors.join(
          " | "
        ),
    };
  }


  return {
    success: true,
  };
}
