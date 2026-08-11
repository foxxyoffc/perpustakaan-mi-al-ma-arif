import { createClient } from "@/app/lib/supabase/server";
import { supabaseAdmin } from "@/app/lib/supabase/admin";

/**
 * =========================================================
 * AUTH HELPER
 * =========================================================
 *
 * File:
 * app/lib/auth.ts
 *
 * Digunakan untuk:
 * - Login user
 * - Login admin
 * - Login developer
 * - Logout
 * - Cek session
 * - Cek role
 * - Cek status akun
 * - Failed login attempt
 * - Lock akun setelah 5x login gagal
 *
 * =========================================================
 */

export type UserRole =
  | "user"
  | "admin"
  | "developer";

export type AccountStatus =
  | "pending"
  | "active"
  | "suspended";


/**
 * Jumlah maksimal login gagal.
 */
export const MAX_LOGIN_ATTEMPTS = 5;


/**
 * Lama lock akun setelah 5x gagal.
 *
 * 15 menit.
 *
 * Setelah masa lock selesai, percobaan dapat dilakukan lagi.
 */
export const LOGIN_LOCK_MINUTES = 15;


/**
 * =========================================================
 * TYPE
 * =========================================================
 */

export interface Profile {
  id: string;

  username: string | null;

  full_name: string | null;

  address: string | null;

  birth_place: string | null;

  birth_date: string | null;

  parent_whatsapp: string | null;

  gmail: string | null;

  class_level: number | null;

  role: UserRole;

  status: AccountStatus;

  avatar_url: string | null;

  failed_login_attempts: number;

  locked_until: string | null;

  created_at: string;

  updated_at: string;
}


/**
 * =========================================================
 * AUTH RESULT
 * =========================================================
 */

export interface AuthResult {
  success: boolean;

  message: string;

  userId?: string;

  role?: UserRole;

  profile?: Profile | null;

  needsApproval?: boolean;

  lockedUntil?: string | null;
}


/**
 * =========================================================
 * NORMALIZE USERNAME
 * =========================================================
 */

export function normalizeUsername(
  username: string
) {
  return username
    .trim()
    .toLowerCase();
}


/**
 * =========================================================
 * NORMALIZE EMAIL
 * =========================================================
 */

export function normalizeEmail(
  email: string
) {
  return email
    .trim()
    .toLowerCase();
}


/**
 * =========================================================
 * GET CURRENT USER
 * =========================================================
 */

export async function getAuthUser() {
  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
    error,
  } =
    await supabase.auth.getUser();

  if (
    error ||
    !user
  ) {
    return null;
  }

  return user;
}


/**
 * =========================================================
 * GET CURRENT PROFILE
 * =========================================================
 */

export async function getAuthProfile() {
  const user =
    await getAuthUser();

  if (!user) {
    return null;
  }


  const {
    data,
    error,
  } =
    await supabaseAdmin
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
      .eq(
        "id",
        user.id
      )
      .maybeSingle();


  if (error) {
    console.error(
      "getAuthProfile error:",
      error
    );

    return null;
  }


  return data as Profile | null;
}


/**
 * =========================================================
 * GET ROLE
 * =========================================================
 */

export async function getUserRole() {
  const profile =
    await getAuthProfile();

  return (
    profile?.role ??
    null
  );
}


/**
 * =========================================================
 * ROLE CHECK
 * =========================================================
 */

export async function hasRole(
  role: UserRole
) {
  const currentRole =
    await getUserRole();

  return (
    currentRole ===
    role
  );
}


/**
 * =========================================================
 * ADMIN CHECK
 * =========================================================
 */

export async function isAdminUser() {
  return hasRole(
    "admin"
  );
}


/**
 * =========================================================
 * DEVELOPER CHECK
 * =========================================================
 */

export async function isDeveloperUser() {
  return hasRole(
    "developer"
  );
}


/**
 * =========================================================
 * ADMIN / DEVELOPER CHECK
 * =========================================================
 */

export async function isStaff() {
  const role =
    await getUserRole();

  return (
    role === "admin" ||
    role === "developer"
  );
}


/**
 * =========================================================
 * ACTIVE ACCOUNT CHECK
 * =========================================================
 */

export async function isActiveAccount() {
  const profile =
    await getAuthProfile();

  if (!profile) {
    return false;
  }

  return (
    profile.status ===
    "active"
  );
}


/**
 * =========================================================
 * CHECK LOCK STATUS
 * =========================================================
 */

export function isAccountLocked(
  lockedUntil:
    | string
    | null
    | undefined
) {
  if (!lockedUntil) {
    return false;
  }


  const lockedTime =
    new Date(
      lockedUntil
    ).getTime();


  if (
    Number.isNaN(
      lockedTime
    )
  ) {
    return false;
  }


  return (
    lockedTime >
    Date.now()
  );
}


/**
 * =========================================================
 * GET LOCK TIME
 * =========================================================
 */

export function getLockUntil() {
  const date =
    new Date(
      Date.now() +
        LOGIN_LOCK_MINUTES *
          60 *
          1000
    );

  return date.toISOString();
}


/**
 * =========================================================
 * FIND ACCOUNT BY USERNAME
 * =========================================================
 *
 * Username disimpan pada profiles.
 *
 * Fungsi ini hanya digunakan SERVER-SIDE.
 */
export async function findProfileByUsername(
  username: string
) {
  const normalized =
    normalizeUsername(
      username
    );


  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from("profiles")
      .select(
        `
          id,
          username,
          full_name,
          gmail,
          role,
          status,
          failed_login_attempts,
          locked_until
        `
      )
      .eq(
        "username",
        normalized
      )
      .maybeSingle();


  if (error) {
    console.error(
      "findProfileByUsername error:",
      error
    );

    return null;
  }


  return data;
}


/**
 * =========================================================
 * INCREMENT FAILED LOGIN
 * =========================================================
 *
 * Dipanggil ketika username/password salah.
 *
 * Setelah 5x gagal:
 * - akun dikunci sementara
 * - failed_login_attempts tetap dicatat
 *
 * Laporan keamanan akan dibuat di helper/report layer
 * berikutnya.
 */
export async function registerFailedLogin(
  profileId: string
) {
  const {
    data: profile,
    error: fetchError,
  } =
    await supabaseAdmin
      .from("profiles")
      .select(
        "failed_login_attempts, locked_until"
      )
      .eq(
        "id",
        profileId
      )
      .maybeSingle();


  if (fetchError) {
    throw new Error(
      `Gagal membaca status login: ${fetchError.message}`
    );
  }


  if (!profile) {
    throw new Error(
      "Profile tidak ditemukan."
    );
  }


  const currentAttempts =
    Number(
      profile.failed_login_attempts ??
        0
    );


  const nextAttempts =
    currentAttempts + 1;


  /**
   * Belum mencapai batas.
   */
  if (
    nextAttempts <
    MAX_LOGIN_ATTEMPTS
  ) {
    const {
      error,
    } =
      await supabaseAdmin
        .from("profiles")
        .update({
          failed_login_attempts:
            nextAttempts,
        })
        .eq(
          "id",
          profileId
        );


    if (error) {
      throw new Error(
        `Gagal mencatat percobaan login: ${error.message}`
      );
    }


    return {
      attempts:
        nextAttempts,

      locked: false,

      lockedUntil:
        null,
    };
  }


  /**
   * Mencapai 5x.
   */
  const lockedUntil =
    getLockUntil();


  const {
    error,
  } =
    await supabaseAdmin
      .from("profiles")
      .update({
        failed_login_attempts:
          nextAttempts,

        locked_until:
          lockedUntil,
      })
      .eq(
        "id",
        profileId
      );


  if (error) {
    throw new Error(
      `Gagal mengunci akun: ${error.message}`
    );
  }


  return {
    attempts:
      nextAttempts,

    locked: true,

    lockedUntil,
  };
}


/**
 * =========================================================
 * RESET FAILED LOGIN
 * =========================================================
 *
 * Dipanggil setelah login berhasil.
 */
export async function resetFailedLogin(
  profileId: string
) {
  const {
    error,
  } =
    await supabaseAdmin
      .from("profiles")
      .update({
        failed_login_attempts:
          0,

        locked_until:
          null,
      })
      .eq(
        "id",
        profileId
      );


  if (error) {
    throw new Error(
      `Gagal mereset percobaan login: ${error.message}`
    );
  }
}


/**
 * =========================================================
 * LOGIN DENGAN EMAIL
 * =========================================================
 *
 * Supabase Auth secara native menggunakan email/password.
 *
 * Username user/admin/developer nantinya akan dicari
 * melalui profiles terlebih dahulu.
 */
export async function loginWithEmail(
  email: string,
  password: string
): Promise<AuthResult> {
  const supabase =
    await createClient();


  const normalizedEmail =
    normalizeEmail(
      email
    );


  /**
   * Cari profile.
   */
  const {
    data: profile,
    error: profileError,
  } =
    await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq(
        "gmail",
        normalizedEmail
      )
      .maybeSingle();


  /**
   * Jangan membocorkan apakah email terdaftar.
   */
  if (
    profileError ||
    !profile
  ) {
    return {
      success: false,

      message:
        "Username/email atau password salah.",
    };
  }


  /**
   * Cek account lock.
   */
  if (
    isAccountLocked(
      profile.locked_until
    )
  ) {
    return {
      success: false,

      message:
        "Akun sedang dikunci sementara karena terlalu banyak percobaan login gagal.",

      lockedUntil:
        profile.locked_until,
    };
  }


  /**
   * Cek status.
   */
  if (
    profile.status ===
    "suspended"
  ) {
    return {
      success: false,

      message:
        "Akun ini telah dinonaktifkan. Silakan hubungi administrator.",
    };
  }


  /**
   * Login Supabase.
   */
  const {
    data,
    error,
  } =
    await supabase.auth
      .signInWithPassword({
        email:
          normalizedEmail,

        password,
      });


  /**
   * PASSWORD SALAH
   */
  if (
    error ||
    !data.user
  ) {
    try {
      const result =
        await registerFailedLogin(
          profile.id
        );


      if (
        result.locked
      ) {
        /**
         * Laporan otomatis akan dibuat oleh
         * layer report/security berikutnya.
         */
        return {
          success: false,

          message:
            "Percobaan login gagal mencapai 5 kali. Akun dikunci sementara.",

          lockedUntil:
            result.lockedUntil,
        };
      }
    } catch (
      registerError
    ) {
      console.error(
        "Failed login registration error:",
        registerError
      );
    }


    return {
      success: false,

      message:
        "Username/email atau password salah.",
    };
  }


  /**
   * Login berhasil.
   */
  await resetFailedLogin(
    profile.id
  );


  return {
    success: true,

    message:
      "Login berhasil.",

    userId:
      data.user.id,

    role:
      profile.role as UserRole,

    profile:
      profile as Profile,
  };
}


/**
 * =========================================================
 * LOGIN BERDASARKAN ROLE
 * =========================================================
 *
 * Digunakan oleh:
 *
 * /login
 * /login-admin
 * /login-developer
 *
 * Mencegah user biasa login menggunakan
 * halaman admin/developer.
 */
export async function loginByRole(
  email: string,
  password: string,
  expectedRole: UserRole
): Promise<AuthResult> {
  const result =
    await loginWithEmail(
      email,
      password
    );


  if (
    !result.success
  ) {
    return result;
  }


  if (
    result.role !==
    expectedRole
  ) {
    /**
     * Logout jika role tidak sesuai.
     */
    await logout();


    return {
      success: false,

      message:
        "Akun ini tidak mempunyai akses ke halaman login tersebut.",
    };
  }


  return result;
}


/**
 * =========================================================
 * LOGIN USER
 * =========================================================
 */

export async function loginUser(
  email: string,
  password: string
) {
  return loginByRole(
    email,
    password,
    "user"
  );
}


/**
 * =========================================================
 * LOGIN ADMIN
 * =========================================================
 */

export async function loginAdmin(
  email: string,
  password: string
) {
  return loginByRole(
    email,
    password,
    "admin"
  );
}


/**
 * =========================================================
 * LOGIN DEVELOPER
 * =========================================================
 */

export async function loginDeveloper(
  email: string,
  password: string
) {
  return loginByRole(
    email,
    password,
    "developer"
  );
}


/**
 * =========================================================
 * LOGOUT
 * =========================================================
 */

export async function logout() {
  const supabase =
    await createClient();

  const {
    error,
  } =
    await supabase.auth
      .signOut();


  if (error) {
    throw new Error(
      `Gagal logout: ${error.message}`
    );
  }


  return {
    success: true,
  };
}


/**
 * =========================================================
 * REQUIRE ROLE
 * =========================================================
 *
 * Helper untuk server-side protection.
 *
 * Contoh:
 *
 * const profile = await requireRole("admin");
 *
 * if (!profile) {
 *   ...
 * }
 */
export async function requireRole(
  role: UserRole
) {
  const profile =
    await getAuthProfile();


  if (!profile) {
    return null;
  }


  if (
    profile.status !==
    "active"
  ) {
    return null;
  }


  if (
    profile.role !==
    role
  ) {
    return null;
  }


  return profile;
}


/**
 * =========================================================
 * REQUIRE STAFF
 * =========================================================
 *
 * Admin atau developer.
 */
export async function requireStaff() {
  const profile =
    await getAuthProfile();


  if (!profile) {
    return null;
  }


  if (
    profile.status !==
    "active"
  ) {
    return null;
  }


  if (
    profile.role !==
      "admin" &&
    profile.role !==
      "developer"
  ) {
    return null;
  }


  return profile;
}


/**
 * =========================================================
 * REQUIRE DEVELOPER
 * =========================================================
 */

export async function requireDeveloper() {
  return requireRole(
    "developer"
  );
}


/**
 * =========================================================
 * REQUIRE ADMIN
 * =========================================================
 */

export async function requireAdmin() {
  return requireRole(
    "admin"
  );
}


/**
 * =========================================================
 * REQUIRE AUTHENTICATED USER
 * =========================================================
 */

export async function requireAuthenticatedUser() {
  const profile =
    await getAuthProfile();


  if (!profile) {
    return null;
  }


  if (
    profile.status !==
    "active"
  ) {
    return null;
  }


  return profile;
    }
