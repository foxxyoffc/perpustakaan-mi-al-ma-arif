import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase Server Client
 *
 * Digunakan pada:
 * - Server Components
 * - Server Actions
 * - Route Handlers
 * - Auth/session checking
 * - Protected pages
 *
 * IMPORTANT:
 * Jangan gunakan SUPABASE_SERVICE_ROLE_KEY di sini.
 *
 * Client ini menggunakan:
 * NEXT_PUBLIC_SUPABASE_URL
 * NEXT_PUBLIC_SUPABASE_ANON_KEY
 *
 * RLS Supabase tetap menjadi lapisan keamanan utama.
 */

export async function createClient() {
  const cookieStore = await cookies();

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

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

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },

        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(
              ({
                name,
                value,
                options,
              }) => {
                cookieStore.set(
                  name,
                  value,
                  options
                );
              }
            );
          } catch {
            /*
             * Server Component tidak selalu dapat
             * menulis cookie.

             * Middleware akan menangani refresh
             * session apabila diperlukan.
             */
          }
        },
      },
    }
  );
}


/**
 * Mengambil user yang sedang login.
 *
 * Menggunakan supabase.auth.getUser()
 * sehingga user diverifikasi oleh Supabase,
 * bukan hanya membaca data session dari cookie.
 */
export async function getCurrentUser() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}


/**
 * Mengambil session aktif.
 *
 * Untuk pengecekan session biasa.
 * Untuk operasi sensitif gunakan getCurrentUser().
 */
export async function getCurrentSession() {
  const supabase = await createClient();

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session) {
    return null;
  }

  return session;
}


/**
 * Mengambil profile user berdasarkan auth.uid().
 *
 * Profile disimpan pada tabel public.profiles.
 */
export async function getCurrentProfile() {
  const supabase = await createClient();

  const {
    data: {
      user,
    },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const {
    data: profile,
    error,
  } = await supabase
    .from("profiles")
    .select(
      `
        id,
        username,
        full_name,
        address,
        birth_place,
        birth_date,
        parent_whatsapp,
        gmail,
        class_level,
        role,
        status,
        avatar_url,
        failed_login_attempts,
        locked_until,
        created_at,
        updated_at
      `
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error(
      "Gagal mengambil profile:",
      error
    );

    return null;
  }

  return profile;
}


/**
 * Mengecek apakah user sudah login.
 */
export async function isAuthenticated() {
  const user = await getCurrentUser();

  return Boolean(user);
}


/**
 * Mengecek role user.
 *
 * Return:
 * - user
 * - admin
 * - developer
 * - null
 */
export async function getCurrentRole() {
  const profile =
    await getCurrentProfile();

  if (!profile) {
    return null;
  }

  return profile.role;
}


/**
 * Mengecek apakah user adalah admin.
 */
export async function isAdmin() {
  const role =
    await getCurrentRole();

  return role === "admin";
}


/**
 * Mengecek apakah user adalah developer.
 */
export async function isDeveloper() {
  const role =
    await getCurrentRole();

  return role === "developer";
}


/**
 * Mengecek apakah user adalah admin
 * atau developer.
 */
export async function isAdminOrDeveloper() {
  const role =
    await getCurrentRole();

  return (
    role === "admin" ||
    role === "developer"
  );
}


/**
 * Memastikan user sudah login.
 *
 * Digunakan pada halaman protected.
 *
 * Jika belum login, fungsi ini mengembalikan null.
 * Redirect akan ditangani oleh halaman/middleware
 * yang memanggilnya agar lebih fleksibel.
 */
export async function requireUser() {
  const user =
    await getCurrentUser();

  if (!user) {
    return null;
  }

  return user;
}


/**
 * Memastikan profile aktif.
 *
 * Akun suspended/inactive tidak dianggap
 * memiliki akses perpustakaan.
 */
export async function requireActiveProfile() {
  const profile =
    await getCurrentProfile();

  if (!profile) {
    return null;
  }

  if (profile.status !== "active") {
    return null;
  }

  return profile;
}


/**
 * Memastikan user mempunyai akses ke
 * sistem perpustakaan.
 *
 * Role yang diperbolehkan:
 * - user
 * - admin
 * - developer
 */
export async function canAccessLibrary() {
  const profile =
    await getCurrentProfile();

  if (!profile) {
    return false;
  }

  if (profile.status !== "active") {
    return false;
  }

  return [
    "user",
    "admin",
    "developer",
  ].includes(profile.role);
}


/**
 * Membuat signed URL untuk file Storage.
 *
 * CATATAN:
 * Untuk PDF buku private, fungsi ini nantinya
 * sebaiknya dipanggil melalui Route Handler
 * yang terlebih dahulu memeriksa:
 *
 * check_book_access(bookId, "read")
 *
 * atau:
 *
 * check_book_access(bookId, "download")
 *
 * Jangan memberikan signed URL secara sembarangan
 * kepada user yang tidak mempunyai izin.
 */
export async function createSignedStorageUrl(
  bucket: string,
  path: string,
  expiresIn = 300
) {
  const supabase =
    await createClient();

  const {
    data,
    error,
  } = await supabase.storage
    .from(bucket)
    .createSignedUrl(
      path,
      expiresIn
    );

  if (error) {
    throw new Error(
      `Gagal membuat signed URL: ${error.message}`
    );
  }

  return data.signedUrl;
}
