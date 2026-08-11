-- =========================================================
-- MI AL-MA'ARIF NUSANTARA
-- DIGITAL LIBRARY
--
-- Migration: 004_reports.sql
--
-- REPORT / REQUEST SYSTEM
--
-- USER
--   └── membuat report
--   └── melihat report miliknya sendiri
--
-- ADMIN
--   └── melihat report dari USER
--   └── tidak melihat report internal ADMIN/DEVELOPER
--   └── menangani request/report user
--
-- DEVELOPER
--   └── melihat seluruh report
--   └── termasuk report ADMIN
--   └── termasuk report internal sistem
--
-- SECURITY
--   └── 5x login gagal -> automatic security report
-- =========================================================


-- =========================================================
-- 1. ADD REPORT SOURCE
-- =========================================================

do $$
begin
    create type public.report_source as enum (
        'user',
        'admin',
        'developer',
        'system'
    );
exception
    when duplicate_object then null;
end $$;


-- =========================================================
-- 2. ADD REPORT SOURCE COLUMN
-- =========================================================

alter table public.reports
add column if not exists source public.report_source
not null default 'user';


-- =========================================================
-- 3. ADD REPORT RESOLUTION INFORMATION
-- =========================================================

alter table public.reports
add column if not exists resolution_note text;

alter table public.reports
add column if not exists assigned_to uuid
references public.profiles(id)
on delete set null;


-- =========================================================
-- 4. ADD AUTOMATIC REPORT INFORMATION
-- =========================================================

alter table public.reports
add column if not exists is_automatic boolean
not null default false;


alter table public.reports
add column if not exists security_event boolean
not null default false;


-- =========================================================
-- 5. ADD REPORT ATTACHMENT
-- =========================================================
-- Attachment optional.
-- File nantinya disimpan di Supabase Storage.
-- =========================================================

alter table public.reports
add column if not exists attachment_path text;


-- =========================================================
-- 6. ADD REPORT METADATA
-- =========================================================

alter table public.reports
add column if not exists metadata jsonb
not null default '{}'::jsonb;


-- =========================================================
-- 7. INDEXES
-- =========================================================

create index if not exists reports_source_idx
on public.reports(source);


create index if not exists reports_priority_idx
on public.reports(priority);


create index if not exists reports_assigned_idx
on public.reports(assigned_to);


create index if not exists reports_automatic_idx
on public.reports(is_automatic);


create index if not exists reports_security_idx
on public.reports(security_event);


create index if not exists reports_type_status_idx
on public.reports(
    report_type,
    status
);


-- =========================================================
-- 8. VALIDATE REPORT
-- =========================================================

create or replace function public.validate_report()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin

    -- ---------------------------------------------
    -- TITLE
    -- ---------------------------------------------

    if new.title is null
       or length(trim(new.title)) < 3
    then
        raise exception
            'Judul laporan minimal 3 karakter.';
    end if;


    -- ---------------------------------------------
    -- DESCRIPTION
    -- ---------------------------------------------

    if new.description is null
       or length(trim(new.description)) < 5
    then
        raise exception
            'Deskripsi laporan terlalu pendek.';
    end if;


    -- ---------------------------------------------
    -- REPORTER
    -- ---------------------------------------------

    if new.reporter_id is null
       and new.source <> 'system'
    then
        raise exception
            'Laporan harus memiliki pengirim.';
    end if;


    -- ---------------------------------------------
    -- AUTOMATIC REPORT
    -- ---------------------------------------------

    if new.is_automatic = true then
        new.source := 'system';
    end if;


    return new;

end;
$$;


drop trigger if exists validate_report_trigger
on public.reports;

create trigger validate_report_trigger
before insert or update
on public.reports
for each row
execute function public.validate_report();


-- =========================================================
-- 9. DETERMINE REPORTER ROLE
-- =========================================================

create or replace function public.get_reporter_role(
    target_report_id uuid
)
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
    select p.role
    from public.reports r
    join public.profiles p
        on p.id = r.reporter_id
    where r.id = target_report_id
    limit 1;
$$;


-- =========================================================
-- 10. CAN VIEW REPORT
-- =========================================================
--
-- USER:
--   only own reports
--
-- ADMIN:
--   reports from normal users
--
-- DEVELOPER:
--   all reports
--
-- SYSTEM:
--   developer can see
--   admin can see system security reports
-- =========================================================

create or replace function public.can_view_report(
    target_report_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select
        case

            -- -----------------------------------------
            -- DEVELOPER
            -- -----------------------------------------

            when public.is_developer()
            then true


            -- -----------------------------------------
            -- OWNER
            -- -----------------------------------------

            when exists (
                select 1
                from public.reports r
                where r.id = target_report_id
                and r.reporter_id = auth.uid()
            )
            then true


            -- -----------------------------------------
            -- ADMIN
            -- -----------------------------------------
            -- Admin hanya melihat report USER biasa.
            -- Tidak melihat report ADMIN/DEVELOPER.
            -- -----------------------------------------

            when exists (
                select 1
                from public.reports r
                join public.profiles p
                    on p.id = r.reporter_id
                where r.id = target_report_id
                and p.role = 'user'
                and public.is_admin_or_developer()
            )
            then true


            -- -----------------------------------------
            -- SYSTEM SECURITY REPORT
            -- -----------------------------------------
            -- Admin boleh melihat automatic security report.
            -- -----------------------------------------

            when exists (
                select 1
                from public.reports r
                where r.id = target_report_id
                and r.source = 'system'
                and r.security_event = true
                and exists (
                    select 1
                    from public.profiles p
                    where p.id = auth.uid()
                    and p.role = 'admin'
                    and p.status = 'active'
                )
            )
            then true


            else false

        end;
$$;


-- =========================================================
-- 11. CREATE REPORT
-- =========================================================

create or replace function public.create_report(
    report_type_value public.report_type,
    report_title text,
    report_description text,
    report_priority_value public.report_priority default 'medium',
    related_book uuid default null,
    attachment text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    caller_role public.user_role;
    new_report_id uuid;
    report_source_value public.report_source;
begin

    -- ---------------------------------------------
    -- AUTH CHECK
    -- ---------------------------------------------

    if auth.uid() is null then
        raise exception
            'Anda harus login untuk mengirim laporan.';
    end if;


    -- ---------------------------------------------
    -- PROFILE
    -- ---------------------------------------------

    select role
    into caller_role
    from public.profiles
    where id = auth.uid()
    and status = 'active';


    if caller_role is null then
        raise exception
            'Akun belum aktif.';
    end if;


    -- ---------------------------------------------
    -- SOURCE
    -- ---------------------------------------------

    report_source_value :=
        case caller_role
            when 'user' then 'user'::public.report_source
            when 'admin' then 'admin'::public.report_source
            when 'developer' then 'developer'::public.report_source
        end;


    -- ---------------------------------------------
    -- INSERT
    -- ---------------------------------------------

    insert into public.reports (
        reporter_id,
        report_type,
        title,
        description,
        priority,
        status,
        related_book_id,
        attachment_path,
        source,
        is_automatic,
        security_event
    )
    values (
        auth.uid(),
        report_type_value,
        trim(report_title),
        trim(report_description),
        report_priority_value,
        'pending',
        related_book,
        attachment,
        report_source_value,
        false,
        false
    )
    returning id
    into new_report_id;


    -- ---------------------------------------------
    -- HISTORY
    -- ---------------------------------------------

    insert into public.history (
        user_id,
        action,
        description,
        target_type,
        target_id
    )
    values (
        auth.uid(),
        'report_create',
        'Membuat laporan.',
        'report',
        new_report_id
    );


    return new_report_id;

end;
$$;


-- =========================================================
-- 12. AUTOMATIC SECURITY REPORT
-- =========================================================
--
-- Dipanggil ketika login gagal ke-5.
--
-- Report otomatis masuk:
--
-- source = system
-- is_automatic = true
-- security_event = true
-- =========================================================

create or replace function public.create_security_report(
    target_user_id uuid default null,
    attempted_username text default null,
    login_type_value text default 'user',
    failed_attempts integer default 5,
    source_ip inet default null,
    source_user_agent text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    new_report_id uuid;
    target_name text;
begin

    -- ---------------------------------------------
    -- MINIMUM 5 ATTEMPTS
    -- ---------------------------------------------

    if failed_attempts < 5 then
        raise exception
            'Security report hanya dapat dibuat setelah minimal 5 percobaan gagal.';
    end if;


    -- ---------------------------------------------
    -- USER NAME
    -- ---------------------------------------------

    select full_name
    into target_name
    from public.profiles
    where id = target_user_id;


    -- ---------------------------------------------
    -- CREATE REPORT
    -- ---------------------------------------------

    insert into public.reports (
        reporter_id,
        report_type,
        title,
        description,
        priority,
        status,
        source,
        is_automatic,
        security_event,
        metadata
    )
    values (
        target_user_id,
        'security',
        'Peringatan keamanan: 5 kali login gagal',

        format(
            'Terdeteksi %s kali percobaan login gagal untuk akun/username "%s". Login type: %s.',
            failed_attempts,
            coalesce(attempted_username, '-'),
            login_type_value
        ),

        'high',
        'pending',
        'system',
        true,
        true,

        jsonb_build_object(
            'user_id',
            target_user_id,

            'username',
            attempted_username,

            'name',
            target_name,

            'login_type',
            login_type_value,

            'failed_attempts',
            failed_attempts,

            'ip_address',
            source_ip,

            'user_agent',
            source_user_agent,

            'created_automatically',
            true
        )
    )
    returning id
    into new_report_id;


    -- ---------------------------------------------
    -- MONITORING
    -- ---------------------------------------------

    insert into public.monitoring_logs (
        user_id,
        event_type,
        event_name,
        description,
        severity,
        metadata,
        ip_address,
        user_agent
    )
    values (
        target_user_id,
        'security',
        'login_failed_threshold',
        'Login gagal mencapai batas 5 kali dan security report dibuat.',
        'warning',

        jsonb_build_object(
            'report_id',
            new_report_id,

            'username',
            attempted_username,

            'login_type',
            login_type_value,

            'failed_attempts',
            failed_attempts
        ),

        source_ip,
        source_user_agent
    );


    return new_report_id;

end;
$$;


-- =========================================================
-- 13. UPDATE REPORT STATUS
-- =========================================================

create or replace function public.update_report_status(
    target_report_id uuid,
    new_status public.report_status,
    note text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    caller_role public.user_role;
begin

    -- ---------------------------------------------
    -- ROLE
    -- ---------------------------------------------

    select role
    into caller_role
    from public.profiles
    where id = auth.uid()
    and status = 'active';


    if caller_role not in (
        'admin',
        'developer'
    ) then
        raise exception
            'Hanya admin atau developer yang dapat memproses laporan.';
    end if;


    -- ---------------------------------------------
    -- ADMIN RESTRICTION
    -- ---------------------------------------------
    -- Admin hanya boleh menangani report USER.
    -- Developer bebas.
    -- ---------------------------------------------

    if caller_role = 'admin'
       and not exists (
           select 1
           from public.reports r
           join public.profiles p
               on p.id = r.reporter_id
           where r.id = target_report_id
           and (
               p.role = 'user'
               or r.source = 'system'
           )
       )
    then

        raise exception
            'Admin tidak memiliki akses terhadap laporan internal admin/developer.';

    end if;


    -- ---------------------------------------------
    -- UPDATE
    -- ---------------------------------------------

    update public.reports
    set
        status = new_status,

        resolution_note = case
            when note is null
                then resolution_note
            else trim(note)
        end,

        resolved_by = case
            when new_status in (
                'resolved',
                'rejected'
            )
            then auth.uid()
            else resolved_by
        end,

        resolved_at = case
            when new_status in (
                'resolved',
                'rejected'
            )
            then timezone('utc', now())
            else resolved_at
        end,

        updated_at = timezone('utc', now())

    where id = target_report_id;


    if found then

        insert into public.history (
            user_id,
            action,
            description,
            target_type,
            target_id,
            metadata
        )
        values (
            auth.uid(),
            'report_update',
            'Memperbarui status laporan.',
            'report',
            target_report_id,

            jsonb_build_object(
                'status',
                new_status,

                'note',
                note
            )
        );

        return true;

    end if;


    return false;

end;
$$;


-- =========================================================
-- 14. ASSIGN REPORT
-- =========================================================

create or replace function public.assign_report(
    target_report_id uuid,
    target_admin_id uuid
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

    -- ---------------------------------------------
    -- CALLER
    -- ---------------------------------------------

    select role
    into caller_role
    from public.profiles
    where id = auth.uid()
    and status = 'active';


    if caller_role not in (
        'admin',
        'developer'
    ) then

        raise exception
            'Tidak memiliki izin menugaskan laporan.';

    end if;


    -- ---------------------------------------------
    -- TARGET ADMIN
    -- ---------------------------------------------

    select role
    into target_role
    from public.profiles
    where id = target_admin_id
    and status = 'active';


    if target_role <> 'admin'
       and caller_role <> 'developer'
    then

        raise exception
            'Laporan hanya dapat ditugaskan kepada admin aktif.';

    end if;


    -- ---------------------------------------------
    -- ADMIN CANNOT ASSIGN INTERNAL REPORT
    -- ---------------------------------------------

    if caller_role = 'admin'
       and not exists (
           select 1
           from public.reports r
           join public.profiles p
               on p.id = r.reporter_id
           where r.id = target_report_id
           and (
               p.role = 'user'
               or r.source = 'system'
           )
       )
    then

        raise exception
            'Admin tidak dapat menangani laporan internal admin/developer.';

    end if;


    -- ---------------------------------------------
    -- UPDATE
    -- ---------------------------------------------

    update public.reports
    set
        assigned_to = target_admin_id,
        status = case
            when status = 'pending'
            then 'reviewing'
            else status
        end,
        updated_at = timezone('utc', now())
    where id = target_report_id;


    return found;

end;
$$;


-- =========================================================
-- 15. GET USER REPORTS
-- =========================================================

create or replace function public.get_my_reports()
returns setof public.reports
language sql
stable
security definer
set search_path = public
as $$
    select r.*
    from public.reports r
    where r.reporter_id = auth.uid()
    order by r.created_at desc;
$$;


-- =========================================================
-- 16. GET ADMIN REPORTS
-- =========================================================
-- Admin:
--   USER reports
--   SYSTEM security reports
--
-- Tidak:
--   ADMIN reports
--   DEVELOPER reports
-- =========================================================

create or replace function public.get_admin_reports()
returns setof public.reports
language sql
stable
security definer
set search_path = public
as $$
    select r.*
    from public.reports r
    left join public.profiles p
        on p.id = r.reporter_id

    where
        exists (
            select 1
            from public.profiles caller
            where caller.id = auth.uid()
            and caller.role = 'admin'
            and caller.status = 'active'
        )

        and (
            p.role = 'user'
            or r.source = 'system'
        )

    order by r.created_at desc;
$$;


-- =========================================================
-- 17. GET DEVELOPER REPORTS
-- =========================================================
-- Developer dapat melihat semuanya.
-- =========================================================

create or replace function public.get_developer_reports()
returns setof public.reports
language sql
stable
security definer
set search_path = public
as $$
    select r.*
    from public.reports r
    where public.is_developer()
    order by r.created_at desc;
$$;


-- =========================================================
-- 18. RLS
-- =========================================================

alter table public.reports
enable row level security;


-- =========================================================
-- 19. REMOVE OLD REPORT POLICIES
-- =========================================================

drop policy if exists "reports_create_authenticated"
on public.reports;

drop policy if exists "reports_read_own"
on public.reports;

drop policy if exists "reports_admin_read"
on public.reports;


-- =========================================================
-- 20. REPORT SELECT POLICY
-- =========================================================

create policy "reports_select_authorized"
on public.reports
for select
to authenticated
using (
    public.can_view_report(id)
);


-- =========================================================
-- 21. REPORT INSERT POLICY
-- =========================================================
-- Untuk insert normal, gunakan create_report().
--
-- Direct INSERT tetap dibatasi.
-- =========================================================

drop policy if exists "reports_direct_insert"
on public.reports;


-- =========================================================
-- 22. REPORT UPDATE POLICY
-- =========================================================
-- Update dilakukan melalui function.
-- =========================================================

drop policy if exists "reports_direct_update"
on public.reports;


-- =========================================================
-- 23. REPORT DELETE POLICY
-- =========================================================
-- Report tidak dapat dihapus user.
-- Developer dapat melakukan cleanup melalui server.
-- =========================================================

drop policy if exists "reports_direct_delete"
on public.reports;


-- =========================================================
-- 24. FUNCTION PRIVILEGES
-- =========================================================

revoke all on function public.create_report(
    public.report_type,
    text,
    text,
    public.report_priority,
    uuid,
    text
)
from public;


revoke all on function public.create_security_report(
    uuid,
    text,
    text,
    integer,
    inet,
    text
)
from public;


revoke all on function public.update_report_status(
    uuid,
    public.report_status,
    text
)
from public;


revoke all on function public.assign_report(
    uuid,
    uuid
)
from public;


revoke all on function public.get_my_reports()
from public;


revoke all on function public.get_admin_reports()
from public;


revoke all on function public.get_developer_reports()
from public;


grant execute on function public.create_report(
    public.report_type,
    text,
    text,
    public.report_priority,
    uuid,
    text
)
to authenticated;


grant execute on function public.create_security_report(
    uuid,
    text,
    text,
    integer,
    inet,
    text
)
to authenticated;


grant execute on function public.update_report_status(
    uuid,
    public.report_status,
    text
)
to authenticated;


grant execute on function public.assign_report(
    uuid,
    uuid
)
to authenticated;


grant execute on function public.get_my_reports()
to authenticated;


grant execute on function public.get_admin_reports()
to authenticated;


grant execute on function public.get_developer_reports()
to authenticated;


-- =========================================================
-- 25. REPORT COMMENTS
-- =========================================================

comment on table public.reports is
'Central report/request system for users, admins, developers and automatic security events.';

comment on column public.reports.source is
'Source of report: user, admin, developer, or system.';

comment on column public.reports.is_automatic is
'True when report is generated automatically by the system.';

comment on column public.reports.security_event is
'True when report represents a security event.';

comment on column public.reports.attachment_path is
'Private Supabase Storage path for optional report attachment.';


-- =========================================================
-- END OF MIGRATION 004
-- =========================================================
