import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { supabaseAdmin } from "@/app/lib/supabase/admin";

/**
 * =========================================================
 * AUTHENTICATION HELPER
 * =========================================================
 *
 * File:
 * app/lib/auth.ts
 *
 * Role:
 * - user
 * - admin
 * - developer
 *
 * File ini digunakan di SERVER.
 *
 * =========================================================
 */

export type UserRole =
  | "user"
  | "admin"
  | "developer";


/**
 * =========================================================
 * PROFILE TYPE
 * =========================================================
 */

export interface AuthProfile {
  id: string;

  username: string | null;

  full_name: string | null;

  address: string | null;

  birth_place: string | null;

  birth_date: string | null;

  parent_whatsapp: string | null;

  email: string | null;

  class_level: number | null;

  avatar_url: string | null;

  role: UserRole;

  is_active: boolean;

  created_at: string;

  updated_at: string;
}


/**
 * =========================================================
 * SESSION USER
 * =========================================================
 */

export interface AuthUser {
  id: string;

  email?: string | null;

  role: UserRole;

  profile: AuthProfile | null;
}


/**
 * =========================================================
 * CREATE SERVER SUPABASE CLIENT
 * =========================================================
 *
 * Client ini menggunakan cookie Supabase SSR.
 *
 * Berbeda dengan supabaseAdmin:
 *
 * createServerSupabaseClient()
 * -> mengikuti session user
 *
 * supabaseAdmin
 * -> Service Role
 *
 * =========================================================
 */

export async function createServerSupabaseClient() {
  const cookieStore =
    await cookies();

  return createServerClient(
    process.env
      .NEXT_PUBLIC_SUPABASE_URL!,
    process.env
      .NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async getAll() {
          return cookieStore.getAll();
        },

        async setAll(
          cookiesToSet
        ) {
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
            /**
             * Server Component mungkin tidak
             * mengizinkan penulisan cookie.
             *
             * Middleware tetap akan menangani
             * refresh session.
             */
          }
        },
      },
    }
  );
}


/**
 * =========================================================
 * GET CURRENT USER
 * =========================================================
 */

export async function getAuthUser() {
  const supabase =
    await createServerSupabaseClient();


  const {
    data,
    error,
  } =
    await supabase.auth.getUser();


  if (
    error ||
    !data.user
  ) {
    return null;
  }


  return data.user;
}


/**
 * =========================================================
 * GET CURRENT SESSION
 * =========================================================
 */

export async function getAuthSession() {
  const supabase =
    await createServerSupabaseClient();


  const {
    data,
    error,
  } =
    await supabase.auth.getSession();


  if (
    error ||
    !data.session
  ) {
    return null;
  }


  return data.session;
}


/**
 * =========================================================
 * GET PROFILE
 * =========================================================
 *
 * Profile disimpan di tabel:
 *
 * profiles
 *
 * bukan di client.
 *
 * =========================================================
 */

export async function getAuthProfile(): Promise<
  AuthProfile | null
> {
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
          email,
          class_level,
          avatar_url,
          role,
          is_active,
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


  if (!data) {
    return null;
  }


  return data as AuthProfile;
}


/**
 * =========================================================
 * GET AUTH CONTEXT
 * =========================================================
 *
 * Mengembalikan:
 *
 * user
 * profile
 * role
 *
 * sekaligus.
 * =========================================================
 */

export async function getAuthContext(): Promise<{
  user: AuthUser | null;
  profile: AuthProfile | null;
  role: UserRole | null;
}> {
  const user =
    await getAuthUser();


  if (!user) {
    return {
      user: null,
      profile: null,
      role: null,
    };
  }


  const profile =
    await getAuthProfile();


  const role =
    profile?.role ??
    "user";


  return {
    user: {
      id: user.id,

      email:
        user.email ??
        null,

      role,

      profile,
    },

    profile,

    role,
  };
}


/**
 * =========================================================
 * REQUIRE AUTHENTICATION
 * =========================================================
 */

export async function requireAuth() {
  const context =
    await getAuthContext();


  if (
    !context.user
  ) {
    throw new Error(
      "AUTH_REQUIRED"
    );
  }


  return context;
}


/**
 * =========================================================
 * REQUIRE ACTIVE ACCOUNT
 * =========================================================
 */

export async function requireActiveAuth() {
  const context =
    await requireAuth();


  if (
    context.profile &&
    !context.profile
      .is_active
  ) {
    throw new Error(
      "ACCOUNT_DISABLED"
    );
  }


  return context;
}


/**
 * =========================================================
 * REQUIRE ROLE
 * =========================================================
 */

export async function requireRole(
  allowedRoles: UserRole[]
) {
  const context =
    await requireActiveAuth();


  if (
    !context.role ||
    !allowedRoles.includes(
      context.role
    )
  ) {
    throw new Error(
      "FORBIDDEN"
    );
  }


  return context;
}


/**
 * =========================================================
 * REQUIRE USER
 * =========================================================
 */

export async function requireUser() {
  return requireRole([
    "user",
  ]);
}


/**
 * =========================================================
 * REQUIRE ADMIN
 * =========================================================
 */

export async function requireAdmin() {
  return requireRole([
    "admin",
    "developer",
  ]);
}


/**
 * =========================================================
 * REQUIRE DEVELOPER
 * =========================================================
 */

export async function requireDeveloper() {
  return requireRole([
    "developer",
  ]);
}


/**
 * =========================================================
 * ROLE CHECKERS
 * =========================================================
 */

export async function isLoggedIn() {
  const user =
    await getAuthUser();

  return Boolean(
    user
  );
}


export async function isAdmin() {
  const profile =
    await getAuthProfile();

  return (
    profile?.role ===
      "admin" ||
    profile?.role ===
      "developer"
  );
}


export async function isDeveloper() {
  const profile =
    await getAuthProfile();

  return (
    profile?.role ===
    "developer"
  );
}


export async function isNormalUser() {
  const profile =
    await getAuthProfile();

  return (
    profile?.role ===
    "user"
  );
}


/**
 * =========================================================
 * SIGN OUT
 * =========================================================
 *
 * Biasanya logout dilakukan melalui
 * Route Handler agar cookie dapat dibersihkan
 * dengan benar.
 *
 * Fungsi ini tetap disediakan untuk server action.
 * =========================================================
 */

export async function signOut() {
  const supabase =
    await createServerSupabaseClient();


  const {
    error,
  } =
    await supabase.auth.signOut();


  if (error) {
    return {
      success: false,

      error:
        error.message,
    };
  }


  return {
    success: true,
  };
}


/**
 * =========================================================
 * GET PROFILE BY ID
 * =========================================================
 *
 * Untuk kebutuhan admin/developer.
 *
 * =========================================================
 */

export async function getProfileById(
  userId: string
) {
  const context =
    await requireAdmin();


  if (
    !context.role
  ) {
    return {
      success: false,

      data: null,

      error:
        "Tidak memiliki akses.",
    };
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
          email,
          class_level,
          avatar_url,
          role,
          is_active,
          created_at,
          updated_at
        `
      )
      .eq(
        "id",
        userId
      )
      .maybeSingle();


  if (error) {
    return {
      success: false,

      data: null,

      error:
        error.message,
    };
  }


  return {
    success: true,

    data:
      data as AuthProfile | null,
  };
}


/**
 * =========================================================
 * GET ALL USERS
 * =========================================================
 *
 * Hanya admin/developer.
 *
 * Developer dapat melihat semua role.
 * Admin tidak melihat developer.
 *
 * =========================================================
 */

export async function getAllProfiles(
  options?: {
    includeAdmins?: boolean;
    includeDevelopers?: boolean;
  }
) {
  const context =
    await requireAdmin();


  let query =
    supabaseAdmin
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
          email,
          class_level,
          avatar_url,
          role,
          is_active,
          created_at,
          updated_at
        `
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      );


  /**
   * Admin:
   * hanya dapat memantau user.
   */
  if (
    context.role ===
    "admin"
  ) {
    query =
      query.eq(
        "role",
        "user"
      );
  }


  /**
   * Developer:
   * default melihat user + admin.
   *
   * Developer hanya melihat developer jika
   * explicitly includeDevelopers = true.
   */
  if (
    context.role ===
      "developer" &&
    options?.includeDevelopers !==
      true
  ) {
    query =
      query.neq(
        "role",
        "developer"
      );
  }


  if (
    context.role ===
      "developer" &&
    options?.includeAdmins ===
      false
  ) {
    query =
      query.neq(
        "role",
        "admin"
      );
  }


  const {
    data,
    error,
  } =
    await query;


  if (error) {
    return {
      success: false,

      data: [],

      error:
        error.message,
    };
  }


  return {
    success: true,

    data:
      (data ??
        []) as AuthProfile[],
  };
}


/**
 * =========================================================
 * GET ROLE LABEL
 * =========================================================
 */

export function getRoleLabel(
  role: UserRole
) {
  switch (role) {
    case "user":
      return "User";

    case "admin":
      return "Admin";

    case "developer":
      return "Developer";

    default:
      return "Unknown";
  }
}


/**
 * =========================================================
 * SAFE USER INFORMATION
 * =========================================================
 *
 * Digunakan untuk frontend.
 *
 * Jangan pernah mengirim password,
 * service role key, access token, refresh token,
 * atau informasi sensitif lainnya.
 * =========================================================
 */

export function sanitizeAuthProfile(
  profile: AuthProfile | null
) {
  if (!profile) {
    return null;
  }


  return {
    id:
      profile.id,

    username:
      profile.username,

    fullName:
      profile.full_name,

    email:
      profile.email,

    classLevel:
      profile.class_level,

    avatarUrl:
      profile.avatar_url,

    role:
      profile.role,

    isActive:
      profile.is_active,
  };
}
