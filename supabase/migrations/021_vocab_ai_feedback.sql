-- AI feedback for stage 3 meaning answers

alter table public.vocab_final_test_answers
  add column if not exists ai_feedback text;
