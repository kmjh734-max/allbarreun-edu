-- vocab_items: 동의어·반의어 (세트 편집 시 AI 생성 후 저장)
alter table public.vocab_items
  add column if not exists synonyms text,
  add column if not exists antonyms text;
