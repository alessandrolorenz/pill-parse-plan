-- PASSO 1 de 2: PRÉVIA (só leitura, não altera nada)
--
-- Corrige events.date/time gravados em UTC antes da correção de toEventRow (packages/core/src/scheduler.ts):
-- uma dose das 08:00 em Brasília ficou gravada como 11:00.
-- Premissa: todos os usuários atuais estão em America/Sao_Paulo (não há fuso salvo por usuário).
--
-- Rode SÓ DEPOIS que a correção estiver no ar (PR mergeado, web publicada no Lovable, build mobile novo).
-- Cole este arquivo inteiro no SQL Editor do Supabase.
--
-- EDITE APENAS A LINHA ABAIXO: data/hora em que a correção entrou no ar, em UTC (Brasília + 3h).
-- Eventos criados depois disso já estão em horário local e ficam de fora.

WITH params AS (SELECT timestamptz '2026-10-28 15:00:00+00' AS cutoff)

SELECT e.id,
       e.date AS date_atual,
       e.time AS time_atual,
       ((e.date + e.time) AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::date AS date_nova,
       ((e.date + e.time) AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::time AS time_nova,
       e.label,
       e.created_at,
       count(*) OVER () AS total_que_sera_corrigido
FROM public.events e, params p
WHERE e.created_at < p.cutoff
ORDER BY e.created_at DESC
LIMIT 50;
