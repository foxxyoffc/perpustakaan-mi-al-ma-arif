import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/app/lib/supabase/admin";
import { requireAdmin } from "@/app/lib/auth";
import { canManageBooks } from "@/app/lib/permissions";

import {
  getStorageSettings,
} from "@/app/lib/settings";


/**
 * =========================================================
 * CONFIG
 * =========================================================
 */

const STORAGE_BUCKET =
  "books";

const DEFAULT_MAX_FILE_SIZE =
  50 * 1024 * 1024; // 50 MB

const DEFAULT_ALLOWED_TYPES = [
  "application/pdf",
];


/**
 * =========================================================
 * HELPERS
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
    .slice(0, 150);
}


function createStoragePath(
  bookId: string,
  originalName: string
) {
  const safeName =
    sanitizeFileName(
      originalName
    ) || "book.pdf";

  const timestamp =
    Date.now();

  const random =
    crypto.randomUUID();

  return [
    bookId,
    `${timestamp}-${random}-${safeName}`,
  ].join("/");
}


function isPdf(
  file: File
) {
  const type =
    (
      file.type || ""
    ).toLowerCase();

  const name =
    file.name.toLowerCase();

  return (
    type ===
      "application/pdf" ||
    name.endsWith(".pdf")
  );
}


/**
 * =========================================================
 * POST /api/books/upload
 * =========================================================
 */

export async function POST(
  request: NextRequest
) {
  try {
    /**
     * -------------------------------------------------------
     * AUTH
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
            "Anda tidak memiliki izin untuk mengunggah buku.",
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
      !file ||
      !(file instanceof File)
    ) {
      return json(
        {
          success: false,
          error:
            "File PDF belum dipilih.",
        },
        400
      );
    }


    if (
      !bookId
    ) {
      return json(
        {
          success: false,
          error:
            "bookId wajib diberikan.",
        },
        400
      );
    }


    /**
     * -------------------------------------------------------
     * VALIDATE FILE
     * -------------------------------------------------------
     */

    if (
      file.size <= 0
    ) {
      return json(
        {
          success: false,
          error:
            "File kosong atau tidak valid.",
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
            "Hanya file PDF yang diperbolehkan.",
        },
        400
      );
    }


    /**
     * -------------------------------------------------------
     * STORAGE SETTINGS
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
        settings.allowedTypes.length
      ) {
        allowedTypes =
          settings.allowedTypes;
      }
    } catch {
      /**
       * Jika settings gagal dibaca,
       * gunakan fallback aman.
       */
    }


    /**
     * -------------------------------------------------------
     * TYPE CHECK
     * -------------------------------------------------------
     */

    if (
      allowedTypes.length > 0 &&
      !allowedTypes.includes(
        "application/pdf"
      )
    ) {
      return json(
        {
          success: false,
          error:
            "Upload PDF sedang dinonaktifkan oleh konfigurasi sistem.",
        },
        400
      );
    }


    /**
     * -------------------------------------------------------
     * SIZE CHECK
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
        ).toFixed(2);


      return json(
        {
          success: false,

          error:
            `Ukuran PDF terlalu besar. Maksimal ${maxMB} MB.`,

          maxFileSize,
        },
        413
      );
    }


    /**
     * -------------------------------------------------------
     * GET BOOK
     * -------------------------------------------------------
     *
     * Kita ambil data buku terlebih dahulu supaya:
     *
     * 1. bookId benar-benar ada
     * 2. bisa mengetahui PDF lama
     * 3. PDF lama tidak langsung dihapus sebelum upload baru
     *
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
            pdf_url
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
        "[BOOK_UPLOAD] get book error:",
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
     * CREATE NEW STORAGE PATH
     * -------------------------------------------------------
     */

    const storagePath =
      createStoragePath(
        bookId,
        file.name
      );


    /**
     * -------------------------------------------------------
     * CONVERT FILE
     * -------------------------------------------------------
     */

    const arrayBuffer =
      await file.arrayBuffer();

    const buffer =
      Buffer.from(
        arrayBuffer
      );


    /**
     * -------------------------------------------------------
     * UPLOAD NEW PDF
     * -------------------------------------------------------
     *
     * PENTING:
     *
     * File lama BELUM dihapus.
     *
     * Kalau upload gagal:
     * PDF lama tetap aman.
     *
     * Kalau upload berhasil:
     * database diperbarui.
     *
     * Setelah database berhasil:
     * file lama dihapus.
     *
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
          storagePath,
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
        "[BOOK_UPLOAD] storage upload error:",
        uploadError
      );


      return json(
        {
          success: false,
          error:
            "Gagal mengunggah PDF ke storage.",
        },
        500
      );
    }


    /**
     * -------------------------------------------------------
     * UPDATE BOOK
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
            storagePath,

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
     * DATABASE UPDATE FAILED
     * -------------------------------------------------------
     *
     * Hapus file BARU supaya tidak menjadi orphan file.
     *
     * PDF lama masih tetap digunakan.
     *
     * -------------------------------------------------------
     */

    if (
      updateError
    ) {
      console.error(
        "[BOOK_UPLOAD] database update error:",
        updateError
      );


      await supabaseAdmin
        .storage
        .from(
          STORAGE_BUCKET
        )
        .remove([
          storagePath,
        ]);


      return json(
        {
          success: false,
          error:
            "PDF berhasil diupload tetapi data buku gagal diperbarui. File baru telah dibersihkan.",
        },
        500
      );
    }


    /**
     * -------------------------------------------------------
     * DELETE OLD PDF
     * -------------------------------------------------------
     *
     * Hanya dilakukan SETELAH:
     *
     * - upload baru berhasil
     * - database berhasil diperbarui
     *
     * Ini mencegah kehilangan PDF apabila proses upload gagal.
     *
     * -------------------------------------------------------
     */

    const oldPdfPath =
      typeof book.pdf_path ===
      "string"
        ? book.pdf_path.trim()
        : "";


    if (
      oldPdfPath &&
      oldPdfPath !==
        storagePath
    ) {
      const {
        error:
          removeOldError,
      } =
        await supabaseAdmin
          .storage
          .from(
            STORAGE_BUCKET
          )
          .remove([
            oldPdfPath,
          ]);


      /**
       * -----------------------------------------------------
       * CATAT ERROR SAJA
       * -----------------------------------------------------
       *
       * Jangan membatalkan response.
       *
       * Karena PDF baru dan database sudah berhasil.
       *
       * File lama yang gagal dihapus bisa dibersihkan
       * melalui monitoring/storage cleanup.
       *
       * -----------------------------------------------------
       */

      if (
        removeOldError
      ) {
        console.error(
          "[BOOK_UPLOAD] old PDF cleanup failed:",
          {
            bookId,
            oldPdfPath,
            error:
              removeOldError,
          }
        );
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
          "PDF berhasil diunggah.",

        data:
          updatedBook,

        oldFileDeleted:
          Boolean(
            oldPdfPath
          ),
      },
      200
    );
  } catch (
    error
  ) {
    console.error(
      "[BOOK_UPLOAD] unexpected error:",
      error
    );


    return json(
      {
        success: false,

        error:
          "Terjadi kesalahan pada server saat mengunggah PDF.",
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
