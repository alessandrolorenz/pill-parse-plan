-- PASSO 2 de 2: CORREÇÃO (altera dados; rode só depois de conferir o passo 1)
--
-- Faz backup automático em public.events_backup_utc_fix e converte date/time de UTC para America/Sao_Paulo.
-- Use EXATAMENTE a mesma data do passo 1. Cole este arquivo inteiro no SQL Editor do Supabase.
-- Roda uma vez só: se o backup já existir, o script para com erro em vez de converter de novo.
--
-- Para desfazer:
--   UPDATE public.events e SET date = b.date, time = b.time
--   FROM public.events_backup_utc_fix b WHERE e.id = b.id;

BEGIN;

-- EDITE APENAS A LINHA ABAIXO (mesma data do passo 1, em UTC)
CREATE TEMP TABLE params ON COMMIT DROP AS SELECT timestamptz '2026-10-28 15:00:00+00' AS cutoff;

CREATE TABLE public.events_backup_utc_fix AS SELECT * FROM public.events;
-- Sem policies: a API (anon/authenticated) não enxerga o backup; só o painel e o service role
ALTER TABLE public.events_backup_utc_fix ENABLE ROW LEVEL SECURITY;

UPDATE public.events e
SET date = ((e.date + e.time) AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::date,
    time = ((e.date + e.time) AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::time
FROM params p
WHERE e.created_at < p.cutoff;

COMMIT;
