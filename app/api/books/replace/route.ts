import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/app/lib/supabase/admin";
import { requireAdmin } from "@/app/lib/auth";
import { canManageBooks } from "@/app/lib/permissions";
import { getStorageSettings } from "@/app/lib/settings";


/**
 * =========================================================
 * CONFIG
 * =========================================================
 */

const STORAGE_BUCKET = "books";

const DEFAULT_MAX_FILE_SIZE =
  50 * 1024 * 1024;

const DEFAULT_ALLOWED_TYPES = [
  "application/pdf",
];


/**
 * =========================================================
 * RESPONSE HELPER
 * =========================================================
 */

function json(
  data: unknown,
  status = 200
) {
  return NextResponse.json(
    data,
    {
      status,

      headers: {
        "Cache-Control":
          "no-store",
      },
    }
  );
}


/**
 * =========================================================
 * FILE NAME SANITIZER
 * =========================================================
 */

function sanitizeFileName(
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
      "_"
    )
    .replace(
      /_+/g,
      "_"
    )
    .replace(
      /^[_-]+|[_-]+$/g,
      ""
    )
    .slice(
      0,
      150
    );
}


/**
 * =========================================================
 * STORAGE PATH
 * =========================================================
 */

function createStoragePath(
  bookId: string,
  fileName: string
) {
  const safeName =
    sanitizeFileName(
      fileName
    ) ||
    "book.pdf";

  return [
    bookId,

    `${Date.now()}-${crypto.randomUUID()}-${safeName}`,
  ].join("/");
}


/**
 * =========================================================
 * PDF CHECK
 * =========================================================
 */

function isPdf(
  file: File
) {
  const mime =
    (
      file.type ||
      ""
    ).toLowerCase();

  const name =
    file.name.toLowerCase();

  return (
    mime ===
      "application/pdf" ||
    name.endsWith(
      ".pdf"
    )
  );
}


/**
 * =========================================================
 * POST
 * =========================================================
 *
 * Ganti PDF yang sudah ada.
 *
 * FormData:
 *
 * bookId
 * file
 *
 * =========================================================
 */

export async function POST(
  request: NextRequest
) {
  let uploadedNewPath =
    "";

  try {
    /**
     * -------------------------------------------------------
     * AUTHORIZATION
     * -------------------------------------------------------
     */

    const context =
      await requireAdmin();


    if (
      !canManageBooks(
        context.role
      )
    ) {
      return json(
        {
          success: false,

          error:
            "Anda tidak memiliki izin untuk mengganti PDF.",
        },
        403
      );
    }


    /**
     * -------------------------------------------------------
     * FORM DATA
     * -------------------------------------------------------
     */

    const formData =
      await request.formData();


    const file =
      formData.get(
        "file"
      );

    const bookId =
      String(
        formData.get(
          "bookId"
        ) || ""
      ).trim();


    if (
      !bookId
    ) {
      return json(
        {
          success: false,

          error:
            "bookId wajib diisi.",
        },
        400
      );
    }


    if (
      !file ||
      !(file instanceof File)
    ) {
      return json(
        {
          success: false,

          error:
            "File PDF wajib dipilih.",
        },
        400
      );
    }


    /**
     * -------------------------------------------------------
     * BASIC FILE VALIDATION
     * -------------------------------------------------------
     */

    if (
      file.size <= 0
    ) {
      return json(
        {
          success: false,

          error:
            "File PDF kosong.",
        },
        400
      );
    }


    if (
      !isPdf(file)
    ) {
      return json(
        {
          success: false,

          error:
            "File harus berupa PDF.",
        },
        400
      );
    }


    /**
     * -------------------------------------------------------
     * SETTINGS
     * -------------------------------------------------------
     */

    let maxFileSize =
      DEFAULT_MAX_FILE_SIZE;

    let allowedTypes =
      DEFAULT_ALLOWED_TYPES;


    try {
      const settings =
        await getStorageSettings();


      if (
        typeof settings.maxFileSize ===
          "number" &&
        Number.isFinite(
          settings.maxFileSize
        ) &&
        settings.maxFileSize >
          0
      ) {
        maxFileSize =
          settings.maxFileSize;
      }


      if (
        Array.isArray(
          settings.allowedTypes
        ) &&
        settings.allowedTypes.length >
          0
      ) {
        allowedTypes =
          settings.allowedTypes;
      }
    } catch {
      /**
       * Fallback ke konfigurasi default.
       */
    }


    if (
      !allowedTypes.includes(
        "application/pdf"
      )
    ) {
      return json(
        {
          success: false,

          error:
            "Upload PDF sedang dinonaktifkan.",
        },
        400
      );
    }


    /**
     * -------------------------------------------------------
     * SIZE
     * -------------------------------------------------------
     */

    if (
      file.size >
      maxFileSize
    ) {
      const maxMB =
        (
          maxFileSize /
          1024 /
          1024
        ).toFixed(
          2
        );


      return json(
        {
          success: false,

          error:
            `Ukuran PDF melebihi batas ${maxMB} MB.`,

          maxFileSize,
        },
        413
      );
    }


    /**
     * -------------------------------------------------------
     * GET CURRENT BOOK
     * -------------------------------------------------------
     */

    const {
      data: book,
      error: bookError,
    } =
      await supabaseAdmin
        .from(
          "books"
        )
        .select(
          `
            id,
            pdf_path,
            pdf_url,
            file_name,
            file_size,
            mime_type
          `
        )
        .eq(
          "id",
          bookId
        )
        .maybeSingle();


    if (
      bookError
    ) {
      console.error(
        "[BOOK_REPLACE] book query error:",
        bookError
      );


      return json(
        {
          success: false,

          error:
            "Gagal mengambil data buku.",
        },
        500
      );
    }


    if (
      !book
    ) {
      return json(
        {
          success: false,

          error:
            "Buku tidak ditemukan.",
        },
        404
      );
    }


    /**
     * -------------------------------------------------------
     * CREATE NEW PATH
     * -------------------------------------------------------
     */

    uploadedNewPath =
      createStoragePath(
        bookId,
        file.name
      );


    /**
     * -------------------------------------------------------
     * FILE BUFFER
     * -------------------------------------------------------
     */

    const buffer =
      Buffer.from(
        await file.arrayBuffer()
      );


    /**
     * -------------------------------------------------------
     * UPLOAD NEW PDF
     * -------------------------------------------------------
     */

    const {
      error:
        uploadError,
    } =
      await supabaseAdmin
        .storage
        .from(
          STORAGE_BUCKET
        )
        .upload(
          uploadedNewPath,
          buffer,
          {
            contentType:
              "application/pdf",

            cacheControl:
              "3600",

            upsert:
              false,
          }
        );


    if (
      uploadError
    ) {
      console.error(
        "[BOOK_REPLACE] upload error:",
        uploadError
      );


      uploadedNewPath =
        "";


      return json(
        {
          success: false,

          error:
            "Gagal mengunggah PDF baru.",
        },
        500
      );
    }


    /**
     * -------------------------------------------------------
     * UPDATE DATABASE
     * -------------------------------------------------------
     */

    const {
      data:
        updatedBook,
      error:
        updateError,
    } =
      await supabaseAdmin
        .from(
          "books"
        )
        .update({
          pdf_path:
            uploadedNewPath,

          pdf_url:
            null,

          file_name:
            file.name,

          file_size:
            file.size,

          mime_type:
            "application/pdf",

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          bookId
        )
        .select(
          `
            id,
            pdf_path,
            pdf_url,
            file_name,
            file_size,
            mime_type,
            updated_at
          `
        )
        .single();


    /**
     * -------------------------------------------------------
     * DATABASE FAILED
     * -------------------------------------------------------
     */

    if (
      updateError
    ) {
      console.error(
        "[BOOK_REPLACE] database update error:",
        updateError
      );


      /**
       * Hapus PDF baru.
       *
       * PDF lama masih aman.
       */

      await supabaseAdmin
        .storage
        .from(
          STORAGE_BUCKET
        )
        .remove([
          uploadedNewPath,
        ]);


      uploadedNewPath =
        "";


      return json(
        {
          success: false,

          error:
            "Database gagal diperbarui. PDF lama tetap dipertahankan.",
        },
        500
      );
    }


    /**
     * -------------------------------------------------------
     * OLD FILE
     * -------------------------------------------------------
     */

    const oldPath =
      typeof book.pdf_path ===
      "string"
        ? book.pdf_path.trim()
        : "";


    /**
     * -------------------------------------------------------
     * DELETE OLD FILE
     * -------------------------------------------------------
     */

    let oldFileDeleted =
      false;

    let oldFileDeleteError:
      | string
      | null =
      null;


    if (
      oldPath &&
      oldPath !==
        uploadedNewPath
    ) {
      const {
        error:
          deleteError,
      } =
        await supabaseAdmin
          .storage
          .from(
            STORAGE_BUCKET
          )
          .remove([
            oldPath,
          ]);


      if (
        deleteError
      ) {
        console.error(
          "[BOOK_REPLACE] old PDF delete error:",
          deleteError
        );


        oldFileDeleteError =
          deleteError.message;
      } else {
        oldFileDeleted =
          true;
      }
    }


    /**
     * -------------------------------------------------------
     * SUCCESS
     * -------------------------------------------------------
     */

    return json(
      {
        success: true,

        message:
          oldFileDeleteError
            ? "PDF berhasil diganti, tetapi file PDF lama gagal dibersihkan."
            : "PDF berhasil diganti.",

        data:
          updatedBook,

        oldFileDeleted,

        oldFileDeleteError,
      },
      200
    );
  } catch (
    error
  ) {
    console.error(
      "[BOOK_REPLACE] unexpected error:",
      error
    );


    /**
     * Jika terjadi error setelah file baru
     * berhasil diupload tetapi sebelum database
     * selesai, bersihkan file baru.
     */

    if (
      uploadedNewPath
    ) {
      try {
        await supabaseAdmin
          .storage
          .from(
            STORAGE_BUCKET
          )
          .remove([
            uploadedNewPath,
          ]);
      } catch (
        cleanupError
      ) {
        console.error(
          "[BOOK_REPLACE] cleanup error:",
          cleanupError
        );
      }
    }


    return json(
      {
        success: false,

        error:
          "Terjadi kesalahan server saat mengganti PDF.",
      },
      500
    );
  }
}


/**
 * =========================================================
 * METHOD NOT ALLOWED
 * =========================================================
 */

export async function GET() {
  return json(
    {
      success: false,

      error:
        "Method tidak diperbolehkan.",
    },
    405
  );
        }
