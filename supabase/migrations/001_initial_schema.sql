-- =========================================================
-- MI AL-MA'ARIF NUSANTARA
-- DIGITAL LIBRARY
-- SUPABASE INITIAL DATABASE SCHEMA
-- Migration: 001_initial_schema.sql
-- =========================================================

-- =========================================================
-- EXTENSIONS
-- =========================================================

create extension if not exists "pgcrypto";

-- =========================================================
-- ENUM TYPES
-- =========================================================

do $$
begin
    create type public.user_role as enum (
        'user',
        'admin',
        'developer'
    );
exception
    when duplicate_object then null;
end $$;


do $$
begin
    create type public.account_status as enum (
        'pending',
        'active',
        'suspended',
        'rejected'
    );
exception
    when duplicate_object then null;
end $$;


do $$
begin
    create type public.book_type as enum (
        'student',
        'teacher'
    );
exception
    when duplicate_object then null;
end $$;


do $$
begin
    create type public.student_category as enum (
        'general',
        'pai'
    );
exception
    when duplicate_object then null;
end $$;


do $$
begin
    create type public.report_status as enum (
        'pending',
        'reviewing',
        'resolved',
        'rejected'
    );
exception
    when duplicate_object then null;
end $$;


do $$
begin
    create type public.report_priority as enum (
        'low',
        'medium',
        'high',
        'critical'
    );
exception
    when duplicate_object then null;
end $$;


do $$
begin
    create type public.history_action as enum (
        'login',
        'logout',
        'login_failed',
        'signup',
        'profile_update',
        'book_view',
        'book_download',
        'report_create',
        'report_update',
        'announcement_view',
        'book_create',
        'book_update',
        'book_delete',
        'book_pdf_upload',
        'book_pdf_replace',
        'book_download_permission_update',
        'user_create',
        'user_update',
        'user_delete',
        'admin_create',
        'admin_update',
        'admin_delete',
        'settings_update',
        'background_update',
        'contact_update',
        'password_change',
        'other'
    );
exception
    when duplicate_object then null;
end $$;


do $$
begin
    create type public.report_type as enum (
        'bug',
        'book_problem',
        'account_problem',
        'request',
        'suggestion',
        'security',
        'other'
    );
exception
    when duplicate_object then null;
end $$;


-- =========================================================
-- UPDATED_AT FUNCTION
-- =========================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
    new.updated_at = timezone('utc', now());
    return new;
end;
$$;


-- =========================================================
-- PROFILES
-- =========================================================
-- Terhubung dengan auth.users.
--
-- User biasa memiliki data:
-- nama, alamat, tempat/tanggal lahir,
-- whatsapp orang tua, gmail, kelas.
--
-- Admin & developer tidak menggunakan field biodata.
-- =========================================================

create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,

    role public.user_role not null default 'user',

    username text unique,

    full_name text,
    address text,
    birth_place text,
    birth_date date,

    parent_whatsapp text,
    email text,

    class_level smallint,

    avatar_path text,

    status public.account_status not null default 'pending',

    last_login_at timestamptz,

    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now()),

    constraint profiles_class_level_check
        check (
            class_level is null
            or class_level between 1 and 6
        ),

    constraint profiles_role_data_check
        check (
            role in ('admin', 'developer')
            or full_name is not null
        )
);


-- =========================================================
-- BOOKS
-- =========================================================
-- Semua metadata buku disimpan di database.
-- File PDF dan cover disimpan di Supabase Storage.
--
-- download_allowed:
-- true  = bisa baca + download
-- false = bisa baca online, download dilarang
-- =========================================================

create table if not exists public.books (
    id uuid primary key default gen_random_uuid(),

    title text not null,

    synopsis text,

    book_type public.book_type not null,

    student_category public.student_category,

    grade smallint,

    cover_path text,

    pdf_path text not null,

    pdf_original_name text,

    pdf_size bigint,

    pdf_mime_type text default 'application/pdf',

    download_allowed boolean not null default false,

    created_by uuid references public.profiles(id) on delete set null,

    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now()),

    constraint books_grade_check
        check (
            grade is null
            or grade between 1 and 6
        ),

    constraint books_student_category_check
        check (
            (
                book_type = 'student'
                and student_category is not null
            )
            or
            (
                book_type = 'teacher'
                and student_category is null
            )
        ),

    constraint books_teacher_grade_check
        check (
            (
                book_type = 'teacher'
                and grade is not null
            )
            or
            (
                book_type = 'student'
            )
        )
);


-- =========================================================
-- REPORTS
-- =========================================================

create table if not exists public.reports (
    id uuid primary key default gen_random_uuid(),

    reporter_id uuid references public.profiles(id) on delete set null,

    report_type public.report_type not null default 'other',

    title text not null,

    description text not null,

    priority public.report_priority not null default 'medium',

    status public.report_status not null default 'pending',

    related_book_id uuid references public.books(id) on delete set null,

    admin_note text,

    resolved_by uuid references public.profiles(id) on delete set null,

    resolved_at timestamptz,

    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);


-- =========================================================
-- ANNOUNCEMENTS
-- =========================================================

create table if not exists public.announcements (
    id uuid primary key default gen_random_uuid(),

    title text not null,

    content text not null,

    is_active boolean not null default true,

    published_at timestamptz,

    created_by uuid references public.profiles(id) on delete set null,

    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);


-- =========================================================
-- HISTORY
-- =========================================================
-- Menyimpan aktivitas user/admin/developer.
--
-- Developer dapat melihat semua.
-- Admin dapat melihat aktivitas user biasa.
-- User hanya dapat melihat history dirinya sendiri.
-- =========================================================

create table if not exists public.history (
    id bigint generated by default as identity primary key,

    user_id uuid references public.profiles(id) on delete set null,

    action public.history_action not null,

    description text,

    target_type text,

    target_id uuid,

    metadata jsonb not null default '{}'::jsonb,

    ip_address inet,

    user_agent text,

    created_at timestamptz not null default timezone('utc', now())
);


-- =========================================================
-- SITE SETTINGS
-- =========================================================
-- Key/value configuration untuk website.
--
-- Contoh:
-- home_background
-- school_name
-- school_history
-- school_vision
-- school_mission
-- dll.
-- =========================================================

create table if not exists public.site_settings (
    id uuid primary key default gen_random_uuid(),

    setting_key text unique not null,

    setting_value jsonb not null default '{}'::jsonb,

    updated_by uuid references public.profiles(id) on delete set null,

    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);


-- =========================================================
-- CONTACT SETTINGS
-- =========================================================

create table if not exists public.contact_settings (
    id uuid primary key default gen_random_uuid(),

    whatsapp_1 text,
    whatsapp_2 text,

    email text,

    updated_by uuid references public.profiles(id) on delete set null,

    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);


-- =========================================================
-- LOGIN ATTEMPTS
-- =========================================================
-- Digunakan untuk sistem:
--
-- gagal 1x
-- gagal 2x
-- gagal 3x
-- gagal 4x
-- gagal 5x
--      ↓
-- otomatis membuat report/security event
-- =========================================================

create table if not exists public.login_attempts (
    id bigint generated by default as identity primary key,

    user_id uuid references public.profiles(id) on delete set null,

    username text,

    login_type text not null,

    success boolean not null default false,

    attempt_number integer not null default 1,

    ip_address inet,

    user_agent text,

    created_at timestamptz not null default timezone('utc', now()),

    constraint login_attempts_number_check
        check (attempt_number >= 1)
);


-- =========================================================
-- MONITORING LOGS
-- =========================================================
-- KHUSUS DEVELOPER.
--
-- Menyimpan informasi sistem:
-- login
-- aktivitas
-- error
-- API
-- storage
-- dll.
-- =========================================================

create table if not exists public.monitoring_logs (
    id bigint generated by default as identity primary key,

    user_id uuid references public.profiles(id) on delete set null,

    event_type text not null,

    event_name text not null,

    description text,

    severity text not null default 'info',

    metadata jsonb not null default '{}'::jsonb,

    ip_address inet,

    user_agent text,

    created_at timestamptz not null default timezone('utc', now())
);


-- =========================================================
-- INDEXES
-- =========================================================

create index if not exists profiles_role_idx
    on public.profiles(role);

create index if not exists profiles_status_idx
    on public.profiles(status);

create index if not exists profiles_username_idx
    on public.profiles(username);


create index if not exists books_type_idx
    on public.books(book_type);

create index if not exists books_student_category_idx
    on public.books(student_category);

create index if not exists books_grade_idx
    on public.books(grade);

create index if not exists books_title_idx
    on public.books using gin(to_tsvector('simple', title));


create index if not exists reports_reporter_idx
    on public.reports(reporter_id);

create index if not exists reports_status_idx
    on public.reports(status);

create index if not exists reports_created_idx
    on public.reports(created_at desc);


create index if not exists announcements_active_idx
    on public.announcements(is_active);

create index if not exists announcements_published_idx
    on public.announcements(published_at desc);


create index if not exists history_user_idx
    on public.history(user_id);

create index if not exists history_action_idx
    on public.history(action);

create index if not exists history_created_idx
    on public.history(created_at desc);


create index if not exists login_attempts_user_idx
    on public.login_attempts(user_id);

create index if not exists login_attempts_created_idx
    on public.login_attempts(created_at desc);


create index if not exists monitoring_logs_user_idx
    on public.monitoring_logs(user_id);

create index if not exists monitoring_logs_event_idx
    on public.monitoring_logs(event_type);

create index if not exists monitoring_logs_created_idx
    on public.monitoring_logs(created_at desc);


-- =========================================================
-- UPDATED_AT TRIGGERS
-- =========================================================

drop trigger if exists profiles_updated_at on public.profiles;

create trigger profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();


drop trigger if exists books_updated_at on public.books;

create trigger books_updated_at
before update on public.books
for each row
execute function public.set_updated_at();


drop trigger if exists reports_updated_at on public.reports;

create trigger reports_updated_at
before update on public.reports
for each row
execute function public.set_updated_at();


drop trigger if exists announcements_updated_at on public.announcements;

create trigger announcements_updated_at
before update on public.announcements
for each row
execute function public.set_updated_at();


drop trigger if exists site_settings_updated_at on public.site_settings;

create trigger site_settings_updated_at
before update on public.site_settings
for each row
execute function public.set_updated_at();


drop trigger if exists contact_settings_updated_at on public.contact_settings;

create trigger contact_settings_updated_at
before update on public.contact_settings
for each row
execute function public.set_updated_at();


-- =========================================================
-- NEW USER PROFILE TRIGGER
-- =========================================================
-- Ketika user dibuat di Supabase Auth,
-- otomatis membuat profile.
--
-- Default role = user
-- Default status = pending
--
-- Admin/developer akan kita provisioning secara
-- server-side melalui sistem developer.
-- =========================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin

    insert into public.profiles (
        id,
        role,
        username,
        email,
        status
    )
    values (
        new.id,
        'user',
        coalesce(
            new.raw_user_meta_data ->> 'username',
            split_part(coalesce(new.email, ''), '@', 1)
        ),
        new.email,
        'pending'
    )
    on conflict (id) do nothing;

    return new;
end;
$$;


drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();


-- =========================================================
-- ENABLE ROW LEVEL SECURITY
-- =========================================================

alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.reports enable row level security;
alter table public.announcements enable row level security;
alter table public.history enable row level security;
alter table public.site_settings enable row level security;
alter table public.contact_settings enable row level security;
alter table public.login_attempts enable row level security;
alter table public.monitoring_logs enable row level security;


-- =========================================================
-- HELPER FUNCTIONS FOR RLS
-- =========================================================

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
    select role
    from public.profiles
    where id = auth.uid()
    limit 1;
$$;


create or replace function public.is_developer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.profiles
        where id = auth.uid()
        and role = 'developer'
        and status = 'active'
    );
$$;


create or replace function public.is_admin_or_developer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.profiles
        where id = auth.uid()
        and role in ('admin', 'developer')
        and status = 'active'
    );
$$;


create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.profiles
        where id = auth.uid()
        and status = 'active'
    );
$$;


-- =========================================================
-- PROFILE POLICIES
-- =========================================================

drop policy if exists "profiles_select_own" on public.profiles;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (
    id = auth.uid()
);


drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (
    id = auth.uid()
)
with check (
    id = auth.uid()
);


drop policy if exists "profiles_admin_read_users" on public.profiles;

create policy "profiles_admin_read_users"
on public.profiles
for select
to authenticated
using (
    public.is_admin_or_developer()
);


-- =========================================================
-- BOOK POLICIES
-- =========================================================
-- Buku aktif dapat dibaca oleh user aktif.
-- Admin/developer dapat mengelola buku melalui server.
--
-- Kita sengaja tidak memberikan UPDATE/DELETE langsung
-- kepada client. Operasi tersebut akan melalui API server
-- yang memvalidasi role.
-- =========================================================

drop policy if exists "books_active_users_read" on public.books;

create policy "books_active_users_read"
on public.books
for select
to authenticated
using (
    public.is_active_user()
);


-- =========================================================
-- REPORT POLICIES
-- =========================================================

drop policy if exists "reports_create_authenticated" on public.reports;

create policy "reports_create_authenticated"
on public.reports
for insert
to authenticated
with check (
    reporter_id = auth.uid()
);


drop policy if exists "reports_read_own" on public.reports;

create policy "reports_read_own"
on public.reports
for select
to authenticated
using (
    reporter_id = auth.uid()
);


drop policy if exists "reports_admin_read" on public.reports;

create policy "reports_admin_read"
on public.reports
for select
to authenticated
using (
    public.is_admin_or_developer()
);


-- =========================================================
-- ANNOUNCEMENT POLICIES
-- =========================================================

drop policy if exists "announcements_active_read" on public.announcements;

create policy "announcements_active_read"
on public.announcements
for select
to authenticated
using (
    is_active = true
    or public.is_admin_or_developer()
);


-- =========================================================
-- HISTORY POLICIES
-- =========================================================

drop policy if exists "history_own_read" on public.history;

create policy "history_own_read"
on public.history
for select
to authenticated
using (
    user_id = auth.uid()
);


drop policy if exists "history_admin_read_users" on public.history;

create policy "history_admin_read_users"
on public.history
for select
to authenticated
using (
    public.is_admin_or_developer()
);


-- =========================================================
-- SITE SETTINGS
-- =========================================================

drop policy if exists "site_settings_public_read" on public.site_settings;

create policy "site_settings_public_read"
on public.site_settings
for select
to anon, authenticated
using (
    setting_key in (
        'school_name',
        'school_history',
        'school_vision',
        'school_mission',
        'home_background',
        'homepage_motivation'
    )
);


-- =========================================================
-- CONTACT SETTINGS
-- =========================================================

drop policy if exists "contact_public_read" on public.contact_settings;

create policy "contact_public_read"
on public.contact_settings
for select
to anon, authenticated
using (
    true
);


-- =========================================================
-- LOGIN ATTEMPTS
-- =========================================================
-- Tidak boleh dibaca langsung oleh user.
-- Pencatatan akan dilakukan server-side.
-- =========================================================

-- Tidak membuat SELECT policy untuk client.


-- =========================================================
-- MONITORING
-- =========================================================
-- Tidak boleh dibaca user/admin.
-- Developer akan mengakses melalui API server menggunakan
-- service role setelah role diverifikasi.
-- =========================================================

-- Tidak membuat SELECT policy untuk client.


-- =========================================================
-- DEFAULT SITE SETTINGS
-- =========================================================

insert into public.site_settings (
    setting_key,
    setting_value
)
values
(
    'school_name',
    '"MI Al-Ma''arif Nusantara"'
),
(
    'homepage_motivation',
    '"Membaca hari ini, membangun masa depan."'
),
(
    'school_history',
    '""'
),
(
    'school_vision',
    '""'
),
(
    'school_mission',
    '[]'
),
(
    'home_background',
    'null'
)
on conflict (setting_key) do nothing;


-- =========================================================
-- DEFAULT CONTACT ROW
-- =========================================================

insert into public.contact_settings (
    whatsapp_1,
    whatsapp_2,
    email
)
select
    null,
    null,
    null
where not exists (
    select 1
    from public.contact_settings
);


-- =========================================================
-- COMMENTS
-- =========================================================

comment on table public.profiles is
'Profile dan role seluruh akun aplikasi. Password dikelola oleh Supabase Auth.';

comment on table public.books is
'Metadata buku. File PDF dan cover disimpan di Supabase Storage.';

comment on column public.books.download_allowed is
'Jika false, buku tetap dapat dibaca online tetapi tidak dapat didownload.';

comment on table public.history is
'Riwayat aktivitas user, admin, dan developer.';

comment on table public.monitoring_logs is
'Log monitoring sistem khusus Developer.';

comment on table public.login_attempts is
'Pencatatan percobaan login untuk keamanan dan otomatisasi laporan.';

-- =========================================================
-- END OF MIGRATION
-- =========================================================
