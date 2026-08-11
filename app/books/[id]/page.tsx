import Link from "next/link";

import PdfViewer from "@/app/components/PdfViewer";


interface BookResponse {
  success: boolean;

  data?: {
    id: string;
    title: string;
    author: string | null;
    description: string | null;
    categoryId: string | null;
    fileName: string | null;
    fileSize: number | null;
    mimeType: string;
    coverPath: string | null;
    isPublished: boolean;
    downloadAllowed: boolean;
    viewerUrl: string | null;
    createdAt: string | null;
    updatedAt: string | null;
  };

  error?: string;
}


interface PageProps {
  params: Promise<{
    id: string;
  }>;
}


async function getBook(
  id: string
): Promise<BookResponse> {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000";


  const response =
    await fetch(
      `${baseUrl}/api/books/${id}`,
      {
        cache: "no-store",
      }
    );


  const result =
    (await response.json()) as BookResponse;


  if (!response.ok) {
    throw new Error(
      result.error ||
        "Buku tidak dapat dimuat."
    );
  }


  return result;
}


export default async function BookPage({
  params,
}: PageProps) {
  const { id } =
    await params;


  let result: BookResponse;


  try {
    result =
      await getBook(id);
  } catch (error) {
    return (
      <main className="book-error-page">

        <div className="book-error-card">

          <div className="error-icon">
            ⚠️
          </div>

          <h1>
            Buku tidak dapat dibuka
          </h1>

          <p>
            {error instanceof Error
              ? error.message
              : "Terjadi kesalahan saat membuka buku."}
          </p>

          <Link
            href="/"
            className="back-button"
          >
            ← Kembali
          </Link>

        </div>


        <style
          dangerouslySetInnerHTML={{
            __html: `
              .book-error-page {
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                background: #08090d;
                color: #f4f4f7;
              }

              .book-error-card {
                width: min(
                  430px,
                  100%
                );
                padding: 30px;
                border:
                  1px solid
                  rgba(
                    255,
                    255,
                    255,
                    .08
                  );
                border-radius: 18px;
                background:
                  rgba(
                    255,
                    255,
                    255,
                    .025
                  );
                text-align: center;
              }

              .error-icon {
                margin-bottom: 12px;
                font-size: 40px;
              }

              .book-error-card h1 {
                margin: 0 0 8px;
                font-size: 22px;
              }

              .book-error-card p {
                margin: 0 0 20px;
                color: #96969f;
                font-size: 13px;
                line-height: 1.6;
              }

              .back-button {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-height: 42px;
                padding: 0 17px;
                border-radius: 10px;
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
              }
            `,
          }}
        />

      </main>
    );
  }


  if (
    !result.success ||
    !result.data
  ) {
    return (
      <main className="book-error-page">
        <div className="book-error-card">
          <h1>
            Buku tidak ditemukan
          </h1>

          <p>
            Data buku tidak tersedia.
          </p>

          <Link
            href="/"
            className="back-button"
          >
            ← Kembali
          </Link>
        </div>
      </main>
    );
  }


  const book =
    result.data;


  /*
   * PDF harus tersedia untuk viewer.
   */

  if (
    !book.viewerUrl
  ) {
    return (
      <main className="book-error-page">

        <div className="book-error-card">

          <div className="error-icon">
            📄
          </div>

          <h1>
            File PDF tidak tersedia
          </h1>

          <p>
            Buku ditemukan, tetapi file
            PDF belum tersedia.
          </p>

          <Link
            href="/"
            className="back-button"
          >
            ← Kembali
          </Link>

        </div>

      </main>
    );
  }


  return (
    <main className="book-page">

      {/* ===================================================
          HEADER
          =================================================== */}

      <header className="book-header">

        <div className="header-left">

          <Link
            href="/"
            className="back-link"
          >
            ←
          </Link>


          <div className="book-heading">

            <h1>
              {book.title}
            </h1>


            {book.author && (
              <p>
                {book.author}
              </p>
            )}

          </div>

        </div>


        {/* =================================================
            DOWNLOAD BUTTON
            ================================================= */}

        {book.downloadAllowed && (
          <a
            href={`/api/books/${book.id}/download`}
            className="download-button"
          >
            <span>
              ↓
            </span>

            Download
          </a>
        )}

      </header>


      {/* ===================================================
          PDF VIEWER
          =================================================== */}

      <section className="viewer-container">

        <PdfViewer
          url={
            book.viewerUrl
          }

          title={
            book.title
          }

          downloadAllowed={
            book.downloadAllowed
          }

        />

      </section>


      {/* ===================================================
          BOOK INFORMATION
          =================================================== */}

      <section className="book-information">

        {book.description && (
          <div className="description">

            <h2>
              Tentang Buku
            </h2>

            <p>
              {book.description}
            </p>

          </div>
        )}


        {!book.downloadAllowed && (
          <div className="read-only-notice">

            <span>
              🔒
            </span>

            <div>

              <strong>
                Mode baca saja
              </strong>

              <p>
                Buku ini dapat dibaca
                langsung melalui website,
                tetapi fitur download
                dinonaktifkan oleh
                administrator.
              </p>

            </div>

          </div>
        )}

      </section>


      <style
        dangerouslySetInnerHTML={{
          __html: `
            .book-page {
              min-height: 100vh;
              background: #08090d;
              color: #f4f4f7;
            }

            .book-header {
              position: sticky;
              top: 0;
              z-index: 20;
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 16px;
              min-height: 62px;
              padding: 0 18px;
              border-bottom:
                1px solid
                rgba(
                  255,
                  255,
                  255,
                  .07
                );
              background:
                rgba(
                  8,
                  9,
                  13,
                  .88
                );
              backdrop-filter:
                blur(16px);
            }

            .header-left {
              display: flex;
              align-items: center;
              gap: 12px;
              min-width: 0;
            }

            .back-link {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 35px;
              height: 35px;
              flex: 0 0 auto;
              border:
                1px solid
                rgba(
                  255,
                  255,
                  255,
                  .08
                );
              border-radius: 9px;
              color: #aaaab2;
              font-size: 17px;
              text-decoration: none;
            }

            .book-heading {
              min-width: 0;
            }

            .book-heading h1 {
              max-width: 60vw;
              margin: 0;
              overflow: hidden;
              color: #eeeef1;
              font-size: 14px;
              font-weight: 700;
              text-overflow: ellipsis;
              white-space: nowrap;
            }

            .book-heading p {
              margin: 3px 0 0;
              overflow: hidden;
              color: #777780;
              font-size: 10px;
              text-overflow: ellipsis;
              white-space: nowrap;
            }

            .download-button {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              gap: 6px;
              min-height: 36px;
              padding: 0 13px;
              flex: 0 0 auto;
              border-radius: 9px;
              background:
                linear-gradient(
                  135deg,
                  #735cff,
                  #a25cff
                );
              color: #fff;
              font-size: 11px;
              font-weight: 700;
              text-decoration: none;
            }

            .download-button span {
              font-size: 15px;
            }

            .viewer-container {
              width: 100%;
              min-height: calc(
                100vh - 62px
              );
            }

            .book-information {
              width: min(
                900px,
                calc(100% - 30px)
              );
              margin: 0 auto;
              padding: 25px 0 50px;
            }

            .description {
              padding: 20px;
              border:
                1px solid
                rgba(
                  255,
                  255,
                  255,
                  .07
                );
              border-radius: 14px;
              background:
                rgba(
                  255,
                  255,
                  255,
                  .025
                );
            }

            .description h2 {
              margin: 0 0 8px;
              font-size: 15px;
            }

            .description p {
              margin: 0;
              color: #92929b;
              font-size: 12px;
              line-height: 1.7;
              white-space: pre-wrap;
            }

            .read-only-notice {
              display: flex;
              align-items: flex-start;
              gap: 10px;
              margin-top: 12px;
              padding: 14px;
              border:
                1px solid
                rgba(
                  255,
                  190,
                  70,
                  .13
                );
              border-radius: 12px;
              background:
                rgba(
                  255,
                  190,
                  70,
                  .035
                );
            }

            .read-only-notice > span {
              font-size: 17px;
            }

            .read-only-notice strong {
              display: block;
              margin-bottom: 3px;
              color: #d9bd7d;
              font-size: 12px;
            }

            .read-only-notice p {
              margin: 0;
              color: #85858e;
              font-size: 11px;
              line-height: 1.5;
            }

            @media (
              max-width: 600px
            ) {
              .book-header {
                padding: 0 10px;
              }

              .book-heading h1 {
                max-width: 48vw;
              }

              .download-button {
                padding: 0 10px;
              }

              .download-button span {
                font-size: 14px;
              }

              .book-information {
                width: min(
                  calc(100% - 20px),
                  900px
                );
              }
            }
          `,
        }}
      />

    </main>
  );
}
