import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/app/lib/supabase/admin";
import { requireAdmin } from "@/app/lib/auth";
import { canManageBooks } from "@/app/lib/permissions";


/**
 * =========================================================
 * CONFIG
 * =========================================================
 */

const STORAGE_BUCKET =
  "books";


/**
 * =========================================================
 * RESPONSE
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
 * DELETE
 * =========================================================
 *
 * Request:
 *
 * DELETE /api/books/delete
 *
 * Body:
 *
 * {
 *   "bookId": "uuid"
 * }
 *
 * =========================================================
 */

export async function DELETE(
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
            "Anda tidak memiliki izin untuk menghapus buku.",
        },
        403
      );
    }


    /**
     * -------------------------------------------------------
     * BODY
     * -------------------------------------------------------
     */

    let body:
      | {
          bookId?: string;
        }
      | null =
      null;


    try {
      body =
        await request.json();
    } catch {
      return json(
        {
          success: false,

          error:
            "Request body tidak valid.",
        },
        400
      );
    }


    const bookId =
      String(
        body?.bookId ||
          ""
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


    /**
     * -------------------------------------------------------
     * GET BOOK
     * -------------------------------------------------------
     *
     * Ambil file path terlebih dahulu.
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
            pdf_url,
            cover_path
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
        "[BOOK_DELETE] book query error:",
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
     * COLLECT FILES
     * -------------------------------------------------------
     *
     * PDF:
     *   pdf_path
     *
     * Cover:
     *   cover_path
     *
     * Tidak semua buku harus memiliki cover.
     *
     * -------------------------------------------------------
     */

    const filesToDelete:
      string[] =
      [];


    const pdfPath =
      typeof book.pdf_path ===
      "string"
        ? book.pdf_path.trim()
        : "";


    const coverPath =
      typeof book.cover_path ===
      "string"
        ? book.cover_path.trim()
        : "";


    if (
      pdfPath
    ) {
      filesToDelete.push(
        pdfPath
      );
    }


    if (
      coverPath
    ) {
      filesToDelete.push(
        coverPath
      );
    }


    /**
     * -------------------------------------------------------
     * DELETE STORAGE FILES
     * -------------------------------------------------------
     */

    let deletedFiles =
      0;


    if (
      filesToDelete.length >
      0
    ) {
      const {
        data:
          removedFiles,
        error:
          storageError,
      } =
        await supabaseAdmin
          .storage
          .from(
            STORAGE_BUCKET
          )
          .remove(
            filesToDelete
          );


      if (
        storageError
      ) {
        console.error(
          "[BOOK_DELETE] storage delete error:",
          storageError
        );


        return json(
          {
            success: false,

            error:
              "File buku gagal dihapus dari storage. Data buku tidak dihapus agar tidak terjadi orphan file.",

            storageError:
              storageError.message,
          },
          500
        );
      }


      deletedFiles =
        removedFiles?.length ??
        0;
    }


    /**
     * -------------------------------------------------------
     * DELETE DATABASE RECORD
     * -------------------------------------------------------
     */

    const {
      error:
        deleteError,
    } =
      await supabaseAdmin
        .from(
          "books"
        )
        .delete()
        .eq(
          "id",
          bookId
        );


    /**
     * -------------------------------------------------------
     * DATABASE FAILED
     * -------------------------------------------------------
     *
     * Kondisi ini cukup penting:
     *
     * Storage sudah terhapus.
     * Database gagal dihapus.
     *
     * Kita tidak bisa mengembalikan file secara
     * otomatis dengan aman karena file sudah benar-benar
     * dihapus.
     *
     * Oleh karena itu catat error secara jelas.
     *
     * -------------------------------------------------------
     */

    if (
      deleteError
    ) {
      console.error(
        "[BOOK_DELETE] database delete error:",
        deleteError
      );


      return json(
        {
          success: false,

          error:
            "File berhasil dihapus dari storage, tetapi data buku gagal dihapus dari database.",

          storageDeleted:
            true,

          deletedFiles,

          databaseError:
            deleteError.message,
        },
        500
      );
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
          "Buku dan file terkait berhasil dihapus.",

        bookId,

        deletedFiles,
      },
      200
    );
  } catch (
    error
  ) {
    console.error(
      "[BOOK_DELETE] unexpected error:",
      error
    );


    return json(
      {
        success: false,

        error:
          "Terjadi kesalahan server saat menghapus buku.",
      },
      500
    );
  }
}


/**
 * =========================================================
 * POST FALLBACK
 * =========================================================
 *
 * Bisa digunakan dari client jika environment tertentu
 * tidak nyaman menggunakan DELETE.
 *
 * Body:
 *
 * {
 *   "bookId": "uuid"
 * }
 *
 * =========================================================
 */

export async function POST(
  request: NextRequest
) {
  return DELETE(
    request
  );
}


/**
 * =========================================================
 * GET
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
