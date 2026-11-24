-- =========================================================
-- Karang Taruna Gading | skema Supabase
-- Jalankan sekali di Supabase Dashboard > SQL Editor.
-- =========================================================

-- 1) Tabel kegiatan ------------------------------------------------
create table if not exists public.kegiatan (
  id          uuid primary key default gen_random_uuid(),
  judul       text not null check (char_length(judul) between 1 and 160),
  tanggal     date not null,
  lokasi      text,
  deskripsi   text not null default '',
  foto        text[] not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists kegiatan_tanggal_idx on public.kegiatan (tanggal desc);

-- 1b) Tabel berita (sorotan di beranda) -----------------------------
create table if not exists public.berita (
  id          uuid primary key default gen_random_uuid(),
  judul       text not null check (char_length(judul) between 1 and 160),
  tanggal     date not null,
  deskripsi   text not null default '',
  foto        text[] not null default '{}',
  sorot       boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists berita_tanggal_idx on public.berita (tanggal desc);

-- 2) Daftar admin (hanya user di tabel ini yang boleh mengubah data) --
create table if not exists public.admin_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists kegiatan_updated on public.kegiatan;
create trigger kegiatan_updated
  before update on public.kegiatan
  for each row execute function public.set_updated_at();

drop trigger if exists berita_updated on public.berita;
create trigger berita_updated
  before update on public.berita
  for each row execute function public.set_updated_at();

-- 3) Row Level Security --------------------------------------------
alter table public.kegiatan    enable row level security;
alter table public.berita      enable row level security;
alter table public.admin_users enable row level security;

drop policy if exists "publik baca berita" on public.berita;
create policy "publik baca berita" on public.berita
  for select to anon, authenticated using (true);

drop policy if exists "admin tambah berita" on public.berita;
create policy "admin tambah berita" on public.berita
  for insert to authenticated with check ((select public.is_admin()));

drop policy if exists "admin ubah berita" on public.berita;
create policy "admin ubah berita" on public.berita
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "admin hapus berita" on public.berita;
create policy "admin hapus berita" on public.berita
  for delete to authenticated using ((select public.is_admin()));

drop policy if exists "publik baca kegiatan" on public.kegiatan;
create policy "publik baca kegiatan" on public.kegiatan
  for select to anon, authenticated using (true);

drop policy if exists "admin tambah kegiatan" on public.kegiatan;
create policy "admin tambah kegiatan" on public.kegiatan
  for insert to authenticated with check ((select public.is_admin()));

drop policy if exists "admin ubah kegiatan" on public.kegiatan;
create policy "admin ubah kegiatan" on public.kegiatan
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "admin hapus kegiatan" on public.kegiatan;
create policy "admin hapus kegiatan" on public.kegiatan
  for delete to authenticated using ((select public.is_admin()));

drop policy if exists "admin lihat diri" on public.admin_users;
create policy "admin lihat diri" on public.admin_users
  for select to authenticated using (user_id = (select auth.uid()));

-- 4) Storage foto (bucket publik; URL foto bisa dibuka siapa saja) --
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('kegiatan', 'kegiatan', true, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

drop policy if exists "admin lihat daftar foto" on storage.objects;
create policy "admin lihat daftar foto" on storage.objects
  for select to authenticated using (bucket_id = 'kegiatan' and (select public.is_admin()));

drop policy if exists "admin unggah foto" on storage.objects;
create policy "admin unggah foto" on storage.objects
  for insert to authenticated with check (bucket_id = 'kegiatan' and (select public.is_admin()));

drop policy if exists "admin ubah foto" on storage.objects;
create policy "admin ubah foto" on storage.objects
  for update to authenticated using (bucket_id = 'kegiatan' and (select public.is_admin()));

drop policy if exists "admin hapus foto" on storage.objects;
create policy "admin hapus foto" on storage.objects
  for delete to authenticated using (bucket_id = 'kegiatan' and (select public.is_admin()));

-- =========================================================
-- MENAMBAH ADMIN
-- 1. Dashboard > Authentication > Users > Add user (isi email + kata sandi, centang Auto Confirm).
-- 2. Jalankan (ganti emailnya):
--    insert into public.admin_users (user_id)
--    select id from auth.users where email = 'admin@contoh.com';
-- =========================================================
