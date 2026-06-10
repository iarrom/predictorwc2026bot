alter table public.profiles
  add column locale text not null default 'en'
    check (locale in ('en', 'ru', 'pl'));

alter table public.profiles
  add column locale_custom boolean not null default false;
