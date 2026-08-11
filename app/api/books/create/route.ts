import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/app/lib/supabase/admin";
import { requireAdmin } from "@/app/lib/auth";
import { canCreateBook } from "@/app/lib/permissions";
import { getStorageSettings } from "@/app/lib/settings";


/**
 * =========================================================
 * CONFIG
 * =========================================================
 */

const STORAGE_BUCKET =
  "books";

const DEFAULT_MAX_FILE_SIZE =
  50 * 1024 * 1024;


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
 * SANITIZE FILE NAME
 * =========================================================
 */

function sanitizeFileName(
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
      ) ||
    "book.pdf"
  );
}


/**
 * =========================================================
 * CREATE STORAGE PATH
 * =========================================================
 */

function createStoragePath(
  fileName: string
) {
  return [
    "books",
    new Date()
      .getUTCFullYear()
      .toString(),

    crypto.randomUUID(),

    `${Date.now()}-${sanitizeFileName(
      fileName
    )}`,
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
  const type =
    (
      file.type ||
      ""
    ).toLowerCase();

  const name =
    file.name.toLowerCase();


  return (
    type ===
      "application/pdf" ||
    name.endsWith(
      ".pdf"
    )
  );
}


/**
 * =========================================================
 * FORM STRING
 * =========================================================
 */

function formString(
  formData: FormData,
  key: string
) {
  const value =
    formData.get(
      key
    );


  if (
    value === null
  ) {
    return "";
  }


  return String(
    value
  ).trim();
}


/**
 * =========================================================
 * BOOLEAN
 * =========================================================
 */

function formBoolean(
  formData: FormData,
  key: string,
  defaultValue = false
) {
  const value =
    formData.get(
      key
    );


  if (
    value === null
  ) {
    return defaultValue;
  }


  if (
    typeof value ===
    "string"
  ) {
    return (
      value ===
        "true" ||
      value ===
        "1" ||
      value ===
        "on"
    );
  }


  return Boolean(
    value
  );
}


/**
 * =========================================================
 * POST
 * =========================================================
 *
 * FormData:
 *
 * title
 * author
 * description
 * categoryId
 * file
 * isPublished
 * downloadAllowed
 *
 * =========================================================
 */

export async function POST(
  request: NextRequest
) {
  let uploadedPath =
    "";


  try {
    /**
     * -------------------------------------------------------
     * AUTH
     * -------------------------------------------------------
     */

    const context =
      await requireAdmin();


    if (
      !canCreateBook(
        context.role
      )
    ) {
      return json(
        {
          success: false,

          error:
            "Anda tidak memiliki izin untuk membuat buku.",
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


    const title =
      formString(
        formData,
        "title"
      );


    const author =
      formString(
        formData,
        "author"
      );


    const description =
      formString(
        formData,
        "description"
      );


    const categoryId =
      formString(
        formData,
        "categoryId"
      );


    const isPublished =
      formBoolean(
        formData,
        "isPublished",
        true
      );


    const downloadAllowed =
      formBoolean(
        formData,
        "downloadAllowed",
        false
      );


    const file =
      formData.get(
        "file"
      );


    /**
     * -------------------------------------------------------
     * VALIDATE TITLE
     * -------------------------------------------------------
     */

    if (
      !title
    ) {
      return json(
        {
          success: false,

          error:
            "Judul buku wajib diisi.",
        },
        400
      );
    }


    if (
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
     * VALIDATE FILE
     * -------------------------------------------------------
     */

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
     * STORAGE SETTINGS
     * -------------------------------------------------------
     */

    let maxFileSize =
      DEFAULT_MAX_FILE_SIZE;


    let allowedTypes = [
      "application/pdf",
    ];


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
       * Gunakan default jika settings belum tersedia.
       */
    }


    /**
     * -------------------------------------------------------
     * MIME
     * -------------------------------------------------------
     */

    if (
      !allowedTypes.includes(
        "application/pdf"
      )
    ) {
      return json(
        {
          success: false,

          error:
            "Upload PDF sedang dinonaktifkan oleh pengaturan storage.",
        },
        400
      );
    }


    /**
     * -------------------------------------------------------
     * FILE SIZE
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
            `Ukuran file melebihi batas ${maxMB} MB.`,
        },
        413
      );
    }


    /**
     * -------------------------------------------------------
     * CATEGORY
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
          .from(
            "categories"
          )
          .select(
            "id"
          )
          .eq(
            "id",
            categoryId
          )
          .maybeSingle();


      if (
        categoryError
      ) {
        console.error(
          "[BOOK_CREATE] category error:",
          categoryError
        );


        return json(
          {
            success: false,

            error:
              "Gagal memeriksa kategori buku.",
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
              "Kategori buku tidak ditemukan.",
          },
          400
        );
      }
    }


    /**
     * -------------------------------------------------------
     * CREATE STORAGE PATH
     * -------------------------------------------------------
     */

    uploadedPath =
      createStoragePath(
        file.name
      );


    /**
     * -------------------------------------------------------
     * READ FILE
     * -------------------------------------------------------
     */

    const buffer =
      Buffer.from(
        await file.arrayBuffer()
      );


    /**
     * -------------------------------------------------------
     * UPLOAD PDF
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
          uploadedPath,
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
        "[BOOK_CREATE] upload error:",
        uploadError
      );


      uploadedPath =
        "";


      return json(
        {
          success: false,

          error:
            "Gagal mengunggah file PDF.",
        },
        500
      );
    }


    /**
     * -------------------------------------------------------
     * INSERT DATABASE
     * -------------------------------------------------------
     */

    const {
      data:
        book,
      error:
        insertError,
    } =
      await supabaseAdmin
        .from(
          "books"
        )
        .insert({
          title,

          author:
            author ||
            null,

          description:
            description ||
            null,

          category_id:
            categoryId ||
            null,

          pdf_path:
            uploadedPath,

          pdf_url:
            null,

          file_name:
            file.name,

          file_size:
            file.size,

          mime_type:
            "application/pdf",

          is_published:
            isPublished,

          download_allowed:
            downloadAllowed,

          created_by:
            context.user.id,

          updated_at:
            new Date().toISOString(),
        })
        .select(
          `
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
          `
        )
        .single();


    /**
     * -------------------------------------------------------
     * DATABASE FAILED
     * -------------------------------------------------------
     */

    if (
      insertError
    ) {
      console.error(
        "[BOOK_CREATE] database error:",
        insertError
      );


      /**
       * Hapus file yang sudah terupload
       * supaya tidak menjadi orphan file.
       */

      await supabaseAdmin
        .storage
        .from(
          STORAGE_BUCKET
        )
        .remove([
          uploadedPath,
        ]);


      uploadedPath =
        "";


      return json(
        {
          success: false,

          error:
            "Data buku gagal disimpan. File PDF dibersihkan kembali.",
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
          "Buku berhasil dibuat.",

        data:
          book,
      },
      201
    );
  } catch (
    error
  ) {
    console.error(
      "[BOOK_CREATE] unexpected error:",
      error
    );


    /**
     * Cleanup jika upload berhasil
     * tetapi terjadi error setelahnya.
     */

    if (
      uploadedPath
    ) {
      try {
        await supabaseAdmin
          .storage
          .from(
            STORAGE_BUCKET
          )
          .remove([
            uploadedPath,
          ]);
      } catch (
        cleanupError
      ) {
        console.error(
          "[BOOK_CREATE] cleanup error:",
          cleanupError
        );
      }
    }


    return json(
      {
        success: false,

        error:
          "Terjadi kesalahan server saat membuat buku.",
      },
      500
    );
  }
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
