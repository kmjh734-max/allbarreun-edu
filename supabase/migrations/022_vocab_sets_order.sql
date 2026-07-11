-- Folder内 단어세트 표시 순서

alter table public.vocab_sets
  add column if not exists order_index int not null default 0;

create index if not exists vocab_sets_folder_order_idx
  on public.vocab_sets (folder_id, order_index);

-- 기존 데이터: 폴더별 created_at 순으로 order_index 부여
with ranked as (
  select
    id,
    row_number() over (
      partition by folder_id
      order by created_at asc, id asc
    ) - 1 as rn
  from public.vocab_sets
  where folder_id is not null
)
update public.vocab_sets vs
set order_index = ranked.rn
from ranked
where vs.id = ranked.id;
