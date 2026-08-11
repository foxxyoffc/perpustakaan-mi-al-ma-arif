-- =========================================================
-- MI AL-MA'ARIF NUSANTARA
-- DIGITAL LIBRARY
-- Migration: 002_auth_profiles.sql
--
-- PURPOSE:
-- 1. Memperkuat sistem profile/auth
-- 2. Approval user
-- 3. Helper function untuk role
-- 4. Keamanan perubahan role/status/username
-- 5. Utility untuk provisioning admin/developer
-- =========================================================

-- =========================================================
-- 1. EXTENSION
-- =========================================================

create extension if not exists "pgcrypto";


-- =========================================================
-- 2. NORMALIZE USERNAME
-- =========================================================
-- Username disimpan lowercase supaya:
--
-- Admin
-- ADMIN
-- Admin
--
-- tidak dianggap sebagai username berbeda.
-- =========================================================

create or replace function public.normalize_username(
    input_username text
)
returns text
language sql
immutable
as $$
    select lower(trim(input_username));
$$;


-- =========================================================
-- 3. VALIDATE USERNAME
-- =========================================================
-- Username:
-- - minimal 3 karakter
-- - maksimal 50 karakter
-- - hanya huruf, angka, titik, underscore, minus
-- =========================================================

create or replace function public.is_valid_username(
    input_username text
)
returns boolean
language sql
immutable
as $$
    select
        input_username is not null
        and length(trim(input_username)) between 3 and 50
        and trim(input_username) ~ '^[A-Za-z0-9._-]+$';
$$;


-- =========================================================
-- 4. PROFILE BEFORE INSERT / UPDATE
-- =========================================================
-- Fungsi ini:
-- - normalize username
-- - normalize email
-- - menjaga agar role/status tidak kosong
-- - memastikan kelas 1-6
-- =========================================================

create or replace function public.prepare_profile()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin

    if new.username is not null then
        new.username := public.normalize_username(new.username);
    end if;

    if new.email is not null then
        new.email := lower(trim(new.email));
    end if;

    if new.class_level is not null
       and (
           new.class_level < 1
           or new.class_level > 6
       )
    then
        raise exception 'Kelas harus berada antara 1 sampai 6.';
    end if;

    if new.role is null then
        new.role := 'user';
    end if;

    if new.status is null then
        new.status := 'pending';
    end if;

    return new;
end;
$$;


drop trigger if exists prepare_profile_before_write
on public.profiles;

create trigger prepare_profile_before_write
before insert or update
on public.profiles
for each row
execute function public.prepare_profile();


-- =========================================================
-- 5. PROTECT SENSITIVE PROFILE FIELDS
-- =========================================================
-- User biasa tidak boleh mengubah:
--
-- role
-- status
-- username
--
-- langsung dari client.
--
-- Perubahan tersebut harus melalui API server.
-- =========================================================

create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin

    -- Jika operasi berasal dari user biasa,
    -- field sensitif tidak boleh berubah.

    if auth.uid() is not null
       and not public.is_admin_or_developer()
    then

        if new.role is distinct from old.role then
            raise exception 'Anda tidak memiliki izin mengubah role.';
        end if;

        if new.status is distinct from old.status then
            raise exception 'Anda tidak memiliki izin mengubah status akun.';
        end if;

        if new.username is distinct from old.username then
            raise exception 'Anda tidak memiliki izin mengubah username.';
        end if;

    end if;

    return new;
end;
$$;


drop trigger if exists protect_profile_sensitive_fields
on public.profiles;

create trigger protect_profile_sensitive_fields
before update
on public.profiles
for each row
execute function public.protect_profile_fields();


-- =========================================================
-- 6. USER APPROVAL FUNCTION
-- =========================================================
-- Admin / Developer dapat menyetujui user.
--
-- pending -> active
--
-- Setelah active:
-- user dapat login / menggunakan perpustakaan.
-- =========================================================

create or replace function public.approve_user(
    target_user_id uuid
)
returns boolean
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

    if caller_role not in ('admin', 'developer') then
        raise exception 'Tidak memiliki izin untuk menyetujui user.';
    end if;

    update public.profiles
    set
        status = 'active',
        updated_at = timezone('utc', now())
    where id = target_user_id
      and role = 'user'
      and status = 'pending';

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
            'user_update',
            'Menyetujui pendaftaran user.',
            'profile',
            target_user_id,
            jsonb_build_object(
                'new_status',
                'active'
            )
        );

        return true;

    end if;

    return false;
end;
$$;


-- =========================================================
-- 7. REJECT USER FUNCTION
-- =========================================================

create or replace function public.reject_user(
    target_user_id uuid
)
returns boolean
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

    if caller_role not in ('admin', 'developer') then
        raise exception 'Tidak memiliki izin untuk menolak user.';
    end if;

    update public.profiles
    set
        status = 'rejected',
        updated_at = timezone('utc', now())
    where id = target_user_id
      and role = 'user'
      and status = 'pending';

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
            'user_update',
            'Menolak pendaftaran user.',
            'profile',
            target_user_id,
            jsonb_build_object(
                'new_status',
                'rejected'
            )
        );

        return true;

    end if;

    return false;
end;
$$;


-- =========================================================
-- 8. SUSPEND USER FUNCTION
-- =========================================================

create or replace function public.suspend_user(
    target_user_id uuid
)
returns boolean
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

    if caller_role not in ('admin', 'developer') then
        raise exception 'Tidak memiliki izin menangguhkan user.';
    end if;

    update public.profiles
    set
        status = 'suspended',
        updated_at = timezone('utc', now())
    where id = target_user_id
      and role = 'user';

    if found then

        insert into public.history (
            user_id,
            action,
            description,
            target_type,
            target_id
        )
        values (
            auth.uid(),
            'user_update',
            'Menangguhkan akun user.',
            'profile',
            target_user_id
        );

        return true;

    end if;

    return false;
end;
$$;


-- =========================================================
-- 9. REACTIVATE USER FUNCTION
-- =========================================================

create or replace function public.reactivate_user(
    target_user_id uuid
)
returns boolean
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

    if caller_role not in ('admin', 'developer') then
        raise exception 'Tidak memiliki izin mengaktifkan user.';
    end if;

    update public.profiles
    set
        status = 'active',
        updated_at = timezone('utc', now())
    where id = target_user_id
      and role = 'user'
      and status in ('suspended', 'rejected');

    if found then

        insert into public.history (
            user_id,
            action,
            description,
            target_type,
            target_id
        )
        values (
            auth.uid(),
            'user_update',
            'Mengaktifkan kembali akun user.',
            'profile',
            target_user_id
        );

        return true;

    end if;

    return false;
end;
$$;


-- =========================================================
-- 10. SET USERNAME FUNCTION
-- =========================================================
-- Hanya Admin / Developer.
-- =========================================================

create or replace function public.set_username(
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
    normalized_username text;
begin

    select role
    into caller_role
    from public.profiles
    where id = auth.uid()
      and status = 'active';

    if caller_role not in ('admin', 'developer') then
        raise exception 'Tidak memiliki izin mengubah username.';
    end if;

    normalized_username :=
        public.normalize_username(new_username);

    if not public.is_valid_username(normalized_username) then
        raise exception
            'Username hanya boleh berisi huruf, angka, titik, underscore, atau minus dan panjang 3-50 karakter.';
    end if;

    if exists (
        select 1
        from public.profiles
        where username = normalized_username
          and id <> target_user_id
    ) then
        raise exception 'Username sudah digunakan.';
    end if;

    update public.profiles
    set
        username = normalized_username,
        updated_at = timezone('utc', now())
    where id = target_user_id
      and role = 'user';

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
            'user_update',
            'Mengubah username user.',
            'profile',
            target_user_id,
            jsonb_build_object(
                'username',
                normalized_username
            )
        );

        return true;

    end if;

    return false;
end;
$$;


-- =========================================================
-- 11. GET CURRENT PROFILE
-- =========================================================
-- Utility untuk server-side.
-- =========================================================

create or replace function public.get_current_profile()
returns public.profiles
language sql
stable
security definer
set search_path = public
as $$
    select p.*
    from public.profiles p
    where p.id = auth.uid()
    limit 1;
$$;


-- =========================================================
-- 12. GET USER ROLE
-- =========================================================

create or replace function public.get_user_role(
    target_user_id uuid
)
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
    select role
    from public.profiles
    where id = target_user_id
    limit 1;
$$;


-- =========================================================
-- 13. CHECK USER ACTIVE
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
        where id = auth.uid()
        and status = 'active'
        and role in (
            'user',
            'admin',
            'developer'
        )
    );
$$;


-- =========================================================
-- 14. USER PROFILE UPDATE POLICY
-- =========================================================
-- User hanya boleh mengubah data pribadi tertentu.
--
-- role/status/username sudah dilindungi trigger.
-- =========================================================

drop policy if exists "profiles_update_personal_data"
on public.profiles;

create policy "profiles_update_personal_data"
on public.profiles
for update
to authenticated
using (
    id = auth.uid()
)
with check (
    id = auth.uid()
);


-- =========================================================
-- 15. PROFILE INSERT POLICY
-- =========================================================
-- Client tidak boleh membuat profile secara manual.
--
-- Profile dibuat melalui:
-- auth trigger
-- atau server-side provisioning.
-- =========================================================

drop policy if exists "profiles_no_client_insert"
on public.profiles;

-- Sengaja tidak memberikan INSERT policy.


-- =========================================================
-- 16. PROFILE DELETE POLICY
-- =========================================================
-- Client tidak boleh menghapus profile.
-- Penghapusan akun dilakukan server-side.
-- =========================================================

drop policy if exists "profiles_no_client_delete"
on public.profiles;

-- Sengaja tidak memberikan DELETE policy.


-- =========================================================
-- 17. SECURE FUNCTION EXECUTION
-- =========================================================
-- Fungsi SECURITY DEFINER harus memiliki search_path
-- yang aman.
-- =========================================================

alter function public.current_user_role()
set search_path = public;

alter function public.is_developer()
set search_path = public;

alter function public.is_admin_or_developer()
set search_path = public;

alter function public.is_active_user()
set search_path = public;

alter function public.approve_user(uuid)
set search_path = public;

alter function public.reject_user(uuid)
set search_path = public;

alter function public.suspend_user(uuid)
set search_path = public;

alter function public.reactivate_user(uuid)
set search_path = public;

alter function public.set_username(uuid, text)
set search_path = public;

alter function public.get_current_profile()
set search_path = public;

alter function public.get_user_role(uuid)
set search_path = public;

alter function public.can_access_library()
set search_path = public;


-- =========================================================
-- 18. FUNCTION PRIVILEGES
-- =========================================================

revoke all on function public.approve_user(uuid)
from public;

revoke all on function public.reject_user(uuid)
from public;

revoke all on function public.suspend_user(uuid)
from public;

revoke all on function public.reactivate_user(uuid)
from public;

revoke all on function public.set_username(uuid, text)
from public;


grant execute on function public.approve_user(uuid)
to authenticated;

grant execute on function public.reject_user(uuid)
to authenticated;

grant execute on function public.suspend_user(uuid)
to authenticated;

grant execute on function public.reactivate_user(uuid)
to authenticated;

grant execute on function public.set_username(uuid, text)
to authenticated;


-- =========================================================
-- 19. DEFAULT PROFILE DATA
-- =========================================================
-- Menjamin profile lama yang mungkin belum memiliki
-- status / role tetap valid.
-- =========================================================

update public.profiles
set role = 'user'
where role is null;


update public.profiles
set status = 'pending'
where status is null;


-- =========================================================
-- 20. COMMENTS
-- =========================================================

comment on function public.approve_user(uuid)
is 'Approve user registration. Only active admin/developer can execute.';

comment on function public.reject_user(uuid)
is 'Reject user registration. Only active admin/developer can execute.';

comment on function public.suspend_user(uuid)
is 'Suspend user account. Only active admin/developer can execute.';

comment on function public.reactivate_user(uuid)
is 'Reactivate user account. Only active admin/developer can execute.';

comment on function public.set_username(uuid, text)
is 'Change username of regular user. Only active admin/developer can execute.';

comment on column public.profiles.status
is 'Account approval state. Pending users cannot access the library.';


-- =========================================================
-- END OF MIGRATION 002
-- =========================================================
