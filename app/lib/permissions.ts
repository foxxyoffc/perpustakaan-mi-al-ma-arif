import type {
  UserRole,
} from "@/app/lib/auth";

/**
 * =========================================================
 * PERMISSIONS
 * =========================================================
 *
 * File:
 * app/lib/permissions.ts
 *
 * Role:
 * - user
 * - admin
 * - developer
 *
 * File ini dipakai untuk menentukan:
 *
 * - menu apa yang boleh muncul
 * - halaman apa yang boleh dibuka
 * - fitur apa yang boleh digunakan
 *
 * PENTING:
 *
 * File ini bukan pengganti RLS.
 *
 * UI permission:
 * -> menyembunyikan menu
 *
 * Server authorization:
 * -> mencegah akses sebenarnya
 *
 * Supabase RLS:
 * -> lapisan keamanan database
 *
 * =========================================================
 */


/**
 * =========================================================
 * PAGE PERMISSIONS
 * =========================================================
 */

export type Permission =
  | "home"
  | "category"
  | "history"
  | "history_all"
  | "history_all_admin"
  | "report"
  | "request_reports"
  | "announcement"
  | "my_account"
  | "about_us"
  | "contact_us"
  | "set_web_admin"
  | "set_web_developer"
  | "developer_monitoring";


/**
 * =========================================================
 * PERMISSION MAP
 * =========================================================
 */

const PERMISSION_MAP: Record<
  Permission,
  UserRole[]
> = {
  /**
   * Semua role
   */

  home: [
    "user",
    "admin",
    "developer",
  ],

  category: [
    "user",
    "admin",
    "developer",
  ],

  history: [
    "user",
    "admin",
    "developer",
  ],

  report: [
    "user",
    "admin",
    "developer",
  ],

  announcement: [
    "user",
    "admin",
    "developer",
  ],

  my_account: [
    "user",
    "admin",
    "developer",
  ],

  about_us: [
    "user",
    "admin",
    "developer",
  ],

  contact_us: [
    "user",
    "admin",
    "developer",
  ],


  /**
   * Admin + Developer
   */

  history_all: [
    "admin",
    "developer",
  ],

  request_reports: [
    "admin",
    "developer",
  ],

  set_web_admin: [
    "admin",
    "developer",
  ],


  /**
   * Developer only
   */

  history_all_admin: [
    "developer",
  ],

  set_web_developer: [
    "developer",
  ],

  developer_monitoring: [
    "developer",
  ],
};


/**
 * =========================================================
 * CHECK PERMISSION
 * =========================================================
 */

export function hasPermission(
  role: UserRole | null | undefined,
  permission: Permission
) {
  if (!role) {
    return false;
  }


  return (
    PERMISSION_MAP[
      permission
    ]?.includes(role) ??
    false
  );
}


/**
 * =========================================================
 * REQUIRE PERMISSION
 * =========================================================
 *
 * Dipakai di server/API.
 *
 * Jika tidak punya akses,
 * function akan throw error.
 *
 * =========================================================
 */

export function requirePermission(
  role:
    | UserRole
    | null
    | undefined,
  permission: Permission
) {
  if (
    !hasPermission(
      role,
      permission
    )
  ) {
    throw new Error(
      "FORBIDDEN"
    );
  }


  return true;
}


/**
 * =========================================================
 * ROLE CHECK
 * =========================================================
 */

export function isUser(
  role:
    | UserRole
    | null
    | undefined
) {
  return (
    role ===
    "user"
  );
}


export function isAdmin(
  role:
    | UserRole
    | null
    | undefined
) {
  return (
    role ===
      "admin"
  );
}


export function isDeveloper(
  role:
    | UserRole
    | null
    | undefined
) {
  return (
    role ===
    "developer"
  );
}


export function isAdminOrDeveloper(
  role:
    | UserRole
    | null
    | undefined
) {
  return (
    role ===
      "admin" ||
    role ===
      "developer"
  );
}


/**
 * =========================================================
 * ROLE HIERARCHY
 * =========================================================
 *
 * Developer memiliki level tertinggi.
 *
 * user:
 *   level 1
 *
 * admin:
 *   level 2
 *
 * developer:
 *   level 3
 *
 * =========================================================
 */

export function getRoleLevel(
  role:
    | UserRole
    | null
    | undefined
) {
  switch (role) {
    case "user":
      return 1;

    case "admin":
      return 2;

    case "developer":
      return 3;

    default:
      return 0;
  }
}


/**
 * =========================================================
 * CHECK ROLE HIERARCHY
 * =========================================================
 */

export function hasMinimumRole(
  role:
    | UserRole
    | null
    | undefined,
  minimumRole: UserRole
) {
  return (
    getRoleLevel(
      role
    ) >=
    getRoleLevel(
      minimumRole
    )
  );
}


/**
 * =========================================================
 * USER FEATURES
 * =========================================================
 */

export const USER_FEATURES = {
  VIEW_HOME:
    "home",

  VIEW_CATEGORY:
    "category",

  VIEW_HISTORY:
    "history",

  SEND_REPORT:
    "report",

  VIEW_ANNOUNCEMENT:
    "announcement",

  VIEW_MY_ACCOUNT:
    "my_account",

  VIEW_ABOUT:
    "about_us",

  VIEW_CONTACT:
    "contact_us",
} as const;


/**
 * =========================================================
 * ADMIN FEATURES
 * =========================================================
 */

export const ADMIN_FEATURES = {
  VIEW_ALL_HISTORY:
    "history_all",

  VIEW_REPORTS:
    "request_reports",

  SET_WEB:
    "set_web_admin",
} as const;


/**
 * =========================================================
 * DEVELOPER FEATURES
 * =========================================================
 */

export const DEVELOPER_FEATURES = {
  VIEW_ALL_HISTORY:
    "history_all",

  VIEW_ADMIN_HISTORY:
    "history_all_admin",

  VIEW_REPORTS:
    "request_reports",

  SET_WEB:
    "set_web_admin",

  SET_WEB_DEVELOPER:
    "set_web_developer",

  MONITORING:
    "developer_monitoring",
} as const;


/**
 * =========================================================
 * GET MENU PERMISSIONS
 * =========================================================
 */

export function getAllowedPermissions(
  role:
    | UserRole
    | null
    | undefined
) {
  if (!role) {
    return [];
  }


  return (
    Object.keys(
      PERMISSION_MAP
    ) as Permission[]
  ).filter(
    (
      permission
    ) =>
      hasPermission(
        role,
        permission
      )
  );
}


/**
 * =========================================================
 * GET ROLE MENU
 * =========================================================
 *
 * Digunakan toolbar/navbar.
 *
 * =========================================================
 */

export interface RoleMenuItem {
  key: string;

  label: string;

  href: string;

  permission: Permission;
}


export function getRoleMenu(
  role:
    | UserRole
    | null
    | undefined
): RoleMenuItem[] {
  if (!role) {
    return [
      {
        key:
          "home",

        label:
          "Home",

        href:
          "/home",

        permission:
          "home",
      },

      {
        key:
          "about",

        label:
          "About Us",

        href:
          "/about-us",

        permission:
          "about_us",
      },

      {
        key:
          "contact",

        label:
          "Contact Us",

        href:
          "/contact-us",

        permission:
          "contact_us",
      },

      {
        key:
          "login",

        label:
          "Login",

        href:
          "/login",

        permission:
          "home",
      },
    ];
  }


  const menu: RoleMenuItem[] = [
    {
      key:
        "home",

      label:
        "Home",

      href:
        "/home",

      permission:
        "home",
    },

    {
      key:
        "category",

      label:
        "Category",

      href:
        "/category",

      permission:
        "category",
    },

    {
      key:
        "announcement",

      label:
        "Announcement",

      href:
        "/announcement",

      permission:
        "announcement",
    },

    {
      key:
        "history",

      label:
        "History",

      href:
        "/history",

      permission:
        "history",
    },

    {
      key:
        "report",

      label:
        "Report",

      href:
        "/report",

      permission:
        "report",
    },

    {
      key:
        "account",

      label:
        "My Account",

      href:
        "/my-account",

      permission:
        "my_account",
    },

    {
      key:
        "about",

      label:
        "About Us",

      href:
        "/about-us",

      permission:
        "about_us",
    },

    {
      key:
        "contact",

      label:
        "Contact Us",

      href:
        "/contact-us",

      permission:
        "contact_us",
    },
  ];


  /**
   * Admin menu.
   */

  if (
    role ===
      "admin" ||
    role ===
      "developer"
  ) {
    menu.push({
      key:
        "all-history",

      label:
        "History All User",

      href:
        "/history-all",

      permission:
        "history_all",
    });


    menu.push({
      key:
        "reports",

      label:
        "Request & All Report",

      href:
        "/request-all-report",

      permission:
        "request_reports",
    });


    menu.push({
      key:
        "set-web",

      label:
        "Set Web",

      href:
        "/set-web",

      permission:
        "set_web_admin",
    });
  }


  /**
   * Developer menu.
   */

  if (
    role ===
    "developer"
  ) {
    menu.push({
      key:
        "developer-history",

      label:
        "History Admin",

      href:
        "/history-all/admin",

      permission:
        "history_all_admin",
    });


    menu.push({
      key:
        "developer-monitoring",

      label:
        "Monitoring",

      href:
        "/developer/monitoring",

      permission:
        "developer_monitoring",
    });


    menu.push({
      key:
        "developer-settings",

      label:
        "Developer Settings",

      href:
        "/set-web/developer",

      permission:
        "set_web_developer",
    });
  }


  return menu.filter(
    (item) =>
      hasPermission(
        role,
        item.permission
      )
  );
}


/**
 * =========================================================
 * PAGE ACCESS CHECK
 * =========================================================
 *
 * Digunakan sebelum menampilkan halaman
 * atau menjalankan server action.
 *
 * =========================================================
 */

export function canAccessPage(
  role:
    | UserRole
    | null
    | undefined,
  pathname: string
) {
  if (
    pathname ===
    "/"
  ) {
    return true;
  }


  if (
    pathname ===
      "/home" ||
    pathname.startsWith(
      "/home/"
    )
  ) {
    return true;
  }


  if (
    pathname ===
      "/about-us" ||
    pathname.startsWith(
      "/about-us/"
    )
  ) {
    return true;
  }


  if (
    pathname ===
      "/contact-us" ||
    pathname.startsWith(
      "/contact-us/"
    )
  ) {
    return true;
  }


  if (
    pathname ===
      "/login" ||
    pathname.startsWith(
      "/login/"
    )
  ) {
    return true;
  }


  if (
    pathname ===
      "/sign-in" ||
    pathname.startsWith(
      "/sign-in/"
    )
  ) {
    return true;
  }


  if (
    pathname ===
      "/login-admin" ||
    pathname.startsWith(
      "/login-admin/"
    )
  ) {
    return true;
  }


  if (
    pathname ===
      "/login-developer" ||
    pathname.startsWith(
      "/login-developer/"
    )
  ) {
    return true;
  }


  /**
   * Category.
   */

  if (
    pathname ===
      "/category" ||
    pathname.startsWith(
      "/category/"
    )
  ) {
    return hasPermission(
      role,
      "category"
    );
  }


  /**
   * User history.
   */

  if (
    pathname ===
      "/history" ||
    pathname.startsWith(
      "/history/"
    )
  ) {
    return hasPermission(
      role,
      "history"
    );
  }


  /**
   * Report.
   */

  if (
    pathname ===
      "/report" ||
    pathname.startsWith(
      "/report/"
    )
  ) {
    return hasPermission(
      role,
      "report"
    );
  }


  /**
   * Announcement.
   */

  if (
    pathname ===
      "/announcement" ||
    pathname.startsWith(
      "/announcement/"
    )
  ) {
    return hasPermission(
      role,
      "announcement"
    );
  }


  /**
   * My Account.
   */

  if (
    pathname ===
      "/my-account" ||
    pathname.startsWith(
      "/my-account/"
    )
  ) {
    return hasPermission(
      role,
      "my_account"
    );
  }


  /**
   * All History.
   */

  if (
    pathname ===
      "/history-all" ||
    pathname.startsWith(
      "/history-all/"
    )
  ) {
    if (
      pathname.startsWith(
        "/history-all/admin"
      )
    ) {
      return hasPermission(
        role,
        "history_all_admin"
      );
    }


    return hasPermission(
      role,
      "history_all"
    );
  }


  /**
   * Reports.
   */

  if (
    pathname ===
      "/request-all-report" ||
    pathname.startsWith(
      "/request-all-report/"
    )
  ) {
    return hasPermission(
      role,
      "request_reports"
    );
  }


  /**
   * Admin settings.
   */

  if (
    pathname ===
      "/set-web" ||
    pathname.startsWith(
      "/set-web/"
    )
  ) {
    if (
      pathname.startsWith(
        "/set-web/developer"
      )
    ) {
      return hasPermission(
        role,
        "set_web_developer"
      );
    }


    return hasPermission(
      role,
      "set_web_admin"
    );
  }


  /**
   * Developer monitoring.
   */

  if (
    pathname ===
      "/developer/monitoring" ||
    pathname.startsWith(
      "/developer/monitoring/"
    )
  ) {
    return hasPermission(
      role,
      "developer_monitoring"
    );
  }


  /**
   * Default:
   * halaman yang belum didaftarkan dianggap
   * tidak boleh diakses.
   */

  return false;
}


/**
 * =========================================================
 * REPORT VISIBILITY
 * =========================================================
 *
 * User:
 * -> hanya report miliknya
 *
 * Admin:
 * -> report user + admin
 *
 * Developer:
 * -> semua report termasuk admin
 *
 * =========================================================
 */

export function canViewAllReports(
  role:
    | UserRole
    | null
    | undefined
) {
  return (
    role ===
      "admin" ||
    role ===
      "developer"
  );
}


export function canViewAdminReports(
  role:
    | UserRole
    | null
    | undefined
) {
  return (
    role ===
    "developer"
  );
}


/**
 * =========================================================
 * HISTORY VISIBILITY
 * =========================================================
 */

export function canViewOwnHistory(
  role:
    | UserRole
    | null
    | undefined
) {
  return Boolean(
    role
  );
}


export function canViewAllUserHistory(
  role:
    | UserRole
    | null
    | undefined
) {
  return (
    role ===
      "admin" ||
    role ===
      "developer"
  );
}


export function canViewAdminHistory(
  role:
    | UserRole
    | null
    | undefined
) {
  return (
    role ===
    "developer"
  );
}


/**
 * =========================================================
 * BOOK MANAGEMENT
 * =========================================================
 */

export function canManageBooks(
  role:
    | UserRole
    | null
    | undefined
) {
  return (
    role ===
      "admin" ||
    role ===
      "developer"
  );
}


/**
 * Admin dapat mengelola buku.
 *
 * Developer juga dapat mengelola buku.
 */

export function canAddBook(
  role:
    | UserRole
    | null
    | undefined
) {
  return canManageBooks(
    role
  );
}


export function canEditBook(
  role:
    | UserRole
    | null
    | undefined
) {
  return canManageBooks(
    role
  );
}


export function canDeleteBook(
  role:
    | UserRole
    | null
    | undefined
) {
  return canManageBooks(
    role
  );
}


export function canReplaceBookPdf(
  role:
    | UserRole
    | null
    | undefined
) {
  return canManageBooks(
    role
  );
}


export function canChangeDownloadPermission(
  role:
    | UserRole
    | null
    | undefined
) {
  return canManageBooks(
    role
  );
}


/**
 * =========================================================
 * ANNOUNCEMENT MANAGEMENT
 * =========================================================
 */

export function canManageAnnouncements(
  role:
    | UserRole
    | null
    | undefined
) {
  return (
    role ===
      "admin" ||
    role ===
      "developer"
  );
}


/**
 * =========================================================
 * CONTACT MANAGEMENT
 * =========================================================
 *
 * Admin dan developer dapat mengatur contact.
 */

export function canManageContacts(
  role:
    | UserRole
    | null
    | undefined
) {
  return (
    role ===
      "admin" ||
    role ===
      "developer"
  );
}


/**
 * =========================================================
 * HOME BACKGROUND
 * =========================================================
 *
 * HANYA DEVELOPER.
 */

export function canManageHomeBackground(
  role:
    | UserRole
    | null
    | undefined
) {
  return (
    role ===
    "developer"
  );
}


/**
 * =========================================================
 * ADMIN MANAGEMENT
 * =========================================================
 *
 * HANYA DEVELOPER.
 */

export function canManageAdmins(
  role:
    | UserRole
    | null
    | undefined
) {
  return (
    role ===
    "developer"
  );
}


export function canAddAdmin(
  role:
    | UserRole
    | null
    | undefined
) {
  return canManageAdmins(
    role
  );
}


export function canDeleteAdmin(
  role:
    | UserRole
    | null
    | undefined
) {
  return canManageAdmins(
    role
  );
}


export function canEditAdmin(
  role:
    | UserRole
    | null
    | undefined
) {
  return canManageAdmins(
    role
  );
}


/**
 * =========================================================
 * USER ACCOUNT MANAGEMENT
 * =========================================================
 *
 * Admin/developer dapat mengatur username/password
 * user sesuai fitur Set Web.
 *
 * User sendiri hanya dapat mengubah profile
 * yang diperbolehkan.
 */

export function canManageUsers(
  role:
    | UserRole
    | null
    | undefined
) {
  return (
    role ===
      "admin" ||
    role ===
      "developer"
  );
}


/**
 * =========================================================
 * DEVELOPER MONITORING
 * =========================================================
 *
 * Developer only.
 */

export function canViewMonitoring(
  role:
    | UserRole
    | null
    | undefined
) {
  return (
    role ===
    "developer"
  );
}


/**
 * =========================================================
 * GET ROLE CAPABILITIES
 * =========================================================
 *
 * Berguna untuk frontend apabila ingin
 * mengetahui kemampuan user.
 *
 * =========================================================
 */

export function getRoleCapabilities(
  role:
    | UserRole
    | null
    | undefined
) {
  return {
    canManageBooks:
      canManageBooks(
        role
      ),

    canManageAnnouncements:
      canManageAnnouncements(
        role
      ),

    canManageContacts:
      canManageContacts(
        role
      ),

    canManageUsers:
      canManageUsers(
        role
      ),

    canManageAdmins:
      canManageAdmins(
        role
      ),

    canManageHomeBackground:
      canManageHomeBackground(
        role
      ),

    canViewAllReports:
      canViewAllReports(
        role
      ),

    canViewAdminReports:
      canViewAdminReports(
        role
      ),

    canViewAllUserHistory:
      canViewAllUserHistory(
        role
      ),

    canViewAdminHistory:
      canViewAdminHistory(
        role
      ),

    canViewMonitoring:
      canViewMonitoring(
        role
      ),
  };
        }
