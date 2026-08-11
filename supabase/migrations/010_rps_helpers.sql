-- =========================================================
-- MI AL-MA'ARIF NUSANTARA
-- DIGITAL LIBRARY
--
-- Migration: 010_rpc_helpers.sql
--
-- PURPOSE:
-- Helper / RPC functions used by the Next.js application.
--
-- IMPORTANT:
-- Sensitive operations should go through these functions
-- or through protected Next.js server APIs.
--
-- =========================================================


-- =========================================================
-- 0. COMPATIBILITY HELPERS
-- =========================================================

-- ---------------------------------------------------------
-- CURRENT USER ROLE
-- ---------------------------------------------------------

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
    select role
    from public.profiles
    where
        id = auth.uid()
        and status = 'active'
    limit 1;
$$;


-- ---------------------------------------------------------
-- IS LOGGED IN
-- ---------------------------------------------------------

create or replace function public.is_logged_in()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select auth.uid() is not null;
$$;


-- ---------------------------------------------------------
-- IS USER
-- ---------------------------------------------------------

create or replace function public.is_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.profiles
        where
            id = auth.uid()
            and role = 'user'
            and status = 'active'
    );
$$;


-- ---------------------------------------------------------
-- IS ADMIN
-- ---------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.profiles
        where
            id = auth.uid()
            and role = 'admin'
            and status = 'active'
    );
$$;


-- ---------------------------------------------------------
-- IS DEVELOPER
-- ---------------------------------------------------------

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
        where
            id = auth.uid()
            and role = 'developer'
            and status = 'active'
    );
$$;


-- ---------------------------------------------------------
-- IS ADMIN OR DEVELOPER
-- ---------------------------------------------------------

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
        where
            id = auth.uid()
            and role in ('admin', 'developer')
            and status = 'active'
    );
$$;


-- =========================================================
-- 1. CURRENT PROFILE
-- =========================================================

create or replace function public.get_my_profile()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
    result jsonb;
begin

    if auth.uid() is null then
        return jsonb_build_object(
            'authenticated',
            false
        );
    end if;


    select jsonb_build_object(
        'id', p.id,
        'username', p.username,
        'full_name', p.full_name,
        'address', p.address,
        'birth_place', p.birth_place,
        'birth_date', p.birth_date,
        'parent_whatsapp', p.parent_whatsapp,
        'gmail', p.gmail,
        'class_level', p.class_level,
        'role', p.role,
        'status', p.status,
        'avatar_url', p.avatar_url,
        'failed_login_attempts', p.failed_login_attempts,
        'locked_until', p.locked_until,
        'created_at', p.created_at,
        'updated_at', p.updated_at
    )
    into result
    from public.profiles p
    where p.id = auth.uid();


    if result is null then
        return jsonb_build_object(
            'authenticated',
            true,
            'profile_exists',
            false
        );
    end if;


    return result;

end;
$$;


-- =========================================================
-- 2. UPDATE OWN PROFILE
-- =========================================================
--
-- User hanya boleh mengubah data profile miliknya.
--
-- Username tidak diubah melalui fungsi ini.
-- Perubahan username akan melalui fungsi khusus admin.
--
-- =========================================================

create or replace function public.update_my_profile(
    new_full_name text default null,
    new_address text default null,
    new_birth_place text default null,
    new_birth_date date default null,
    new_parent_whatsapp text default null,
    new_gmail text default null,
    new_class_level integer default null,
    new_avatar_url text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin

    if auth.uid() is null then
        raise exception 'Anda belum login.';
    end if;


    update public.profiles
    set

        full_name =
            coalesce(new_full_name, full_name),

        address =
            coalesce(new_address, address),

        birth_place =
            coalesce(new_birth_place, birth_place),

        birth_date =
            coalesce(new_birth_date, birth_date),

        parent_whatsapp =
            coalesce(new_parent_whatsapp, parent_whatsapp),

        gmail =
            coalesce(new_gmail, gmail),

        class_level =
            coalesce(new_class_level, class_level),

        avatar_url =
            coalesce(new_avatar_url, avatar_url),

        updated_at =
            timezone('utc', now())

    where id = auth.uid();


    return found;

end;
$$;


-- =========================================================
-- 3. ANNOUNCEMENTS
-- =========================================================


-- ---------------------------------------------------------
-- GET PUBLIC ANNOUNCEMENTS
-- ---------------------------------------------------------

create or replace function public.get_public_announcements(
    limit_count integer default 20
)
returns table (
    id uuid,
    title text,
    content text,
    created_at timestamptz,
    updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
    select
        a.id,
        a.title,
        a.content,
        a.created_at,
        a.updated_at
    from public.announcements a
    where
        a.is_published = true
    order by
        a.created_at desc
    limit greatest(
        least(limit_count, 100),
        1
    );
$$;


-- ---------------------------------------------------------
-- CREATE ANNOUNCEMENT
-- ---------------------------------------------------------

create or replace function public.create_announcement(
    announcement_title text,
    announcement_content text,
    publish_now boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    new_id uuid;
begin

    if not public.is_admin_or_developer() then
        raise exception
            'Hanya admin/developer yang dapat membuat pengumuman.';
    end if;


    insert into public.announcements (
        title,
        content,
        is_published,
        created_by
    )
    values (
        trim(announcement_title),
        trim(announcement_content),
        publish_now,
        auth.uid()
    )
    returning id into new_id;


    return new_id;

end;
$$;


-- ---------------------------------------------------------
-- UPDATE ANNOUNCEMENT
-- ---------------------------------------------------------

create or replace function public.update_announcement(
    announcement_id uuid,
    new_title text default null,
    new_content text default null,
    new_is_published boolean default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin

    if not public.is_admin_or_developer() then
        raise exception
            'Tidak memiliki izin.';
    end if;


    update public.announcements
    set
        title =
            coalesce(new_title, title),

        content =
            coalesce(new_content, content),

        is_published =
            coalesce(new_is_published, is_published),

        updated_at =
            timezone('utc', now())

    where id = announcement_id;


    return found;

end;
$$;


-- ---------------------------------------------------------
-- DELETE ANNOUNCEMENT
-- ---------------------------------------------------------

create or replace function public.delete_announcement(
    announcement_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin

    if not public.is_admin_or_developer() then
        raise exception
            'Tidak memiliki izin.';
    end if;


    delete from public.announcements
    where id = announcement_id;


    return found;

end;
$$;


-- =========================================================
-- 4. BOOK LIST
-- =========================================================
--
-- PDF PATH TIDAK DIKEMBALIKAN KE USER.
--
-- Frontend hanya mendapatkan informasi buku.
--
-- PDF akan diakses melalui protected API.
--
-- =========================================================

create or replace function public.get_books(
    target_category text default null,
    target_grade integer default null,
    search_query text default null,
    limit_count integer default 50,
    offset_count integer default 0
)
returns table (
    id uuid,
    title text,
    synopsis text,
    category text,
    grade integer,
    cover_url text,
    allow_download boolean,
    created_at timestamptz,
    updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin

    if auth.uid() is null then
        raise exception
            'Silakan login terlebih dahulu.';
    end if;


    return query

    select
        b.id,
        b.title,
        b.synopsis,
        b.category,
        b.grade,
        b.cover_url,
        b.allow_download,
        b.created_at,
        b.updated_at

    from public.books b

    where

        (
            target_category is null
            or b.category = target_category
        )

        and

        (
            target_grade is null
            or b.grade = target_grade
        )

        and

        (
            search_query is null
            or search_query = ''
            or b.title ilike
                '%' || search_query || '%'
            or b.synopsis ilike
                '%' || search_query || '%'
        )

    order by
        b.created_at desc

    limit greatest(
        least(limit_count, 100),
        1
    )

    offset greatest(
        offset_count,
        0
    );

end;
$$;


-- =========================================================
-- 5. GET SINGLE BOOK
-- =========================================================

create or replace function public.get_book(
    book_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
    result jsonb;
begin

    if auth.uid() is null then
        raise exception
            'Silakan login terlebih dahulu.';
    end if;


    select jsonb_build_object(
        'id', b.id,
        'title', b.title,
        'synopsis', b.synopsis,
        'category', b.category,
        'grade', b.grade,
        'cover_url', b.cover_url,
        'allow_download', b.allow_download,
        'created_at', b.created_at,
        'updated_at', b.updated_at
    )
    into result

    from public.books b

    where b.id = book_id;


    if result is null then
        raise exception
            'Buku tidak ditemukan.';
    end if;


    return result;

end;
$$;


-- =========================================================
-- 6. CHECK BOOK ACCESS
-- =========================================================
--
-- Digunakan sebelum membuat signed URL PDF.
--
-- =========================================================

create or replace function public.check_book_access(
    book_id uuid,
    requested_action text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare

    book_exists boolean;

    download_allowed boolean;

begin

    if auth.uid() is null then

        return jsonb_build_object(
            'allowed',
            false,

            'reason',
            'not_authenticated'
        );

    end if;


    select
        true,
        b.allow_download

    into
        book_exists,
        download_allowed

    from public.books b

    where b.id = book_id;


    if not book_exists then

        return jsonb_build_object(
            'allowed',
            false,

            'reason',
            'book_not_found'
        );

    end if;


    -- -----------------------------------------------------
    -- READ
    -- -----------------------------------------------------

    if requested_action = 'read' then

        return jsonb_build_object(
            'allowed',
            true,

            'reason',
            'read_allowed'
        );

    end if;


    -- -----------------------------------------------------
    -- DOWNLOAD
    -- -----------------------------------------------------

    if requested_action = 'download' then

        if download_allowed then

            return jsonb_build_object(
                'allowed',
                true,

                'reason',
                'download_allowed'
            );

        else

            return jsonb_build_object(
                'allowed',
                false,

                'reason',
                'download_disabled'
            );

        end if;

    end if;


    return jsonb_build_object(
        'allowed',
        false,

        'reason',
        'invalid_action'
    );

end;
$$;


-- =========================================================
-- 7. ADMIN / DEVELOPER BOOK CREATION
-- =========================================================

create or replace function public.create_book(
    book_title text,
    book_synopsis text,
    book_category text,
    book_grade integer default null,
    book_cover_url text default null,
    book_pdf_path text default null,
    book_allow_download boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    new_book_id uuid;
begin

    if not public.is_admin_or_developer() then
        raise exception
            'Hanya admin/developer yang dapat menambah buku.';
    end if;


    if trim(book_title) = '' then
        raise exception
            'Judul buku wajib diisi.';
    end if;


    insert into public.books (
        title,
        synopsis,
        category,
        grade,
        cover_url,
        pdf_path,
        allow_download,
        created_by
    )
    values (
        trim(book_title),
        nullif(trim(book_synopsis), ''),
        book_category,
        book_grade,
        book_cover_url,
        book_pdf_path,
        book_allow_download,
        auth.uid()
    )
    returning id into new_book_id;


    return new_book_id;

end;
$$;


-- =========================================================
-- 8. UPDATE BOOK
-- =========================================================

create or replace function public.update_book(
    book_id uuid,
    new_title text default null,
    new_synopsis text default null,
    new_category text default null,
    new_grade integer default null,
    new_cover_url text default null,
    new_pdf_path text default null,
    new_allow_download boolean default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin

    if not public.is_admin_or_developer() then
        raise exception
            'Tidak memiliki izin mengedit buku.';
    end if;


    update public.books
    set

        title =
            coalesce(new_title, title),

        synopsis =
            coalesce(new_synopsis, synopsis),

        category =
            coalesce(new_category, category),

        grade =
            coalesce(new_grade, grade),

        cover_url =
            coalesce(new_cover_url, cover_url),

        pdf_path =
            coalesce(new_pdf_path, pdf_path),

        allow_download =
            coalesce(
                new_allow_download,
                allow_download
            ),

        updated_at =
            timezone('utc', now())

    where id = book_id;


    return found;

end;
$$;


-- =========================================================
-- 9. CHANGE DOWNLOAD PERMISSION
-- =========================================================

create or replace function public.set_book_download_permission(
    book_id uuid,
    allow_download_value boolean
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin

    if not public.is_admin_or_developer() then
        raise exception
            'Tidak memiliki izin.';
    end if;


    update public.books

    set

        allow_download =
            allow_download_value,

        updated_at =
            timezone('utc', now())

    where id = book_id;


    return found;

end;
$$;


-- =========================================================
-- 10. DELETE BOOK
-- =========================================================
--
-- Catatan:
-- Fungsi ini menghapus database record.
--
-- File Storage akan dihapus oleh protected server API
-- menggunakan service-role setelah path lama diperoleh.
--
-- =========================================================

create or replace function public.delete_book(
    book_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare

    old_pdf_path text;

    old_cover_url text;

begin

    if not public.is_admin_or_developer() then
        raise exception
            'Tidak memiliki izin menghapus buku.';
    end if;


    select
        pdf_path,
        cover_url

    into
        old_pdf_path,
        old_cover_url

    from public.books

    where id = book_id;


    if old_pdf_path is null
       and old_cover_url is null then

        delete from public.books
        where id = book_id;

    else

        delete from public.books
        where id = book_id;

    end if;


    return jsonb_build_object(

        'deleted',
        true,

        'book_id',
        book_id,

        'pdf_path',
        old_pdf_path,

        'cover_url',
        old_cover_url

    );

end;
$$;


-- =========================================================
-- 11. REPORTS
-- =========================================================


-- ---------------------------------------------------------
-- CREATE USER REPORT
-- ---------------------------------------------------------

create or replace function public.create_report(
    report_title text,
    report_description text,
    report_type_value text default 'bug',
    report_priority_value text default 'normal'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare

    new_report_id uuid;

begin

    if auth.uid() is null then
        raise exception
            'Silakan login terlebih dahulu.';
    end if;


    insert into public.reports (
        reporter_id,
        report_type,
        title,
        description,
        priority,
        status
    )
    values (
        auth.uid(),
        report_type_value,
        trim(report_title),
        trim(report_description),
        report_priority_value,
        'open'
    )
    returning id into new_report_id;


    return new_report_id;

end;
$$;


-- ---------------------------------------------------------
-- GET REPORTS
-- ---------------------------------------------------------
--
-- User:
--   hanya report miliknya.
--
-- Admin:
--   report user.
--
-- Developer:
--   semua report termasuk admin.
--
-- ---------------------------------------------------------

create or replace function public.get_reports(
    limit_count integer default 100
)
returns table (
    id uuid,
    reporter_id uuid,
    reporter_name text,
    reporter_role public.user_role,
    report_type text,
    title text,
    description text,
    priority text,
    status text,
    created_at timestamptz,
    updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare

    caller_role public.user_role;

begin

    if auth.uid() is null then
        raise exception
            'Silakan login.';
    end if;


    select role
    into caller_role

    from public.profiles

    where
        id = auth.uid()
        and status = 'active';


    return query

    select

        r.id,

        r.reporter_id,

        p.full_name,

        p.role,

        r.report_type,

        r.title,

        r.description,

        r.priority,

        r.status,

        r.created_at,

        r.updated_at

    from public.reports r

    left join public.profiles p
        on p.id = r.reporter_id

    where

        case

            when caller_role = 'developer'
            then true

            when caller_role = 'admin'
            then coalesce(
                p.role,
                'user'
            ) = 'user'

            when caller_role = 'user'
            then r.reporter_id = auth.uid()

            else false

        end

    order by
        r.created_at desc

    limit greatest(
        least(limit_count, 500),
        1
    );

end;
$$;


-- =========================================================
-- 12. UPDATE REPORT STATUS
-- =========================================================

create or replace function public.update_report_status(
    report_id uuid,
    new_status text,
    new_priority text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin

    if not public.is_admin_or_developer() then
        raise exception
            'Hanya admin/developer yang dapat mengubah report.';
    end if;


    update public.reports
    set

        status =
            new_status,

        priority =
            coalesce(
                new_priority,
                priority
            ),

        updated_at =
            timezone('utc', now())

    where id = report_id;


    return found;

end;
$$;


-- =========================================================
-- 13. HISTORY
-- =========================================================


-- ---------------------------------------------------------
-- USER HISTORY
-- ---------------------------------------------------------

create or replace function public.get_my_history(
    limit_count integer default 100
)
returns table (
    id uuid,
    action text,
    action_type text,
    description text,
    target_type text,
    target_id uuid,
    severity text,
    metadata jsonb,
    created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
    select
        h.id,
        h.action,
        h.action_type,
        h.description,
        h.target_type,
        h.target_id,
        h.severity,
        h.metadata,
        h.created_at

    from public.history h

    where h.user_id = auth.uid()

    order by
        h.created_at desc

    limit greatest(
        least(limit_count, 500),
        1
    );
$$;


-- ---------------------------------------------------------
-- ADMIN HISTORY
-- ---------------------------------------------------------

create or replace function public.get_admin_history(
    limit_count integer default 200
)
returns table (
    id uuid,
    user_id uuid,
    user_name text,
    user_role public.user_role,
    action text,
    action_type text,
    description text,
    target_type text,
    target_id uuid,
    severity text,
    metadata jsonb,
    created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
    caller_role public.user_role;
begin

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
            'Tidak memiliki izin melihat history.';
    end if;


    return query

    select

        h.id,

        h.user_id,

        p.full_name,

        p.role,

        h.action,

        h.action_type,

        h.description,

        h.target_type,

        h.target_id,

        h.severity,

        h.metadata,

        h.created_at

    from public.history h

    left join public.profiles p
        on p.id = h.user_id

    where

        caller_role = 'developer'

        or

        (
            caller_role = 'admin'
            and coalesce(
                p.role,
                'user'
            ) = 'user'
        )

    order by
        h.created_at desc

    limit greatest(
        least(limit_count, 500),
        1
    );

end;
$$;


-- =========================================================
-- 14. CONTACT SETTINGS
-- =========================================================

create or replace function public.get_contact_settings()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
    select coalesce(
        jsonb_object_agg(
            setting_key,
            setting_value
        ),
        '{}'::jsonb
    )

    from public.site_settings

    where
        category = 'contact'
        and is_public = true;
$$;


-- =========================================================
-- 15. PUBLIC HOME SETTINGS
-- =========================================================

create or replace function public.get_public_settings()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
    select coalesce(
        jsonb_object_agg(
            setting_key,
            setting_value
        ),
        '{}'::jsonb
    )

    from public.site_settings

    where
        is_public = true
        and developer_only = false;
$$;


-- =========================================================
-- 16. DEVELOPER SETTINGS
-- =========================================================

create or replace function public.get_developer_settings()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin

    if not public.is_developer() then
        raise exception
            'Hanya developer yang dapat melihat developer settings.';
    end if;


    return (
        select coalesce(
            jsonb_object_agg(
                setting_key,
                setting_value
            ),
            '{}'::jsonb
        )

        from public.site_settings
    );

end;
$$;


-- =========================================================
-- 17. UPDATE SETTING
-- =========================================================

create or replace function public.update_site_setting(
    target_key text,
    target_value text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare

    setting_developer_only boolean;

begin

    if not public.is_admin_or_developer() then
        raise exception
            'Tidak memiliki izin.';
    end if;


    select developer_only
    into setting_developer_only

    from public.site_settings

    where setting_key = target_key;


    if setting_developer_only is true
       and not public.is_developer()
    then

        raise exception
            'Setting ini hanya dapat diubah developer.';

    end if;


    update public.site_settings

    set

        setting_value = target_value,

        updated_at =
            timezone('utc', now()),

        updated_by =
            auth.uid()

    where setting_key = target_key;


    return found;

end;
$$;


-- =========================================================
-- 18. ADMIN USER MANAGEMENT
-- =========================================================


-- ---------------------------------------------------------
-- GET USER LIST
-- ---------------------------------------------------------
--
-- Admin:
--   hanya user biasa
--
-- Developer:
--   user + admin
--
-- Password TIDAK PERNAH dikembalikan.
--
-- ---------------------------------------------------------

create or replace function public.get_managed_users(
    limit_count integer default 200
)
returns table (
    id uuid,
    username text,
    full_name text,
    gmail text,
    parent_whatsapp text,
    class_level integer,
    role public.user_role,
    status text,
    avatar_url text,
    failed_login_attempts integer,
    locked_until timestamptz,
    created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
    caller_role public.user_role;
begin

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
            'Tidak memiliki izin.';
    end if;


    return query

    select

        p.id,
        p.username,
        p.full_name,
        p.gmail,
        p.parent_whatsapp,
        p.class_level,
        p.role,
        p.status,
        p.avatar_url,
        p.failed_login_attempts,
        p.locked_until,
        p.created_at

    from public.profiles p

    where

        case

            when caller_role = 'developer'
            then p.role in (
                'user',
                'admin'
            )

            when caller_role = 'admin'
            then p.role = 'user'

            else false

        end

    order by
        p.created_at desc

    limit greatest(
        least(limit_count, 500),
        1
    );

end;
$$;


-- =========================================================
-- 19. CHANGE USERNAME
-- =========================================================
--
-- Hanya untuk USER biasa.
--
-- Admin:
--   dapat mengubah username user.
--
-- Developer:
--   dapat mengubah username user.
--
-- Tidak digunakan untuk admin/developer.
--
-- =========================================================

create or replace function public.change_user_username(
    target_user_id uuid,
    new_username text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare

    caller_role public.user_role;

    target_role public.user_role;

begin

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
            'Tidak memiliki izin.';
    end if;


    select role
    into target_role

    from public.profiles

    where id = target_user_id;


    if target_role is null then
        raise exception
            'User tidak ditemukan.';
    end if;


    if target_role <> 'user' then
        raise exception
            'Username admin/developer tidak dapat diubah melalui fungsi ini.';
    end if;


    if trim(new_username) = '' then
        raise exception
            'Username tidak boleh kosong.';
    end if;


    if exists (
        select 1
        from public.profiles
        where
            lower(username)
            =
            lower(trim(new_username))
            and id <> target_user_id
    ) then

        raise exception
            'Username sudah digunakan.';
    end if;


    update public.profiles

    set

        username =
            trim(new_username),

        updated_at =
            timezone('utc', now())

    where id = target_user_id;


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

        'change_username',

        'account',

        'Mengubah username user.',

        'user',

        target_user_id,

        'info',

        jsonb_build_object(
            'new_username',
            trim(new_username)
        )
    );


    return found;

end;
$$;


-- =========================================================
-- 20. CHANGE USER STATUS
-- =========================================================

create or replace function public.set_user_status(
    target_user_id uuid,
    new_status text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare

    caller_role public.user_role;

    target_role public.user_role;

begin

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
            'Tidak memiliki izin.';
    end if;


    select role
    into target_role

    from public.profiles

    where id = target_user_id;


    if target_role is null then
        raise exception
            'User tidak ditemukan.';
    end if;


    if caller_role = 'admin'
       and target_role <> 'user'
    then

        raise exception
            'Admin hanya dapat mengatur user biasa.';
    end if;


    if new_status not in (
        'active',
        'inactive',
        'suspended'
    )
    then

        raise exception
            'Status tidak valid.';
    end if;


    update public.profiles

    set

        status = new_status,

        updated_at =
            timezone('utc', now())

    where id = target_user_id;


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

        'change_user_status',

        'account',

        'Mengubah status akun user.',

        'user',

        target_user_id,

        'warning',

        jsonb_build_object(
            'new_status',
            new_status
        )
    );


    return found;

end;
$$;


-- =========================================================
-- 21. CLASS BOOK CATEGORIES
-- =========================================================
--
-- Helper untuk halaman:
--
-- Buku Guru
--   Kelas 1
--   Kelas 2
--   Kelas 3
--   Kelas 4
--   Kelas 5
--   Kelas 6
--
-- =========================================================

create or replace function public.get_teacher_book_categories()
returns table (
    grade integer,
    label text
)
language sql
immutable
as $$
    select *
    from (
        values
            (1, 'Kelas 1'),
            (2, 'Kelas 2'),
            (3, 'Kelas 3'),
            (4, 'Kelas 4'),
            (5, 'Kelas 5'),
            (6, 'Kelas 6')
    ) as categories(grade, label);
$$;


-- =========================================================
-- 22. STUDENT BOOK CATEGORIES
-- =========================================================

create or replace function public.get_student_book_categories()
returns table (
    category_key text,
    label text
)
language sql
immutable
as $$
    select *
    from (
        values
            ('umum', 'Buku Umum'),
            ('agama', 'Buku PAI / Agama')
    ) as categories(category_key, label);
$$;


-- =========================================================
-- 23. WRITE HISTORY HELPER
-- =========================================================
--
-- Hanya dapat dipanggil oleh authenticated user.
--
-- User tidak dapat memasukkan user_id milik orang lain.
--
-- =========================================================

create or replace function public.write_history(
    history_action text,
    history_action_type text,
    history_description text,
    history_target_type text default null,
    history_target_id uuid default null,
    history_severity text default 'info',
    history_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    new_id uuid;
begin

    if auth.uid() is null then
        raise exception
            'Silakan login.';
    end if;


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
        history_action,
        history_action_type,
        history_description,
        history_target_type,
        history_target_id,
        history_severity,
        coalesce(
            history_metadata,
            '{}'::jsonb
        )
    )

    returning id into new_id;


    return new_id;

end;
$$;


-- =========================================================
-- 24. CLEAN EXPIRED LOCKS
-- =========================================================
--
-- Fungsi ini dapat dipanggil oleh backend/cron.
--
-- Tidak otomatis berjalan sendiri.
--
-- Nanti dapat dipanggil melalui Vercel Cron.
--
-- =========================================================

create or replace function public.clean_expired_account_locks()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare

    affected_count integer;

begin

    update public.profiles

    set

        locked_until = null,

        failed_login_attempts = 0,

        updated_at =
            timezone('utc', now())

    where

        locked_until is not null

        and locked_until <=
            timezone('utc', now());


    get diagnostics
        affected_count = row_count;


    return affected_count;

end;
$$;


-- =========================================================
-- 25. SEARCH BOOKS
-- =========================================================

create or replace function public.search_books(
    search_text text,
    limit_count integer default 30
)
returns table (
    id uuid,
    title text,
    synopsis text,
    category text,
    grade integer,
    cover_url text,
    allow_download boolean
)
language sql
stable
security definer
set search_path = public
as $$
    select

        b.id,

        b.title,

        b.synopsis,

        b.category,

        b.grade,

        b.cover_url,

        b.allow_download

    from public.books b

    where

        auth.uid() is not null

        and

        (
            b.title ilike
                '%' || search_text || '%'

            or

            coalesce(
                b.synopsis,
                ''
            ) ilike
                '%' || search_text || '%'
        )

    order by
        b.title asc

    limit greatest(
        least(limit_count, 100),
        1
    );
$$;


-- =========================================================
-- 26. PUBLIC HOME DATA
-- =========================================================

create or replace function public.get_home_data()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare

    result jsonb;

begin

    select jsonb_build_object(

        'settings',

        coalesce(
            (
                select jsonb_object_agg(
                    setting_key,
                    setting_value
                )

                from public.site_settings

                where
                    is_public = true
                    and developer_only = false
            ),
            '{}'::jsonb
        ),

        'announcements',

        coalesce(
            (
                select jsonb_agg(
                    jsonb_build_object(
                        'id', a.id,
                        'title', a.title,
                        'content', a.content,
                        'created_at', a.created_at
                    )
                    order by a.created_at desc
                )

                from public.announcements a

                where
                    a.is_published = true
            ),
            '[]'::jsonb
        )

    )

    into result;


    return result;

end;
$$;


-- =========================================================
-- 27. PERMISSION CHECK
-- =========================================================

create or replace function public.can_access_library()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.profiles
        where
            id = auth.uid()
            and status = 'active'
            and role in (
                'user',
                'admin',
                'developer'
            )
    );
$$;


-- =========================================================
-- 28. GRANTS
-- =========================================================

revoke all on function public.current_user_role()
from public;

revoke all on function public.is_logged_in()
from public;

revoke all on function public.is_user()
from public;

revoke all on function public.is_admin()
from public;

revoke all on function public.is_developer()
from public;

revoke all on function public.is_admin_or_developer()
from public;

revoke all on function public.get_my_profile()
from public;

revoke all on function public.update_my_profile(
    text,
    text,
    text,
    date,
    text,
    text,
    integer,
    text
)
from public;

revoke all on function public.get_public_announcements(
    integer
)
from public;

revoke all on function public.create_announcement(
    text,
    text,
    boolean
)
from public;

revoke all on function public.update_announcement(
    uuid,
    text,
    text,
    boolean
)
from public;

revoke all on function public.delete_announcement(
    uuid
)
from public;

revoke all on function public.get_books(
    text,
    integer,
    text,
    integer,
    integer
)
from public;

revoke all on function public.get_book(
    uuid
)
from public;

revoke all on function public.check_book_access(
    uuid,
    text
)
from public;

revoke all on function public.create_book(
    text,
    text,
    text,
    integer,
    text,
    text,
    boolean
)
from public;

revoke all on function public.update_book(
    uuid,
    text,
    text,
    text,
    integer,
    text,
    text,
    boolean
)
from public;

revoke all on function public.set_book_download_permission(
    uuid,
    boolean
)
from public;

revoke all on function public.delete_book(
    uuid
)
from public;

revoke all on function public.create_report(
    text,
    text,
    text,
    text
)
from public;

revoke all on function public.get_reports(
    integer
)
from public;

revoke all on function public.update_report_status(
    uuid,
    text,
    text
)
from public;

revoke all on function public.get_my_history(
    integer
)
from public;

revoke all on function public.get_admin_history(
    integer
)
from public;

revoke all on function public.get_contact_settings()
from public;

revoke all on function public.get_public_settings()
from public;

revoke all on function public.get_developer_settings()
from public;

revoke all on function public.update_site_setting(
    text,
    text
)
from public;

revoke all on function public.get_managed_users(
    integer
)
from public;

revoke all on function public.change_user_username(
    uuid,
    text
)
from public;

revoke all on function public.set_user_status(
    uuid,
    text
)
from public;

revoke all on function public.get_teacher_book_categories()
from public;

revoke all on function public.get_student_book_categories()
from public;

revoke all on function public.write_history(
    text,
    text,
    text,
    text,
    uuid,
    text,
    jsonb
)
from public;

revoke all on function public.clean_expired_account_locks()
from public;

revoke all on function public.search_books(
    text,
    integer
)
from public;

revoke all on function public.get_home_data()
from public;

revoke all on function public.can_access_library()
from public;


-- =========================================================
-- 29. GRANT AUTHENTICATED
-- =========================================================

grant execute on function public.current_user_role()
to authenticated;

grant execute on function public.is_logged_in()
to authenticated;

grant execute on function public.is_user()
to authenticated;

grant execute on function public.is_admin()
to authenticated;

grant execute on function public.is_developer()
to authenticated;

grant execute on function public.is_admin_or_developer()
to authenticated;

grant execute on function public.get_my_profile()
to authenticated;

grant execute on function public.update_my_profile(
    text,
    text,
    text,
    date,
    text,
    text,
    integer,
    text
)
to authenticated;

grant execute on function public.get_public_announcements(
    integer
)
to anon, authenticated;

grant execute on function public.create_announcement(
    text,
    text,
    boolean
)
to authenticated;

grant execute on function public.update_announcement(
    uuid,
    text,
    text,
    boolean
)
to authenticated;

grant execute on function public.delete_announcement(
    uuid
)
to authenticated;

grant execute on function public.get_books(
    text,
    integer,
    text,
    integer,
    integer
)
to authenticated;

grant execute on function public.get_book(
    uuid
)
to authenticated;

grant execute on function public.check_book_access(
    uuid,
    text
)
to authenticated;

grant execute on function public.create_book(
    text,
    text,
    text,
    integer,
    text,
    text,
    boolean
)
to authenticated;

grant execute on function public.update_book(
    uuid,
    text,
    text,
    text,
    integer,
    text,
    text,
    boolean
)
to authenticated;

grant execute on function public.set_book_download_permission(
    uuid,
    boolean
)
to authenticated;

grant execute on function public.delete_book(
    uuid
)
to authenticated;

grant execute on function public.create_report(
    text,
    text,
    text,
    text
)
to authenticated;

grant execute on function public.get_reports(
    integer
)
to authenticated;

grant execute on function public.update_report_status(
    uuid,
    text,
    text
)
to authenticated;

grant execute on function public.get_my_history(
    integer
)
to authenticated;

grant execute on function public.get_admin_history(
    integer
)
to authenticated;

grant execute on function public.get_contact_settings()
to anon, authenticated;

grant execute on function public.get_public_settings()
to anon, authenticated;

grant execute on function public.get_developer_settings()
to authenticated;

grant execute on function public.update_site_setting(
    text,
    text
)
to authenticated;

grant execute on function public.get_managed_users(
    integer
)
to authenticated;

grant execute on function public.change_user_username(
    uuid,
    text
)
to authenticated;

grant execute on function public.set_user_status(
    uuid,
    text
)
to authenticated;

grant execute on function public.get_teacher_book_categories()
to anon, authenticated;

grant execute on function public.get_student_book_categories()
to anon, authenticated;

grant execute on function public.write_history(
    text,
    text,
    text,
    text,
    uuid,
    text,
    jsonb
)
to authenticated;

grant execute on function public.clean_expired_account_locks()
to authenticated;

grant execute on function public.search_books(
    text,
    integer
)
to authenticated;

grant execute on function public.get_home_data()
to anon, authenticated;

grant execute on function public.can_access_library()
to authenticated;


-- =========================================================
-- 30. COMMENTS
-- =========================================================

comment on function public.current_user_role()
is
'Returns the active role of the currently authenticated user.';


comment on function public.get_my_profile()
is
'Returns the current user profile without password information.';


comment on function public.get_books(
    text,
    integer,
    text,
    integer,
    integer
)
is
'Returns books accessible to authenticated users. PDF storage path is intentionally not exposed.';


comment on function public.check_book_access(
    uuid,
    text
)
is
'Checks whether a logged-in user may read or download a book.';


comment on function public.get_reports(
    integer
)
is
'Returns reports according to the caller role.';


comment on function public.get_admin_history(
    integer
)
is
'Returns history according to admin/developer monitoring permissions.';


comment on function public.get_developer_settings()
is
'Returns all site settings for developer-only configuration.';


comment on function public.clean_expired_account_locks()
is
'Clears expired account locks. Suitable for scheduled backend execution.';


-- =========================================================
-- END OF MIGRATION 010
-- =========================================================
