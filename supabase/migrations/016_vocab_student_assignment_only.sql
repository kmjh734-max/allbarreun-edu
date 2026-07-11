-- Students see vocab by assignment only (not is_published flag)

drop policy if exists "Students select assigned published vocab_sets" on public.vocab_sets;

create policy "Students select assigned vocab_sets"
  on public.vocab_sets for select
  using (
    public.is_student()
    and public.student_assigned_vocab_set(id)
  );

drop policy if exists "Students select vocab_items for assigned sets" on public.vocab_items;

create policy "Students select vocab_items for assigned sets"
  on public.vocab_items for select
  using (
    public.is_student()
    and exists (
      select 1 from public.vocab_sets vs
      where vs.id = vocab_items.set_id
        and public.student_assigned_vocab_set(vs.id)
    )
  );

drop policy if exists "Students insert own vocab_progress" on public.vocab_progress;
drop policy if exists "Students update own vocab_progress" on public.vocab_progress;

create policy "Students insert own vocab_progress"
  on public.vocab_progress for insert
  with check (
    public.is_student()
    and student_id = auth.uid()
    and exists (
      select 1
      from public.vocab_items vi
      join public.vocab_sets vs on vs.id = vi.set_id
      where vi.id = vocab_progress.item_id
        and public.student_assigned_vocab_set(vs.id)
    )
  );

create policy "Students update own vocab_progress"
  on public.vocab_progress for update
  using (public.is_student() and student_id = auth.uid())
  with check (
    public.is_student()
    and student_id = auth.uid()
    and exists (
      select 1
      from public.vocab_items vi
      join public.vocab_sets vs on vs.id = vi.set_id
      where vi.id = vocab_progress.item_id
        and public.student_assigned_vocab_set(vs.id)
    )
  );

-- Existing sets: treat as visible when assigned
update public.vocab_sets set is_published = true where is_published = false;
