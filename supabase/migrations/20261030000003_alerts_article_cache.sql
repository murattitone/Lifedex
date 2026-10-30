alter table public.alerts add column if not exists article jsonb;
comment on column public.alerts.article is 'Reader-mode extraction of the linked news article (cached by the article edge function).';
