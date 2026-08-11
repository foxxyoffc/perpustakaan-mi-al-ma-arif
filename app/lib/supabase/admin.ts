import { createClient } from "@supabase/supabase-js";

/**
 * =========================================================
 * SUPABASE ADMIN CLIENT
 * =========================================================
 *
 * File:
 * app/lib/supabase/admin.ts
 *
 * CLIENT INI HANYA BOLEH DIGUNAKAN DI SERVER.
 *
 * Jangan import file ini ke:
 * - Client Component
 * - browser
 * - file yang memakai "use client"
 *
 * Karena client ini menggunakan:
 *
 * SUPABASE_SERVICE_ROLE_KEY
 *
 * Service Role Key mempunyai hak akses tinggi
 * dan dapat melewati Row Level Security (RLS).
 *
 * =========================================================
 */


/**
 * =========================================================
 * ENVIRONMENT VARIABLES
 * =========================================================
 */

const supabaseUrl =
  process.env
    .NEXT_PUBLIC_SUPABASE_URL;


const serviceRoleKey =
  process.env
    .SUPABASE_SERVICE_ROLE_KEY;


/**
 * =========================================================
 * ENV VALIDATION
 * =========================================================
 */

if (!supabaseUrl) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL belum diatur di environment variables."
  );
}


if (!serviceRoleKey) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY belum diatur di environment variables."
  );
}


/**
 * =========================================================
 * ADMIN CLIENT
 * =========================================================
 *
 * autoRefreshToken: false
 * --------------------------------
 * Server tidak membutuhkan refresh token
 * seperti browser.
 *
 * persistSession: false
 * --------------------------------
 * Session tidak disimpan di cookie/localStorage.
 *
 * detectSessionInUrl: false
 * --------------------------------
 * Tidak digunakan untuk OAuth browser flow.
 *
 * =========================================================
 */

export const supabaseAdmin =
  createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken:
          false,

        persistSession:
          false,

        detectSessionInUrl:
          false,
      },
    }
  );


/**
 * =========================================================
 * HELPER
 * =========================================================
 *
 * Mengecek apakah admin client tersedia.
 *
 * Berguna untuk debugging server.
 */

export function isSupabaseAdminConfigured() {
  return Boolean(
    supabaseUrl &&
      serviceRoleKey
  );
}


/**
 * =========================================================
 * STORAGE HELPERS
 * =========================================================
 */

export function adminStorage() {
  return supabaseAdmin.storage;
}


/**
 * =========================================================
 * AUTH ADMIN
 * =========================================================
 *
 * Digunakan untuk operasi Auth yang membutuhkan
 * Service Role.
 *
 * Contoh:
 * - membuat user
 * - menghapus user
 * - reset password
 * - mengubah email
 * - mengubah metadata
 *
 * Jangan dipanggil dari Client Component.
 * =========================================================
 */

export function adminAuth() {
  return supabaseAdmin.auth.admin;
}


/**
 * =========================================================
 * DATABASE
 * =========================================================
 *
 * Contoh penggunaan:
 *
 * const { data, error } =
 *   await supabaseAdmin
 *     .from("books")
 *     .select("*");
 *
 * =========================================================
 */

export default supabaseAdmin;
