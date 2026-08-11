"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";


interface PdfViewerProps {
  bookId: string;
  title?: string;
  downloadAllowed?: boolean;
  className?: string;
}


export default function PdfViewer({
  bookId,
  title = "PDF Viewer",
  downloadAllowed = false,
  className = "",
}: PdfViewerProps) {
  const iframeRef =
    useRef<HTMLIFrameElement | null>(null);

  const viewerContainerRef =
    useRef<HTMLDivElement | null>(null);


  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState(false);

  const [fullscreen, setFullscreen] =
    useState(false);


  /*
   * ========================================================
   * URL
   * ========================================================
   *
   * Viewer:
   * /api/books/[id]/view
   *
   * Download:
   * /api/books/[id]/download
   */

  const viewUrl =
    `/api/books/${encodeURIComponent(
      bookId
    )}/view`;


  const downloadUrl =
    `/api/books/${encodeURIComponent(
      bookId
    )}/download`;


  /*
   * ========================================================
   * IFRAME LOAD
   * ========================================================
   */

  const handleLoad =
    useCallback(() => {
      setLoading(false);
      setError(false);
    }, []);


  /*
   * ========================================================
   * IFRAME ERROR
   * ========================================================
   */

  const handleError =
    useCallback(() => {
      setLoading(false);
      setError(true);
    }, []);


  /*
   * ========================================================
   * FULLSCREEN CHANGE
   * ========================================================
   */

  useEffect(() => {
    const handleFullscreenChange =
      () => {
        setFullscreen(
          Boolean(
            document.fullscreenElement
          )
        );
      };


    document.addEventListener(
      "fullscreenchange",
      handleFullscreenChange
    );


    return () => {
      document.removeEventListener(
        "fullscreenchange",
        handleFullscreenChange
      );
    };
  }, []);


  /*
   * ========================================================
   * FULLSCREEN
   * ========================================================
   */

  const toggleFullscreen =
    async () => {
      const element =
        viewerContainerRef.current;


      if (!element) {
        return;
      }


      try {
        if (
          document.fullscreenElement
        ) {
          await document.exitFullscreen();
          return;
        }


        await element.requestFullscreen();
      } catch (fullscreenError) {
        console.error(
          "[PDF_VIEWER] fullscreen error:",
          fullscreenError
        );
      }
    };


  /*
   * ========================================================
   * RELOAD
   * ========================================================
   */

  const reloadViewer =
    () => {
      setError(false);
      setLoading(true);


      const iframe =
        iframeRef.current;


      if (!iframe) {
        return;
      }


      const separator =
        viewUrl.includes("?")
          ? "&"
          : "?";


      iframe.src =
        `${viewUrl}${separator}_=${Date.now()}`;
    };


  /*
   * ========================================================
   * INVALID ID
   * ========================================================
   */

  if (!bookId) {
    return (
      <section
        className={`pdf-viewer-wrapper ${className}`}
      >
        <div className="pdf-viewer-error">

          <div className="pdf-error-icon">
            ⚠️
          </div>

          <h3>
            PDF tidak dapat dibuka
          </h3>

          <p>
            ID buku tidak valid.
          </p>

        </div>
      </section>
    );
  }


  /*
   * ========================================================
   * RENDER
   * ========================================================
   */

  return (
    <section
      ref={viewerContainerRef}
      className={`pdf-viewer-wrapper ${
        fullscreen
          ? "pdf-viewer-fullscreen"
          : ""
      } ${className}`}
    >

      {/* ==================================================
          TOOLBAR
          ================================================== */}

      <div className="pdf-viewer-toolbar">

        <div className="pdf-toolbar-left">

          <span className="pdf-status-dot" />

          <span className="pdf-viewer-title">
            {title}
          </span>

        </div>


        <div className="pdf-toolbar-right">

          {downloadAllowed && (
            <a
              href={downloadUrl}
              className="pdf-toolbar-button"
              download
              title="Download PDF"
            >
              <span>
                ↓
              </span>

              <span className="pdf-button-text">
                Download
              </span>
            </a>
          )}


          <button
            type="button"
            onClick={reloadViewer}
            className="pdf-toolbar-button"
            title="Muat ulang PDF"
          >
            <span>
              ↻
            </span>

            <span className="pdf-button-text">
              Reload
            </span>
          </button>


          <button
            type="button"
            onClick={toggleFullscreen}
            className="pdf-toolbar-button"
            title={
              fullscreen
                ? "Keluar fullscreen"
                : "Fullscreen"
            }
          >
            <span>
              {fullscreen
                ? "⤢"
                : "⛶"}
            </span>

            <span className="pdf-button-text">
              {fullscreen
                ? "Exit"
                : "Fullscreen"}
            </span>
          </button>

        </div>

      </div>


      {/* ==================================================
          VIEWER
          ================================================== */}

      <div className="pdf-viewer-content">

        {loading && (
          <div className="pdf-viewer-loading">

            <div className="pdf-spinner" />

            <p>
              Membuka PDF...
            </p>

            <span>
              Mohon tunggu sebentar
            </span>

          </div>
        )}


        {error && (
          <div className="pdf-viewer-error">

            <div className="pdf-error-icon">
              📄
            </div>

            <h3>
              PDF gagal dimuat
            </h3>

            <p>
              File tidak dapat ditampilkan
              saat ini.
            </p>

            <button
              type="button"
              onClick={reloadViewer}
              className="pdf-retry-button"
            >
              Coba lagi
            </button>

          </div>
        )}


        <iframe
          ref={iframeRef}
          src={viewUrl}
          title={`PDF: ${title}`}
          className={`pdf-iframe ${
            error
              ? "pdf-iframe-hidden"
              : ""
          }`}
          onLoad={handleLoad}
          onError={handleError}
          allow="fullscreen"
          loading="eager"
        />

      </div>


      {/* ==================================================
          READ ONLY NOTICE
          ================================================== */}

      {!downloadAllowed && (
        <div className="pdf-readonly-notice">

          <span className="pdf-lock">
            🔒
          </span>

          <span>
            Buku ini hanya dapat dibaca
            melalui website.
          </span>

        </div>
      )}


      <style
        dangerouslySetInnerHTML={{
          __html: `
            .pdf-viewer-wrapper {
              position: relative;
              display: flex;
              flex-direction: column;
              width: 100%;
              height: min(82vh, 1050px);
              min-height: 620px;
              overflow: hidden;
              border: 1px solid rgba(255,255,255,.09);
              border-radius: 18px;
              background: #111217;
              box-shadow:
                0 25px 80px
                rgba(0,0,0,.35);
            }

            .pdf-viewer-fullscreen {
              width: 100vw;
              height: 100vh;
              min-height: 100vh;
              border-radius: 0;
              border: 0;
              background: #111217;
            }

            .pdf-viewer-toolbar {
              position: relative;
              z-index: 10;
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 12px;
              min-height: 54px;
              padding: 7px 10px 7px 15px;
              border-bottom:
                1px solid
                rgba(255,255,255,.07);
              background:
                rgba(15,16,21,.96);
              backdrop-filter:
                blur(16px);
            }

            .pdf-toolbar-left {
              display: flex;
              align-items: center;
              gap: 9px;
              min-width: 0;
            }

            .pdf-status-dot {
              width: 7px;
              height: 7px;
              flex: 0 0 auto;
              border-radius: 50%;
              background: #57e39b;
              box-shadow:
                0 0 10px
                rgba(87,227,155,.65);
            }

            .pdf-viewer-title {
              overflow: hidden;
              color: #dddde3;
              font-size: 13px;
              font-weight: 600;
              text-overflow: ellipsis;
              white-space: nowrap;
            }

            .pdf-toolbar-right {
              display: flex;
              align-items: center;
              gap: 6px;
              flex: 0 0 auto;
            }

            .pdf-toolbar-button {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              gap: 6px;
              min-height: 36px;
              padding: 0 11px;
              border:
                1px solid
                rgba(255,255,255,.08);
              border-radius: 9px;
              background:
                rgba(255,255,255,.045);
              color: #d7d7dd;
              font-family: inherit;
              font-size: 12px;
              font-weight: 600;
              text-decoration: none;
              cursor: pointer;
              transition:
                background .18s ease,
                border-color .18s ease,
                transform .18s ease;
            }

            .pdf-toolbar-button:hover {
              background:
                rgba(255,255,255,.09);
              border-color:
                rgba(255,255,255,.14);
            }

            .pdf-toolbar-button:active {
              transform:
                translateY(1px);
            }

            .pdf-toolbar-button span:first-child {
              font-size: 16px;
              line-height: 1;
            }

            .pdf-viewer-content {
              position: relative;
              flex: 1;
              min-height: 0;
              background: #292a30;
            }

            .pdf-iframe {
              position: relative;
              z-index: 1;
              display: block;
              width: 100%;
              height: 100%;
              border: 0;
              background: #292a30;
            }

            .pdf-iframe-hidden {
              visibility: hidden;
            }

            .pdf-viewer-loading,
            .pdf-viewer-error {
              position: absolute;
              inset: 0;
              z-index: 5;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-direction: column;
              padding: 30px;
              background: #292a30;
              text-align: center;
            }

            .pdf-viewer-loading p {
              margin: 15px 0 4px;
              color: #eeeef1;
              font-size: 15px;
              font-weight: 600;
            }

            .pdf-viewer-loading span {
              color: #85858e;
              font-size: 12px;
            }

            .pdf-spinner {
              width: 30px;
              height: 30px;
              border:
                3px solid
                rgba(255,255,255,.12);
              border-top-color: #8c73ff;
              border-radius: 50%;
              animation:
                pdfSpin .8s linear infinite;
            }

            @keyframes pdfSpin {
              to {
                transform: rotate(360deg);
              }
            }

            .pdf-error-icon {
              margin-bottom: 10px;
              font-size: 36px;
            }

            .pdf-viewer-error h3 {
              margin: 0 0 7px;
              color: #eeeeF1;
              font-size: 18px;
            }

            .pdf-viewer-error p {
              margin: 0 0 16px;
              color: #92929c;
              font-size: 13px;
            }

            .pdf-retry-button {
              min-height: 38px;
              padding: 0 15px;
              border: 0;
              border-radius: 9px;
              background:
                linear-gradient(
                  135deg,
                  #725cff,
                  #a15cff
                );
              color: #fff;
              font-family: inherit;
              font-size: 13px;
              font-weight: 600;
              cursor: pointer;
            }

            .pdf-readonly-notice {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 7px;
              min-height: 36px;
              padding: 0 12px;
              border-top:
                1px solid
                rgba(255,255,255,.06);
              background:
                rgba(255,190,70,.035);
              color: #9e9ea7;
              font-size: 11px;
            }

            .pdf-lock {
              font-size: 12px;
            }

            @media (max-width: 650px) {
              .pdf-viewer-wrapper {
                height: 75vh;
                min-height: 520px;
                border-radius: 13px;
              }

              .pdf-viewer-toolbar {
                min-height: 50px;
                padding:
                  6px 7px 6px 11px;
              }

              .pdf-button-text {
                display: none;
              }

              .pdf-toolbar-button {
                width: 36px;
                height: 36px;
                padding: 0;
              }

              .pdf-viewer-title {
                max-width: 150px;
              }
            }

            @media (max-width: 400px) {
              .pdf-viewer-wrapper {
                min-height: 480px;
              }

              .pdf-viewer-title {
                max-width: 115px;
              }
            }
          `,
        }}
      />

    </section>
  );
}
