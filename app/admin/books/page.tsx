import Link from "next/link";
import { redirect } from "next/navigation";

import { supabaseAdmin } from "@/app/lib/supabase/admin";
import { requireAdmin } from "@/app/lib/auth";
import {
  canManageBooks,
} from "@/app/lib/permissions";


/**
 * =========================================================
 * TYPES
 * =========================================================
 */

interface Book {
  id: string;
  title: string;
  author: string | null;
  description: string | null;
  category_id: string | null;
  file_name: string | null;
  file_size: number | null;
  is_published: boolean;
  download_allowed: boolean;
  created_at: string;
  updated_at: string | null;
}


/**
 * =========================================================
 * HELPERS
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

  let size = bytes;
  let index = 0;

  while (
    size >= 1024 &&
    index <
      units.length - 1
  ) {
    size /= 1024;
    index++;
  }

  return `${size.toFixed(
    index === 0 ? 0 : 2
  )} ${units[index]}`;
}


function formatDate(
  date: string
) {
  try {
    return new Intl.DateTimeFormat(
      "id-ID",
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    ).format(
      new Date(date)
    );
  } catch {
    return date;
  }
}


/**
 * =========================================================
 * GET BOOKS
 * =========================================================
 */

async function getBooks() {
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
        file_name,
        file_size,
        is_published,
        download_allowed,
        created_at,
        updated_at
      `)
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

  if (error) {
    console.error(
      "[ADMIN_BOOKS] fetch error:",
      error
    );

    return [];
  }

  return (
    data as Book[] | null
  ) || [];
}


/**
 * =========================================================
 * PAGE
 * =========================================================
 */

export default async function AdminBooksPage() {
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
    redirect(
      "/home"
    );
  }


  /**
   * -------------------------------------------------------
   * DATA
   * -------------------------------------------------------
   */

  const books =
    await getBooks();


  /**
   * -------------------------------------------------------
   * STATS
   * -------------------------------------------------------
   */

  const totalBooks =
    books.length;

  const publishedBooks =
    books.filter(
      (book) =>
        book.is_published
    ).length;

  const readOnlyBooks =
    books.filter(
      (book) =>
        !book.download_allowed
    ).length;

  const downloadableBooks =
    books.filter(
      (book) =>
        book.download_allowed
    ).length;


  /**
   * -------------------------------------------------------
   * RENDER
   * -------------------------------------------------------
   */

  return (
    <main className="admin-books-page">

      <div className="admin-books-container">

        {/* =================================================
            HEADER
            ================================================= */}

        <header className="admin-books-header">

          <div>
            <Link
              href="/admin"
              className="admin-back"
            >
              ← Dashboard
            </Link>

            <p className="admin-eyebrow">
              ADMINISTRATION
            </p>

            <h1>
              Kelola Buku
            </h1>

            <p className="admin-subtitle">
              Kelola koleksi buku digital,
              publikasi, dan izin download.
            </p>
          </div>


          <div className="admin-header-actions">

            <Link
              href="/admin/books/create"
              className="admin-primary-button"
            >
              + Tambah Buku
            </Link>

          </div>

        </header>


        {/* =================================================
            STATS
            ================================================= */}

        <section className="admin-stats">

          <div className="admin-stat-card">

            <span>
              Total Buku
            </span>

            <strong>
              {totalBooks}
            </strong>

          </div>


          <div className="admin-stat-card">

            <span>
              Dipublikasikan
            </span>

            <strong>
              {publishedBooks}
            </strong>

          </div>


          <div className="admin-stat-card">

            <span>
              Hanya Baca
            </span>

            <strong>
              {readOnlyBooks}
            </strong>

          </div>


          <div className="admin-stat-card">

            <span>
              Bisa Download
            </span>

            <strong>
              {downloadableBooks}
            </strong>

          </div>

        </section>


        {/* =================================================
            BOOK TABLE
            ================================================= */}

        <section className="books-panel">

          <div className="books-panel-header">

            <div>
              <h2>
                Daftar Buku
              </h2>

              <p>
                {totalBooks} buku
                terdaftar.
              </p>
            </div>

          </div>


          {books.length === 0 ? (
            <div className="books-empty">

              <div className="empty-icon">
                📚
              </div>

              <h3>
                Belum ada buku
              </h3>

              <p>
                Tambahkan buku pertama
                ke perpustakaan.
              </p>

              <Link
                href="/admin/books/create"
                className="admin-primary-button"
              >
                + Tambah Buku
              </Link>

            </div>
          ) : (
            <div className="books-table-wrapper">

              <table className="books-table">

                <thead>
                  <tr>

                    <th>
                      Buku
                    </th>

                    <th>
                      File
                    </th>

                    <th>
                      Publikasi
                    </th>

                    <th>
                      Download
                    </th>

                    <th>
                      Diperbarui
                    </th>

                    <th>
                      Aksi
                    </th>

                  </tr>
                </thead>


                <tbody>

                  {books.map(
                    (book) => (
                      <tr
                        key={
                          book.id
                        }
                      >

                        {/* --------------------------------
                            BOOK
                            -------------------------------- */}

                        <td>

                          <div className="book-cell">

                            <div className="book-cover-placeholder">
                              📖
                            </div>

                            <div className="book-cell-info">

                              <strong>
                                {book.title}
                              </strong>

                              <span>
                                {book.author ||
                                  "Penulis tidak diketahui"}
                              </span>

                            </div>

                          </div>

                        </td>


                        {/* --------------------------------
                            FILE
                            -------------------------------- */}

                        <td>

                          <div className="file-cell">

                            <strong>
                              PDF
                            </strong>

                            <span>
                              {formatFileSize(
                                book.file_size
                              )}
                            </span>

                          </div>

                        </td>


                        {/* --------------------------------
                            PUBLISH
                            -------------------------------- */}

                        <td>

                          {book.is_published ? (
                            <span className="status status-published">
                              ● Published
                            </span>
                          ) : (
                            <span className="status status-draft">
                              ● Draft
                            </span>
                          )}

                        </td>


                        {/* --------------------------------
                            DOWNLOAD
                            -------------------------------- */}

                        <td>

                          {book.download_allowed ? (
                            <span className="status status-download">
                              ↓ Allowed
                            </span>
                          ) : (
                            <span className="status status-readonly">
                              🔒 Read only
                            </span>
                          )}

                        </td>


                        {/* --------------------------------
                            UPDATED
                            -------------------------------- */}

                        <td>

                          <span className="date-cell">
                            {formatDate(
                              book.updated_at ||
                                book.created_at
                            )}
                          </span>

                        </td>


                        {/* --------------------------------
                            ACTION
                            -------------------------------- */}

                        <td>

                          <div className="action-buttons">

                            <Link
                              href={`/books/${book.id}`}
                              target="_blank"
                              className="action-button"
                              title="Buka buku"
                            >
                              👁
                            </Link>


                            <Link
                              href={`/admin/books/${book.id}/edit`}
                              className="action-button"
                              title="Edit buku"
                            >
                              ✎
                            </Link>


                            <Link
                              href={`/admin/books/${book.id}/replace`}
                              className="action-button"
                              title="Ganti PDF"
                            >
                              ⟳
                            </Link>


                            <Link
                              href={`/admin/books/${book.id}/delete`}
                              className="action-button action-danger"
                              title="Hapus buku"
                            >
                              🗑
                            </Link>

                          </div>

                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>
          )}

        </section>


        {/* =================================================
            FOOTER
            ================================================= */}

        <footer className="admin-books-footer">

          <Link
            href="/admin"
          >
            ← Kembali ke Dashboard
          </Link>

        </footer>

      </div>


      {/* ===================================================
          STYLE
          =================================================== */}

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .admin-books-page {
              min-height: 100vh;
              background:
                radial-gradient(
                  circle at top,
                  rgba(
                    115,
                    90,
                    255,
                    0.08
                  ),
                  transparent 35%
                ),
                #08090d;
              color: #f4f4f7;
            }

            .admin-books-container {
              width: min(
                1500px,
                calc(100% - 32px)
              );
              margin: 0 auto;
              padding: 32px 0 60px;
            }

            .admin-books-header {
              display: flex;
              align-items: flex-end;
              justify-content: space-between;
              gap: 20px;
              margin-bottom: 25px;
            }

            .admin-back {
              display: inline-block;
              margin-bottom: 18px;
              color: #8f8f99;
              font-size: 13px;
              text-decoration: none;
            }

            .admin-back:hover {
              color: #fff;
            }

            .admin-eyebrow {
              margin: 0 0 6px;
              color: #8d7cff;
              font-size: 10px;
              font-weight: 700;
              letter-spacing: .18em;
            }

            .admin-books-header h1 {
              margin: 0;
              font-size: clamp(
                28px,
                4vw,
                42px
              );
              line-height: 1.1;
            }

            .admin-subtitle {
              max-width: 600px;
              margin: 10px 0 0;
              color: #96969f;
              font-size: 14px;
              line-height: 1.6;
            }

            .admin-primary-button {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              min-height: 43px;
              padding: 0 17px;
              border-radius: 11px;
              background:
                linear-gradient(
                  135deg,
                  #735cff,
                  #a25cff
                );
              color: #fff;
              font-size: 13px;
              font-weight: 700;
              text-decoration: none;
              box-shadow:
                0 10px 35px
                rgba(
                  115,
                  92,
                  255,
                  0.2
                );
            }

            .admin-stats {
              display: grid;
              grid-template-columns:
                repeat(
                  4,
                  minmax(
                    0,
                    1fr
                  )
                );
              gap: 12px;
              margin-bottom: 18px;
            }

            .admin-stat-card {
              padding: 18px;
              border:
                1px solid
                rgba(
                  255,
                  255,
                  255,
                  0.08
                );
              border-radius: 15px;
              background:
                rgba(
                  255,
                  255,
                  255,
                  0.035
                );
            }

            .admin-stat-card span {
              display: block;
              margin-bottom: 8px;
              color: #888891;
              font-size: 12px;
            }

            .admin-stat-card strong {
              font-size: 25px;
            }

            .books-panel {
              overflow: hidden;
              border:
                1px solid
                rgba(
                  255,
                  255,
                  255,
                  0.08
                );
              border-radius: 17px;
              background:
                rgba(
                  255,
                  255,
                  255,
                  0.025
                );
            }

            .books-panel-header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 20px;
              border-bottom:
                1px solid
                rgba(
                  255,
                  255,
                  255,
                  0.07
                );
            }

            .books-panel-header h2 {
              margin: 0 0 4px;
              font-size: 17px;
            }

            .books-panel-header p {
              margin: 0;
              color: #85858e;
              font-size: 12px;
            }

            .books-table-wrapper {
              width: 100%;
              overflow-x: auto;
            }

            .books-table {
              width: 100%;
              border-collapse: collapse;
              min-width: 950px;
            }

            .books-table th {
              padding: 13px 18px;
              color: #777780;
              background:
                rgba(
                  255,
                  255,
                  255,
                  0.02
                );
              font-size: 11px;
              font-weight: 700;
              text-align: left;
              text-transform: uppercase;
              letter-spacing: .07em;
            }

            .books-table td {
              padding: 14px 18px;
              border-top:
                1px solid
                rgba(
                  255,
                  255,
                  255,
                  0.055
                );
              vertical-align: middle;
            }

            .books-table tbody tr {
              transition:
                background .15s ease;
            }

            .books-table tbody tr:hover {
              background:
                rgba(
                  255,
                  255,
                  255,
                  0.025
                );
            }

            .book-cell {
              display: flex;
              align-items: center;
              gap: 11px;
              min-width: 260px;
            }

            .book-cover-placeholder {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 42px;
              height: 54px;
              flex: 0 0 auto;
              border-radius: 7px;
              background:
                linear-gradient(
                  145deg,
                  #29233f,
                  #16151e
                );
              border:
                1px solid
                rgba(
                  255,
                  255,
                  255,
                  0.08
                );
              font-size: 18px;
            }

            .book-cell-info {
              min-width: 0;
            }

            .book-cell-info strong {
              display: block;
              max-width: 330px;
              overflow: hidden;
              color: #eeeeF1;
              font-size: 13px;
              text-overflow: ellipsis;
              white-space: nowrap;
            }

            .book-cell-info span {
              display: block;
              margin-top: 4px;
              color: #85858e;
              font-size: 11px;
            }

            .file-cell strong {
              display: block;
              color: #d6d6dc;
              font-size: 12px;
            }

            .file-cell span {
              display: block;
              margin-top: 4px;
              color: #777780;
              font-size: 11px;
            }

            .status {
              display: inline-flex;
              align-items: center;
              gap: 5px;
              padding: 5px 8px;
              border-radius: 999px;
              font-size: 10px;
              font-weight: 700;
              white-space: nowrap;
            }

            .status-published {
              background:
                rgba(
                  70,
                  220,
                  145,
                  0.08
                );
              color: #64df9e;
            }

            .status-draft {
              background:
                rgba(
                  255,
                  190,
                  70,
                  0.08
                );
              color: #e6ba6c;
            }

            .status-download {
              background:
                rgba(
                  100,
                  140,
                  255,
                  0.08
                );
              color: #8daaff;
            }

            .status-readonly {
              background:
                rgba(
                  255,
                  190,
                  70,
                  0.08
                );
              color: #ddb66e;
            }

            .date-cell {
              color: #85858e;
              font-size: 11px;
              white-space: nowrap;
            }

            .action-buttons {
              display: flex;
              align-items: center;
              gap: 5px;
            }

            .action-button {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              width: 34px;
              height: 34px;
              border:
                1px solid
                rgba(
                  255,
                  255,
                  255,
                  0.08
                );
              border-radius: 8px;
              background:
                rgba(
                  255,
                  255,
                  255,
                  0.035
                );
              color: #bdbdc5;
              font-size: 14px;
              text-decoration: none;
            }

            .action-button:hover {
              background:
                rgba(
                  255,
                  255,
                  255,
                  0.08
                );
              color: #fff;
            }

            .action-danger:hover {
              border-color:
                rgba(
                  255,
                  80,
                  100,
                  0.3
                );
              background:
                rgba(
                  255,
                  80,
                  100,
                  0.08
                );
              color: #ff7888;
            }

            .books-empty {
              display: flex;
              align-items: center;
              justify-content: center;
              flex-direction: column;
              min-height: 350px;
              padding: 30px;
              text-align: center;
            }

            .empty-icon {
              margin-bottom: 12px;
              font-size: 42px;
            }

            .books-empty h3 {
              margin: 0 0 7px;
              font-size: 18px;
            }

            .books-empty p {
              margin: 0 0 18px;
              color: #85858e;
              font-size: 13px;
            }

            .admin-books-footer {
              padding-top: 22px;
            }

            .admin-books-footer a {
              color: #85858e;
              font-size: 13px;
              text-decoration: none;
            }

            .admin-books-footer a:hover {
              color: #fff;
            }

            @media (
              max-width: 800px
            ) {
              .admin-books-container {
                width: min(
                  calc(100% - 20px),
                  1500px
                );
                padding-top: 20px;
              }

              .admin-books-header {
                align-items: flex-start;
                flex-direction: column;
              }

              .admin-header-actions {
                width: 100%;
              }

              .admin-primary-button {
                width: 100%;
              }

              .admin-stats {
                grid-template-columns:
                  repeat(
                    2,
                    minmax(
                      0,
                      1fr
                    )
                  );
              }
            }

            @media (
              max-width: 450px
            ) {
              .admin-stats {
                gap: 8px;
              }

              .admin-stat-card {
                padding: 14px;
              }

              .admin-stat-card strong {
                font-size: 21px;
              }
            }
          `,
        }}
      />

    </main>
  );
}
