import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "ID buku tidak ditemukan.",
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    /*
     * =====================================================
     * AUTH
     * =====================================================
     */

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "Anda harus login terlebih dahulu.",
        },
        { status: 401 }
      );
    }

    /*
     * =====================================================
     * GET BOOK
     * =====================================================
     */

    const { data: book, error: bookError } = await supabase
      .from("books")
      .select(
        `
          id,
          title,
          author,
          description,
          category_id,
          file_path,
          file_name,
          file_size,
          mime_type,
          cover_path,
          is_published,
          download_allowed,
          created_at,
          updated_at
        `
      )
      .eq("id", id)
      .maybeSingle();

    if (bookError) {
      console.error(
        "[API_BOOK_GET] Database error:",
        bookError
      );

      return NextResponse.json(
        {
          success: false,
          error: "Gagal mengambil data buku.",
        },
        { status: 500 }
      );
    }

    if (!book) {
      return NextResponse.json(
        {
          success: false,
          error: "Buku tidak ditemukan.",
        },
        { status: 404 }
      );
    }

    /*
     * =====================================================
     * PUBLISHED CHECK
     * =====================================================
     */

    if (!book.is_published) {
      return NextResponse.json(
        {
          success: false,
          error: "Buku ini belum dipublikasikan.",
        },
        { status: 403 }
      );
    }

    /*
     * =====================================================
     * CREATE VIEWER URL
     * =====================================================
     *
     * PDF tetap dibuka langsung di website.
     *
     * Kita membuat signed URL sementara dari Supabase
     * Storage. Ini BUKAN proses download.
     */

    let viewerUrl: string | null = null;

    if (book.file_path) {
      const {
        data: signedUrl,
        error: signedUrlError,
      } = await supabase.storage
        .from("books")
        .createSignedUrl(
          book.file_path,
          60 * 60
        );

      if (signedUrlError) {
        console.error(
          "[API_BOOK_GET] Signed URL error:",
          signedUrlError
        );

        return NextResponse.json(
          {
            success: false,
            error: "Gagal membuat URL PDF.",
          },
          { status: 500 }
        );
      }

      viewerUrl =
        signedUrl?.signedUrl ?? null;
    }

    /*
     * =====================================================
     * RESPONSE
     * =====================================================
     *
     * downloadAllowed tetap dikirim agar PdfViewer tahu
     * apakah tombol download boleh ditampilkan.
     */

    return NextResponse.json(
      {
        success: true,

        data: {
          id: book.id,

          title: book.title,

          author: book.author,

          description:
            book.description,

          categoryId:
            book.category_id,

          fileName:
            book.file_name,

          fileSize:
            book.file_size,

          mimeType:
            book.mime_type ||
            "application/pdf",

          coverPath:
            book.cover_path,

          isPublished:
            book.is_published,

          downloadAllowed:
            Boolean(
              book.download_allowed
            ),

          viewerUrl,

          createdAt:
            book.created_at,

          updatedAt:
            book.updated_at,
        },
      },
      {
        status: 200,

        headers: {
          "Cache-Control":
            "private, no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "[API_BOOK_GET] Unexpected error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Terjadi kesalahan pada server.",
      },
      { status: 500 }
    );
  }
}
