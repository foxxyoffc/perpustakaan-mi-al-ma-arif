-- =========================================================
-- MI AL-MA'ARIF NUSANTARA
-- DIGITAL LIBRARY
--
-- Migration: 003_books.sql
--
-- BOOK SYSTEM
--
-- STUDENT BOOK
--   ├── GENERAL
--   └── PAI / RELIGION
--
-- TEACHER BOOK
--   ├── GRADE 1
--   ├── GRADE 2
--   ├── GRADE 3
--   ├── GRADE 4
--   ├── GRADE 5
--   └── GRADE 6
--
-- PDF:
--   READ ONLINE = YES
--   DOWNLOAD    = depends on download_allowed
-- =========================================================


-- =========================================================
-- 1. EXTRA BOOK STATUS
-- =========================================================

do $$
begin
    create type public.book_status as enum (
        'draft',
        'published',
        'archived'
    );
exception
    when duplicate_object then null;
end $$;


-- =========================================================
-- 2. ADD BOOK STATUS
-- =========================================================

alter table public.books
add column if not exists status public.book_status
not null default 'published';


-- =========================================================
-- 3. ADD BOOK DESCRIPTION / AUTHOR INFORMATION
-- =========================================================
-- Field tambahan supaya katalog lebih profesional.
-- Semua optional agar buku lama tetap kompatibel.
-- =========================================================

alter table public.books
add column if not exists author text;

alter table public.books
add column if not exists publisher text;

alter table public.books
add column if not exists publication_year smallint;

alter table public.books
add column if not exists isbn text;

alter table public.books
add column if not exists page_count integer;


-- =========================================================
-- 4. ADD SORT ORDER
-- =========================================================
-- Admin/developer dapat mengatur urutan buku.
-- =========================================================

alter table public.books
add column if not exists sort_order integer
not null default 0;


-- =========================================================
-- 5. ADD VIEW COUNT
-- =========================================================
-- Statistik jumlah buku dibaca.
-- Tidak digunakan sebagai pengganti history.
-- =========================================================

alter table public.books
add column if not exists view_count bigint
not null default 0;


-- =========================================================
-- 6. ADD DOWNLOAD COUNT
-- =========================================================

alter table public.books
add column if not exists download_count bigint
not null default 0;


-- =========================================================
-- 7. BOOK CONSTRAINTS
-- =========================================================

do $$
begin

    if not exists (
        select 1
        from pg_constraint
        where conname = 'books_publication_year_check'
    ) then

        alter table public.books
        add constraint books_publication_year_check
        check (
            publication_year is null
            or publication_year between 1000 and 2100
        );

    end if;


    if not exists (
        select 1
        from pg_constraint
        where conname = 'books_page_count_check'
    ) then

        alter table public.books
        add constraint books_page_count_check
        check (
            page_count is null
            or page_count > 0
        );

    end if;


    if not exists (
        select 1
        from pg_constraint
        where conname = 'books_sort_order_check'
    ) then

        alter table public.books
        add constraint books_sort_order_check
        check (
            sort_order >= 0
        );

    end if;


    if not exists (
        select 1
        from pg_constraint
        where conname = 'books_view_count_check'
    ) then

        alter table public.books
        add constraint books_view_count_check
        check (
            view_count >= 0
        );

    end if;


    if not exists (
        select 1
        from pg_constraint
        where conname = 'books_download_count_check'
    ) then

        alter table public.books
        add constraint books_download_count_check
        check (
            download_count >= 0
        );

    end if;

end $$;


-- =========================================================
-- 8. VALIDATE BOOK STRUCTURE
-- =========================================================
--
-- STUDENT:
--   student_category MUST be:
--      general
--      pai
--
--   grade MUST be NULL
--
-- TEACHER:
--   student_category MUST be NULL
--   grade MUST be 1-6
--
-- =========================================================

create or replace function public.validate_book_structure()
returns trigger
language plpgsql
set search_path = public
as $$
begin

    -- ---------------------------------------------
    -- STUDENT BOOK
    -- ---------------------------------------------

    if new.book_type = 'student' then

        if new.student_category is null then
            raise exception
                'Buku siswa harus memiliki kategori General atau PAI.';
        end if;

        if new.grade is not null then
            raise exception
                'Buku siswa tidak boleh memiliki grade kelas.';
        end if;

    end if;


    -- ---------------------------------------------
    -- TEACHER BOOK
    -- ---------------------------------------------

    if new.book_type = 'teacher' then

        if new.grade is null then
            raise exception
                'Buku guru harus memiliki kelas 1 sampai 6.';
        end if;

        if new.grade < 1 or new.grade > 6 then
            raise exception
                'Kelas buku guru hanya boleh 1 sampai 6.';
        end if;

        if new.student_category is not null then
            raise exception
                'Buku guru tidak boleh memiliki kategori buku siswa.';
        end if;

    end if;


    -- ---------------------------------------------
    -- TITLE
    -- ---------------------------------------------

    if new.title is null
       or length(trim(new.title)) < 1
    then
        raise exception
            'Judul buku wajib diisi.';
    end if;


    -- ---------------------------------------------
    -- PDF
    -- ---------------------------------------------

    if new.pdf_path is null
       or length(trim(new.pdf_path)) < 1
    then
        raise exception
            'File PDF buku wajib tersedia.';
    end if;


    -- ---------------------------------------------
    -- PDF MIME
    -- ---------------------------------------------

    if new.pdf_mime_type is null then
        new.pdf_mime_type := 'application/pdf';
    end if;


    -- ---------------------------------------------
    -- DOWNLOAD COUNT
    -- ---------------------------------------------

    if new.download_count < 0 then
        new.download_count := 0;
    end if;


    -- ---------------------------------------------
    -- VIEW COUNT
    -- ---------------------------------------------

    if new.view_count < 0 then
        new.view_count := 0;
    end if;


    return new;

end;
$$;


drop trigger if exists validate_book_structure_trigger
on public.books;

create trigger validate_book_structure_trigger
before insert or update
on public.books
for each row
execute function public.validate_book_structure();


-- =========================================================
-- 9. SEARCH INDEX
-- =========================================================

drop index if exists books_title_idx;

create index if not exists books_title_idx
on public.books
using gin (
    to_tsvector(
        'simple',
        coalesce(title, '')
        || ' '
        || coalesce(synopsis, '')
        || ' '
        || coalesce(author, '')
    )
);


-- =========================================================
-- 10. CATEGORY INDEXES
-- =========================================================

create index if not exists books_type_category_idx
on public.books (
    book_type,
    student_category
);


create index if not exists books_teacher_grade_idx
on public.books (
    book_type,
    grade
);


create index if not exists books_status_idx
on public.books (
    status
);


create index if not exists books_sort_order_idx
on public.books (
    sort_order,
    title
);


-- =========================================================
-- 11. BOOK READ FUNCTION
-- =========================================================
-- Dipanggil ketika user membuka PDF.
--
-- IMPORTANT:
-- Fungsi ini TIDAK memberikan URL PDF.
--
-- Server/API akan:
-- 1. cek user
-- 2. cek status user
-- 3. cek buku
-- 4. membuat signed URL singkat
-- 5. mengembalikan URL ke PDF viewer
--
-- Dengan begitu file tetap private.
-- =========================================================

create or replace function public.register_book_view(
    target_book_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    current_profile_id uuid;
    current_book_exists boolean;
begin

    current_profile_id := auth.uid();

    if current_profile_id is null then
        raise exception
            'Anda harus login untuk membaca buku.';
    end if;


    -- ---------------------------------------------
    -- CHECK ACTIVE USER
    -- ---------------------------------------------

    if not exists (
        select 1
        from public.profiles
        where id = current_profile_id
        and status = 'active'
        and role in (
            'user',
            'admin',
            'developer'
        )
    ) then

        raise exception
            'Akun belum aktif atau tidak memiliki akses.';
    end if;


    -- ---------------------------------------------
    -- CHECK BOOK
    -- ---------------------------------------------

    select exists (
        select 1
        from public.books
        where id = target_book_id
        and status = 'published'
    )
    into current_book_exists;


    if not current_book_exists then
        raise exception
            'Buku tidak ditemukan atau belum diterbitkan.';
    end if;


    -- ---------------------------------------------
    -- INCREASE VIEW COUNT
    -- ---------------------------------------------

    update public.books
    set
        view_count = view_count + 1,
        updated_at = timezone('utc', now())
    where id = target_book_id;


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
        current_profile_id,
        'book_view',
        'Membuka buku untuk dibaca secara online.',
        'book',
        target_book_id
    );


    return true;

end;
$$;


-- =========================================================
-- 12. REGISTER BOOK DOWNLOAD
-- =========================================================
-- Download hanya berhasil jika:
--
-- book.download_allowed = true
--
-- Fungsi ini hanya melakukan VALIDASI + statistik.
-- File tetap diberikan oleh API server melalui
-- signed URL.
-- =========================================================

create or replace function public.register_book_download(
    target_book_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    current_profile_id uuid;
    allowed boolean;
begin

    current_profile_id := auth.uid();


    if current_profile_id is null then
        raise exception
            'Anda harus login untuk mendownload buku.';
    end if;


    -- ---------------------------------------------
    -- ACTIVE USER
    -- ---------------------------------------------

    if not exists (
        select 1
        from public.profiles
        where id = current_profile_id
        and status = 'active'
        and role in (
            'user',
            'admin',
            'developer'
        )
    ) then

        raise exception
            'Akun belum aktif atau tidak memiliki akses.';
    end if;


    -- ---------------------------------------------
    -- GET PERMISSION
    -- ---------------------------------------------

    select download_allowed
    into allowed
    from public.books
    where id = target_book_id
    and status = 'published';


    if allowed is null then
        raise exception
            'Buku tidak ditemukan.';
    end if;


    -- ---------------------------------------------
    -- DOWNLOAD BLOCKED
    -- ---------------------------------------------

    if allowed = false then

        raise exception
            'Download buku ini tidak diizinkan. Buku tetap dapat dibaca secara online.';

    end if;


    -- ---------------------------------------------
    -- STATISTICS
    -- ---------------------------------------------

    update public.books
    set
        download_count = download_count + 1,
        updated_at = timezone('utc', now())
    where id = target_book_id;


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
        current_profile_id,
        'book_download',
        'Mendownload file PDF buku.',
        'book',
        target_book_id
    );


    return true;

end;
$$;


-- =========================================================
-- 13. BOOK PERMISSION CHECK
-- =========================================================
-- Digunakan API untuk mengecek apakah user dapat
-- membaca buku.
-- =========================================================

create or replace function public.can_read_book(
    target_book_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.books b
        inner join public.profiles p
            on p.id = auth.uid()
        where b.id = target_book_id
        and b.status = 'published'
        and p.status = 'active'
        and p.role in (
            'user',
            'admin',
            'developer'
        )
    );
$$;


-- =========================================================
-- 14. BOOK DOWNLOAD PERMISSION CHECK
-- =========================================================

create or replace function public.can_download_book(
    target_book_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.books b
        inner join public.profiles p
            on p.id = auth.uid()
        where b.id = target_book_id
        and b.status = 'published'
        and b.download_allowed = true
        and p.status = 'active'
        and p.role in (
            'user',
            'admin',
            'developer'
        )
    );
$$;


-- =========================================================
-- 15. BOOK MANAGEMENT FUNCTIONS
-- =========================================================


-- =========================================================
-- CREATE BOOK
-- =========================================================

create or replace function public.create_book(
    book_title text,
    book_synopsis text,
    book_type_value public.book_type,
    book_student_category public.student_category,
    book_grade smallint,
    book_pdf_path text,
    book_cover_path text default null,
    book_author text default null,
    book_publisher text default null,
    book_publication_year smallint default null,
    book_isbn text default null,
    book_page_count integer default null,
    book_download_allowed boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    caller_role public.user_role;
    new_book_id uuid;
begin

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
            'Hanya admin atau developer yang dapat menambahkan buku.';

    end if;


    insert into public.books (
        title,
        synopsis,
        book_type,
        student_category,
        grade,
        cover_path,
        pdf_path,
        author,
        publisher,
        publication_year,
        isbn,
        page_count,
        download_allowed,
        created_by
    )
    values (
        trim(book_title),
        nullif(trim(book_synopsis), ''),
        book_type_value,
        book_student_category,
        book_grade,
        book_cover_path,
        trim(book_pdf_path),
        nullif(trim(book_author), ''),
        nullif(trim(book_publisher), ''),
        book_publication_year,
        nullif(trim(book_isbn), ''),
        book_page_count,
        book_download_allowed,
        auth.uid()
    )
    returning id into new_book_id;


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
        'book_create',
        'Membuat buku baru.',
        'book',
        new_book_id,
        jsonb_build_object(
            'title',
            book_title
        )
    );


    return new_book_id;

end;
$$;


-- =========================================================
-- UPDATE BOOK
-- =========================================================

create or replace function public.update_book(
    target_book_id uuid,
    new_title text default null,
    new_synopsis text default null,
    new_cover_path text default null,
    new_author text default null,
    new_publisher text default null,
    new_publication_year smallint default null,
    new_isbn text default null,
    new_page_count integer default null
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


    if caller_role not in (
        'admin',
        'developer'
    ) then

        raise exception
            'Hanya admin atau developer yang dapat mengedit buku.';

    end if;


    update public.books
    set
        title = coalesce(
            nullif(trim(new_title), ''),
            title
        ),

        synopsis = case
            when new_synopsis is null
                then synopsis
            else nullif(trim(new_synopsis), '')
        end,

        cover_path = case
            when new_cover_path is null
                then cover_path
            else new_cover_path
        end,

        author = case
            when new_author is null
                then author
            else nullif(trim(new_author), '')
        end,

        publisher = case
            when new_publisher is null
                then publisher
            else nullif(trim(new_publisher), '')
        end,

        publication_year = coalesce(
            new_publication_year,
            publication_year
        ),

        isbn = case
            when new_isbn is null
                then isbn
            else nullif(trim(new_isbn), '')
        end,

        page_count = coalesce(
            new_page_count,
            page_count
        ),

        updated_at = timezone('utc', now())

    where id = target_book_id;


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
            'book_update',
            'Mengedit metadata buku.',
            'book',
            target_book_id
        );

        return true;

    end if;


    return false;

end;
$$;


-- =========================================================
-- UPDATE DOWNLOAD PERMISSION
-- =========================================================

create or replace function public.set_book_download_permission(
    target_book_id uuid,
    allowed boolean
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


    if caller_role not in (
        'admin',
        'developer'
    ) then

        raise exception
            'Hanya admin atau developer yang dapat mengubah izin download.';

    end if;


    update public.books
    set
        download_allowed = allowed,
        updated_at = timezone('utc', now())
    where id = target_book_id;


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
            'book_download_permission_update',
            case
                when allowed
                then 'Mengizinkan download buku.'
                else 'Menonaktifkan download buku.'
            end,
            'book',
            target_book_id,
            jsonb_build_object(
                'download_allowed',
                allowed
            )
        );

        return true;

    end if;


    return false;

end;
$$;


-- =========================================================
-- PUBLISH / ARCHIVE BOOK
-- =========================================================

create or replace function public.set_book_status(
    target_book_id uuid,
    new_status public.book_status
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


    if caller_role not in (
        'admin',
        'developer'
    ) then

        raise exception
            'Hanya admin atau developer yang dapat mengubah status buku.';

    end if;


    update public.books
    set
        status = new_status,
        updated_at = timezone('utc', now())
    where id = target_book_id;


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
            'book_update',
            'Mengubah status publikasi buku.',
            'book',
            target_book_id,
            jsonb_build_object(
                'status',
                new_status
            )
        );

        return true;

    end if;


    return false;

end;
$$;


-- =========================================================
-- DELETE BOOK
-- =========================================================
-- Menghapus record database.
--
-- File PDF / cover di Storage akan dihapus melalui
-- server API setelah database deletion berhasil.
-- =========================================================

create or replace function public.delete_book(
    target_book_id uuid
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


    if caller_role not in (
        'admin',
        'developer'
    ) then

        raise exception
            'Hanya admin atau developer yang dapat menghapus buku.';

    end if;


    insert into public.history (
        user_id,
        action,
        description,
        target_type,
        target_id
    )
    values (
        auth.uid(),
        'book_delete',
        'Menghapus buku.',
        'book',
        target_book_id
    );


    delete from public.books
    where id = target_book_id;


    return found;

end;
$$;


-- =========================================================
-- 16. FUNCTION PRIVILEGES
-- =========================================================

revoke all on function public.register_book_view(uuid)
from public;

revoke all on function public.register_book_download(uuid)
from public;

revoke all on function public.can_read_book(uuid)
from public;

revoke all on function public.can_download_book(uuid)
from public;

revoke all on function public.create_book(
    text,
    text,
    public.book_type,
    public.student_category,
    smallint,
    text,
    text,
    text,
    text,
    smallint,
    text,
    integer,
    boolean
)
from public;

revoke all on function public.update_book(
    uuid,
    text,
    text,
    text,
    text,
    text,
    smallint,
    text,
    integer
)
from public;

revoke all on function public.set_book_download_permission(
    uuid,
    boolean
)
from public;

revoke all on function public.set_book_status(
    uuid,
    public.book_status
)
from public;

revoke all on function public.delete_book(uuid)
from public;


grant execute on function public.register_book_view(uuid)
to authenticated;

grant execute on function public.register_book_download(uuid)
to authenticated;

grant execute on function public.can_read_book(uuid)
to authenticated;

grant execute on function public.can_download_book(uuid)
to authenticated;

grant execute on function public.create_book(
    text,
    text,
    public.book_type,
    public.student_category,
    smallint,
    text,
    text,
    text,
    text,
    smallint,
    text,
    integer,
    boolean
)
to authenticated;

grant execute on function public.update_book(
    uuid,
    text,
    text,
    text,
    text,
    text,
    smallint,
    text,
    integer
)
to authenticated;

grant execute on function public.set_book_download_permission(
    uuid,
    boolean
)
to authenticated;

grant execute on function public.set_book_status(
    uuid,
    public.book_status
)
to authenticated;

grant execute on function public.delete_book(uuid)
to authenticated;


-- =========================================================
-- 17. BOOK RLS
-- =========================================================

drop policy if exists "books_active_users_read"
on public.books;

create policy "books_active_users_read"
on public.books
for select
to authenticated
using (
    status = 'published'
    and public.can_access_library()
);


-- =========================================================
-- 18. NO DIRECT CLIENT INSERT
-- =========================================================
-- Buku dibuat melalui function / server API.
--
-- Tidak memberikan INSERT policy.
-- =========================================================


-- =========================================================
-- 19. NO DIRECT CLIENT UPDATE
-- =========================================================
-- Admin/developer akan menggunakan API server.
-- =========================================================


-- =========================================================
-- 20. NO DIRECT CLIENT DELETE
-- =========================================================
-- Penghapusan menggunakan API server.
-- =========================================================


-- =========================================================
-- 21. SECURE SEARCH FUNCTION
-- =========================================================
-- Search katalog buku.
--
-- User aktif hanya mendapatkan buku published.
-- =========================================================

create or replace function public.search_books(
    search_query text default null,
    filter_type public.book_type default null,
    filter_student_category public.student_category default null,
    filter_grade smallint default null
)
returns setof public.books
language sql
stable
security definer
set search_path = public
as $$
    select b.*
    from public.books b
    where
        b.status = 'published'

        and public.can_access_library()

        and (
            search_query is null
            or trim(search_query) = ''
            or to_tsvector(
                'simple',
                coalesce(b.title, '')
                || ' '
                || coalesce(b.synopsis, '')
                || ' '
                || coalesce(b.author, '')
            )
            @@ plainto_tsquery(
                'simple',
                search_query
            )
        )

        and (
            filter_type is null
            or b.book_type = filter_type
        )

        and (
            filter_student_category is null
            or b.student_category = filter_student_category
        )

        and (
            filter_grade is null
            or b.grade = filter_grade
        )

    order by
        b.sort_order asc,
        b.title asc;
$$;


revoke all on function public.search_books(
    text,
    public.book_type,
    public.student_category,
    smallint
)
from public;

grant execute on function public.search_books(
    text,
    public.book_type,
    public.student_category,
    smallint
)
to authenticated;


-- =========================================================
-- 22. COMMENTS
-- =========================================================

comment on column public.books.download_allowed is
'True = user boleh membaca dan mendownload. False = user tetap boleh membaca online tetapi tidak boleh mendownload.';

comment on column public.books.pdf_path is
'Path file PDF pada Supabase Storage private bucket.';

comment on column public.books.cover_path is
'Path cover buku pada Supabase Storage.';

comment on column public.books.view_count is
'Jumlah pembukaan buku melalui PDF reader.';

comment on column public.books.download_count is
'Jumlah download buku yang berhasil.';


-- =========================================================
-- END OF MIGRATION 003
-- =========================================================
