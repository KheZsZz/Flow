-- =====================================================================
-- SYNC: colunas que podem não ter sido aplicadas no banco vivo.
-- Seguro rodar mais de uma vez (ADD COLUMN IF NOT EXISTS).
-- Destino: supabase/migrations/20260616090000_sync_colunas.sql
--
-- ATENÇÃO: isto cobre apenas COLUNAS. Se a 20260613124913_ordens.sql nunca
-- rodou, ainda faltam: enum public.OrderType, status "Em Rota" (110), o job
-- pg_cron (start_due_orders) e os triggers de finalização/trava.
-- A correção definitiva é sincronizar as migrations (supabase db push /
-- supabase migration up), não adicionar coluna a coluna.
-- =====================================================================

-- 1. OrderVehicles: role/position  (erro 42703 na listagem)
ALTER TABLE public.OrderVehicles
  ADD COLUMN IF NOT EXISTS role     TEXT    NOT NULL DEFAULT 'Cavalo',
  ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 1;

-- 2. Orders: colunas usadas no findAll/findById
ALTER TABLE public.Orders
  ADD COLUMN IF NOT EXISTS notes           TEXT,
  ADD COLUMN IF NOT EXISTS delivery_date   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scheduled_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS finaled_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3. Collections: campos referenciados no COLLECTION_SELECT do controller
ALTER TABLE public.Collections
  ADD COLUMN IF NOT EXISTS quantity           INTEGER,
  ADD COLUMN IF NOT EXISTS weight             NUMERIC(12,3),
  ADD COLUMN IF NOT EXISTS collection_address TEXT,
  ADD COLUMN IF NOT EXISTS finaled_at         TIMESTAMPTZ;
