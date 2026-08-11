import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/app/lib/supabase/admin";
import { requireUser } from "@/app/lib/auth";


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
          "no-store, no-cache, must-revalidate",
      },
    }
  );
}


/**
 * =========================================================
 * GET BOOK ID
 * =========================================================
 *
 * Support:
 *
 * /api/books/view?bookId=UUID
 *
 * =========================================================
 */

function getBookId(
  request: NextRequest
) {
  const url =
    new URL(
      request.url
    );

  return (
    url.searchParams
      .get("bookId")
      ?.trim() || ""
  );
}


/**
 * =========================================================
 * GET
 * =========================================================
 *
 * PDF dibaca langsung melalui browser.
 *
 * Tidak membuat public URL.
 *
 * Tidak membutuhkan file PDF di-download oleh user.
 *
 * =========================================================
 */

export async function GET(
  request: NextRequest
) {
  try {
    /**
     * -------------------------------------------------------
     * AUTHENTICATION
     * -------------------------------------------------------
     */

    let user;

    try {
      user =
        await requireUser();
    } catch {
      return json(
        {
          success: false,

          error:
            "Anda harus login untuk membaca buku.",
        },
        401
      );
    }


    /**
     * -------------------------------------------------------
     * BOOK ID
     * -------------------------------------------------------
     */

    const bookId =
      getBookId(
        request
      );


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
     * GET BOOK
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
            title,
            pdf_path,
            pdf_url,
            mime_type,
            file_name,
            is_published,
            download_allowed
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
        "[BOOK_VIEW] database error:",
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
     * PUBLICATION CHECK
     * -------------------------------------------------------
     *
     * Buku yang belum dipublish tidak boleh dibaca
     * oleh user biasa.
     *
     * Admin / Developer tetap bisa melihat.
     *
     * -------------------------------------------------------
     */

    const role =
      user.role;


    const isPrivileged =
      role ===
        "admin" ||
      role ===
        "developer";


    if (
      !book.is_published &&
      !isPrivileged
    ) {
      return json(
        {
          success: false,

          error:
            "Buku belum dipublikasikan.",
        },
        403
      );
    }


    /**
     * -------------------------------------------------------
     * PDF PATH
     * -------------------------------------------------------
     */

    const pdfPath =
      typeof book.pdf_path ===
      "string"
        ? book.pdf_path.trim()
        : "";


    if (
      !pdfPath
    ) {
      return json(
        {
          success: false,

          error:
            "Buku belum memiliki file PDF.",
        },
        404
      );
    }


    /**
     * -------------------------------------------------------
     * DOWNLOAD PERMISSION
     * -------------------------------------------------------
     *
     * PERHATIKAN:
     *
     * download_allowed TIDAK digunakan untuk
     * menentukan apakah PDF boleh DIBACA.
     *
     * User tetap boleh membaca PDF.
     *
     * download_allowed hanya digunakan oleh
     * endpoint download.
     *
     * -------------------------------------------------------
     */


    /**
     * -------------------------------------------------------
     * DOWNLOAD FROM SUPABASE STORAGE
     * -------------------------------------------------------
     *
     * Kita menggunakan service role dari server.
     *
     * URL storage tidak pernah dibuka secara public.
     *
     * -------------------------------------------------------
     */

    const {
      data: file,
      error:
        storageError,
    } =
      await supabaseAdmin
        .storage
        .from(
          STORAGE_BUCKET
        )
        .download(
          pdfPath
        );


    if (
      storageError ||
      !file
    ) {
      console.error(
        "[BOOK_VIEW] storage error:",
        storageError
      );


      return json(
        {
          success: false,

          error:
            "File PDF tidak ditemukan di storage.",
        },
        404
      );
    }


    /**
     * -------------------------------------------------------
     * FILE ARRAY BUFFER
     * -------------------------------------------------------
     */

    const buffer =
      await file.arrayBuffer();


    /**
     * -------------------------------------------------------
     * RESPONSE HEADERS
     * -------------------------------------------------------
     *
     * inline:
     * browser mencoba menampilkan PDF.
     *
     * BUKAN attachment.
     *
     * Jadi tidak memaksa download.
     *
     * -------------------------------------------------------
     */

    const headers =
      new Headers();


    headers.set(
      "Content-Type",
      "application/pdf"
    );


    headers.set(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(
        book.file_name ||
          "book.pdf"
      )}"`
    );


    headers.set(
      "Content-Length",
      String(
        buffer.byteLength
      )
    );


    /**
     * -------------------------------------------------------
     * SECURITY / CACHE
     * -------------------------------------------------------
     *
     * Jangan cache PDF private di CDN/browser.
     *
     * -------------------------------------------------------
     */

    headers.set(
      "Cache-Control",
      "private, no-store, no-cache, must-revalidate"
    );


    headers.set(
      "Pragma",
      "no-cache"
    );


    headers.set(
      "X-Content-Type-Options",
      "nosniff"
    );


    /**
     * -------------------------------------------------------
     * OPTIONAL RANGE SUPPORT
     * -------------------------------------------------------
     *
     * Untuk versi pertama kita kirim file penuh.
     *
     * Browser masih dapat menampilkan PDF secara normal.
     *
     * Range streaming bisa kita tambahkan kemudian
     * jika ukuran PDF besar dan ingin loading halaman
     * lebih cepat.
     *
     * -------------------------------------------------------
     */

    return new NextResponse(
      buffer,
      {
        status: 200,

        headers,
      }
    );
  } catch (
    error
  ) {
    console.error(
      "[BOOK_VIEW] unexpected error:",
      error
    );


    return json(
      {
        success: false,

        error:
          "Terjadi kesalahan server saat membuka PDF.",
      },
      500
    );
  }
}


/**
 * =========================================================
 * HEAD
 * =========================================================
 */

export async function HEAD(
  request: NextRequest
) {
  try {
    await requireUser();

    const bookId =
      getBookId(
        request
      );


    if (
      !bookId
    ) {
      return new NextResponse(
        null,
        {
          status: 400,
        }
      );
    }


    const {
      data: book,
    } =
      await supabaseAdmin
        .from(
          "books"
        )
        .select(
          `
            id,
            pdf_path,
            is_published
          `
        )
        .eq(
          "id",
          bookId
        )
        .maybeSingle();


    if (
      !book ||
      !book.pdf_path
    ) {
      return new NextResponse(
        null,
        {
          status: 404,
        }
      );
    }


    return new NextResponse(
      null,
      {
        status: 200,

        headers: {
          "Content-Type":
            "application/pdf",

          "Cache-Control":
            "private, no-store",
        },
      }
    );
  } catch {
    return new NextResponse(
      null,
      {
        status: 401,
      }
    );
  }
}
