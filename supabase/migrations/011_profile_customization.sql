-- Profile customization flags + public avatars storage bucket.

alter table public.profiles
  add column if not exists display_name_custom boolean not null default false,
  add column if not exists avatar_custom boolean not null default false;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do nothing;
