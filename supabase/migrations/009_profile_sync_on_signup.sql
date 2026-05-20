-- Sync profile row when auth user is created (admin API: student/teacher accounts)

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta_username text;
  meta_role text;
  meta_created_by uuid;
begin
  meta_username := nullif(lower(trim(coalesce(new.raw_user_meta_data->>'username', ''))), '');
  meta_role := coalesce(nullif(trim(new.raw_user_meta_data->>'role'), ''), 'student');
  if meta_role not in ('admin', 'teacher', 'student') then
    meta_role := 'student';
  end if;

  begin
    meta_created_by := (new.raw_user_meta_data->>'created_by')::uuid;
  exception when others then
    meta_created_by := null;
  end;

  insert into public.profiles (id, name, email, role, username, is_active, created_by)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    meta_role,
    meta_username,
    true,
    meta_created_by
  )
  on conflict (id) do update set
    name = excluded.name,
    email = excluded.email,
    role = excluded.role,
    username = coalesce(excluded.username, public.profiles.username),
    is_active = coalesce(public.profiles.is_active, true),
    created_by = coalesce(excluded.created_by, public.profiles.created_by);

  return new;
end;
$$;
