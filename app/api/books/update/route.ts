import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/app/lib/supabase/admin";
import { requireAdmin } from "@/app/lib/auth";
import {
  canUpdateBook,
  canChangeDownloadPermission,
} from "@/app/lib/permissions";


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
 * FORM STRING
 * =========================================================
 */

function getString(
  formData: FormData,
  key: string
) {
  const value =
    formData.get(key);


  if (
    value === null
  ) {
    return null;
  }


  const result =
    String(value).trim();


  return result ||
    null;
}


/**
 * =========================================================
 * FORM BOOLEAN
 * =========================================================
 */

function getBoolean(
  formData: FormData,
  key: string
) {
  const value =
    formData.get(key);


  if (
    value === null
  ) {
    return null;
  }


  if (
    typeof value === "boolean"
  ) {
    return value;
  }


  const normalized =
    String(value)
      .trim()
      .toLowerCase();


  if (
    normalized ===
      "true" ||
    normalized ===
      "1" ||
    normalized ===
      "on" ||
    normalized ===
      "yes"
  ) {
    return true;
  }


  if (
    normalized ===
      "false" ||
    normalized ===
      "0" ||
    normalized ===
      "off" ||
    normalized ===
      "no"
  ) {
    return false;
  }


  return null;
}


/**
 * =========================================================
 * PATCH
 * =========================================================
 *
 * FormData:
 *
 * id
 * title
 * author
 * description
 * categoryId
 * isPublished
 * downloadAllowed
 *
 * PDF TIDAK diubah di endpoint ini.
 *
 * =========================================================
 */

export async function PATCH(
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
      !canUpdateBook(
        context.role
      )
    ) {
      return json(
        {
          success: false,
          error:
            "Anda tidak memiliki izin untuk mengubah buku.",
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


    const id =
      getString(
        formData,
        "id"
      );


    if (
      !id
    ) {
      return json(
        {
          success: false,
          error:
            "ID buku wajib diisi.",
        },
        400
      );
    }


    /**
     * -------------------------------------------------------
     * GET EXISTING BOOK
     * -------------------------------------------------------
     */

    const {
      data:
        existingBook,
      error:
        existingError,
    } =
      await supabaseAdmin
        .from("books")
        .select(`
          id,
          title,
          author,
          description,
          category_id,
          is_published,
          download_allowed,
          pdf_path
        `)
        .eq(
          "id",
          id
        )
        .maybeSingle();


    if (
      existingError
    ) {
      console.error(
        "[BOOK_UPDATE] fetch error:",
        existingError
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
      !existingBook
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
     * VALUES
     * -------------------------------------------------------
     */

    const title =
      getString(
        formData,
        "title"
      );


    const author =
      getString(
        formData,
        "author"
      );


    const description =
      getString(
        formData,
        "description"
      );


    const categoryId =
      getString(
        formData,
        "categoryId"
      );


    const isPublished =
      getBoolean(
        formData,
        "isPublished"
      );


    const downloadAllowed =
      getBoolean(
        formData,
        "downloadAllowed"
      );


    /**
     * -------------------------------------------------------
     * VALIDATE TITLE
     * -------------------------------------------------------
     */

    if (
      title !== null &&
      !title
    ) {
      return json(
        {
          success: false,
          error:
            "Judul buku tidak boleh kosong.",
        },
        400
      );
    }


    if (
      title &&
      title.length >
        300
    ) {
      return json(
        {
          success: false,
          error:
            "Judul buku terlalu panjang.",
        },
        400
      );
    }


    /**
     * -------------------------------------------------------
     * CATEGORY VALIDATION
     * -------------------------------------------------------
     */

    if (
      categoryId
    ) {
      const {
        data:
          category,
        error:
          categoryError,
      } =
        await supabaseAdmin
          .from("categories")
          .select("id")
          .eq(
            "id",
            categoryId
          )
          .maybeSingle();


      if (
        categoryError
      ) {
        console.error(
          "[BOOK_UPDATE] category error:",
          categoryError
        );


        return json(
          {
            success: false,
            error:
              "Gagal memeriksa kategori.",
          },
          500
        );
      }


      if (
        !category
      ) {
        return json(
          {
            success: false,
            error:
              "Kategori tidak ditemukan.",
          },
          400
        );
      }
    }


    /**
     * -------------------------------------------------------
     * DOWNLOAD PERMISSION
     * -------------------------------------------------------
     *
     * Hanya role yang memang mempunyai izin
     * yang boleh mengubah download_allowed.
     *
     * -------------------------------------------------------
     */

    if (
      downloadAllowed !==
      null
    ) {
      if (
        !canChangeDownloadPermission(
          context.role
        )
      ) {
        return json(
          {
            success: false,
            error:
              "Anda tidak memiliki izin untuk mengubah izin download.",
          },
          403
        );
      }
    }


    /**
     * -------------------------------------------------------
     * BUILD UPDATE
     * -------------------------------------------------------
     */

    const updateData: Record<
      string,
      unknown
    > = {
      updated_at:
        new Date().toISOString(),
    };


    if (
      title !== null
    ) {
      updateData.title =
        title;
    }


    if (
      author !== null
    ) {
      updateData.author =
        author;
    }


    if (
      formData.has(
        "description"
      )
    ) {
      updateData.description =
        description;
    }


    if (
      formData.has(
        "categoryId"
      )
    ) {
      updateData.category_id =
        categoryId;
    }


    if (
      isPublished !==
      null
    ) {
      updateData.is_published =
        isPublished;
    }


    if (
      downloadAllowed !==
      null
    ) {
      updateData.download_allowed =
        downloadAllowed;
    }


    /**
     * -------------------------------------------------------
     * NOTHING TO UPDATE
     * -------------------------------------------------------
     */

    if (
      Object.keys(
        updateData
      ).length === 1
    ) {
      return json(
        {
          success: false,
          error:
            "Tidak ada perubahan yang dikirim.",
        },
        400
      );
    }


    /**
     * -------------------------------------------------------
     * UPDATE
     * -------------------------------------------------------
     */

    const {
      data:
        updatedBook,
      error:
        updateError,
    } =
      await supabaseAdmin
        .from("books")
        .update(
          updateData
        )
        .eq(
          "id",
          id
        )
        .select(`
          id,
          title,
          author,
          description,
          category_id,
          pdf_path,
          file_name,
          file_size,
          mime_type,
          is_published,
          download_allowed,
          created_at,
          updated_at
        `)
        .single();


    if (
      updateError
    ) {
      console.error(
        "[BOOK_UPDATE] update error:",
        updateError
      );


      return json(
        {
          success: false,
          error:
            "Gagal memperbarui buku.",
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
          "Buku berhasil diperbarui.",

        data:
          updatedBook,
      }
    );
  } catch (
    error
  ) {
    console.error(
      "[BOOK_UPDATE] unexpected error:",
      error
    );


    return json(
      {
        success: false,
        error:
          "Terjadi kesalahan server.",
      },
      500
    );
  }
}


/**
 * =========================================================
 * POST
 * =========================================================
 *
 * Beberapa frontend lebih mudah menggunakan POST.
 *
 * Kita izinkan POST sebagai alias update.
 *
 * =========================================================
 */

export async function POST(
  request: NextRequest
) {
  return PATCH(
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


/**
 * =========================================================
 * DELETE
 * =========================================================
 */

export async function DELETE() {
  return json(
    {
      success: false,
      error:
        "Gunakan /api/books/delete untuk menghapus buku.",
    },
    405
  );
}
