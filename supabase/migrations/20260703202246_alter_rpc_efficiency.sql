-- =====================================================================
-- Dashboard — get_vehicle_efficiency passa a retornar license_plate
-- Motivo: o painel exibia shortId (substring do vehicle_id) por falta de
-- placa no retorno. Colocamos o JOIN na fonte pra evitar cruzamento
-- client-side redundante em Vehicles.
-- =====================================================================

DROP FUNCTION IF EXISTS public.get_vehicle_efficiency(UUID);

CREATE OR REPLACE FUNCTION public.get_vehicle_efficiency(p_corporation_id UUID)
RETURNS TABLE (
  fuel_id       UUID,
  vehicle_id    UUID,
  license_plate VARCHAR,
  liters        DECIMAL(10, 2),
  total_price   DECIMAL(10, 2),
  kms_driven    INT,
  km_per_liter  DECIMAL(10, 2),
  created_at    TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  WITH OdometerCalculations AS (
    SELECT
      f.id,
      f.vehicle_id,
      f.liters,
      f.total_price,
      f.current_odometer,
      f.is_full_tank,
      f.created_at,
      LAG(f.current_odometer) OVER (
        PARTITION BY f.vehicle_id ORDER BY f.created_at
      ) AS previous_odometer
    FROM public.Fuel f
    WHERE f.corporation_id = p_corporation_id
  )
  SELECT
    oc.id,
    oc.vehicle_id,
    v.license_plate,
    oc.liters,
    oc.total_price,
    (oc.current_odometer - oc.previous_odometer)::INT,
    CASE
      WHEN oc.is_full_tank = TRUE AND (oc.current_odometer - oc.previous_odometer) > 0
      THEN ROUND(((oc.current_odometer - oc.previous_odometer) / oc.liters), 2)
      ELSE 0
    END,
    oc.created_at
  FROM OdometerCalculations oc
  JOIN public.Vehicles v ON v.id = oc.vehicle_id
  WHERE oc.previous_odometer IS NOT NULL;
END;
$$;

NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- Manutenção — Batch 2 (opção 2):
--   1) enum public.maintenancecategory ('Preventiva' | 'Corretiva')
--   2) tabela public.maintenance_types (moldada em expense_types)
--   3) sequência maintenance_code_seq -> coluna code (OM-000001)
--   4) FK maintenance_type_id em maintenances
--   5) seed dos tipos a partir dos maintenance_type texto já existentes
--   6) backfill de maintenance_type_id
-- Mantém a coluna `maintenance_type` (text) por retrocompatibilidade.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) enum de categoria
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'maintenancecategory') THEN
    CREATE TYPE public.maintenancecategory AS ENUM ('Preventiva', 'Corretiva');
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 2) Tabela maintenance_types  (mesmo padrão de expense_types)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.maintenance_types (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corporation_id UUID NOT NULL REFERENCES public.Corporation(id) ON DELETE RESTRICT,
  name           VARCHAR(120) NOT NULL,
  category       public.maintenancecategory NOT NULL,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by     UUID NOT NULL REFERENCES public.Users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_maintenance_types
  ON public.maintenance_types (corporation_id, name);

CREATE INDEX IF NOT EXISTS idx_maintenance_types_corp
  ON public.maintenance_types (corporation_id);

DROP TRIGGER IF EXISTS set_timestamp_maintenance_types ON public.maintenance_types;
CREATE TRIGGER set_timestamp_maintenance_types
  BEFORE UPDATE ON public.maintenance_types
  FOR EACH ROW EXECUTE PROCEDURE public.trigger_set_timestamp();

-- ---------------------------------------------------------------------
-- 3) Sequência e coluna de código OM-000001
--    NOT NULL DEFAULT vai preencher linhas existentes retroativamente.
-- ---------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.maintenance_code_seq;

ALTER TABLE public.maintenances
  ADD COLUMN IF NOT EXISTS code TEXT NOT NULL
    DEFAULT ('OM-' || lpad(nextval('public.maintenance_code_seq')::text, 6, '0'));

CREATE UNIQUE INDEX IF NOT EXISTS uniq_maintenances_code
  ON public.maintenances (corporation_id, code);

-- ---------------------------------------------------------------------
-- 4) FK maintenance_type_id (mantém maintenance_type TEXT p/ retrocompat)
-- ---------------------------------------------------------------------
ALTER TABLE public.maintenances
  ADD COLUMN IF NOT EXISTS maintenance_type_id UUID
    REFERENCES public.maintenance_types(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_maintenances_type
  ON public.maintenances (maintenance_type_id);

-- ---------------------------------------------------------------------
-- 5) Seed dos tipos a partir dos maintenance_type texto já existentes
--    Regra simples: qualquer coisa começando com "Reparo" vira Corretiva,
--    o resto vira Preventiva. O usuário pode reclassificar depois.
-- ---------------------------------------------------------------------
INSERT INTO public.maintenance_types (corporation_id, name, category, created_by)
SELECT DISTINCT
  m.corporation_id,
  m.maintenance_type,
  CASE
    WHEN m.maintenance_type ILIKE 'reparo%' THEN 'Corretiva'::public.maintenancecategory
    ELSE 'Preventiva'::public.maintenancecategory
  END,
  m.created_by
FROM public.maintenances m
WHERE m.maintenance_type IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.maintenance_types mt
    WHERE mt.corporation_id = m.corporation_id
      AND mt.name = m.maintenance_type
  );

-- ---------------------------------------------------------------------
-- 6) Backfill maintenance_type_id nas linhas existentes
-- ---------------------------------------------------------------------
UPDATE public.maintenances m
SET maintenance_type_id = mt.id
FROM public.maintenance_types mt
WHERE mt.corporation_id = m.corporation_id
  AND mt.name = m.maintenance_type
  AND m.maintenance_type_id IS NULL;

NOTIFY pgrst, 'reload schema';
