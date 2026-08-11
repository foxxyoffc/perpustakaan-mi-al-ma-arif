-- =========================================================
-- MI AL-MA'ARIF NUSANTARA
-- DIGITAL LIBRARY
--
-- Migration: 009_security.sql
--
-- SECURITY / LOGIN MONITORING
--
-- FEATURES
--
-- 1. Login attempt logging
-- 2. Failed login counter
-- 3. 5x failed login -> automatic security report
-- 4. Temporary account lock
-- 5. Successful login reset
-- 6. Suspicious activity logging
-- 7. Admin monitoring
-- 8. Developer monitoring
-- 9. Security event history
--
-- =========================================================


-- =========================================================
-- 1. SECURITY EVENT TYPE
-- =========================================================

do $$
begin

    create type public.security_event_type as enum (
        'login_success',
        'login_failed',
        'account_locked',
        'account_unlocked',
        'logout',
        'password_change',
        'password_reset_request',
        'password_reset_success',
        'suspicious_activity',
        'security_report'
    );

exception
    when duplicate_object then null;

end $$;


-- =========================================================
-- 2. LOGIN ATTEMPTS TABLE
-- =========================================================

create table if not exists public.login_attempts (

    id uuid primary key default gen_random_uuid(),

    -- -----------------------------------------------------
    -- USER
    -- -----------------------------------------------------

    user_id uuid
        references public.profiles(id)
        on delete set null,

    -- -----------------------------------------------------
    -- LOGIN INFORMATION
    -- -----------------------------------------------------

    username_attempted text,

    account_type text,

    success boolean
        not null default false,

    failure_reason text,

    -- -----------------------------------------------------
    -- NETWORK INFORMATION
    -- -----------------------------------------------------

    ip_address inet,

    user_agent text,

    -- -----------------------------------------------------
    -- TIMESTAMP
    -- -----------------------------------------------------

    attempted_at timestamptz
        not null default timezone('utc', now())

);


-- =========================================================
-- 3. LOGIN ATTEMPT INDEXES
-- =========================================================

create index if not exists login_attempts_user_idx
on public.login_attempts(user_id);


create index if not exists login_attempts_username_idx
on public.login_attempts(username_attempted);


create index if not exists login_attempts_success_idx
on public.login_attempts(success);


create index if not exists login_attempts_attempted_at_idx
on public.login_attempts(attempted_at desc);


create index if not exists login_attempts_ip_idx
on public.login_attempts(ip_address);


-- =========================================================
-- 4. SECURITY EVENTS
-- =========================================================

create table if not exists public.security_events (

    id uuid primary key default gen_random_uuid(),

    -- -----------------------------------------------------
    -- USER
    -- -----------------------------------------------------

    user_id uuid
        references public.profiles(id)
        on delete set null,

    -- -----------------------------------------------------
    -- EVENT
    -- -----------------------------------------------------

    event_type public.security_event_type
        not null,

    description text,

    severity text
        not null default 'info',

    -- -----------------------------------------------------
    -- TECHNICAL INFORMATION
    -- -----------------------------------------------------

    ip_address inet,

    user_agent text,

    metadata jsonb
        not null default '{}'::jsonb,

    -- -----------------------------------------------------
    -- TIMESTAMP
    -- -----------------------------------------------------

    created_at timestamptz
        not null default timezone('utc', now())

);


-- =========================================================
-- 5. SECURITY EVENT INDEXES
-- =========================================================

create index if not exists security_events_user_idx
on public.security_events(user_id);


create index if not exists security_events_type_idx
on public.security_events(event_type);


create index if not exists security_events_severity_idx
on public.security_events(severity);


create index if not exists security_events_created_idx
on public.security_events(created_at desc);


create index if not exists security_events_ip_idx
on public.security_events(ip_address);


-- =========================================================
-- 6. LOGIN SECURITY SETTINGS
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
    'security_max_login_attempts',
    '5',
    'developer',
    false,
    true,
    'Jumlah maksimum login gagal sebelum account dikunci.'
),

(
    'security_lock_minutes',
    '15',
    'developer',
    false,
    true,
    'Durasi lock account setelah mencapai batas login gagal.'
),

(
    'security_report_enabled',
    'true',
    'developer',
    false,
    true,
    'Membuat report otomatis setelah login gagal mencapai batas.'
)

on conflict (setting_key)
do nothing;


-- =========================================================
-- 7. GET SECURITY SETTING
-- =========================================================

create or replace function public.get_security_setting(
    target_key text,
    default_value integer
)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
    result_value integer;
begin

    select
        setting_value::integer

    into result_value

    from public.site_settings

    where
        setting_key = target_key
        and developer_only = true;


    if result_value is null then
        return default_value;
    end if;


    return result_value;

exception
    when others then
        return default_value;

end;
$$;


-- =========================================================
-- 8. CHECK ACCOUNT LOCK
-- =========================================================

create or replace function public.is_account_locked(
    target_user_id uuid
)
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
            id = target_user_id
            and (
                locked_until is not null
                and locked_until > timezone('utc', now())
            )
    );
$$;


-- =========================================================
-- 9. GET REMAINING LOCK TIME
-- =========================================================

create or replace function public.get_account_lock_seconds(
    target_user_id uuid
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
    select greatest(
        0,
        extract(
            epoch
            from (
                locked_until
                - timezone('utc', now())
            )
        )::integer
    )

    from public.profiles

    where id = target_user_id;
$$;


-- =========================================================
-- 10. RECORD FAILED LOGIN
-- =========================================================
--
-- DIPANGGIL BACKEND SETELAH LOGIN GAGAL.
--
-- Setelah 5 kali:
--
--   1. account dikunci
--   2. security event dibuat
--   3. report dibuat otomatis
--   4. history dibuat
--
-- =========================================================

create or replace function public.record_failed_login(
    target_user_id uuid,
    attempted_username text,
    target_account_type text default 'user',
    target_ip inet default null,
    target_user_agent text default null,
    target_failure_reason text default 'invalid_credentials'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare

    current_failed_attempts integer;

    maximum_attempts integer;

    lock_duration integer;

    should_lock boolean := false;

    security_report_enabled boolean;

    generated_report_id uuid;

    account_name text;

begin

    -- -----------------------------------------------------
    -- SECURITY SETTINGS
    -- -----------------------------------------------------

    maximum_attempts :=
        public.get_security_setting(
            'security_max_login_attempts',
            5
        );


    lock_duration :=
        public.get_security_setting(
            'security_lock_minutes',
            15
        );


    security_report_enabled :=
        coalesce(
            (
                select
                    setting_value = 'true'

                from public.site_settings

                where
                    setting_key =
                        'security_report_enabled'
            ),
            true
        );


    -- -----------------------------------------------------
    -- GET CURRENT FAILED ATTEMPTS
    -- -----------------------------------------------------

    select
        coalesce(failed_login_attempts, 0)

    into current_failed_attempts

    from public.profiles

    where id = target_user_id

    for update;


    current_failed_attempts :=
        coalesce(current_failed_attempts, 0) + 1;


    -- -----------------------------------------------------
    -- LOGIN ATTEMPT LOG
    -- -----------------------------------------------------

    insert into public.login_attempts (
        user_id,
        username_attempted,
        account_type,
        success,
        failure_reason,
        ip_address,
        user_agent
    )

    values (
        target_user_id,
        attempted_username,
        target_account_type,
        false,
        target_failure_reason,
        target_ip,
        target_user_agent
    );


    -- -----------------------------------------------------
    -- CHECK LIMIT
    -- -----------------------------------------------------

    if current_failed_attempts >= maximum_attempts then

        should_lock := true;

    end if;


    -- -----------------------------------------------------
    -- UPDATE PROFILE
    -- -----------------------------------------------------

    update public.profiles

    set

        failed_login_attempts =
            current_failed_attempts,

        locked_until =
            case
                when should_lock
                then timezone('utc', now())
                    + make_interval(
                        mins => lock_duration
                    )
                else locked_until
            end

    where id = target_user_id;


    -- -----------------------------------------------------
    -- SECURITY EVENT
    -- -----------------------------------------------------

    if should_lock then

        insert into public.security_events (
            user_id,
            event_type,
            description,
            severity,
            ip_address,
            user_agent,
            metadata
        )

        values (
            target_user_id,

            'account_locked',

            'Akun dikunci karena terlalu banyak percobaan login gagal.',

            'high',

            target_ip,

            target_user_agent,

            jsonb_build_object(
                'failed_attempts',
                current_failed_attempts,

                'maximum_attempts',
                maximum_attempts,

                'lock_minutes',
                lock_duration
            )
        );


        -- -------------------------------------------------
        -- HISTORY
        -- -------------------------------------------------

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
            target_user_id,

            'account_locked',

            'security',

            'Akun dikunci setelah terlalu banyak login gagal.',

            'security',

            target_user_id,

            'warning',

            jsonb_build_object(
                'failed_attempts',
                current_failed_attempts,

                'lock_minutes',
                lock_duration
            )
        );


        -- -------------------------------------------------
        -- AUTOMATIC REPORT
        -- -------------------------------------------------

        if security_report_enabled then

            account_name :=
                coalesce(
                    (
                        select full_name
                        from public.profiles
                        where id = target_user_id
                    ),
                    attempted_username
                );


            insert into public.reports (
                reporter_id,
                report_type,
                title,
                description,
                priority,
                status,
                metadata
            )

            values (
                null,

                'security',

                'Akun otomatis dikunci setelah 5x login gagal',

                'Sistem mendeteksi percobaan login gagal berulang dan secara otomatis mengunci akun.',

                'high',

                'open',

                jsonb_build_object(
                    'user_id',
                    target_user_id,

                    'username',
                    attempted_username,

                    'account_type',
                    target_account_type,

                    'account_name',
                    account_name,

                    'failed_attempts',
                    current_failed_attempts,

                    'ip_address',
                    target_ip,

                    'user_agent',
                    target_user_agent
                )
            )

            returning id
            into generated_report_id;


            insert into public.security_events (
                user_id,
                event_type,
                description,
                severity,
                ip_address,
                user_agent,
                metadata
            )

            values (
                target_user_id,

                'security_report',

                'Security report otomatis dibuat karena percobaan login gagal mencapai batas.',

                'high',

                target_ip,

                target_user_agent,

                jsonb_build_object(
                    'report_id',
                    generated_report_id,

                    'failed_attempts',
                    current_failed_attempts
                )
            );

        end if;


    else

        -- -------------------------------------------------
        -- NORMAL FAILED LOGIN
        -- -------------------------------------------------

        insert into public.security_events (
            user_id,
            event_type,
            description,
            severity,
            ip_address,
            user_agent,
            metadata
        )

        values (
            target_user_id,

            'login_failed',

            'Percobaan login gagal.',

            'info',

            target_ip,

            target_user_agent,

            jsonb_build_object(
                'failed_attempts',
                current_failed_attempts,

                'remaining_attempts',
                greatest(
                    maximum_attempts
                    - current_failed_attempts,
                    0
                )
            )
        );

    end if;


    -- -----------------------------------------------------
    -- RESPONSE
    -- -----------------------------------------------------

    return jsonb_build_object(

        'success',
        true,

        'failed_attempts',
        current_failed_attempts,

        'maximum_attempts',
        maximum_attempts,

        'locked',
        should_lock,

        'lock_minutes',
        case
            when should_lock
            then lock_duration
            else 0
        end,

        'report_created',
        (
            generated_report_id is not null
        ),

        'report_id',
        generated_report_id

    );

end;
$$;


-- =========================================================
-- 11. RECORD SUCCESSFUL LOGIN
-- =========================================================
--
-- Dipanggil setelah login berhasil.
--
-- Counter gagal kembali menjadi 0.
-- Lock yang sudah expired dibersihkan.
--
-- =========================================================

create or replace function public.record_successful_login(
    target_user_id uuid,
    target_username text,
    target_account_type text default 'user',
    target_ip inet default null,
    target_user_agent text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin

    -- -----------------------------------------------------
    -- LOGIN LOG
    -- -----------------------------------------------------

    insert into public.login_attempts (
        user_id,
        username_attempted,
        account_type,
        success,
        failure_reason,
        ip_address,
        user_agent
    )

    values (
        target_user_id,
        target_username,
        target_account_type,
        true,
        null,
        target_ip,
        target_user_agent
    );


    -- -----------------------------------------------------
    -- RESET FAILED ATTEMPTS
    -- -----------------------------------------------------

    update public.profiles

    set

        failed_login_attempts = 0,

        locked_until =
            case
                when locked_until is not null
                     and locked_until <= timezone('utc', now())
                then null
                else locked_until
            end

    where id = target_user_id;


    -- -----------------------------------------------------
    -- SECURITY EVENT
    -- -----------------------------------------------------

    insert into public.security_events (
        user_id,
        event_type,
        description,
        severity,
        ip_address,
        user_agent
    )

    values (
        target_user_id,

        'login_success',

        'Login berhasil.',

        'info',

        target_ip,

        target_user_agent
    );


    return true;

end;
$$;


-- =========================================================
-- 12. RECORD LOGOUT
-- =========================================================

create or replace function public.record_logout(
    target_ip inet default null,
    target_user_agent text default null
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


    insert into public.security_events (
        user_id,
        event_type,
        description,
        severity,
        ip_address,
        user_agent
    )

    values (
        auth.uid(),

        'logout',

        'User melakukan logout.',

        'info',

        target_ip,

        target_user_agent
    );


    return true;

end;
$$;


-- =========================================================
-- 13. MANUALLY UNLOCK ACCOUNT
-- =========================================================
--
-- Admin / Developer.
--
-- Developer dapat unlock semua.
-- Admin dapat unlock user biasa.
--
-- Admin tidak dapat unlock akun developer/admin lain
-- melalui fungsi ini.
--
-- =========================================================

create or replace function public.unlock_account(
    target_user_id uuid
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

    -- -----------------------------------------------------
    -- CALLER ROLE
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
            'Anda tidak memiliki izin unlock akun.';

    end if;


    -- -----------------------------------------------------
    -- TARGET ROLE
    -- -----------------------------------------------------

    select role
    into target_role
    from public.profiles
    where id = target_user_id;


    if target_role is null then
        return false;
    end if;


    -- -----------------------------------------------------
    -- ADMIN PROTECTION
    -- -----------------------------------------------------

    if caller_role = 'admin'
       and target_role in (
           'admin',
           'developer'
       )
    then

        raise exception
            'Admin tidak dapat unlock akun admin/developer.';

    end if;


    -- -----------------------------------------------------
    -- UNLOCK
    -- -----------------------------------------------------

    update public.profiles

    set

        failed_login_attempts = 0,

        locked_until = null

    where id = target_user_id;


    -- -----------------------------------------------------
    -- SECURITY EVENT
    -- -----------------------------------------------------

    insert into public.security_events (
        user_id,
        event_type,
        description,
        severity,
        metadata
    )

    values (
        target_user_id,

        'account_unlocked',

        'Akun dibuka kembali oleh administrator.',

        'info',

        jsonb_build_object(
            'unlocked_by',
            auth.uid(),

            'unlocked_by_role',
            caller_role
        )
    );


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

        'account_unlocked',

        'security',

        'Membuka kembali akun user.',

        'user',

        target_user_id,

        'info',

        jsonb_build_object(
            'target_role',
            target_role
        )
    );


    return true;

end;
$$;


-- =========================================================
-- 14. SECURITY DASHBOARD
-- =========================================================
--
-- Khusus Developer.
--
-- Menampilkan ringkasan keamanan.
--
-- =========================================================

create or replace function public.get_security_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare

    total_failed bigint;

    total_success bigint;

    locked_accounts bigint;

    reports_created bigint;

    suspicious_events bigint;

begin

    if not public.is_developer() then

        raise exception
            'Security monitoring hanya dapat diakses developer.';

    end if;


    -- -----------------------------------------------------
    -- FAILED LOGIN 24 JAM
    -- -----------------------------------------------------

    select count(*)
    into total_failed

    from public.login_attempts

    where
        success = false
        and attempted_at >=
            timezone('utc', now())
            - interval '24 hours';


    -- -----------------------------------------------------
    -- SUCCESS LOGIN 24 JAM
    -- -----------------------------------------------------

    select count(*)
    into total_success

    from public.login_attempts

    where
        success = true
        and attempted_at >=
            timezone('utc', now())
            - interval '24 hours';


    -- -----------------------------------------------------
    -- LOCKED ACCOUNTS
    -- -----------------------------------------------------

    select count(*)
    into locked_accounts

    from public.profiles

    where
        locked_until is not null
        and locked_until >
            timezone('utc', now());


    -- -----------------------------------------------------
    -- SECURITY REPORT
    -- -----------------------------------------------------

    select count(*)
    into reports_created

    from public.reports

    where
        report_type = 'security'
        and created_at >=
            timezone('utc', now())
            - interval '24 hours';


    -- -----------------------------------------------------
    -- SUSPICIOUS EVENTS
    -- -----------------------------------------------------

    select count(*)
    into suspicious_events

    from public.security_events

    where
        event_type = 'suspicious_activity'
        and created_at >=
            timezone('utc', now())
            - interval '24 hours';


    return jsonb_build_object(

        'failed_logins_24h',
        total_failed,

        'successful_logins_24h',
        total_success,

        'locked_accounts',
        locked_accounts,

        'security_reports_24h',
        reports_created,

        'suspicious_events_24h',
        suspicious_events

    );

end;
$$;


-- =========================================================
-- 15. SECURITY EVENT LIST
-- =========================================================
--
-- Developer:
--   semua event
--
-- Admin:
--   event user biasa
--   tidak melihat event sesama admin/developer
--
-- =========================================================

create or replace function public.get_security_events(
    limit_count integer default 100
)
returns table (
    id uuid,
    user_id uuid,
    event_type public.security_event_type,
    description text,
    severity text,
    ip_address inet,
    user_agent text,
    metadata jsonb,
    created_at timestamptz,
    target_role public.user_role
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
            'Anda tidak memiliki izin melihat security events.';

    end if;


    return query

    select

        se.id,

        se.user_id,

        se.event_type,

        se.description,

        se.severity,

        se.ip_address,

        se.user_agent,

        se.metadata,

        se.created_at,

        p.role

    from public.security_events se

    left join public.profiles p
        on p.id = se.user_id

    where

        (
            caller_role = 'developer'

            or

            (
                caller_role = 'admin'

                and coalesce(
                    p.role,
                    'user'
                ) = 'user'
            )
        )

    order by
        se.created_at desc

    limit greatest(
        least(limit_count, 500),
        1
    );

end;
$$;


-- =========================================================
-- 16. LOGIN ATTEMPT MONITORING
-- =========================================================

create or replace function public.get_login_attempts(
    limit_count integer default 100
)
returns table (
    id uuid,
    user_id uuid,
    username_attempted text,
    account_type text,
    success boolean,
    failure_reason text,
    ip_address inet,
    user_agent text,
    attempted_at timestamptz,
    target_role public.user_role
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
            'Anda tidak memiliki izin.';

    end if;


    return query

    select

        la.id,

        la.user_id,

        la.username_attempted,

        la.account_type,

        la.success,

        la.failure_reason,

        la.ip_address,

        la.user_agent,

        la.attempted_at,

        p.role

    from public.login_attempts la

    left join public.profiles p
        on p.id = la.user_id

    where

        (
            caller_role = 'developer'

            or

            (
                caller_role = 'admin'

                and coalesce(
                    p.role,
                    'user'
                ) = 'user'
            )
        )

    order by
        la.attempted_at desc

    limit greatest(
        least(limit_count, 500),
        1
    );

end;
$$;


-- =========================================================
-- 17. RLS
-- =========================================================

alter table public.login_attempts
enable row level security;


alter table public.security_events
enable row level security;


-- =========================================================
-- 18. DROP OLD POLICIES
-- =========================================================

drop policy if exists "login_attempts_admin_read"
on public.login_attempts;

drop policy if exists "security_events_admin_read"
on public.security_events;


-- =========================================================
-- 19. LOGIN ATTEMPTS POLICY
-- =========================================================
--
-- Tidak ada direct SELECT untuk user.
--
-- Monitoring menggunakan RPC:
--   get_login_attempts()
--
-- =========================================================


-- =========================================================
-- 20. SECURITY EVENTS POLICY
-- =========================================================
--
-- Tidak ada direct SELECT untuk user.
--
-- Monitoring menggunakan RPC:
--   get_security_events()
--
-- =========================================================


-- =========================================================
-- 21. FUNCTION PRIVILEGES
-- =========================================================

revoke all on function public.get_security_setting(
    text,
    integer
)
from public;


revoke all on function public.is_account_locked(
    uuid
)
from public;


revoke all on function public.get_account_lock_seconds(
    uuid
)
from public;


revoke all on function public.record_failed_login(
    uuid,
    text,
    text,
    inet,
    text,
    text
)
from public;


revoke all on function public.record_successful_login(
    uuid,
    text,
    text,
    inet,
    text
)
from public;


revoke all on function public.record_logout(
    inet,
    text
)
from public;


revoke all on function public.unlock_account(
    uuid
)
from public;


revoke all on function public.get_security_dashboard()
from public;


revoke all on function public.get_security_events(
    integer
)
from public;


revoke all on function public.get_login_attempts(
    integer
)
from public;


-- =========================================================
-- 22. GRANT
-- =========================================================

grant execute on function public.get_security_setting(
    text,
    integer
)
to authenticated;


grant execute on function public.is_account_locked(
    uuid
)
to authenticated;


grant execute on function public.get_account_lock_seconds(
    uuid
)
to authenticated;


grant execute on function public.record_failed_login(
    uuid,
    text,
    text,
    inet,
    text,
    text
)
to authenticated;


grant execute on function public.record_successful_login(
    uuid,
    text,
    text,
    inet,
    text
)
to authenticated;


grant execute on function public.record_logout(
    inet,
    text
)
to authenticated;


grant execute on function public.unlock_account(
    uuid
)
to authenticated;


grant execute on function public.get_security_dashboard()
to authenticated;


grant execute on function public.get_security_events(
    integer
)
to authenticated;


grant execute on function public.get_login_attempts(
    integer
)
to authenticated;


-- =========================================================
-- 23. COMMENTS
-- =========================================================

comment on table public.login_attempts is
'Security log for authentication attempts.';

comment on table public.security_events is
'Security monitoring events for the digital library.';

comment on function public.record_failed_login(
    uuid,
    text,
    text,
    inet,
    text,
    text
)
is
'Records failed login attempts, locks account after configured threshold, and optionally creates automatic security report.';

comment on function public.record_successful_login(
    uuid,
    text,
    text,
    inet,
    text
)
is
'Records successful login and resets failed login counter.';

comment on function public.get_security_dashboard()
is
'Developer-only security monitoring dashboard summary.';


-- =========================================================
-- END OF MIGRATION 009
-- =========================================================
