-- Student login id (username) and account active flag

alter table public.profiles
  add column if not exists username text,
  add column if not exists is_active boolean not null default true;

create unique index if not exists profiles_username_unique_idx
  on public.profiles (username)
  where username is not null;

-- Backfill username from internal student emails
update public.profiles
set username = lower(split_part(email, '@', 1))
where role = 'student'
  and username is null
  and email like '%@jslms.local';

-- Sync profile on auth signup (admin-created users via metadata)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta_username text;
begin
  meta_username := nullif(lower(trim(coalesce(new.raw_user_meta_data->>'username', ''))), '');

  insert into public.profiles (id, name, email, role, username, is_active)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'student'),
    meta_username,
    true
  )
  on conflict (id) do update set
    name = excluded.name,
    email = excluded.email,
    role = excluded.role,
    username = coalesce(excluded.username, public.profiles.username),
    is_active = coalesce(public.profiles.is_active, true);

  return new;
end;
$$;

-- Admin: manage all profiles (insert for service-role upserts; app uses Admin API)
drop policy if exists "Admins can update any profile" on public.profiles;

create policy "Admins can update any profile"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can insert profiles"
  on public.profiles for insert
  with check (public.is_admin());
