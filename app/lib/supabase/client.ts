import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase Browser Client
 *
 * Digunakan pada:
 * - Client Components
 * - Login / logout
 * - Sign In
 * - My Account
 * - History user
 * - Category / Books
 * - Report
 * - Announcement
 *
 * Jangan masukkan SUPABASE_SERVICE_ROLE_KEY ke file ini.
 * File ini hanya boleh menggunakan ANON/PUBLISHABLE KEY.
 */

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL belum diatur. Periksa file .env.local."
    );
  }

  if (!supabaseAnonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY belum diatur. Periksa file .env.local."
    );
  }

  return createBrowserClient(
    supabaseUrl,
    supabaseAnonKey
  );
}

/**
 * Singleton client.
 *
 * Membantu agar dalam satu browser session kita tidak
 * membuat banyak instance Supabase client yang tidak perlu.
 */
let browserClient:
  | ReturnType<typeof createBrowserClient>
  | undefined;

export function getSupabaseBrowserClient() {
  if (!browserClient) {
    browserClient = createClient();
  }

  return browserClient;
}
