-- =====================================================================
-- Alinhamento de enums + código de rastreio da viagem
-- Destino: supabase/migrations/20260616120000_enums_e_tracking.sql
-- =====================================================================

-- 1. OrderType: adicionar os valores que faltam (não-destrutivo).
--    Conjunto final desejado: Coleta, Entrega/Coleta, Devolução,
--    Outros Estados, Retorno Vazio.
ALTER TYPE public.OrderType ADD VALUE IF NOT EXISTS 'Outros Estados';

-- 2. VehicleType: incluir 'Ultilitário' (o banco só tinha 'Fiorino').
ALTER TYPE public.VehicleType ADD VALUE IF NOT EXISTS 'Ultilitário';

-- 3. Código de rastreio da VIAGEM (não do item): auto-gerado, ex.: VG-000001.
CREATE SEQUENCE IF NOT EXISTS public.order_tracking_seq;

ALTER TABLE public.Orders
  ADD COLUMN IF NOT EXISTS tracking TEXT;

ALTER TABLE public.Orders
  ALTER COLUMN tracking
  SET DEFAULT ('VG-' || lpad(nextval('public.order_tracking_seq')::text, 6, '0'));

-- preenche viagens já existentes que estejam sem código
UPDATE public.Orders
  SET tracking = ('VG-' || lpad(nextval('public.order_tracking_seq')::text, 6, '0'))
  WHERE tracking IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_orders_tracking
  ON public.Orders (tracking);
