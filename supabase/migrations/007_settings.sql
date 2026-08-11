-- =========================================================
-- MI AL-MA'ARIF NUSANTARA
-- DIGITAL LIBRARY
--
-- Migration: 007_settings.sql
--
-- WEBSITE SETTINGS
--
-- ADMIN
--   -> mengatur informasi sekolah
--   -> mengatur kontak
--   -> mengatur beberapa pengaturan website
--
-- DEVELOPER
--   -> semua akses ADMIN
--   -> mengatur background Home
--   -> mengatur developer-only settings
--
-- USER
--   -> hanya membaca setting publik
--
-- =========================================================


-- =========================================================
-- 1. SETTINGS CATEGORY
-- =========================================================

do $$
begin

    create type public.setting_category as enum (
        'general',
        'school',
        'contact',
        'home',
        'footer',
        'developer'
    );

exception
    when duplicate_object then null;

end $$;


-- =========================================================
-- 2. SETTINGS TABLE
-- =========================================================

create table if not exists public.site_settings (

    id uuid primary key default gen_random_uuid(),

    -- -----------------------------------------------------
    -- SETTING KEY
    -- -----------------------------------------------------
    -- Contoh:
    -- site_name
    -- school_name
    -- whatsapp_1
    -- home_background_url
    -- -----------------------------------------------------

    setting_key text not null unique,

    -- -----------------------------------------------------
    -- VALUE
    -- -----------------------------------------------------

    setting_value text,

    -- -----------------------------------------------------
    -- CATEGORY
    -- -----------------------------------------------------

    category public.setting_category
        not null default 'general',

    -- -----------------------------------------------------
    -- PUBLIC
    -- -----------------------------------------------------
    -- true  = dapat dibaca frontend publik
    -- false = hanya admin/developer
    -- -----------------------------------------------------

    is_public boolean
        not null default true,

    -- -----------------------------------------------------
    -- DEVELOPER ONLY
    -- -----------------------------------------------------

    developer_only boolean
        not null default false,

    -- -----------------------------------------------------
    -- DESCRIPTION
    -- -----------------------------------------------------

    description text,

    -- -----------------------------------------------------
    -- LAST UPDATE
    -- -----------------------------------------------------

    updated_by uuid
        references public.profiles(id)
        on delete set null,

    created_at timestamptz
        not null default timezone('utc', now()),

    updated_at timestamptz
        not null default timezone('utc', now())

);


-- =========================================================
-- 3. INDEX
-- =========================================================

create index if not exists site_settings_category_idx
on public.site_settings(category);


create index if not exists site_settings_public_idx
on public.site_settings(is_public);


create index if not exists site_settings_developer_idx
on public.site_settings(developer_only);


-- =========================================================
-- 4. UPDATED_AT TRIGGER
-- =========================================================

create or replace function public.update_site_settings_timestamp()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin

    new.updated_at :=
        timezone('utc', now());

    return new;

end;
$$;


drop trigger if exists site_settings_updated_at_trigger
on public.site_settings;


create trigger site_settings_updated_at_trigger
before update
on public.site_settings
for each row
execute function public.update_site_settings_timestamp();


-- =========================================================
-- 5. PROTECT DEVELOPER-ONLY SETTINGS
-- =========================================================
--
-- Admin tidak boleh mengubah setting yang sudah ditandai
-- developer_only = true.
--
-- =========================================================

create or replace function public.protect_developer_settings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    caller_role public.user_role;
begin

    select role
    into caller_role
    from public.profiles
    where id = auth.uid()
    and status = 'active';


    -- -----------------------------------------------------
    -- Jika setting developer-only
    -- -----------------------------------------------------

    if coalesce(old.developer_only, false) = true
       or coalesce(new.developer_only, false) = true
    then

        if caller_role <> 'developer' then

            raise exception
                'Pengaturan ini hanya dapat diubah oleh developer.';

        end if;

    end if;


    return new;

end;
$$;


drop trigger if exists protect_developer_settings_trigger
on public.site_settings;


create trigger protect_developer_settings_trigger
before update
on public.site_settings
for each row
execute function public.protect_developer_settings();


-- =========================================================
-- 6. SETTING VALIDATION
-- =========================================================

create or replace function public.validate_site_setting()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin

    if new.setting_key is null
       or length(trim(new.setting_key)) < 2
    then
        raise exception
            'Setting key tidak valid.';
    end if;


    new.setting_key :=
        lower(trim(new.setting_key));


    return new;

end;
$$;


drop trigger if exists validate_site_setting_trigger
on public.site_settings;


create trigger validate_site_setting_trigger
before insert or update
on public.site_settings
for each row
execute function public.validate_site_setting();


-- =========================================================
-- 7. PUBLIC SETTINGS
-- =========================================================
--
-- Hanya setting:
--   is_public = true
--   developer_only = false
--
-- yang diberikan ke frontend publik.
-- =========================================================

create or replace function public.get_public_settings()
returns table (
    setting_key text,
    setting_value text,
    category public.setting_category
)
language sql
stable
security definer
set search_path = public
as $$
    select
        s.setting_key,
        s.setting_value,
        s.category

    from public.site_settings s

    where
        s.is_public = true
        and s.developer_only = false

    order by
        s.category,
        s.setting_key;
$$;


-- =========================================================
-- 8. GET SINGLE PUBLIC SETTING
-- =========================================================

create or replace function public.get_public_setting(
    target_key text
)
returns table (
    setting_key text,
    setting_value text,
    category public.setting_category
)
language sql
stable
security definer
set search_path = public
as $$
    select
        s.setting_key,
        s.setting_value,
        s.category

    from public.site_settings s

    where
        s.setting_key = lower(trim(target_key))
        and s.is_public = true
        and s.developer_only = false

    limit 1;
$$;


-- =========================================================
-- 9. GET ADMIN SETTINGS
-- =========================================================
--
-- Admin dapat melihat setting non-developer.
-- =========================================================

create or replace function public.get_admin_settings()
returns setof public.site_settings
language sql
stable
security definer
set search_path = public
as $$
    select s.*
    from public.site_settings s

    where
        exists (
            select 1
            from public.profiles p
            where
                p.id = auth.uid()
                and p.role = 'admin'
                and p.status = 'active'
        )

        and s.developer_only = false

    order by
        s.category,
        s.setting_key;
$$;


-- =========================================================
-- 10. GET DEVELOPER SETTINGS
-- =========================================================
--
-- Developer dapat melihat semua setting.
-- =========================================================

create or replace function public.get_developer_settings()
returns setof public.site_settings
language sql
stable
security definer
set search_path = public
as $$
    select s.*
    from public.site_settings s

    where public.is_developer()

    order by
        s.category,
        s.setting_key;
$$;


-- =========================================================
-- 11. CREATE / UPSERT SETTING
-- =========================================================
--
-- Digunakan oleh Admin / Developer.
--
-- Admin:
--   tidak boleh membuat developer_only=true
--
-- Developer:
--   bebas.
-- =========================================================

create or replace function public.set_site_setting(
    target_key text,
    target_value text,
    target_category public.setting_category default 'general',
    target_public boolean default true,
    target_developer_only boolean default false,
    target_description text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    caller_role public.user_role;
    setting_id uuid;
begin

    -- -----------------------------------------------------
    -- ROLE
    -- -----------------------------------------------------

    select role
    into caller_role
    from public.profiles
    where
        id = auth.uid()
        and status = 'active';


    if caller_role not in (
        'admin',
        'developer'
    ) then

        raise exception
            'Anda tidak memiliki izin mengubah pengaturan website.';

    end if;


    -- -----------------------------------------------------
    -- DEVELOPER ONLY
    -- -----------------------------------------------------

    if target_developer_only = true
       and caller_role <> 'developer'
    then

        raise exception
            'Pengaturan developer hanya dapat dibuat oleh developer.';

    end if;


    -- -----------------------------------------------------
    -- UPSERT
    -- -----------------------------------------------------

    insert into public.site_settings (
        setting_key,
        setting_value,
        category,
        is_public,
        developer_only,
        description,
        updated_by
    )
    values (
        lower(trim(target_key)),
        target_value,
        target_category,
        target_public,
        target_developer_only,
        target_description,
        auth.uid()
    )

    on conflict (setting_key)
    do update set

        setting_value =
            excluded.setting_value,

        category =
            excluded.category,

        is_public =
            excluded.is_public,

        developer_only =
            excluded.developer_only,

        description =
            excluded.description,

        updated_by =
            auth.uid(),

        updated_at =
            timezone('utc', now())

    returning id
    into setting_id;


    -- -----------------------------------------------------
    -- HISTORY
    -- -----------------------------------------------------

    insert into public.history (
        user_id,
        action,
        action_type,
        description,
        target_type,
        target_id,
        severity,
        metadata
    )
    values (
        auth.uid(),

        'settings_update',

        'settings_update',

        'Mengubah pengaturan website.',

        'site_setting',

        setting_id,

        'info',

        jsonb_build_object(
            'setting_key',
            lower(trim(target_key)),

            'category',
            target_category,

            'developer_only',
            target_developer_only
        )
    );


    return setting_id;

end;
$$;


-- =========================================================
-- 12. DELETE SETTING
-- =========================================================
--
-- Admin dapat menghapus setting non-developer.
-- Developer dapat menghapus semua.
-- =========================================================

create or replace function public.delete_site_setting(
    target_key text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    caller_role public.user_role;
    target_id uuid;
    target_is_developer_only boolean;
begin

    -- -----------------------------------------------------
    -- ROLE
    -- -----------------------------------------------------

    select role
    into caller_role
    from public.profiles
    where
        id = auth.uid()
        and status = 'active';


    if caller_role not in (
        'admin',
        'developer'
    ) then

        raise exception
            'Anda tidak memiliki izin.';

    end if;


    -- -----------------------------------------------------
    -- GET SETTING
    -- -----------------------------------------------------

    select
        id,
        developer_only

    into
        target_id,
        target_is_developer_only

    from public.site_settings

    where setting_key =
        lower(trim(target_key));


    if target_id is null then
        return false;
    end if;


    -- -----------------------------------------------------
    -- DEVELOPER PROTECTION
    -- -----------------------------------------------------

    if target_is_developer_only = true
       and caller_role <> 'developer'
    then

        raise exception
            'Setting developer tidak dapat dihapus oleh admin.';

    end if;


    -- -----------------------------------------------------
    -- DELETE
    -- -----------------------------------------------------

    delete from public.site_settings
    where id = target_id;


    -- -----------------------------------------------------
    -- HISTORY
    -- -----------------------------------------------------

    insert into public.history (
        user_id,
        action,
        action_type,
        description,
        target_type,
        target_id,
        severity,
        metadata
    )
    values (
        auth.uid(),

        'settings_update',

        'settings_update',

        'Menghapus pengaturan website.',

        'site_setting',

        target_id,

        'danger',

        jsonb_build_object(
            'setting_key',
            lower(trim(target_key))
        )
    );


    return true;

end;
$$;


-- =========================================================
-- 13. HOME BACKGROUND HELPER
-- =========================================================
--
-- Background Home disimpan sebagai URL/path.
--
-- FILE tidak disimpan di database.
--
-- Contoh:
--
-- /home/background-2026.webp
--
-- atau:
--
-- https://xxxxx.supabase.co/storage/...
--
-- Hanya Developer.
-- =========================================================

create or replace function public.set_home_background(
    background_url text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    setting_id uuid;
begin

    if not public.is_developer() then
        raise exception
            'Background Home hanya dapat diubah oleh developer.';
    end if;


    insert into public.site_settings (
        setting_key,
        setting_value,
        category,
        is_public,
        developer_only,
        description,
        updated_by
    )
    values (
        'home_background_url',
        trim(background_url),
        'home',
        true,
        true,
        'Background utama halaman Home.',
        auth.uid()
    )

    on conflict (setting_key)
    do update set

        setting_value =
            excluded.setting_value,

        category =
            'home',

        is_public =
            true,

        developer_only =
            true,

        updated_by =
            auth.uid(),

        updated_at =
            timezone('utc', now())

    returning id
    into setting_id;


    -- -----------------------------------------------------
    -- HISTORY
    -- -----------------------------------------------------

    insert into public.history (
        user_id,
        action,
        action_type,
        description,
        target_type,
        target_id,
        severity,
        metadata
    )
    values (
        auth.uid(),

        'settings_update',

        'settings_update',

        'Mengganti background halaman Home.',

        'site_setting',

        setting_id,

        'info',

        jsonb_build_object(
            'setting_key',
            'home_background_url'
        )
    );


    return setting_id;

end;
$$;


-- =========================================================
-- 14. RESET HOME BACKGROUND
-- =========================================================

create or replace function public.remove_home_background()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    target_id uuid;
begin

    if not public.is_developer() then
        raise exception
            'Hanya developer yang dapat menghapus background Home.';
    end if;


    select id
    into target_id
    from public.site_settings
    where setting_key = 'home_background_url';


    if target_id is null then
        return false;
    end if;


    delete from public.site_settings
    where id = target_id;


    insert into public.history (
        user_id,
        action,
        action_type,
        description,
        target_type,
        target_id,
        severity
    )
    values (
        auth.uid(),

        'settings_update',

        'settings_update',

        'Menghapus background halaman Home.',

        'site_setting',

        target_id,

        'warning'
    );


    return true;

end;
$$;


-- =========================================================
-- 15. DEFAULT SETTINGS
-- =========================================================
--
-- Default ini dibuat jika belum ada.
--
-- Tidak menggunakan ON CONFLICT untuk mengubah setting
-- yang sudah dikonfigurasi.
-- =========================================================

insert into public.site_settings (
    setting_key,
    setting_value,
    category,
    is_public,
    developer_only,
    description
)

values

(
    'site_name',
    'Perpustakaan MI Al-Ma''arif Nusantara',
    'general',
    true,
    false,
    'Nama website perpustakaan.'
),

(
    'site_tagline',
    'Membaca, Belajar, dan Berkembang Bersama',
    'general',
    true,
    false,
    'Tagline utama website.'
),

(
    'school_name',
    'MI Al-Ma''arif Nusantara',
    'school',
    true,
    false,
    'Nama sekolah.'
),

(
    'school_location',
    'Jimbaran, Bali',
    'school',
    true,
    false,
    'Lokasi sekolah.'
),

(
    'school_history',
    'Sejarah sekolah dapat diatur melalui halaman Set Web.',
    'school',
    true,
    false,
    'Sejarah sekolah.'
),

(
    'school_vision',
    'Visi sekolah dapat diatur melalui halaman Set Web.',
    'school',
    true,
    false,
    'Visi sekolah.'
),

(
    'school_mission',
    'Misi sekolah dapat diatur melalui halaman Set Web.',
    'school',
    true,
    false,
    'Misi sekolah.'
),

(
    'contact_whatsapp_1',
    '',
    'contact',
    true,
    false,
    'Nomor WhatsApp kontak pertama.'
),

(
    'contact_whatsapp_2',
    '',
    'contact',
    true,
    false,
    'Nomor WhatsApp kontak kedua.'
),

(
    'contact_gmail',
    '',
    'contact',
    true,
    false,
    'Alamat Gmail kontak sekolah/perpustakaan.'
),

(
    'contact_address',
    '',
    'contact',
    true,
    false,
    'Alamat kontak sekolah.'
),

(
    'footer_text',
    'Hak Cipta MI Al-Ma''arif Nusantara ©2026 All Right Reserved.',
    'footer',
    true,
    false,
    'Teks copyright pada footer.'
),

(
    'home_title',
    'Perpustakaan MI Al-Ma''arif Nusantara',
    'home',
    true,
    false,
    'Judul utama halaman Home.'
),

(
    'home_subtitle',
    'Temukan pengetahuan, perluas wawasan, dan tumbuh bersama buku.',
    'home',
    true,
    false,
    'Teks motivasi halaman Home.'
),

(
    'home_background_url',
    '',
    'home',
    true,
    true,
    'Background utama halaman Home. Hanya Developer.'
)

on conflict (setting_key)
do nothing;


-- =========================================================
-- 16. ADD DEVELOPER SETTINGS
-- =========================================================

insert into public.site_settings (
    setting_key,
    setting_value,
    category,
    is_public,
    developer_only,
    description
)

values

(
    'maintenance_mode',
    'false',
    'developer',
    false,
    true,
    'Mode maintenance website.'
),

(
    'registration_enabled',
    'true',
    'developer',
    false,
    true,
    'Mengaktifkan atau menonaktifkan pendaftaran akun.'
),

(
    'allow_user_reports',
    'true',
    'developer',
    false,
    true,
    'Mengizinkan user mengirim report.'
),

(
    'allow_book_download',
    'true',
    'developer',
    false,
    true,
    'Master switch download buku.'
),

(
    'max_login_attempts',
    '5',
    'developer',
    false,
    true,
    'Jumlah maksimal login gagal sebelum security report dibuat.'
)

on conflict (setting_key)
do nothing;


-- =========================================================
-- 17. GET SETTING VALUE
-- =========================================================

create or replace function public.get_setting_value(
    target_key text
)
returns text
language sql
stable
security definer
set search_path = public
as $$
    select s.setting_value
    from public.site_settings s
    where
        s.setting_key = lower(trim(target_key))
        and (
            s.is_public = true
            or public.is_developer()
            or (
                exists (
                    select 1
                    from public.profiles p
                    where
                        p.id = auth.uid()
                        and p.role = 'admin'
                        and p.status = 'active'
                )
                and s.developer_only = false
            )
        )
    limit 1;
$$;


-- =========================================================
-- 18. GET SETTINGS BY CATEGORY
-- =========================================================

create or replace function public.get_settings_by_category(
    target_category public.setting_category
)
returns table (
    setting_key text,
    setting_value text,
    category public.setting_category,
    is_public boolean,
    developer_only boolean,
    description text
)
language sql
stable
security definer
set search_path = public
as $$
    select
        s.setting_key,
        s.setting_value,
        s.category,
        s.is_public,
        s.developer_only,
        s.description

    from public.site_settings s

    where
        s.category = target_category

        and (
            s.is_public = true

            or public.is_developer()

            or (
                exists (
                    select 1
                    from public.profiles p
                    where
                        p.id = auth.uid()
                        and p.role = 'admin'
                        and p.status = 'active'
                )

                and s.developer_only = false
            )
        )

    order by
        s.setting_key;
$$;


-- =========================================================
-- 19. RLS
-- =========================================================

alter table public.site_settings
enable row level security;


-- =========================================================
-- 20. DROP OLD POLICIES
-- =========================================================

drop policy if exists "settings_public_read"
on public.site_settings;

drop policy if exists "settings_admin_read"
on public.site_settings;

drop policy if exists "settings_developer_read"
on public.site_settings;

drop policy if exists "settings_admin_write"
on public.site_settings;

drop policy if exists "settings_developer_write"
on public.site_settings;


-- =========================================================
-- 21. PUBLIC READ
-- =========================================================

create policy "settings_public_read"
on public.site_settings
for select
to anon, authenticated
using (
    is_public = true
    and developer_only = false
);


-- =========================================================
-- 22. ADMIN READ
-- =========================================================

create policy "settings_admin_read"
on public.site_settings
for select
to authenticated
using (
    exists (
        select 1
        from public.profiles p
        where
            p.id = auth.uid()
            and p.role = 'admin'
            and p.status = 'active'
    )

    and developer_only = false
);


-- =========================================================
-- 23. DEVELOPER READ
-- =========================================================

create policy "settings_developer_read"
on public.site_settings
for select
to authenticated
using (
    public.is_developer()
);


-- =========================================================
-- 24. DIRECT INSERT
-- =========================================================
--
-- Tidak diberikan.
--
-- Gunakan:
--   set_site_setting()
-- =========================================================


-- =========================================================
-- 25. DIRECT UPDATE
-- =========================================================
--
-- Tidak diberikan.
--
-- Gunakan:
--   set_site_setting()
-- =========================================================


-- =========================================================
-- 26. DIRECT DELETE
-- =========================================================
--
-- Tidak diberikan.
--
-- Gunakan:
--   delete_site_setting()
-- =========================================================


-- =========================================================
-- 27. FUNCTION PRIVILEGES
-- =========================================================

revoke all on function public.get_public_settings()
from public;

revoke all on function public.get_public_setting(text)
from public;

revoke all on function public.get_admin_settings()
from public;

revoke all on function public.get_developer_settings()
from public;

revoke all on function public.set_site_setting(
    text,
    text,
    public.setting_category,
    boolean,
    boolean,
    text
)
from public;

revoke all on function public.delete_site_setting(text)
from public;

revoke all on function public.set_home_background(text)
from public;

revoke all on function public.remove_home_background()
from public;

revoke all on function public.get_setting_value(text)
from public;

revoke all on function public.get_settings_by_category(
    public.setting_category
)
from public;


-- =========================================================
-- 28. GRANT
-- =========================================================

grant execute on function public.get_public_settings()
to anon, authenticated;

grant execute on function public.get_public_setting(text)
to anon, authenticated;

grant execute on function public.get_admin_settings()
to authenticated;

grant execute on function public.get_developer_settings()
to authenticated;

grant execute on function public.set_site_setting(
    text,
    text,
    public.setting_category,
    boolean,
    boolean,
    text
)
to authenticated;

grant execute on function public.delete_site_setting(text)
to authenticated;

grant execute on function public.set_home_background(text)
to authenticated;

grant execute on function public.remove_home_background()
to authenticated;

grant execute on function public.get_setting_value(text)
to anon, authenticated;

grant execute on function public.get_settings_by_category(
    public.setting_category
)
to anon, authenticated;


-- =========================================================
-- 29. COMMENTS
-- =========================================================

comment on table public.site_settings is
'Centralized configuration table for the MI Al-Maarif Nusantara digital library website.';

comment on column public.site_settings.setting_key is
'Unique machine-readable setting key.';

comment on column public.site_settings.setting_value is
'Setting value stored as text. Structured data should use JSON text when needed.';

comment on column public.site_settings.is_public is
'Determines whether the setting may be exposed to public frontend clients.';

comment on column public.site_settings.developer_only is
'Marks a setting as accessible and manageable only by the developer.';

comment on column public.site_settings.updated_by is
'Account that most recently changed the setting.';


-- =========================================================
-- END OF MIGRATION 007
-- =========================================================
