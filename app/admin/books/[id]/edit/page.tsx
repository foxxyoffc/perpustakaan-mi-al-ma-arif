"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import Link from "next/link";
import {
  useParams,
  useRouter,
} from "next/navigation";


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
}

interface Category {
  id: string;
  name: string;
}


function formatFileSize(
  bytes: number | null
) {
  if (!bytes || bytes <= 0) {
    return "-";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(
      bytes /
      1024 /
      1024
    ).toFixed(2)} MB`;
  }

  return `${(
    bytes /
    1024 /
    1024 /
    1024
  ).toFixed(2)} GB`;
}


export default function EditBookPage() {
  const params =
    useParams();

  const router =
    useRouter();


  const id =
    Array.isArray(
      params?.id
    )
      ? params.id[0]
      : params?.id;


  const [
    book,
    setBook,
  ] = useState<Book | null>(
    null
  );


  const [
    categories,
    setCategories,
  ] = useState<Category[]>(
    []
  );


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    submitting,
    setSubmitting,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState("");


  const [
    success,
    setSuccess,
  ] = useState("");


  const [
    title,
    setTitle,
  ] = useState("");


  const [
    author,
    setAuthor,
  ] = useState("");


  const [
    description,
    setDescription,
  ] = useState("");


  const [
    categoryId,
    setCategoryId,
  ] = useState("");


  const [
    isPublished,
    setIsPublished,
  ] = useState(true);


  const [
    downloadAllowed,
    setDownloadAllowed,
  ] = useState(false);


  /**
   * ========================================================
   * LOAD BOOK
   * ========================================================
   */

  useEffect(() => {
    if (!id) {
      setError(
        "ID buku tidak ditemukan."
      );

      setLoading(false);

      return;
    }


    let cancelled =
      false;


    async function loadData() {
      try {
        setLoading(true);
        setError("");


        const [
          bookResponse,
          categoryResponse,
        ] = await Promise.all([
          fetch(
            `/api/books/${id}`,
            {
              cache:
                "no-store",
            }
          ),

          fetch(
            "/api/categories",
            {
              cache:
                "no-store",
            }
          ),
        ]);


        const bookResult =
          await bookResponse.json();


        const categoryResult =
          await categoryResponse.json();


        if (
          !bookResponse.ok ||
          !bookResult?.success
        ) {
          throw new Error(
            bookResult?.error ||
              "Gagal mengambil data buku."
          );
        }


        if (
          !cancelled
        ) {
          const data =
            bookResult.data as Book;


          setBook(data);

          setTitle(
            data.title ||
              ""
          );

          setAuthor(
            data.author ||
              ""
          );

          setDescription(
            data.description ||
              ""
          );

          setCategoryId(
            data.category_id ||
              ""
          );

          setIsPublished(
            Boolean(
              data.is_published
            )
          );

          setDownloadAllowed(
            Boolean(
              data.download_allowed
            )
          );


          if (
            categoryResponse.ok &&
            categoryResult?.success
          ) {
            setCategories(
              Array.isArray(
                categoryResult.data
              )
                ? categoryResult.data
                : []
            );
          }
        }
      } catch (
        loadError
      ) {
        console.error(
          "[EDIT_BOOK] load error:",
          loadError
        );


        if (
          !cancelled
        ) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Gagal memuat buku."
          );
        }
      } finally {
        if (
          !cancelled
        ) {
          setLoading(false);
        }
      }
    }


    loadData();


    return () => {
      cancelled =
        true;
    };
  }, [id]);


  /**
   * ========================================================
   * SUBMIT
   * ========================================================
   */

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();


    setError("");
    setSuccess("");


    if (!id) {
      setError(
        "ID buku tidak ditemukan."
      );

      return;
    }


    if (
      !title.trim()
    ) {
      setError(
        "Judul buku wajib diisi."
      );

      return;
    }


    try {
      setSubmitting(true);


      const formData =
        new FormData();


      formData.append(
        "id",
        String(id)
      );


      formData.append(
        "title",
        title.trim()
      );


      formData.append(
        "author",
        author.trim()
      );


      formData.append(
        "description",
        description.trim()
      );


      formData.append(
        "categoryId",
        categoryId
      );


      formData.append(
        "isPublished",
        String(
          isPublished
        )
      );


      formData.append(
        "downloadAllowed",
        String(
          downloadAllowed
        )
      );


      const response =
        await fetch(
          "/api/books/update",
          {
            method:
              "PATCH",
            body:
              formData,
          }
        );


      const result =
        await response.json();


      if (
        !response.ok ||
        !result?.success
      ) {
        throw new Error(
          result?.error ||
            "Gagal memperbarui buku."
        );
      }


      setSuccess(
        "Perubahan berhasil disimpan."
      );


      if (
        result.data
      ) {
        setBook(
          result.data
        );
      }


      setTimeout(() => {
        router.push(
          "/admin/books"
        );

        router.refresh();
      }, 700);
    } catch (
      submitError
    ) {
      console.error(
        "[EDIT_BOOK] update error:",
        submitError
      );


      setError(
        submitError instanceof Error
          ? submitError.message
          : "Terjadi kesalahan saat menyimpan."
      );
    } finally {
      setSubmitting(false);
    }
  }


  /**
   * ========================================================
   * LOADING
   * ========================================================
   */

  if (loading) {
    return (
      <main className="edit-book-page">

        <div className="loading-container">

          <div className="spinner" />

          <p>
            Memuat data buku...
          </p>

        </div>


        <style
          dangerouslySetInnerHTML={{
            __html: `
              .edit-book-page {
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                background: #08090d;
                color: #f4f4f7;
              }

              .loading-container {
                display: flex;
                align-items: center;
                flex-direction: column;
                gap: 12px;
                color: #888891;
                font-size: 13px;
              }

              .spinner {
                width: 30px;
                height: 30px;
                border:
                  3px solid
                  rgba(
                    255,
                    255,
                    255,
                    .1
                  );
                border-top-color:
                  #8069ff;
                border-radius: 50%;
                animation:
                  editSpin
                  .7s
                  linear
                  infinite;
              }

              @keyframes editSpin {
                to {
                  transform:
                    rotate(360deg);
                }
              }
            `,
          }}
        />

      </main>
    );
  }


  /**
   * ========================================================
   * ERROR WITHOUT BOOK
   * ========================================================
   */

  if (
    error &&
    !book
  ) {
    return (
      <main className="edit-book-page">

        <div className="error-container">

          <div className="error-icon">
            ⚠️
          </div>

          <h1>
            Buku tidak dapat dimuat
          </h1>

          <p>
            {error}
          </p>

          <Link
            href="/admin/books"
            className="primary-button"
          >
            ← Kembali ke Buku
          </Link>

        </div>


        <style
          dangerouslySetInnerHTML={{
            __html: `
              .edit-book-page {
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                background: #08090d;
                color: #f4f4f7;
              }

              .error-container {
                max-width: 500px;
                text-align: center;
              }

              .error-icon {
                margin-bottom: 12px;
                font-size: 42px;
              }

              .error-container h1 {
                margin: 0 0 8px;
                font-size: 24px;
              }

              .error-container p {
                margin: 0 0 20px;
                color: #9999a2;
                font-size: 13px;
              }

              .primary-button {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-height: 43px;
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


  /**
   * ========================================================
   * PAGE
   * ========================================================
   */

  return (
    <main className="edit-book-page">

      <div className="edit-book-container">

        <header className="edit-book-header">

          <Link
            href="/admin/books"
            className="back-link"
          >
            ← Kembali ke Kelola Buku
          </Link>


          <p className="eyebrow">
            ADMINISTRATION
          </p>


          <h1>
            Edit Buku
          </h1>


          <p className="subtitle">
            Perbarui informasi dan
            pengaturan akses buku.
          </p>

        </header>


        {error && (
          <div className="alert alert-error">

            <span>
              ⚠️
            </span>

            <p>
              {error}
            </p>

          </div>
        )}


        {success && (
          <div className="alert alert-success">

            <span>
              ✓
            </span>

            <p>
              {success}
            </p>

          </div>
        )}


        <form
          onSubmit={
            handleSubmit
          }
          className="edit-book-form"
        >

          {/* =================================================
              FILE INFO
              ================================================= */}

          <section className="form-section">

            <div className="section-heading">

              <h2>
                File Buku
              </h2>

              <p>
                File PDF saat ini tidak
                diubah dari halaman ini.
              </p>

            </div>


            <div className="current-file">

              <div className="pdf-icon">
                PDF
              </div>


              <div className="file-info">

                <strong>
                  {book?.file_name ||
                    "File PDF"}
                </strong>

                <span>
                  {formatFileSize(
                    book?.file_size ||
                      null
                  )}
                </span>

              </div>


              <Link
                href={`/books/${id}`}
                target="_blank"
                className="view-button"
              >
                Buka Buku
              </Link>

            </div>


            <div className="replace-hint">

              <span>
                💡
              </span>

              <p>
                Ingin mengganti file PDF?
                Gunakan menu{" "}
                <Link
                  href={`/admin/books/${id}/replace`}
                >
                  Ganti PDF
                </Link>
                .
              </p>

            </div>

          </section>


          {/* =================================================
              INFORMATION
              ================================================= */}

          <section className="form-section">

            <div className="section-heading">

              <h2>
                Informasi Buku
              </h2>

              <p>
                Ubah informasi dasar buku.
              </p>

            </div>


            <div className="field">

              <label htmlFor="title">
                Judul Buku
                <span>*</span>
              </label>

              <input
                id="title"
                type="text"
                value={title}
                onChange={(event) =>
                  setTitle(
                    event.target.value
                  )
                }
                maxLength={300}
                disabled={
                  submitting
                }
              />

            </div>


            <div className="field">

              <label htmlFor="author">
                Penulis
              </label>

              <input
                id="author"
                type="text"
                value={author}
                onChange={(event) =>
                  setAuthor(
                    event.target.value
                  )
                }
                disabled={
                  submitting
                }
              />

            </div>


            <div className="field">

              <label htmlFor="category">
                Kategori
              </label>

              <select
                id="category"
                value={
                  categoryId
                }
                onChange={(event) =>
                  setCategoryId(
                    event.target.value
                  )
                }
                disabled={
                  submitting
                }
              >

                <option value="">
                  Tanpa kategori
                </option>


                {categories.map(
                  (category) => (
                    <option
                      key={
                        category.id
                      }
                      value={
                        category.id
                      }
                    >
                      {
                        category.name
                      }
                    </option>
                  )
                )}

              </select>

            </div>


            <div className="field">

              <label htmlFor="description">
                Deskripsi
              </label>

              <textarea
                id="description"
                rows={6}
                value={
                  description
                }
                onChange={(event) =>
                  setDescription(
                    event.target.value
                  )
                }
                disabled={
                  submitting
                }
              />

            </div>

          </section>


          {/* =================================================
              ACCESS
              ================================================= */}

          <section className="form-section">

            <div className="section-heading">

              <h2>
                Pengaturan Akses
              </h2>

              <p>
                Atur bagaimana user dapat
                mengakses buku ini.
              </p>

            </div>


            <label className="setting-card">

              <div className="setting-icon">
                {isPublished
                  ? "🌐"
                  : "🔒"}
              </div>


              <div className="setting-content">

                <strong>
                  Buku Dipublikasikan
                </strong>

                <span>
                  {isPublished
                    ? "User dapat menemukan dan membaca buku ini."
                    : "Buku tidak dapat diakses user biasa."}
                </span>

              </div>


              <input
                type="checkbox"
                checked={
                  isPublished
                }
                onChange={(event) =>
                  setIsPublished(
                    event.target.checked
                  )
                }
                disabled={
                  submitting
                }
              />

            </label>


            <label
              className={`setting-card ${
                downloadAllowed
                  ? "download-on"
                  : ""
              }`}
            >

              <div className="setting-icon">
                {downloadAllowed
                  ? "↓"
                  : "🔒"}
              </div>


              <div className="setting-content">

                <strong>
                  Izinkan Download PDF
                </strong>

                <span>
                  {downloadAllowed
                    ? "User dapat membaca dan mengunduh PDF."
                    : "User tetap dapat membaca PDF di website, tetapi tidak diberikan akses download melalui fitur website."}
                </span>

              </div>


              <input
                type="checkbox"
                checked={
                  downloadAllowed
                }
                onChange={(event) =>
                  setDownloadAllowed(
                    event.target.checked
                  )
                }
                disabled={
                  submitting
                }
              />

            </label>


            <div className="important-note">

              <span>
                🔐
              </span>

              <p>
                <strong>
                  Mode hanya baca:
                </strong>{" "}
                jika download dimatikan,
                PDF tetap dapat dibuka
                menggunakan PDF Viewer
                website. User tidak perlu
                mengunduh PDF terlebih dahulu
                untuk membacanya.
              </p>

            </div>

          </section>


          {/* =================================================
              ACTION
              ================================================= */}

          <div className="form-actions">

            <Link
              href="/admin/books"
              className="cancel-button"
            >
              Batal
            </Link>


            <button
              type="submit"
              className="submit-button"
              disabled={
                submitting
              }
            >

              {submitting ? (
                <>
                  <span className="button-spinner" />
                  Menyimpan...
                </>
              ) : (
                "Simpan Perubahan"
              )}

            </button>

          </div>

        </form>

      </div>


      <style
        dangerouslySetInnerHTML={{
          __html: `
            .edit-book-page {
              min-height: 100vh;
              background:
                radial-gradient(
                  circle at top,
                  rgba(
                    115,
                    90,
                    255,
                    .08
                  ),
                  transparent 35%
                ),
                #08090d;
              color: #f4f4f7;
            }

            .edit-book-container {
              width: min(
                900px,
                calc(100% - 32px)
              );
              margin: 0 auto;
              padding: 32px 0 70px;
            }

            .edit-book-header {
              margin-bottom: 25px;
            }

            .back-link {
              display: inline-block;
              margin-bottom: 20px;
              color: #8f8f99;
              font-size: 13px;
              text-decoration: none;
            }

            .back-link:hover {
              color: #fff;
            }

            .eyebrow {
              margin: 0 0 6px;
              color: #8d7cff;
              font-size: 10px;
              font-weight: 700;
              letter-spacing: .18em;
            }

            .edit-book-header h1 {
              margin: 0;
              font-size: clamp(
                28px,
                5vw,
                42px
              );
              line-height: 1.1;
            }

            .subtitle {
              margin: 10px 0 0;
              color: #96969f;
              font-size: 14px;
            }

            .alert {
              display: flex;
              align-items: flex-start;
              gap: 10px;
              margin-bottom: 16px;
              padding: 13px 15px;
              border-radius: 12px;
              font-size: 13px;
            }

            .alert p {
              margin: 0;
              line-height: 1.5;
            }

            .alert-error {
              border:
                1px solid
                rgba(
                  255,
                  80,
                  100,
                  .18
                );
              background:
                rgba(
                  255,
                  80,
                  100,
                  .06
                );
              color: #ff9ba8;
            }

            .alert-success {
              border:
                1px solid
                rgba(
                  70,
                  220,
                  145,
                  .18
                );
              background:
                rgba(
                  70,
                  220,
                  145,
                  .06
                );
              color: #75e3aa;
            }

            .edit-book-form {
              display: flex;
              flex-direction: column;
              gap: 16px;
            }

            .form-section {
              padding: 22px;
              border:
                1px solid
                rgba(
                  255,
                  255,
                  255,
                  .08
                );
              border-radius: 17px;
              background:
                rgba(
                  255,
                  255,
                  255,
                  .025
                );
            }

            .section-heading {
              margin-bottom: 20px;
            }

            .section-heading h2 {
              margin: 0 0 5px;
              font-size: 17px;
            }

            .section-heading p {
              margin: 0;
              color: #85858e;
              font-size: 12px;
            }

            .current-file {
              display: flex;
              align-items: center;
              gap: 12px;
              padding: 14px;
              border:
                1px solid
                rgba(
                  255,
                  255,
                  255,
                  .08
                );
              border-radius: 12px;
              background:
                rgba(
                  255,
                  255,
                  255,
                  .025
                );
            }

            .pdf-icon {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 45px;
              height: 50px;
              flex: 0 0 auto;
              border-radius: 8px;
              background:
                rgba(
                  255,
                  80,
                  100,
                  .1
                );
              color: #ff8d9b;
              font-size: 10px;
              font-weight: 800;
            }

            .file-info {
              min-width: 0;
              flex: 1;
            }

            .file-info strong {
              display: block;
              overflow: hidden;
              color: #dddde2;
              font-size: 12px;
              text-overflow: ellipsis;
              white-space: nowrap;
            }

            .file-info span {
              display: block;
              margin-top: 4px;
              color: #777780;
              font-size: 11px;
            }

            .view-button {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              min-height: 35px;
              padding: 0 11px;
              border:
                1px solid
                rgba(
                  255,
                  255,
                  255,
                  .09
                );
              border-radius: 8px;
              color: #aaaab2;
              font-size: 11px;
              font-weight: 600;
              text-decoration: none;
              white-space: nowrap;
            }

            .replace-hint {
              display: flex;
              align-items: flex-start;
              gap: 8px;
              margin-top: 12px;
              color: #85858e;
              font-size: 11px;
              line-height: 1.5;
            }

            .replace-hint p {
              margin: 0;
            }

            .replace-hint a {
              color: #a394ff;
              text-decoration: none;
            }

            .field {
              margin-bottom: 17px;
            }

            .field:last-child {
              margin-bottom: 0;
            }

            .field label {
              display: block;
              margin-bottom: 7px;
              color: #d9d9df;
              font-size: 12px;
              font-weight: 600;
            }

            .field label span {
              margin-left: 3px;
              color: #ff7182;
            }

            .field input,
            .field select,
            .field textarea {
              display: block;
              width: 100%;
              box-sizing: border-box;
              border:
                1px solid
                rgba(
                  255,
                  255,
                  255,
                  .1
                );
              border-radius: 10px;
              outline: none;
              background:
                rgba(
                  255,
                  255,
                  255,
                  .035
                );
              color: #eeeef1;
              font-family: inherit;
              font-size: 13px;
            }

            .field input,
            .field select {
              height: 44px;
              padding: 0 13px;
            }

            .field textarea {
              min-height: 130px;
              padding: 12px 13px;
              resize: vertical;
              line-height: 1.6;
            }

            .field input:focus,
            .field select:focus,
            .field textarea:focus {
              border-color:
                rgba(
                  132,
                  109,
                  255,
                  .6
                );
            }

            .field select option {
              background: #17181e;
              color: #fff;
            }

            .setting-card {
              display: flex;
              align-items: center;
              gap: 13px;
              margin-bottom: 10px;
              padding: 15px;
              border:
                1px solid
                rgba(
                  255,
                  255,
                  255,
                  .08
                );
              border-radius: 13px;
              background:
                rgba(
                  255,
                  255,
                  255,
                  .025
                );
              cursor: pointer;
            }

            .setting-card.download-on {
              border-color:
                rgba(
                  115,
                  90,
                  255,
                  .25
                );
              background:
                rgba(
                  115,
                  90,
                  255,
                  .04
                );
            }

            .setting-icon {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 38px;
              height: 38px;
              flex: 0 0 auto;
              border-radius: 10px;
              background:
                rgba(
                  255,
                  255,
                  255,
                  .05
                );
              font-size: 16px;
            }

            .setting-content {
              min-width: 0;
              flex: 1;
            }

            .setting-content strong {
              display: block;
              margin-bottom: 4px;
              color: #dddde2;
              font-size: 13px;
            }

            .setting-content span {
              display: block;
              color: #7f7f88;
              font-size: 11px;
              line-height: 1.5;
            }

            .setting-card input[type="checkbox"] {
              width: 20px;
              height: 20px;
              flex: 0 0 auto;
              accent-color: #8069ff;
            }

            .important-note {
              display: flex;
              align-items: flex-start;
              gap: 9px;
              margin-top: 14px;
              padding: 13px;
              border-radius: 10px;
              background:
                rgba(
                  115,
                  90,
                  255,
                  .045
                );
              color: #92929b;
              font-size: 11px;
              line-height: 1.6;
            }

            .important-note p {
              margin: 0;
            }

            .important-note strong {
              color: #b9adff;
            }

            .form-actions {
              display: flex;
              align-items: center;
              justify-content: flex-end;
              gap: 9px;
            }

            .cancel-button,
            .submit-button {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              min-height: 44px;
              padding: 0 18px;
              border-radius: 10px;
              font-family: inherit;
              font-size: 13px;
              font-weight: 700;
              text-decoration: none;
              cursor: pointer;
            }

            .cancel-button {
              border:
                1px solid
                rgba(
                  255,
                  255,
                  255,
                  .09
                );
              background:
                rgba(
                  255,
                  255,
                  255,
                  .035
                );
              color: #aaaab2;
            }

            .submit-button {
              border: 0;
              background:
                linear-gradient(
                  135deg,
                  #735cff,
                  #a25cff
                );
              color: #fff;
              box-shadow:
                0 10px 35px
                rgba(
                  115,
                  92,
                  255,
                  .2
                );
            }

            .submit-button:disabled {
              opacity: .55;
              cursor: not-allowed;
            }

            .button-spinner {
              width: 15px;
              height: 15px;
              margin-right: 8px;
              border:
                2px solid
                rgba(
                  255,
                  255,
                  255,
                  .35
                );
              border-top-color: #fff;
              border-radius: 50%;
              animation:
                editButtonSpin
                .7s
                linear
                infinite;
            }

            @keyframes editButtonSpin {
              to {
                transform:
                  rotate(360deg);
              }
            }

            @media (
              max-width: 600px
            ) {
              .edit-book-container {
                width: min(
                  calc(100% - 20px),
                  900px
                );
                padding-top: 20px;
              }

              .form-section {
                padding: 17px;
              }

              .current-file {
                align-items: flex-start;
                flex-wrap: wrap;
              }

              .view-button {
                margin-left: 57px;
              }

              .form-actions {
                flex-direction: column-reverse;
              }

              .cancel-button,
              .submit-button {
                width: 100%;
              }
            }
          `,
        }}
      />

    </main>
  );
}
