-- Corrige events.date/time gravados em UTC antes da correção de toEventRow (packages/core/src/scheduler.ts).
-- Até então, web e mobile gravavam a parte UTC de toISOString(): uma dose das 08:00 em Brasília ficava como 11:00.
--
-- NÃO é uma migration automática: fica fora de supabase/migrations para não rodar com `supabase db push`.
-- Premissa: todos os usuários atuais estão em America/Sao_Paulo (não há fuso salvo por usuário).
--
-- Como aplicar:
--   1. Faça backup da tabela events.
--   2. Substitua :deploy_cutoff pela data/hora (UTC) do deploy da correção, ex.: '2026-10-27 12:00:00+00'.
--      Eventos criados depois disso já estão em horário local e não podem ser alterados.
--   3. Rode a prévia (passo A) e confira algumas linhas.
--   4. Rode o passo B.

-- A) Prévia
SELECT id, date, time,
       ((date + time) AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::date AS new_date,
       ((date + time) AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::time AS new_time,
       created_at
FROM public.events
WHERE created_at < :deploy_cutoff
ORDER BY created_at DESC
LIMIT 50;

-- B) Correção
BEGIN;

UPDATE public.events
SET date = ((date + time) AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::date,
    time = ((date + time) AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::time
WHERE created_at < :deploy_cutoff;

COMMIT;
