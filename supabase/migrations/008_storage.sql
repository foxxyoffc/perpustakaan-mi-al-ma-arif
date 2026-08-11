-- =========================================================
-- MI AL-MA'ARIF NUSANTARA
-- DIGITAL LIBRARY
--
-- Migration: 008_storage.sql
--
-- SUPABASE STORAGE CONFIGURATION
--
-- BUCKETS:
--
-- 1. book-pdfs
--    -> PRIVATE
--    -> file PDF buku
--
-- 2. book-covers
--    -> PUBLIC
--    -> cover/gambar buku
--
-- 3. home-backgrounds
--    -> PUBLIC
--    -> background halaman Home
--
-- 4. profile-avatars
--    -> PUBLIC
--    -> foto profil user
--
-- =========================================================
--
-- IMPORTANT:
--
-- PDF BUKU TIDAK dibuat public.
--
-- Akses PDF nanti melalui API/server:
--
-- User
--   ↓
-- API
--   ↓
-- cek login
--   ↓
-- cek buku
--   ↓
-- cek permission
--   ↓
-- buat signed URL
--   ↓
-- PDF dapat dibaca di browser
--
-- Download:
--
-- User
--   ↓
-- API
--   ↓
-- cek allow_download
--   ↓
-- jika TRUE -> signed URL download
-- jika FALSE -> ditolak
--
-- =========================================================


-- =========================================================
-- 1. CREATE STORAGE BUCKETS
-- =========================================================

-- ---------------------------------------------------------
-- BOOK PDF
-- PRIVATE
-- ---------------------------------------------------------

insert into storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
)

values (
    'book-pdfs',
    'book-pdfs',
    false,

    -- 100 MB per file
    104857600,

    array[
        'application/pdf'
    ]
)

on conflict (id)
do update set

    public =
        excluded.public,

    file_size_limit =
        excluded.file_size_limit,

    allowed_mime_types =
        excluded.allowed_mime_types;


-- ---------------------------------------------------------
-- BOOK COVERS
-- PUBLIC
-- ---------------------------------------------------------

insert into storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
)

values (
    'book-covers',
    'book-covers',
    true,

    -- 10 MB per image
    10485760,

    array[
        'image/jpeg',
        'image/png',
        'image/webp'
    ]
)

on conflict (id)
do update set

    public =
        excluded.public,

    file_size_limit =
        excluded.file_size_limit,

    allowed_mime_types =
        excluded.allowed_mime_types;


-- ---------------------------------------------------------
-- HOME BACKGROUNDS
-- PUBLIC
-- ---------------------------------------------------------

insert into storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
)

values (
    'home-backgrounds',
    'home-backgrounds',
    true,

    -- 15 MB per image
    15728640,

    array[
        'image/jpeg',
        'image/png',
        'image/webp'
    ]
)

on conflict (id)
do update set

    public =
        excluded.public,

    file_size_limit =
        excluded.file_size_limit,

    allowed_mime_types =
        excluded.allowed_mime_types;


-- ---------------------------------------------------------
-- PROFILE AVATARS
-- PUBLIC
-- ---------------------------------------------------------

insert into storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
)

values (
    'profile-avatars',
    'profile-avatars',
    true,

    -- 5 MB per image
    5242880,

    array[
        'image/jpeg',
        'image/png',
        'image/webp'
    ]
)

on conflict (id)
do update set

    public =
        excluded.public,

    file_size_limit =
        excluded.file_size_limit,

    allowed_mime_types =
        excluded.allowed_mime_types;


-- =========================================================
-- 2. HELPER FUNCTIONS
-- =========================================================


-- =========================================================
-- CHECK ADMIN / DEVELOPER
-- =========================================================

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
            and role in (
                'admin',
                'developer'
            )
            and status = 'active'
    );
$$;


-- =========================================================
-- CHECK DEVELOPER
-- =========================================================

create or replace function public.storage_is_developer()
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


-- =========================================================
-- 3. DROP OLD STORAGE POLICIES
-- =========================================================


-- ---------------------------------------------------------
-- BOOK PDF
-- ---------------------------------------------------------

drop policy if exists "book_pdfs_admin_upload"
on storage.objects;

drop policy if exists "book_pdfs_admin_delete"
on storage.objects;

drop policy if exists "book_pdfs_admin_update"
on storage.objects;

drop policy if exists "book_pdfs_no_direct_public_read"
on storage.objects;


-- ---------------------------------------------------------
-- BOOK COVERS
-- ---------------------------------------------------------

drop policy if exists "book_covers_public_read"
on storage.objects;

drop policy if exists "book_covers_admin_insert"
on storage.objects;

drop policy if exists "book_covers_admin_update"
on storage.objects;

drop policy if exists "book_covers_admin_delete"
on storage.objects;


-- ---------------------------------------------------------
-- HOME BACKGROUND
-- ---------------------------------------------------------

drop policy if exists "home_background_public_read"
on storage.objects;

drop policy if exists "home_background_developer_insert"
on storage.objects;

drop policy if exists "home_background_developer_update"
on storage.objects;

drop policy if exists "home_background_developer_delete"
on storage.objects;


-- ---------------------------------------------------------
-- PROFILE AVATAR
-- ---------------------------------------------------------

drop policy if exists "profile_avatars_public_read"
on storage.objects;

drop policy if exists "profile_avatars_user_insert"
on storage.objects;

drop policy if exists "profile_avatars_user_update"
on storage.objects;

drop policy if exists "profile_avatars_user_delete"
on storage.objects;


-- =========================================================
-- 4. BOOK PDF STORAGE POLICIES
-- =========================================================
--
-- BOOK PDF SENGAJA TIDAK MEMILIKI POLICY SELECT.
--
-- Artinya:
--
-- Browser user
--    X direct SELECT
--
-- User hanya mendapatkan signed URL dari backend
-- setelah backend memeriksa permission.
--
-- =========================================================


-- ---------------------------------------------------------
-- ADMIN / DEVELOPER UPLOAD PDF
-- ---------------------------------------------------------

create policy "book_pdfs_admin_upload"
on storage.objects
for insert
to authenticated
with check (

    bucket_id = 'book-pdfs'

    and public.is_admin_or_developer()

);


-- ---------------------------------------------------------
-- ADMIN / DEVELOPER UPDATE PDF
-- ---------------------------------------------------------

create policy "book_pdfs_admin_update"
on storage.objects
for update
to authenticated
using (

    bucket_id = 'book-pdfs'

    and public.is_admin_or_developer()

)
with check (

    bucket_id = 'book-pdfs'

    and public.is_admin_or_developer()

);


-- ---------------------------------------------------------
-- ADMIN / DEVELOPER DELETE PDF
-- ---------------------------------------------------------

create policy "book_pdfs_admin_delete"
on storage.objects
for delete
to authenticated
using (

    bucket_id = 'book-pdfs'

    and public.is_admin_or_developer()

);


-- =========================================================
-- 5. BOOK COVERS
-- =========================================================


-- ---------------------------------------------------------
-- PUBLIC READ
-- ---------------------------------------------------------

create policy "book_covers_public_read"
on storage.objects
for select
to anon, authenticated
using (

    bucket_id = 'book-covers'

);


-- ---------------------------------------------------------
-- ADMIN / DEVELOPER INSERT
-- ---------------------------------------------------------

create policy "book_covers_admin_insert"
on storage.objects
for insert
to authenticated
with check (

    bucket_id = 'book-covers'

    and public.is_admin_or_developer()

);


-- ---------------------------------------------------------
-- ADMIN / DEVELOPER UPDATE
-- ---------------------------------------------------------

create policy "book_covers_admin_update"
on storage.objects
for update
to authenticated
using (

    bucket_id = 'book-covers'

    and public.is_admin_or_developer()

)
with check (

    bucket_id = 'book-covers'

    and public.is_admin_or_developer()

);


-- ---------------------------------------------------------
-- ADMIN / DEVELOPER DELETE
-- ---------------------------------------------------------

create policy "book_covers_admin_delete"
on storage.objects
for delete
to authenticated
using (

    bucket_id = 'book-covers'

    and public.is_admin_or_developer()

);


-- =========================================================
-- 6. HOME BACKGROUND
-- =========================================================
--
-- Hanya Developer yang boleh mengubah background.
-- Public boleh melihat gambar.
-- =========================================================


-- ---------------------------------------------------------
-- PUBLIC READ
-- ---------------------------------------------------------

create policy "home_background_public_read"
on storage.objects
for select
to anon, authenticated
using (

    bucket_id = 'home-backgrounds'

);


-- ---------------------------------------------------------
-- DEVELOPER INSERT
-- ---------------------------------------------------------

create policy "home_background_developer_insert"
on storage.objects
for insert
to authenticated
with check (

    bucket_id = 'home-backgrounds'

    and public.storage_is_developer()

);


-- ---------------------------------------------------------
-- DEVELOPER UPDATE
-- ---------------------------------------------------------

create policy "home_background_developer_update"
on storage.objects
for update
to authenticated
using (

    bucket_id = 'home-backgrounds'

    and public.storage_is_developer()

)
with check (

    bucket_id = 'home-backgrounds'

    and public.storage_is_developer()

);


-- ---------------------------------------------------------
-- DEVELOPER DELETE
-- ---------------------------------------------------------

create policy "home_background_developer_delete"
on storage.objects
for delete
to authenticated
using (

    bucket_id = 'home-backgrounds'

    and public.storage_is_developer()

);


-- =========================================================
-- 7. PROFILE AVATARS
-- =========================================================
--
-- User dapat mengelola avatar miliknya sendiri.
--
-- Struktur path yang nanti digunakan:
--
-- profile-avatars/
--     USER_UUID/
--         avatar.webp
--
-- =========================================================


-- ---------------------------------------------------------
-- PUBLIC READ
-- ---------------------------------------------------------

create policy "profile_avatars_public_read"
on storage.objects
for select
to anon, authenticated
using (

    bucket_id = 'profile-avatars'

);


-- ---------------------------------------------------------
-- USER INSERT
-- ---------------------------------------------------------

create policy "profile_avatars_user_insert"
on storage.objects
for insert
to authenticated
with check (

    bucket_id = 'profile-avatars'

    and (
        (storage.foldername(name))[1]
        = auth.uid()::text
    )

);


-- ---------------------------------------------------------
-- USER UPDATE
-- ---------------------------------------------------------

create policy "profile_avatars_user_update"
on storage.objects
for update
to authenticated
using (

    bucket_id = 'profile-avatars'

    and (
        (storage.foldername(name))[1]
        = auth.uid()::text
    )

)
with check (

    bucket_id = 'profile-avatars'

    and (
        (storage.foldername(name))[1]
        = auth.uid()::text
    )

);


-- ---------------------------------------------------------
-- USER DELETE
-- ---------------------------------------------------------

create policy "profile_avatars_user_delete"
on storage.objects
for delete
to authenticated
using (

    bucket_id = 'profile-avatars'

    and (
        (storage.foldername(name))[1]
        = auth.uid()::text
    )

);


-- =========================================================
-- 8. STORAGE METADATA HELPER
-- =========================================================
--
-- Digunakan backend untuk mengecek object.
-- =========================================================

create or replace function public.storage_object_exists(
    target_bucket text,
    target_path text
)
returns boolean
language sql
stable
security definer
set search_path = public, storage
as $$
    select exists (
        select 1
        from storage.objects
        where
            bucket_id = target_bucket
            and name = target_path
    );
$$;


-- =========================================================
-- 9. GET STORAGE OBJECT
-- =========================================================

create or replace function public.get_storage_object(
    target_bucket text,
    target_path text
)
returns table (
    id uuid,
    bucket_id text,
    name text,
    mime_type text,
    size bigint,
    created_at timestamptz,
    updated_at timestamptz
)
language sql
stable
security definer
set search_path = public, storage
as $$
    select
        o.id,
        o.bucket_id,
        o.name,
        o.metadata ->> 'mimetype' as mime_type,
        coalesce(
            (o.metadata ->> 'size')::bigint,
            0
        ) as size,
        o.created_at,
        o.updated_at

    from storage.objects o

    where
        o.bucket_id = target_bucket
        and o.name = target_path

    limit 1;
$$;


-- =========================================================
-- 10. DELETE OBJECT SAFELY
-- =========================================================
--
-- Hanya Admin / Developer.
--
-- Dipakai backend ketika:
--   - buku dihapus
--   - PDF lama diganti
--   - cover lama diganti
--
-- =========================================================

create or replace function public.delete_storage_object(
    target_bucket text,
    target_path text
)
returns boolean
language plpgsql
security definer
set search_path = public, storage
as $$
begin

    if not public.is_admin_or_developer() then

        raise exception
            'Anda tidak memiliki izin menghapus file.';

    end if;


    delete from storage.objects

    where
        bucket_id = target_bucket
        and name = target_path;


    return found;

end;
$$;


-- =========================================================
-- 11. STORAGE FUNCTION PRIVILEGES
-- =========================================================

revoke all on function public.is_admin_or_developer()
from public;

revoke all on function public.storage_is_developer()
from public;

revoke all on function public.storage_object_exists(
    text,
    text
)
from public;

revoke all on function public.get_storage_object(
    text,
    text
)
from public;

revoke all on function public.delete_storage_object(
    text,
    text
)
from public;


-- =========================================================
-- 12. GRANT
-- =========================================================

grant execute
on function public.is_admin_or_developer()
to authenticated;


grant execute
on function public.storage_is_developer()
to authenticated;


grant execute
on function public.storage_object_exists(
    text,
    text
)
to authenticated;


grant execute
on function public.get_storage_object(
    text,
    text
)
to authenticated;


grant execute
on function public.delete_storage_object(
    text,
    text
)
to authenticated;


-- =========================================================
-- 13. COMMENTS
-- =========================================================

comment on function public.storage_object_exists(
    text,
    text
)
is
'Checks whether a storage object exists.';


comment on function public.get_storage_object(
    text,
    text
)
is
'Returns metadata for a storage object.';


comment on function public.delete_storage_object(
    text,
    text
)
is
'Deletes a storage object after verifying admin/developer access.';


-- =========================================================
-- END OF MIGRATION 008
-- =========================================================
