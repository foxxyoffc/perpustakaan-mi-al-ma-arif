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
          "no-store, no-cache, must-revalidate",
      },
    }
  );
}


/**
 * =========================================================
 * GET BOOK ID
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
 * SAFE DOWNLOAD NAME
 * =========================================================
 */

function sanitizeDownloadName(
  name: string
) {
  return (
    name
      .normalize("NFKD")
      .replace(
        /[\u0300-\u036f]/g,
        ""
      )
      .replace(
        /[/\\?%*:|"<>]/g,
        "_"
      )
      .replace(
        /[\r\n]/g,
        "_"
      )
      .trim()
      .slice(
        0,
        180
      ) ||
    "book.pdf"
  );
}


/**
 * =========================================================
 * ENSURE PDF EXTENSION
 * =========================================================
 */

function ensurePdfExtension(
  name: string
) {
  const clean =
    sanitizeDownloadName(
      name
    );

  if (
    clean
      .toLowerCase()
      .endsWith(".pdf")
  ) {
    return clean;
  }

  return `${clean}.pdf`;
}


/**
 * =========================================================
 * GET
 * =========================================================
 *
 * /api/books/download?bookId=UUID
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
            "Anda harus login untuk mengunduh buku.",
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
            file_name,
            file_size,
            mime_type,
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
        "[BOOK_DOWNLOAD] database error:",
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
     * DOWNLOAD PERMISSION
     * -------------------------------------------------------
     *
     * INI ADALAH CHECK UTAMA.
     *
     * false = TOLAK
     *
     * true = BOLEH
     *
     * -------------------------------------------------------
     */

    if (
      book.download_allowed !==
      true
    ) {
      return json(
        {
          success: false,

          code:
            "DOWNLOAD_NOT_ALLOWED",

          error:
            "Buku ini hanya dapat dibaca di website dan tidak diizinkan untuk diunduh.",
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
            "File PDF buku tidak tersedia.",
        },
        404
      );
    }


    /**
     * -------------------------------------------------------
     * DOWNLOAD FROM SUPABASE
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
        "[BOOK_DOWNLOAD] storage error:",
        storageError
      );


      return json(
        {
          success: false,

          error:
            "File PDF tidak ditemukan.",
        },
        404
      );
    }


    /**
     * -------------------------------------------------------
     * ARRAY BUFFER
     * -------------------------------------------------------
     */

    const buffer =
      await file.arrayBuffer();


    /**
     * -------------------------------------------------------
     * DOWNLOAD FILE NAME
     * -------------------------------------------------------
     */

    const fileName =
      ensurePdfExtension(
        book.file_name ||
          book.title ||
          "book"
      );


    /**
     * -------------------------------------------------------
     * HEADERS
     * -------------------------------------------------------
     *
     * attachment:
     *
     * Browser memperlakukan response
     * sebagai file download.
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
      `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(
        fileName
      )}`
    );


    headers.set(
      "Content-Length",
      String(
        buffer.byteLength
      )
    );


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
     * RESPONSE
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
      "[BOOK_DOWNLOAD] unexpected error:",
      error
    );


    return json(
      {
        success: false,

        error:
          "Terjadi kesalahan server saat mengunduh PDF.",
      },
      500
    );
  }
}


/**
 * =========================================================
 * HEAD
 * =========================================================
 *
 * Digunakan untuk mengecek apakah download
 * diperbolehkan tanpa mengirim seluruh PDF.
 *
 * =========================================================
 */

export async function HEAD(
  request: NextRequest
) {
  try {
    const user =
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
      !book
    ) {
      return new NextResponse(
        null,
        {
          status: 404,
        }
      );
    }


    const isPrivileged =
      user.role ===
        "admin" ||
      user.role ===
        "developer";


    if (
      !book.is_published &&
      !isPrivileged
    ) {
      return new NextResponse(
        null,
        {
          status: 403,
        }
      );
    }


    if (
      book.download_allowed !==
      true
    ) {
      return new NextResponse(
        null,
        {
          status: 403,
        }
      );
    }


    if (
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
