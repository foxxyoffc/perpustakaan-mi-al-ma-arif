-- =========================================================
-- MI AL-MA'ARIF NUSANTARA
-- DIGITAL LIBRARY
--
-- Migration: 006_announcements.sql
--
-- ANNOUNCEMENT SYSTEM
--
-- USER
--   -> melihat announcement yang published & aktif
--
-- ADMIN
--   -> membuat announcement
--   -> mengedit announcement
--   -> publish / unpublish
--   -> archive
--   -> delete
--
-- DEVELOPER
--   -> semua akses ADMIN
--   -> dapat mengelola seluruh announcement
--
-- =========================================================


-- =========================================================
-- 1. ANNOUNCEMENT STATUS
-- =========================================================

do $$
begin

    create type public.announcement_status as enum (
        'draft',
        'published',
        'archived'
    );

exception
    when duplicate_object then null;

end $$;


-- =========================================================
-- 2. ANNOUNCEMENTS TABLE
-- =========================================================

create table if not exists public.announcements (

    id uuid primary key default gen_random_uuid(),

    -- -----------------------------------------------------
    -- CONTENT
    -- -----------------------------------------------------

    title text not null,

    content text not null,

    -- -----------------------------------------------------
    -- STATUS
    -- -----------------------------------------------------

    status public.announcement_status
        not null default 'draft',

    -- -----------------------------------------------------
    -- IMPORTANT / PINNED
    -- -----------------------------------------------------

    is_important boolean
        not null default false,

    is_pinned boolean
        not null default false,

    -- -----------------------------------------------------
    -- SCHEDULE
    -- -----------------------------------------------------

    publish_at timestamptz,

    expires_at timestamptz,

    -- -----------------------------------------------------
    -- AUTHOR
    -- -----------------------------------------------------

    created_by uuid
        references public.profiles(id)
        on delete set null,

    updated_by uuid
        references public.profiles(id)
        on delete set null,

    -- -----------------------------------------------------
    -- TIMESTAMP
    -- -----------------------------------------------------

    created_at timestamptz
        not null default timezone('utc', now()),

    updated_at timestamptz
        not null default timezone('utc', now())

);


-- =========================================================
-- 3. INDEXES
-- =========================================================

create index if not exists announcements_status_idx
on public.announcements(status);


create index if not exists announcements_publish_at_idx
on public.announcements(publish_at);


create index if not exists announcements_expires_at_idx
on public.announcements(expires_at);


create index if not exists announcements_important_idx
on public.announcements(is_important);


create index if not exists announcements_pinned_idx
on public.announcements(is_pinned);


create index if not exists announcements_created_at_idx
on public.announcements(created_at desc);


-- =========================================================
-- 4. UPDATED_AT
-- =========================================================

create or replace function public.update_announcement_timestamp()
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


drop trigger if exists announcements_updated_at_trigger
on public.announcements;


create trigger announcements_updated_at_trigger
before update
on public.announcements
for each row
execute function public.update_announcement_timestamp();


-- =========================================================
-- 5. VALIDATE ANNOUNCEMENT
-- =========================================================

create or replace function public.validate_announcement()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin

    -- -----------------------------------------------------
    -- TITLE
    -- -----------------------------------------------------

    if new.title is null
       or length(trim(new.title)) < 3
    then
        raise exception
            'Judul pengumuman minimal 3 karakter.';
    end if;


    -- -----------------------------------------------------
    -- CONTENT
    -- -----------------------------------------------------

    if new.content is null
       or length(trim(new.content)) < 3
    then
        raise exception
            'Isi pengumuman tidak boleh kosong.';
    end if;


    -- -----------------------------------------------------
    -- DATE VALIDATION
    -- -----------------------------------------------------

    if new.expires_at is not null
       and new.publish_at is not null
       and new.expires_at <= new.publish_at
    then
        raise exception
            'Tanggal berakhir harus lebih besar dari tanggal mulai.';
    end if;


    return new;

end;
$$;


drop trigger if exists announcements_validation_trigger
on public.announcements;


create trigger announcements_validation_trigger
before insert or update
on public.announcements
for each row
execute function public.validate_announcement();


-- =========================================================
-- 6. CHECK MANAGEMENT ACCESS
-- =========================================================

create or replace function public.can_manage_announcements()
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
        and role in (
            'admin',
            'developer'
        )
        and status = 'active'
    );
$$;


-- =========================================================
-- 7. GET PUBLIC ANNOUNCEMENTS
-- =========================================================
--
-- User hanya mendapatkan:
--
-- status = published
-- publish_at sudah tiba
-- expires_at belum lewat
--
-- Jika publish_at NULL -> langsung aktif setelah publish.
-- Jika expires_at NULL -> tidak memiliki tanggal kadaluarsa.
-- =========================================================

create or replace function public.get_public_announcements()
returns setof public.announcements
language sql
stable
security definer
set search_path = public
as $$
    select a.*
    from public.announcements a

    where
        a.status = 'published'

        and (
            a.publish_at is null
            or a.publish_at <= timezone('utc', now())
        )

        and (
            a.expires_at is null
            or a.expires_at > timezone('utc', now())
        )

    order by
        a.is_pinned desc,
        a.is_important desc,
        coalesce(
            a.publish_at,
            a.created_at
        ) desc;
$$;


-- =========================================================
-- 8. GET ANNOUNCEMENT BY ID
-- =========================================================
--
-- Public version.
-- Hanya announcement aktif.
-- =========================================================

create or replace function public.get_public_announcement(
    announcement_id uuid
)
returns public.announcements
language sql
stable
security definer
set search_path = public
as $$
    select a.*
    from public.announcements a

    where
        a.id = announcement_id

        and a.status = 'published'

        and (
            a.publish_at is null
            or a.publish_at <= timezone('utc', now())
        )

        and (
            a.expires_at is null
            or a.expires_at > timezone('utc', now())
        )

    limit 1;
$$;


-- =========================================================
-- 9. GET ALL ANNOUNCEMENTS
-- =========================================================
--
-- Admin / Developer.
-- Menampilkan draft, published, archived.
-- =========================================================

create or replace function public.get_all_announcements()
returns setof public.announcements
language sql
stable
security definer
set search_path = public
as $$
    select a.*
    from public.announcements a

    where public.can_manage_announcements()

    order by
        case
            when a.status = 'published' then 1
            when a.status = 'draft' then 2
            when a.status = 'archived' then 3
        end,

        a.is_pinned desc,
        a.created_at desc;
$$;


-- =========================================================
-- 10. CREATE ANNOUNCEMENT
-- =========================================================

create or replace function public.create_announcement(
    announcement_title text,
    announcement_content text,
    announcement_status public.announcement_status default 'draft',
    announcement_important boolean default false,
    announcement_pinned boolean default false,
    announcement_publish_at timestamptz default null,
    announcement_expires_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    new_announcement_id uuid;
begin

    -- -----------------------------------------------------
    -- ACCESS
    -- -----------------------------------------------------

    if not public.can_manage_announcements() then
        raise exception
            'Anda tidak memiliki izin mengelola pengumuman.';
    end if;


    -- -----------------------------------------------------
    -- INSERT
    -- -----------------------------------------------------

    insert into public.announcements (
        title,
        content,
        status,
        is_important,
        is_pinned,
        publish_at,
        expires_at,
        created_by,
        updated_by
    )
    values (
        trim(announcement_title),
        trim(announcement_content),
        announcement_status,
        announcement_important,
        announcement_pinned,
        announcement_publish_at,
        announcement_expires_at,
        auth.uid(),
        auth.uid()
    )

    returning id
    into new_announcement_id;


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

        'announcement_create',

        'announcement_create',

        'Membuat pengumuman baru.',

        'announcement',

        new_announcement_id,

        'success',

        jsonb_build_object(
            'title',
            announcement_title,

            'status',
            announcement_status,

            'important',
            announcement_important,

            'pinned',
            announcement_pinned
        )
    );


    return new_announcement_id;

end;
$$;


-- =========================================================
-- 11. UPDATE ANNOUNCEMENT
-- =========================================================

create or replace function public.update_announcement(
    announcement_id uuid,
    announcement_title text,
    announcement_content text,
    announcement_status public.announcement_status,
    announcement_important boolean,
    announcement_pinned boolean,
    announcement_publish_at timestamptz,
    announcement_expires_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin

    -- -----------------------------------------------------
    -- ACCESS
    -- -----------------------------------------------------

    if not public.can_manage_announcements() then
        raise exception
            'Anda tidak memiliki izin mengelola pengumuman.';
    end if;


    -- -----------------------------------------------------
    -- UPDATE
    -- -----------------------------------------------------

    update public.announcements
    set

        title =
            trim(announcement_title),

        content =
            trim(announcement_content),

        status =
            announcement_status,

        is_important =
            announcement_important,

        is_pinned =
            announcement_pinned,

        publish_at =
            announcement_publish_at,

        expires_at =
            announcement_expires_at,

        updated_by =
            auth.uid()

    where id = announcement_id;


    if not found then
        return false;
    end if;


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

        'announcement_update',

        'announcement_update',

        'Mengubah pengumuman.',

        'announcement',

        announcement_id,

        'info',

        jsonb_build_object(
            'title',
            announcement_title,

            'status',
            announcement_status
        )
    );


    return true;

end;
$$;


-- =========================================================
-- 12. PUBLISH ANNOUNCEMENT
-- =========================================================

create or replace function public.publish_announcement(
    announcement_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin

    if not public.can_manage_announcements() then
        raise exception
            'Tidak memiliki izin.';
    end if;


    update public.announcements
    set
        status = 'published',

        publish_at = coalesce(
            publish_at,
            timezone('utc', now())
        ),

        updated_by = auth.uid()

    where id = announcement_id;


    if not found then
        return false;
    end if;


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

        'announcement_update',

        'announcement_update',

        'Mempublikasikan pengumuman.',

        'announcement',

        announcement_id,

        'success'
    );


    return true;

end;
$$;


-- =========================================================
-- 13. UNPUBLISH ANNOUNCEMENT
-- =========================================================

create or replace function public.unpublish_announcement(
    announcement_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin

    if not public.can_manage_announcements() then
        raise exception
            'Tidak memiliki izin.';
    end if;


    update public.announcements
    set
        status = 'draft',
        updated_by = auth.uid()

    where id = announcement_id;


    if not found then
        return false;
    end if;


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

        'announcement_update',

        'announcement_update',

        'Menyembunyikan pengumuman dari publik.',

        'announcement',

        announcement_id,

        'warning'
    );


    return true;

end;
$$;


-- =========================================================
-- 14. ARCHIVE ANNOUNCEMENT
-- =========================================================

create or replace function public.archive_announcement(
    announcement_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin

    if not public.can_manage_announcements() then
        raise exception
            'Tidak memiliki izin.';
    end if;


    update public.announcements
    set
        status = 'archived',
        updated_by = auth.uid()

    where id = announcement_id;


    if not found then
        return false;
    end if;


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

        'announcement_update',

        'announcement_update',

        'Mengarsipkan pengumuman.',

        'announcement',

        announcement_id,

        'info'
    );


    return true;

end;
$$;


-- =========================================================
-- 15. DELETE ANNOUNCEMENT
-- =========================================================

create or replace function public.delete_announcement(
    announcement_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    old_title text;
begin

    if not public.can_manage_announcements() then
        raise exception
            'Tidak memiliki izin menghapus pengumuman.';
    end if;


    select title
    into old_title
    from public.announcements
    where id = announcement_id;


    if old_title is null then
        return false;
    end if;


    delete from public.announcements
    where id = announcement_id;


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

        'announcement_delete',

        'announcement_delete',

        'Menghapus pengumuman.',

        'announcement',

        announcement_id,

        'danger',

        jsonb_build_object(
            'deleted_title',
            old_title
        )
    );


    return true;

end;
$$;


-- =========================================================
-- 16. RECORD ANNOUNCEMENT VIEW
-- =========================================================
--
-- Dipanggil ketika user membuka detail announcement.
--
-- Tidak menyimpan history jika user belum login.
-- =========================================================

create or replace function public.record_announcement_view(
    announcement_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin

    if auth.uid() is null then
        return false;
    end if;


    if not exists (
        select 1
        from public.announcements
        where id = announcement_id
        and status = 'published'
    ) then
        return false;
    end if;


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

        'announcement_view',

        'announcement_view',

        'Membuka pengumuman.',

        'announcement',

        announcement_id,

        'info'
    );


    return true;

end;
$$;


-- =========================================================
-- 17. RLS
-- =========================================================

alter table public.announcements
enable row level security;


-- =========================================================
-- 18. REMOVE OLD POLICIES
-- =========================================================

drop policy if exists "announcements_public_read"
on public.announcements;

drop policy if exists "announcements_admin_read"
on public.announcements;

drop policy if exists "announcements_admin_insert"
on public.announcements;

drop policy if exists "announcements_admin_update"
on public.announcements;

drop policy if exists "announcements_admin_delete"
on public.announcements;


-- =========================================================
-- 19. PUBLIC READ POLICY
-- =========================================================
--
-- Hanya published + tanggal aktif.
-- =========================================================

create policy "announcements_public_read"
on public.announcements
for select
to anon, authenticated
using (

    status = 'published'

    and (
        publish_at is null
        or publish_at <= timezone('utc', now())
    )

    and (
        expires_at is null
        or expires_at > timezone('utc', now())
    )

);


-- =========================================================
-- 20. ADMIN / DEVELOPER READ POLICY
-- =========================================================
--
-- Admin dan Developer dapat melihat draft dan archived.
-- =========================================================

create policy "announcements_management_read"
on public.announcements
for select
to authenticated
using (
    public.can_manage_announcements()
);


-- =========================================================
-- 21. DIRECT INSERT POLICY
-- =========================================================
--
-- Insert dilakukan melalui create_announcement().
-- =========================================================


-- =========================================================
-- 22. DIRECT UPDATE POLICY
-- =========================================================
--
-- Update dilakukan melalui function.
-- =========================================================


-- =========================================================
-- 23. DIRECT DELETE POLICY
-- =========================================================
--
-- Delete dilakukan melalui delete_announcement().
-- =========================================================


-- =========================================================
-- 24. FUNCTION PRIVILEGES
-- =========================================================

revoke all on function public.can_manage_announcements()
from public;


revoke all on function public.get_public_announcements()
from public;


revoke all on function public.get_public_announcement(uuid)
from public;


revoke all on function public.get_all_announcements()
from public;


revoke all on function public.create_announcement(
    text,
    text,
    public.announcement_status,
    boolean,
    boolean,
    timestamptz,
    timestamptz
)
from public;


revoke all on function public.update_announcement(
    uuid,
    text,
    text,
    public.announcement_status,
    boolean,
    boolean,
    timestamptz,
    timestamptz
)
from public;


revoke all on function public.publish_announcement(uuid)
from public;


revoke all on function public.unpublish_announcement(uuid)
from public;


revoke all on function public.archive_announcement(uuid)
from public;


revoke all on function public.delete_announcement(uuid)
from public;


revoke all on function public.record_announcement_view(uuid)
from public;


-- =========================================================
-- 25. GRANT
-- =========================================================

grant execute on function public.can_manage_announcements()
to authenticated;


grant execute on function public.get_public_announcements()
to anon, authenticated;


grant execute on function public.get_public_announcement(uuid)
to anon, authenticated;


grant execute on function public.get_all_announcements()
to authenticated;


grant execute on function public.create_announcement(
    text,
    text,
    public.announcement_status,
    boolean,
    boolean,
    timestamptz,
    timestamptz
)
to authenticated;


grant execute on function public.update_announcement(
    uuid,
    text,
    text,
    public.announcement_status,
    boolean,
    boolean,
    timestamptz,
    timestamptz
)
to authenticated;


grant execute on function public.publish_announcement(uuid)
to authenticated;


grant execute on function public.unpublish_announcement(uuid)
to authenticated;


grant execute on function public.archive_announcement(uuid)
to authenticated;


grant execute on function public.delete_announcement(uuid)
to authenticated;


grant execute on function public.record_announcement_view(uuid)
to authenticated;


-- =========================================================
-- 26. COMMENTS
-- =========================================================

comment on table public.announcements is
'Announcement system for MI Al-Maarif Nusantara digital library.';

comment on column public.announcements.status is
'Announcement state: draft, published, or archived.';

comment on column public.announcements.is_important is
'Marks an announcement as important.';

comment on column public.announcements.is_pinned is
'Pins announcement to the top of the announcement list.';

comment on column public.announcements.publish_at is
'Optional scheduled publication time.';

comment on column public.announcements.expires_at is
'Optional time when announcement stops being publicly visible.';


-- =========================================================
-- END OF MIGRATION 006
-- =========================================================
