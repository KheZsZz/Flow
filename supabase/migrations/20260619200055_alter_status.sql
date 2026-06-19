-- =====================================================================
-- Status: inativar, nunca excluir (Tópico 9 - alternativa A)
--
-- Status é referenciado com ON DELETE RESTRICT por collections/orders/
-- orderitem/etc., então exclusão real falharia em uso. A regra de negócio
-- passa a ser "inativar". Adicionamos a coluna is_active.
--
-- Destino: supabase/migrations/20260619121000_status_soft_delete.sql
-- =====================================================================

ALTER TABLE public.Status
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
