-- Vocabulary folders (organize vocab_sets; classes handle student assignment)

create table if not exists public.vocab_folders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  teacher_id uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists vocab_folders_teacher_id_idx on public.vocab_folders(teacher_id);
create index if not exists vocab_folders_created_by_idx on public.vocab_folders(created_by);

alter table public.vocab_sets
  add column if not exists folder_id uuid references public.vocab_folders(id) on delete set null;

create index if not exists vocab_sets_folder_id_idx on public.vocab_sets(folder_id);

-- Backfill: one default folder per creator for existing sets
insert into public.vocab_folders (name, teacher_id, created_by)
select distinct '기본 폴더', teacher_id, created_by
from public.vocab_sets
where created_by is not null
  and not exists (
    select 1 from public.vocab_folders vf
    where vf.created_by = vocab_sets.created_by
      and vf.name = '기본 폴더'
  );

update public.vocab_sets vs
set folder_id = vf.id
from public.vocab_folders vf
where vs.folder_id is null
  and vs.created_by = vf.created_by
  and vf.name = '기본 폴더';

-- Helpers
create or replace function public.teacher_owns_vocab_folder(folder_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.vocab_folders
    where id = folder_uuid
      and (teacher_id = auth.uid() or created_by = auth.uid())
  );
$$;

create or replace function public.teacher_can_manage_vocab_folder(folder_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.teacher_owns_vocab_folder(folder_uuid);
$$;

-- RLS vocab_folders
alter table public.vocab_folders enable row level security;

drop policy if exists "Admins select vocab_folders" on public.vocab_folders;
drop policy if exists "Admins insert vocab_folders" on public.vocab_folders;
drop policy if exists "Admins update vocab_folders" on public.vocab_folders;
drop policy if exists "Admins delete vocab_folders" on public.vocab_folders;

create policy "Admins select vocab_folders"
  on public.vocab_folders for select using (public.is_admin());
create policy "Admins insert vocab_folders"
  on public.vocab_folders for insert with check (public.is_admin());
create policy "Admins update vocab_folders"
  on public.vocab_folders for update
  using (public.is_admin()) with check (public.is_admin());
create policy "Admins delete vocab_folders"
  on public.vocab_folders for delete using (public.is_admin());

drop policy if exists "Teachers select own vocab_folders" on public.vocab_folders;
drop policy if exists "Teachers insert vocab_folders" on public.vocab_folders;
drop policy if exists "Teachers update own vocab_folders" on public.vocab_folders;
drop policy if exists "Teachers delete own vocab_folders" on public.vocab_folders;

create policy "Teachers select own vocab_folders"
  on public.vocab_folders for select
  using (public.is_teacher() and public.teacher_can_manage_vocab_folder(id));

create policy "Teachers insert vocab_folders"
  on public.vocab_folders for insert
  with check (
    public.is_teacher()
    and created_by = auth.uid()
    and (teacher_id is null or teacher_id = auth.uid())
  );

create policy "Teachers update own vocab_folders"
  on public.vocab_folders for update
  using (public.is_teacher() and public.teacher_can_manage_vocab_folder(id))
  with check (public.is_teacher() and public.teacher_can_manage_vocab_folder(id));

create policy "Teachers delete own vocab_folders"
  on public.vocab_folders for delete
  using (public.is_teacher() and public.teacher_can_manage_vocab_folder(id));

-- Teachers: vocab_sets in own folders
drop policy if exists "Teachers insert vocab_sets" on public.vocab_sets;
create policy "Teachers insert vocab_sets"
  on public.vocab_sets for insert
  with check (
    public.is_teacher()
    and created_by = auth.uid()
    and (teacher_id is null or teacher_id = auth.uid())
    and (
      folder_id is null
      or public.teacher_can_manage_vocab_folder(folder_id)
    )
  );
