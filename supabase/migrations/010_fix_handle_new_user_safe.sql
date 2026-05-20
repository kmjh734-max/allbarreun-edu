-- Fix "Database error creating new user": keep trigger minimal; app fills username/is_active/created_by

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta_role text;
begin
  meta_role := coalesce(nullif(trim(new.raw_user_meta_data->>'role'), ''), 'student');
  if meta_role not in ('admin', 'teacher', 'student') then
    meta_role := 'student';
  end if;

  -- Only base columns (always exist after 001). Extended columns set by Admin API after signup.
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    meta_role
  )
  on conflict (id) do update set
    name = excluded.name,
    email = excluded.email,
    role = excluded.role;

  return new;
end;
$$;
