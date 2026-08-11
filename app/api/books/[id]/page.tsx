import Link from "next/link";
import { notFound } from "next/navigation";

import { supabaseAdmin } from "@/app/lib/supabase/admin";
import { requireUser } from "@/app/lib/auth";


/**
 * =========================================================
 * TYPES
 * =========================================================
 */

interface BookPageProps {
  params: Promise<{
    id: string;
  }>;
}


/**
 * =========================================================
 * BOOK QUERY
 * =========================================================
 */

async function getBook(
  id: string
) {
  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from("books")
      .select(`
        id,
        title,
        author,
        description,
        category_id,
        cover_path,
        pdf_path,
        file_name,
        file_size,
        mime_type,
        is_published,
        download_allowed,
        created_at,
        updated_at
      `)
      .eq("id", id)
      .maybeSingle();


  if (error) {
    console.error(
      "[BOOK_PAGE] database error:",
      error
    );

    return null;
  }


  return data;
}


/**
 * =========================================================
 * FORMAT FILE SIZE
 * =========================================================
 */

function formatFileSize(
  bytes: number | null
) {
  if (
    !bytes ||
    bytes <= 0
  ) {
    return "-";
  }


  const units = [
    "B",
    "KB",
    "MB",
    "GB",
  ];


  let size =
    bytes;

  let index =
    0;


  while (
    size >= 1024 &&
    index <
      units.length - 1
  ) {
    size /=
      1024;

    index++;
  }


  return `${size.toFixed(
    index === 0
      ? 0
      : 2
  )} ${units[index]}`;
}


/**
 * =========================================================
 * PAGE
 * =========================================================
 */

export default async function BookPage({
  params,
}: BookPageProps) {
  /**
   * -------------------------------------------------------
   * AUTH
   * -------------------------------------------------------
   */

  let user;

  try {
    user =
      await requireUser();
  } catch {
    /**
     * Jika sistem auth kamu menggunakan redirect
     * di requireUser(), bagian ini tidak akan terpanggil.
     */

    return (
      <main className="book-page">
        <section className="book-error">
          <h1>
            Login diperlukan
          </h1>

          <p>
            Silakan login terlebih dahulu
            untuk membaca buku.
          </p>

          <Link
            href="/login"
            className="book-button"
          >
            Login
          </Link>
        </section>
      </main>
    );
  }


  /**
   * -------------------------------------------------------
   * PARAMS
   * -------------------------------------------------------
   */

  const {
    id,
  } = await params;


  if (
    !id
  ) {
    notFound();
  }


  /**
   * -------------------------------------------------------
   * BOOK
   * -------------------------------------------------------
   */

  const book =
    await getBook(
      id
    );


  if (
    !book
  ) {
    notFound();
  }


  /**
   * -------------------------------------------------------
   * ACCESS
   * -------------------------------------------------------
   */

  const isPrivileged =
    user.role ===
      "admin" ||
    user.role ===
      "developer";


  /**
   * Buku unpublished hanya bisa dilihat
   * admin/developer.
   */

  if (
    !book.is_published &&
    !isPrivileged
  ) {
    return (
      <main className="book-page">
        <section className="book-error">
          <div className="book-error-icon">
            🔒
          </div>

          <h1>
            Buku belum tersedia
          </h1>

          <p>
            Buku ini belum dipublikasikan
            dan belum dapat dibaca.
          </p>

          <Link
            href="/home"
            className="book-button"
          >
            Kembali
          </Link>
        </section>
      </main>
    );
  }


  /**
   * -------------------------------------------------------
   * PDF
   * -------------------------------------------------------
   */

  const hasPdf =
    Boolean(
      book.pdf_path
    );


  const viewerUrl =
    `/api/books/view?bookId=${encodeURIComponent(
      book.id
    )}`;


  const downloadUrl =
    `/api/books/download?bookId=${encodeURIComponent(
      book.id
    )}`;


  /**
   * -------------------------------------------------------
   * RENDER
   * -------------------------------------------------------
   */

  return (
    <main className="book-page">
      <div className="book-container">

        {/* =================================================
            HEADER
            ================================================= */}

        <header className="book-header">

          <div className="book-header-left">

            <Link
              href="/home"
              className="book-back"
            >
              ← Kembali
            </Link>

            <div>
              <p className="book-label">
                DIGITAL LIBRARY
              </p>

              <h1 className="book-title">
                {book.title}
              </h1>
            </div>

          </div>


          <div className="book-actions">

            {book.download_allowed && (
              <a
                href={downloadUrl}
                className="book-button book-download"
              >
                ↓ Download PDF
              </a>
            )}

          </div>

        </header>


        {/* =================================================
            INFORMATION
            ================================================= */}

        <section className="book-info">

          <div className="book-info-item">
            <span>
              Penulis
            </span>

            <strong>
              {book.author ||
                "Tidak diketahui"}
            </strong>
          </div>


          <div className="book-info-item">
            <span>
              Ukuran PDF
            </span>

            <strong>
              {formatFileSize(
                book.file_size
              )}
            </strong>
          </div>


          <div className="book-info-item">
            <span>
              Format
            </span>

            <strong>
              PDF
            </strong>
          </div>


          <div className="book-info-item">
            <span>
              Status Download
            </span>

            <strong>
              {book.download_allowed
                ? "Diizinkan"
                : "Hanya baca"}
            </strong>
          </div>

        </section>


        {/* =================================================
            DESCRIPTION
            ================================================= */}

        {book.description && (
          <section className="book-description">

            <h2>
              Tentang buku
            </h2>

            <p>
              {book.description}
            </p>

          </section>
        )}


        {/* =================================================
            PDF VIEWER
            ================================================= */}

        <section className="book-viewer-section">

          <div className="book-viewer-header">

            <div>
              <span className="book-viewer-status">
                ●
              </span>

              <span>
                Pembaca PDF
              </span>
            </div>


            {!book.download_allowed && (
              <span className="book-read-only">
                Hanya dapat dibaca
              </span>
            )}

          </div>


          {hasPdf ? (
            <div className="book-viewer">

              <iframe
                src={viewerUrl}
                title={
                  `Membaca ${book.title}`
                }
                className="book-pdf-frame"
                loading="lazy"
              />

            </div>
          ) : (
            <div className="book-no-pdf">

              <div className="book-no-pdf-icon">
                📄
              </div>

              <h2>
                PDF belum tersedia
              </h2>

              <p>
                File PDF untuk buku ini
                belum tersedia.
              </p>

            </div>
          )}

        </section>


        {/* =================================================
            DOWNLOAD NOTICE
            ================================================= */}

        {!book.download_allowed && (
          <section className="book-notice">

            <div className="book-notice-icon">
              🔒
            </div>

            <div>

              <strong>
                Buku hanya untuk dibaca
              </strong>

              <p>
                Buku ini dapat dibaca langsung
                melalui website, tetapi pemilik
                buku tidak mengizinkan file PDF
                untuk diunduh.
              </p>

            </div>

          </section>
        )}


        {/* =================================================
            FOOTER
            ================================================= */}

        <footer className="book-footer">

          <Link
            href="/home"
            className="book-footer-link"
          >
            ← Kembali ke perpustakaan
          </Link>

        </footer>

      </div>


      {/* ===================================================
          PAGE STYLE
          =================================================== */}

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .book-page {
              min-height: 100vh;
              background:
                radial-gradient(
                  circle at top,
                  rgba(120, 90, 255, 0.08),
                  transparent 35%
                ),
                #08090d;
              color: #f5f5f7;
            }

            .book-container {
              width: min(
                1500px,
                calc(100% - 32px)
              );
              margin: 0 auto;
              padding: 28px 0 60px;
            }

            .book-header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 20px;
              margin-bottom: 22px;
            }

            .book-header-left {
              display: flex;
              align-items: center;
              gap: 22px;
              min-width: 0;
            }

            .book-back {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              min-width: 42px;
              height: 42px;
              padding: 0 14px;
              border: 1px solid rgba(
                255,
                255,
                255,
                0.1
              );
              border-radius: 12px;
              color: #d7d7dc;
              text-decoration: none;
              background: rgba(
                255,
                255,
                255,
                0.04
              );
              transition:
                0.2s ease;
            }

            .book-back:hover {
              background: rgba(
                255,
                255,
                255,
                0.08
              );
            }

            .book-label {
              margin: 0 0 5px;
              font-size: 11px;
              letter-spacing: 0.18em;
              color: #92929c;
            }

            .book-title {
              margin: 0;
              font-size: clamp(
                22px,
                3vw,
                38px
              );
              line-height: 1.15;
              overflow-wrap: anywhere;
            }

            .book-actions {
              display: flex;
              align-items: center;
              gap: 10px;
            }

            .book-button {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              min-height: 42px;
              padding: 0 18px;
              border-radius: 12px;
              text-decoration: none;
              font-weight: 600;
              font-size: 14px;
            }

            .book-download {
              color: #fff;
              background:
                linear-gradient(
                  135deg,
                  #725cff,
                  #a15cff
                );
              box-shadow:
                0 8px 30px
                rgba(
                  114,
                  92,
                  255,
                  0.22
                );
            }

            .book-info {
              display: grid;
              grid-template-columns:
                repeat(
                  4,
                  minmax(
                    0,
                    1fr
                  )
                );
              gap: 10px;
              margin-bottom: 18px;
            }

            .book-info-item {
              padding: 15px 17px;
              border:
                1px solid
                rgba(
                  255,
                  255,
                  255,
                  0.08
                );
              border-radius: 14px;
              background:
                rgba(
                  255,
                  255,
                  255,
                  0.035
                );
            }

            .book-info-item span {
              display: block;
              margin-bottom: 6px;
              color: #898991;
              font-size: 12px;
            }

            .book-info-item strong {
              display: block;
              color: #eeeeF2;
              font-size: 14px;
              overflow-wrap: anywhere;
            }

            .book-description {
              margin-bottom: 18px;
              padding: 20px;
              border:
                1px solid
                rgba(
                  255,
                  255,
                  255,
                  0.08
                );
              border-radius: 16px;
              background:
                rgba(
                  255,
                  255,
                  255,
                  0.025
                );
            }

            .book-description h2 {
              margin: 0 0 8px;
              font-size: 16px;
            }

            .book-description p {
              margin: 0;
              color: #a7a7b0;
              line-height: 1.7;
              white-space: pre-wrap;
            }

            .book-viewer-section {
              overflow: hidden;
              border:
                1px solid
                rgba(
                  255,
                  255,
                  255,
                  0.09
                );
              border-radius: 18px;
              background: #111217;
              box-shadow:
                0 25px 80px
                rgba(
                  0,
                  0,
                  0,
                  0.35
                );
            }

            .book-viewer-header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 12px;
              min-height: 52px;
              padding: 0 17px;
              border-bottom:
                1px solid
                rgba(
                  255,
                  255,
                  255,
                  0.07
                );
              background:
                rgba(
                  255,
                  255,
                  255,
                  0.025
                );
              color: #cfcfd5;
              font-size: 13px;
            }

            .book-viewer-header > div {
              display: flex;
              align-items: center;
              gap: 8px;
            }

            .book-viewer-status {
              color: #58e39b;
              font-size: 11px;
              text-shadow:
                0 0 10px
                rgba(
                  88,
                  227,
                  155,
                  0.7
                );
            }

            .book-read-only {
              padding: 5px 9px;
              border-radius: 999px;
              background:
                rgba(
                  255,
                  190,
                  70,
                  0.08
                );
              border:
                1px solid
                rgba(
                  255,
                  190,
                  70,
                  0.18
                );
              color: #e9bd72;
              font-size: 11px;
            }

            .book-viewer {
              width: 100%;
              height: min(
                80vh,
                1000px
              );
              min-height: 650px;
              background: #24252b;
            }

            .book-pdf-frame {
              display: block;
              width: 100%;
              height: 100%;
              border: 0;
              background: #24252b;
            }

            .book-no-pdf {
              min-height: 400px;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-direction: column;
              text-align: center;
              padding: 40px;
              color: #aaaab3;
            }

            .book-no-pdf-icon {
              margin-bottom: 14px;
              font-size: 40px;
            }

            .book-no-pdf h2 {
              margin: 0 0 7px;
              color: #eee;
              font-size: 20px;
            }

            .book-no-pdf p {
              margin: 0;
              font-size: 14px;
            }

            .book-notice {
              display: flex;
              align-items: flex-start;
              gap: 13px;
              margin-top: 16px;
              padding: 16px 18px;
              border:
                1px solid
                rgba(
                  255,
                  190,
                  70,
                  0.14
                );
              border-radius: 15px;
              background:
                rgba(
                  255,
                  190,
                  70,
                  0.035
                );
            }

            .book-notice-icon {
              flex: 0 0 auto;
            }

            .book-notice strong {
              display: block;
              margin-bottom: 5px;
              color: #e9bd72;
              font-size: 14px;
            }

            .book-notice p {
              margin: 0;
              color: #9e9ea7;
              line-height: 1.6;
              font-size: 13px;
            }

            .book-footer {
              padding-top: 24px;
            }

            .book-footer-link {
              color: #8d8d98;
              font-size: 13px;
              text-decoration: none;
            }

            .book-footer-link:hover {
              color: #fff;
            }

            .book-error {
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-direction: column;
              padding: 30px;
              text-align: center;
            }

            .book-error-icon {
              margin-bottom: 12px;
              font-size: 36px;
            }

            .book-error h1 {
              margin: 0 0 8px;
              font-size: 24px;
            }

            .book-error p {
              margin: 0 0 20px;
              color: #9999a3;
            }

            @media (
              max-width: 800px
            ) {
              .book-container {
                width: min(
                  100% - 20px,
                  1500px
                );
                padding-top: 16px;
              }

              .book-header {
                align-items: flex-start;
                flex-direction: column;
              }

              .book-header-left {
                width: 100%;
              }

              .book-actions {
                width: 100%;
              }

              .book-download {
                width: 100%;
              }

              .book-info {
                grid-template-columns:
                  repeat(
                    2,
                    minmax(
                      0,
                      1fr
                    )
                  );
              }

              .book-viewer {
                min-height: 600px;
                height: 75vh;
              }
            }

            @media (
              max-width: 480px
            ) {
              .book-header-left {
                align-items: flex-start;
              }

              .book-title {
                font-size: 23px;
              }

              .book-info {
                grid-template-columns:
                  1fr 1fr;
              }

              .book-info-item {
                padding: 12px;
              }

              .book-viewer {
                min-height: 520px;
              }
            }
          `,
        }}
      />
    </main>
  );
}
