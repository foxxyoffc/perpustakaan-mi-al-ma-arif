"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";


/**
 * =========================================================
 * CATEGORY TYPE
 * =========================================================
 */

interface Category {
  id: string;
  name: string;
}


/**
 * =========================================================
 * PAGE
 * =========================================================
 */

export default function CreateBookPage() {
  const router =
    useRouter();


  /**
   * -------------------------------------------------------
   * STATE
   * -------------------------------------------------------
   */

  const [
    categories,
    setCategories,
  ] = useState<Category[]>(
    []
  );


  const [
    loadingCategories,
    setLoadingCategories,
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
    pdfFile,
    setPdfFile,
  ] = useState<File | null>(
    null
  );


  const [
    isPublished,
    setIsPublished,
  ] = useState(true);


  const [
    downloadAllowed,
    setDownloadAllowed,
  ] = useState(false);


  /**
   * -------------------------------------------------------
   * LOAD CATEGORIES
   * -------------------------------------------------------
   */

  useEffect(() => {
    let cancelled =
      false;


    async function loadCategories() {
      try {
        setLoadingCategories(
          true
        );


        const response =
          await fetch(
            "/api/categories",
            {
              method:
                "GET",

              cache:
                "no-store",
            }
          );


        const result =
          await response.json();


        if (
          !response.ok
        ) {
          throw new Error(
            result?.error ||
              "Gagal mengambil kategori."
          );
        }


        if (
          !cancelled
        ) {
          setCategories(
            Array.isArray(
              result?.data
            )
              ? result.data
              : []
          );
        }
      } catch (
        categoryError
      ) {
        console.error(
          "[CREATE_BOOK] category error:",
          categoryError
        );


        if (
          !cancelled
        ) {
          setCategories(
            []
          );
        }
      } finally {
        if (
          !cancelled
        ) {
          setLoadingCategories(
            false
          );
        }
      }
    }


    loadCategories();


    return () => {
      cancelled =
        true;
    };
  }, []);


  /**
   * -------------------------------------------------------
   * FILE CHANGE
   * -------------------------------------------------------
   */

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0] ||
      null;


    setError("");


    if (
      !file
    ) {
      setPdfFile(
        null
      );

      return;
    }


    const isPdf =
      file.type ===
        "application/pdf" ||
      file.name
        .toLowerCase()
        .endsWith(
          ".pdf"
        );


    if (
      !isPdf
    ) {
      setPdfFile(
        null
      );

      event.target.value =
        "";


      setError(
        "File yang dipilih harus berupa PDF."
      );

      return;
    }


    setPdfFile(
      file
    );
  }


  /**
   * -------------------------------------------------------
   * SUBMIT
   * -------------------------------------------------------
   */

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();


    setError("");
    setSuccess("");


    /**
     * Validation
     */

    if (
      !title.trim()
    ) {
      setError(
        "Judul buku wajib diisi."
      );

      return;
    }


    if (
      !pdfFile
    ) {
      setError(
        "File PDF wajib dipilih."
      );

      return;
    }


    /**
     * FormData
     */

    const formData =
      new FormData();


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


    formData.append(
      "file",
      pdfFile
    );


    /**
     * -------------------------------------------------------
     * REQUEST
     * -------------------------------------------------------
     */

    try {
      setSubmitting(
        true
      );


      const response =
        await fetch(
          "/api/books/create",
          {
            method:
              "POST",

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
            "Gagal membuat buku."
        );
      }


      setSuccess(
        "Buku berhasil dibuat."
      );


      /**
       * Redirect setelah sebentar
       */

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
        "[CREATE_BOOK] submit error:",
        submitError
      );


      setError(
        submitError instanceof Error
          ? submitError.message
          : "Terjadi kesalahan saat membuat buku."
      );
    } finally {
      setSubmitting(
        false
      );
    }
  }


  /**
   * -------------------------------------------------------
   * FORMAT FILE SIZE
   * -------------------------------------------------------
   */

  function formatFileSize(
    bytes: number
  ) {
    if (
      bytes <
      1024
    ) {
      return `${bytes} B`;
    }


    if (
      bytes <
      1024 * 1024
    ) {
      return `${(
        bytes / 1024
      ).toFixed(1)} KB`;
    }


    return `${(
      bytes /
      1024 /
      1024
    ).toFixed(2)} MB`;
  }


  /**
   * -------------------------------------------------------
   * RENDER
   * -------------------------------------------------------
   */

  return (
    <main className="create-book-page">

      <div className="create-book-container">

        {/* =================================================
            HEADER
            ================================================= */}

        <header className="create-book-header">

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
            Tambah Buku
          </h1>


          <p className="subtitle">
            Tambahkan buku digital baru
            ke perpustakaan.
          </p>

        </header>


        {/* =================================================
            ALERT
            ================================================= */}

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


        {/* =================================================
            FORM
            ================================================= */}

        <form
          onSubmit={
            handleSubmit
          }
          className="create-book-form"
        >

          {/* =================================================
              BASIC INFORMATION
              ================================================= */}

          <section className="form-section">

            <div className="section-heading">

              <h2>
                Informasi Buku
              </h2>

              <p>
                Informasi dasar buku yang
                akan ditampilkan kepada user.
              </p>

            </div>


            {/* TITLE */}

            <div className="field">

              <label htmlFor="title">
                Judul Buku
                <span>
                  *
                </span>
              </label>

              <input
                id="title"
                name="title"
                type="text"
                value={
                  title
                }
                onChange={(event) =>
                  setTitle(
                    event.target.value
                  )
                }
                placeholder="Contoh: Matematika Kelas 6"
                maxLength={300}
                disabled={
                  submitting
                }
              />

            </div>


            {/* AUTHOR */}

            <div className="field">

              <label htmlFor="author">
                Penulis
              </label>

              <input
                id="author"
                name="author"
                type="text"
                value={
                  author
                }
                onChange={(event) =>
                  setAuthor(
                    event.target.value
                  )
                }
                placeholder="Nama penulis"
                disabled={
                  submitting
                }
              />

            </div>


            {/* CATEGORY */}

            <div className="field">

              <label htmlFor="category">
                Kategori
              </label>

              <select
                id="category"
                name="categoryId"
                value={
                  categoryId
                }
                onChange={(event) =>
                  setCategoryId(
                    event.target.value
                  )
                }
                disabled={
                  submitting ||
                  loadingCategories
                }
              >

                <option value="">
                  Tanpa kategori
                </option>


                {categories.map(
                  (
                    category
                  ) => (
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

              {loadingCategories && (
                <small>
                  Memuat kategori...
                </small>
              )}

            </div>


            {/* DESCRIPTION */}

            <div className="field">

              <label htmlFor="description">
                Deskripsi
              </label>

              <textarea
                id="description"
                name="description"
                value={
                  description
                }
                onChange={(event) =>
                  setDescription(
                    event.target.value
                  )
                }
                placeholder="Deskripsi singkat mengenai buku..."
                rows={6}
                disabled={
                  submitting
                }
              />

            </div>

          </section>


          {/* =================================================
              PDF
              ================================================= */}

          <section className="form-section">

            <div className="section-heading">

              <h2>
                File PDF
              </h2>

              <p>
                Upload file PDF yang akan
                dibaca melalui website.
              </p>

            </div>


            <label
              htmlFor="pdf"
              className={`file-dropzone ${
                pdfFile
                  ? "has-file"
                  : ""
              }`}
            >

              <input
                id="pdf"
                name="file"
                type="file"
                accept="application/pdf,.pdf"
                onChange={
                  handleFileChange
                }
                disabled={
                  submitting
                }
              />


              <div className="upload-icon">
                {pdfFile
                  ? "✓"
                  : "↑"}
              </div>


              {pdfFile ? (
                <>
                  <strong>
                    {pdfFile.name}
                  </strong>

                  <span>
                    {formatFileSize(
                      pdfFile.size
                    )}
                  </span>
                </>
              ) : (
                <>
                  <strong>
                    Pilih file PDF
                  </strong>

                  <span>
                    Klik untuk memilih
                    file dari perangkat
                  </span>
                </>
              )}

            </label>

          </section>


          {/* =================================================
              PUBLISH SETTINGS
              ================================================= */}

          <section className="form-section">

            <div className="section-heading">

              <h2>
                Pengaturan Akses
              </h2>

              <p>
                Tentukan bagaimana user
                dapat mengakses buku.
              </p>

            </div>


            {/* PUBLISH */}

            <label className="setting-card">

              <div className="setting-icon">
                {isPublished
                  ? "🌐"
                  : "🔒"}
              </div>

              <div className="setting-content">

                <strong>
                  Publikasikan buku
                </strong>

                <span>
                  {isPublished
                    ? "Buku dapat ditemukan dan dibaca oleh user."
                    : "Buku disimpan sebagai draft dan belum dapat diakses user biasa."}
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


            {/* DOWNLOAD */}

            <label
              className={`setting-card ${
                downloadAllowed
                  ? "setting-download-enabled"
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
                    ? "User dapat membaca dan mengunduh file PDF."
                    : "User dapat membaca PDF langsung di website, tetapi tidak diberikan tombol download."}
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


            {/* INFO */}

            <div className="access-info">

              <span>
                💡
              </span>

              <p>
                <strong>
                  Perlu diketahui:
                </strong>{" "}
                menonaktifkan download
                tidak menghalangi user
                untuk membaca PDF.
                PDF tetap ditampilkan
                langsung di website.
              </p>

            </div>

          </section>


          {/* =================================================
              ACTIONS
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
                <>
                  + Buat Buku
                </>
              )}

            </button>

          </div>

        </form>

      </div>


      {/* ===================================================
          STYLE
          =================================================== */}

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .create-book-page {
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

            .create-book-container {
              width: min(
                900px,
                calc(100% - 32px)
              );
              margin: 0 auto;
              padding: 32px 0 70px;
            }

            .create-book-header {
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

            .create-book-header h1 {
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
              line-height: 1.6;
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
                  0.18
                );
              background:
                rgba(
                  255,
                  80,
                  100,
                  0.06
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
                  0.18
                );
              background:
                rgba(
                  70,
                  220,
                  145,
                  0.06
                );
              color: #75e3aa;
            }

            .create-book-form {
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
              line-height: 1.5;
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
                  0.1
                );
              border-radius: 10px;
              outline: none;
              background:
                rgba(
                  255,
                  255,
                  255,
                  0.035
                );
              color: #eeeef1;
              font-family: inherit;
              font-size: 13px;
              transition:
                border-color .18s ease,
                background .18s ease;
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
                  0.6
                );
              background:
                rgba(
                  255,
                  255,
                  255,
                  0.05
                );
            }

            .field input::placeholder,
            .field textarea::placeholder {
              color: #5f5f68;
            }

            .field select option {
              background: #17181e;
              color: #fff;
            }

            .field small {
              display: block;
              margin-top: 6px;
              color: #777780;
              font-size: 11px;
            }

            .file-dropzone {
              position: relative;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-direction: column;
              min-height: 210px;
              padding: 25px;
              border:
                1px dashed
                rgba(
                  255,
                  255,
                  255,
                  0.16
                );
              border-radius: 14px;
              background:
                rgba(
                  255,
                  255,
                  255,
                  0.02
                );
              text-align: center;
              cursor: pointer;
              transition:
                border-color .18s ease,
                background .18s ease;
            }

            .file-dropzone:hover {
              border-color:
                rgba(
                  137,
                  116,
                  255,
                  0.55
                );
              background:
                rgba(
                  115,
                  90,
                  255,
                  0.04
                );
            }

            .file-dropzone.has-file {
              border-style: solid;
              border-color:
                rgba(
                  80,
                  220,
                  150,
                  0.3
                );
              background:
                rgba(
                  80,
                  220,
                  150,
                  0.035
                );
            }

            .file-dropzone input {
              position: absolute;
              width: 1px;
              height: 1px;
              opacity: 0;
              pointer-events: none;
            }

            .upload-icon {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 50px;
              height: 50px;
              margin-bottom: 12px;
              border-radius: 13px;
              background:
                rgba(
                  115,
                  90,
                  255,
                  0.1
                );
              color: #9c8cff;
              font-size: 23px;
              font-weight: 700;
            }

            .file-dropzone.has-file .upload-icon {
              background:
                rgba(
                  80,
                  220,
                  150,
                  0.1
                );
              color: #67dfa1;
            }

            .file-dropzone strong {
              max-width: 100%;
              overflow: hidden;
              color: #e7e7eb;
              font-size: 14px;
              text-overflow: ellipsis;
              white-space: nowrap;
            }

            .file-dropzone span {
              margin-top: 5px;
              color: #777780;
              font-size: 11px;
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
                  0.08
                );
              border-radius: 13px;
              background:
                rgba(
                  255,
                  255,
                  255,
                  0.025
                );
              cursor: pointer;
            }

            .setting-card:hover {
              background:
                rgba(
                  255,
                  255,
                  255,
                  0.04
                );
            }

            .setting-download-enabled {
              border-color:
                rgba(
                  115,
                  90,
                  255,
                  0.22
                );
              background:
                rgba(
                  115,
                  90,
                  255,
                  0.035
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
                  0.05
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
              cursor: pointer;
            }

            .access-info {
              display: flex;
              align-items: flex-start;
              gap: 9px;
              margin-top: 14px;
              padding: 12px 13px;
              border-radius: 10px;
              background:
                rgba(
                  255,
                  190,
                  70,
                  0.04
                );
              color: #9e9ea7;
              font-size: 11px;
              line-height: 1.55;
            }

            .access-info p {
              margin: 0;
            }

            .access-info strong {
              color: #d5b16e;
            }

            .form-actions {
              display: flex;
              align-items: center;
              justify-content: flex-end;
              gap: 9px;
              padding-top: 3px;
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
                  0.09
                );
              background:
                rgba(
                  255,
                  255,
                  255,
                  0.035
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
                  0.2
                );
            }

            .submit-button:disabled,
            .cancel-button[aria-disabled="true"] {
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
                  0.35
                );
              border-top-color: #fff;
              border-radius: 50%;
              animation:
                buttonSpin
                .7s
                linear
                infinite;
            }

            @keyframes buttonSpin {
              to {
                transform:
                  rotate(360deg);
              }
            }

            @media (
              max-width: 600px
            ) {
              .create-book-container {
                width: min(
                  calc(100% - 20px),
                  900px
                );
                padding-top: 20px;
              }

              .form-section {
                padding: 17px;
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
