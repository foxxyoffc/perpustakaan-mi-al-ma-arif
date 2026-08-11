-- =========================================================
-- MI AL-MA'ARIF NUSANTARA
-- DIGITAL LIBRARY
--
-- Migration: 005_history.sql
--
-- HISTORY / ACTIVITY LOG SYSTEM
--
-- USER
--   -> hanya melihat history pribadi
--
-- ADMIN
--   -> melihat history USER
--   -> tidak melihat history ADMIN / DEVELOPER
--
-- DEVELOPER
--   -> melihat history USER
--   -> melihat history ADMIN
--   -> dapat melihat history DEVELOPER
--
-- History bersifat append-only.
-- User tidak dapat mengubah / menghapus history.
-- =========================================================


-- =========================================================
-- 1. HISTORY ACTION TYPE
-- =========================================================

do $$
begin

    create type public.history_action as enum (

        -- AUTH
        'login',
        'logout',
        'login_failed',
        'password_change',
        'password_reset',
        'profile_update',

        -- ACCOUNT
        'account_create',
        'account_update',
        'account_approve',
        'account_reject',
        'account_suspend',
        'account_activate',
        'account_delete',

        -- BOOK
        'book_view',
        'book_download',
        'book_create',
        'book_update',
        'book_delete',
        'book_download_permission_update',

        -- REPORT
        'report_create',
        'report_update',

        -- ANNOUNCEMENT
        'announcement_view',
        'announcement_create',
        'announcement_update',
        'announcement_delete',

        -- ADMIN
        'admin_create',
        'admin_update',
        'admin_delete',

        -- SETTINGS
        'settings_update',

        -- SYSTEM
        'security_event',
        'system_event',

        -- OTHER
        'request_create',
        'contact_click',
        'unknown'
    );

exception
    when duplicate_object then null;

end $$;


-- =========================================================
-- 2. ADD COLUMNS TO HISTORY
-- =========================================================

alter table public.history
add column if not exists action_type public.history_action;


-- =========================================================
-- 3. MIGRATION FOR OLD ACTION COLUMN
-- =========================================================
-- Jika migration sebelumnya sudah memiliki kolom "action"
-- berupa text, nilai tersebut akan dipindahkan ke action_type.
--
-- Kolom action lama tetap dipertahankan agar kompatibel
-- dengan kode lama.
-- =========================================================

update public.history
set action_type =
    case

        when action = 'login'
            then 'login'::public.history_action

        when action = 'logout'
            then 'logout'::public.history_action

        when action = 'login_failed'
            then 'login_failed'::public.history_action

        when action = 'password_change'
            then 'password_change'::public.history_action

        when action = 'password_reset'
            then 'password_reset'::public.history_action

        when action = 'profile_update'
            then 'profile_update'::public.history_action

        when action = 'account_create'
            then 'account_create'::public.history_action

        when action = 'account_update'
            then 'account_update'::public.history_action

        when action = 'account_approve'
            then 'account_approve'::public.history_action

        when action = 'account_reject'
            then 'account_reject'::public.history_action

        when action = 'account_suspend'
            then 'account_suspend'::public.history_action

        when action = 'account_activate'
            then 'account_activate'::public.history_action

        when action = 'account_delete'
            then 'account_delete'::public.history_action

        when action = 'book_view'
            then 'book_view'::public.history_action

        when action = 'book_download'
            then 'book_download'::public.history_action

        when action = 'book_create'
            then 'book_create'::public.history_action

        when action = 'book_update'
            then 'book_update'::public.history_action

        when action = 'book_delete'
            then 'book_delete'::public.history_action

        when action = 'book_download_permission_update'
            then 'book_download_permission_update'::public.history_action

        when action = 'report_create'
            then 'report_create'::public.history_action

        when action = 'report_update'
            then 'report_update'::public.history_action

        when action = 'announcement_view'
            then 'announcement_view'::public.history_action

        when action = 'announcement_create'
            then 'announcement_create'::public.history_action

        when action = 'announcement_update'
            then 'announcement_update'::public.history_action

        when action = 'announcement_delete'
            then 'announcement_delete'::public.history_action

        when action = 'admin_create'
            then 'admin_create'::public.history_action

        when action = 'admin_update'
            then 'admin_update'::public.history_action

        when action = 'admin_delete'
            then 'admin_delete'::public.history_action

        when action = 'settings_update'
            then 'settings_update'::public.history_action

        when action = 'security_event'
            then 'security_event'::public.history_action

        when action = 'system_event'
            then 'system_event'::public.history_action

        when action = 'request_create'
            then 'request_create'::public.history_action

        when action = 'contact_click'
            then 'contact_click'::public.history_action

        else 'unknown'::public.history_action

    end
where action_type is null;


-- =========================================================
-- 4. MAKE ACTION TYPE DEFAULT
-- =========================================================

alter table public.history
alter column action_type
set default 'system_event'::public.history_action;


-- =========================================================
-- 5. ADD ACTOR ROLE
-- =========================================================
-- Role user ketika aktivitas dilakukan.
--
-- Penting karena role account dapat berubah.
-- =========================================================

alter table public.history
add column if not exists actor_role public.user_role;


-- =========================================================
-- 6. ADD TARGET INFORMATION
-- =========================================================

alter table public.history
add column if not exists target_type text;

alter table public.history
add column if not exists target_id uuid;


-- =========================================================
-- 7. ADD REQUEST INFORMATION
-- =========================================================

alter table public.history
add column if not exists ip_address inet;

alter table public.history
add column if not exists user_agent text;

alter table public.history
add column if not exists session_id text;


-- =========================================================
-- 8. ADD SEVERITY
-- =========================================================

do $$
begin

    create type public.history_severity as enum (
        'info',
        'success',
        'warning',
        'danger'
    );

exception
    when duplicate_object then null;

end $$;


alter table public.history
add column if not exists severity public.history_severity
not null default 'info';


-- =========================================================
-- 9. ADD METADATA
-- =========================================================

alter table public.history
add column if not exists metadata jsonb
not null default '{}'::jsonb;


-- =========================================================
-- 10. INDEXES
-- =========================================================

create index if not exists history_user_id_idx
on public.history(user_id);


create index if not exists history_action_type_idx
on public.history(action_type);


create index if not exists history_actor_role_idx
on public.history(actor_role);


create index if not exists history_target_idx
on public.history(
    target_type,
    target_id
);


create index if not exists history_created_at_idx
on public.history(created_at desc);


create index if not exists history_severity_idx
on public.history(severity);


-- =========================================================
-- 11. AUTOMATIC ACTOR ROLE
-- =========================================================
-- Ketika history dibuat, role user diambil dari profiles.
-- =========================================================

create or replace function public.set_history_actor_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    detected_role public.user_role;
begin

    if new.user_id is not null then

        select role
        into detected_role
        from public.profiles
        where id = new.user_id;

        if detected_role is not null then
            new.actor_role := detected_role;
        end if;

    end if;


    -- Jika action lama masih digunakan,
    -- sinkronkan action_type.
    if new.action_type is null then

        new.action_type :=
            case new.action

                when 'login'
                    then 'login'::public.history_action

                when 'logout'
                    then 'logout'::public.history_action

                when 'login_failed'
                    then 'login_failed'::public.history_action

                when 'password_change'
                    then 'password_change'::public.history_action

                when 'password_reset'
                    then 'password_reset'::public.history_action

                when 'profile_update'
                    then 'profile_update'::public.history_action

                when 'book_view'
                    then 'book_view'::public.history_action

                when 'book_download'
                    then 'book_download'::public.history_action

                when 'book_create'
                    then 'book_create'::public.history_action

                when 'book_update'
                    then 'book_update'::public.history_action

                when 'book_delete'
                    then 'book_delete'::public.history_action

                when 'book_download_permission_update'
                    then 'book_download_permission_update'::public.history_action

                when 'report_create'
                    then 'report_create'::public.history_action

                when 'report_update'
                    then 'report_update'::public.history_action

                when 'account_create'
                    then 'account_create'::public.history_action

                when 'account_update'
                    then 'account_update'::public.history_action

                when 'account_approve'
                    then 'account_approve'::public.history_action

                when 'account_reject'
                    then 'account_reject'::public.history_action

                when 'account_suspend'
                    then 'account_suspend'::public.history_action

                when 'account_activate'
                    then 'account_activate'::public.history_action

                when 'account_delete'
                    then 'account_delete'::public.history_action

                else
                    'system_event'::public.history_action

            end;

    end if;


    return new;

end;
$$;


drop trigger if exists set_history_actor_role_trigger
on public.history;


create trigger set_history_actor_role_trigger
before insert
on public.history
for each row
execute function public.set_history_actor_role();


-- =========================================================
-- 12. CREATE HISTORY HELPER
-- =========================================================
-- Digunakan API Next.js untuk mencatat aktivitas.
-- =========================================================

create or replace function public.create_history(
    history_action_value public.history_action,
    history_description text,
    history_target_type text default null,
    history_target_id uuid default null,
    history_severity_value public.history_severity default 'info',
    history_metadata jsonb default '{}'::jsonb,
    history_ip inet default null,
    history_user_agent text default null,
    history_session_id text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    new_history_id uuid;
begin

    if auth.uid() is null then
        raise exception
            'User belum login.';
    end if;


    insert into public.history (
        user_id,
        action,
        action_type,
        description,
        target_type,
        target_id,
        severity,
        metadata,
        ip_address,
        user_agent,
        session_id
    )
    values (
        auth.uid(),

        history_action_value::text,

        history_action_value,

        trim(history_description),

        history_target_type,

        history_target_id,

        history_severity_value,

        coalesce(history_metadata, '{}'::jsonb),

        history_ip,

        history_user_agent,

        history_session_id
    )
    returning id
    into new_history_id;


    return new_history_id;

end;
$$;


-- =========================================================
-- 13. GET MY HISTORY
-- =========================================================

create or replace function public.get_my_history(
    result_limit integer default 100,
    result_offset integer default 0
)
returns setof public.history
language sql
stable
security definer
set search_path = public
as $$
    select h.*
    from public.history h
    where h.user_id = auth.uid()

    order by h.created_at desc

    limit least(
        greatest(result_limit, 1),
        500
    )

    offset greatest(
        result_offset,
        0
    );
$$;


-- =========================================================
-- 14. GET USER HISTORY FOR ADMIN
-- =========================================================
--
-- Admin dapat melihat aktivitas USER.
--
-- Admin tidak mendapatkan:
--   ADMIN
--   DEVELOPER
--
-- Developer menggunakan function khusus di bawah.
-- =========================================================

create or replace function public.get_admin_history(
    result_limit integer default 200,
    result_offset integer default 0
)
returns setof public.history
language sql
stable
security definer
set search_path = public
as $$
    select h.*
    from public.history h
    where

        exists (
            select 1
            from public.profiles caller
            where caller.id = auth.uid()
            and caller.role = 'admin'
            and caller.status = 'active'
        )

        and h.actor_role = 'user'

    order by h.created_at desc

    limit least(
        greatest(result_limit, 1),
        500
    )

    offset greatest(
        result_offset,
        0
    );
$$;


-- =========================================================
-- 15. GET DEVELOPER HISTORY
-- =========================================================
--
-- Developer dapat melihat:
--
-- USER
-- ADMIN
-- DEVELOPER
--
-- Tidak dibatasi actor role.
-- =========================================================

create or replace function public.get_developer_history(
    result_limit integer default 500,
    result_offset integer default 0
)
returns setof public.history
language sql
stable
security definer
set search_path = public
as $$
    select h.*
    from public.history h
    where public.is_developer()

    order by h.created_at desc

    limit least(
        greatest(result_limit, 1),
        1000
    )

    offset greatest(
        result_offset,
        0
    );
$$;


-- =========================================================
-- 16. GET HISTORY BY USER
-- =========================================================
-- Khusus Developer.
-- Berguna untuk halaman monitoring detail seorang user/admin.
-- =========================================================

create or replace function public.get_history_by_user(
    target_user_id uuid,
    result_limit integer default 200,
    result_offset integer default 0
)
returns setof public.history
language sql
stable
security definer
set search_path = public
as $$
    select h.*
    from public.history h
    where
        public.is_developer()
        and h.user_id = target_user_id

    order by h.created_at desc

    limit least(
        greatest(result_limit, 1),
        500
    )

    offset greatest(
        result_offset,
        0
    );
$$;


-- =========================================================
-- 17. HISTORY SUMMARY
-- =========================================================
-- Statistik untuk dashboard Developer.
-- =========================================================

create or replace function public.get_history_summary(
    days_back integer default 30
)
returns table (
    action_type public.history_action,
    total bigint
)
language sql
stable
security definer
set search_path = public
as $$
    select
        h.action_type,
        count(*)::bigint as total

    from public.history h

    where
        public.is_developer()
        and h.created_at >= (
            timezone('utc', now())
            - make_interval(
                days => greatest(days_back, 1)
            )
        )

    group by
        h.action_type

    order by
        total desc;
$$;


-- =========================================================
-- 18. HISTORY DAILY ACTIVITY
-- =========================================================
-- Data grafik monitoring Developer.
-- =========================================================

create or replace function public.get_history_daily_activity(
    days_back integer default 30
)
returns table (
    activity_date date,
    total bigint
)
language sql
stable
security definer
set search_path = public
as $$
    select
        h.created_at::date as activity_date,
        count(*)::bigint as total

    from public.history h

    where
        public.is_developer()
        and h.created_at >= (
            timezone('utc', now())
            - make_interval(
                days => greatest(days_back, 1)
            )
        )

    group by
        h.created_at::date

    order by
        activity_date asc;
$$;


-- =========================================================
-- 19. HISTORY SECURITY EVENTS
-- =========================================================
-- Developer monitoring khusus event berbahaya.
-- =========================================================

create or replace function public.get_security_history(
    result_limit integer default 200,
    result_offset integer default 0
)
returns setof public.history
language sql
stable
security definer
set search_path = public
as $$
    select h.*
    from public.history h
    where
        public.is_developer()
        and (
            h.severity = 'danger'
            or h.severity = 'warning'
            or h.action_type in (
                'login_failed',
                'security_event'
            )
        )

    order by h.created_at desc

    limit least(
        greatest(result_limit, 1),
        500
    )

    offset greatest(
        result_offset,
        0
    );
$$;


-- =========================================================
-- 20. HISTORY RLS
-- =========================================================

alter table public.history
enable row level security;


-- =========================================================
-- 21. REMOVE OLD POLICIES
-- =========================================================

drop policy if exists "history_read_own"
on public.history;

drop policy if exists "history_admin_read"
on public.history;

drop policy if exists "history_developer_read"
on public.history;

drop policy if exists "history_insert_authenticated"
on public.history;

drop policy if exists "history_update"
on public.history;

drop policy if exists "history_delete"
on public.history;


-- =========================================================
-- 22. USER HISTORY POLICY
-- =========================================================
-- User hanya dapat melihat history miliknya.
-- =========================================================

create policy "history_user_read_own"
on public.history
for select
to authenticated
using (
    user_id = auth.uid()
);


-- =========================================================
-- 23. ADMIN HISTORY POLICY
-- =========================================================
-- Admin dapat melihat history USER.
-- =========================================================

create policy "history_admin_read_user"
on public.history
for select
to authenticated
using (
    exists (
        select 1
        from public.profiles caller
        where caller.id = auth.uid()
        and caller.role = 'admin'
        and caller.status = 'active'
    )

    and actor_role = 'user'
);


-- =========================================================
-- 24. DEVELOPER HISTORY POLICY
-- =========================================================
-- Developer dapat melihat seluruh history.
-- =========================================================

create policy "history_developer_read_all"
on public.history
for select
to authenticated
using (
    public.is_developer()
);


-- =========================================================
-- 25. DIRECT INSERT POLICY
-- =========================================================
-- Tidak diberikan.
--
-- History dibuat melalui:
--   create_history()
--
-- atau function internal server.
-- =========================================================


-- =========================================================
-- 26. DIRECT UPDATE POLICY
-- =========================================================
-- History immutable.
-- =========================================================


-- =========================================================
-- 27. DIRECT DELETE POLICY
-- =========================================================
-- History immutable.
-- =========================================================


-- =========================================================
-- 28. FUNCTION PRIVILEGES
-- =========================================================

revoke all on function public.create_history(
    public.history_action,
    text,
    text,
    uuid,
    public.history_severity,
    jsonb,
    inet,
    text,
    text
)
from public;


revoke all on function public.get_my_history(
    integer,
    integer
)
from public;


revoke all on function public.get_admin_history(
    integer,
    integer
)
from public;


revoke all on function public.get_developer_history(
    integer,
    integer
)
from public;


revoke all on function public.get_history_by_user(
    uuid,
    integer,
    integer
)
from public;


revoke all on function public.get_history_summary(
    integer
)
from public;


revoke all on function public.get_history_daily_activity(
    integer
)
from public;


revoke all on function public.get_security_history(
    integer,
    integer
)
from public;


grant execute on function public.create_history(
    public.history_action,
    text,
    text,
    uuid,
    public.history_severity,
    jsonb,
    inet,
    text,
    text
)
to authenticated;


grant execute on function public.get_my_history(
    integer,
    integer
)
to authenticated;


grant execute on function public.get_admin_history(
    integer,
    integer
)
to authenticated;


grant execute on function public.get_developer_history(
    integer,
    integer
)
to authenticated;


grant execute on function public.get_history_by_user(
    uuid,
    integer,
    integer
)
to authenticated;


grant execute on function public.get_history_summary(
    integer
)
to authenticated;


grant execute on function public.get_history_daily_activity(
    integer
)
to authenticated;


grant execute on function public.get_security_history(
    integer,
    integer
)
to authenticated;


-- =========================================================
-- 29. HISTORY COMMENTS
-- =========================================================

comment on table public.history is
'Immutable activity history for users, admins, developers and system events.';

comment on column public.history.action_type is
'Normalized activity type used for filtering and monitoring.';

comment on column public.history.actor_role is
'Role of the account that performed the action at the time of the event.';

comment on column public.history.ip_address is
'IP address associated with the activity when available.';

comment on column public.history.user_agent is
'Browser/device user-agent when available.';

comment on column public.history.session_id is
'Session identifier when available.';

comment on column public.history.metadata is
'Additional structured information about the activity.';


-- =========================================================
-- 30. IMPORTANT SECURITY NOTE
-- =========================================================
--
-- History sebaiknya TIDAK dihapus ketika akun user dihapus.
--
-- Karena history menggunakan user_id dan schema sebelumnya
-- diharapkan menggunakan ON DELETE SET NULL.
--
-- Dengan begitu Developer masih dapat melihat aktivitas
-- historis meskipun akun sudah tidak aktif.
-- =========================================================


-- =========================================================
-- END OF MIGRATION 005
-- =========================================================
