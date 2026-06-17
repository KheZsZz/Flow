-- =====================================================================
-- CONSOLIDAÇÃO — módulo de Viagens (Orders) / fix do create  (v2)
-- ---------------------------------------------------------------------
-- Idempotente. Corrige o erro 2BP01 da v1: agora converte TODAS as
-- colunas que dependem de OrderType (orders.type_orders E
-- orderitem.type_orders) antes de dropar o tipo antigo.
--
-- Aplicar com:  supabase db push
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Enum OrderType  (fonte única = OrderTypeSchema do app)
--    Coleta / Entrega / Devolução / Reentrega / Avarias
-- ---------------------------------------------------------------------
DO $$
DECLARE
  v_labels text[];
  v_want   text[] := ARRAY['Coleta','Entrega','Devolução','Reentrega','Avarias'];
  v_col    RECORD;
BEGIN
  -- limpa resíduo de uma execução anterior interrompida
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ordertype')
     AND EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ordertype_old') THEN
    DROP TYPE IF EXISTS public.OrderType_old;
  END IF;

  -- tipo ausente: cria do zero (ou recupera o _old órfão)
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ordertype') THEN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ordertype_old') THEN
      ALTER TYPE public.OrderType_old RENAME TO OrderType;
    ELSE
      CREATE TYPE public.OrderType AS ENUM
        ('Coleta','Entrega','Devolução','Reentrega','Avarias');
      RETURN;
    END IF;
  END IF;

  -- já está correto? não toca em nada
  SELECT array_agg(enumlabel ORDER BY enumsortorder) INTO v_labels
  FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
  WHERE t.typname = 'ordertype';

  IF v_labels @> v_want AND v_want @> v_labels THEN
    RETURN;
  END IF;

  -- precisa remapear: recria o tipo
  ALTER TYPE public.OrderType RENAME TO OrderType_old;
  CREATE TYPE public.OrderType AS ENUM
    ('Coleta','Entrega','Devolução','Reentrega','Avarias');

  -- converte TODAS as colunas que ainda usam o tipo antigo
  FOR v_col IN
    SELECT n.nspname AS sch, c.relname AS tbl, a.attname AS col
    FROM pg_attribute a
    JOIN pg_class     c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_type      t ON t.oid = a.atttypid
    WHERE t.typname = 'ordertype_old'
      AND a.attnum > 0
      AND NOT a.attisdropped
      AND c.relkind = 'r'
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I ALTER COLUMN %I DROP DEFAULT',
      v_col.sch, v_col.tbl, v_col.col);

    EXECUTE format($f$
      ALTER TABLE %I.%I
        ALTER COLUMN %I TYPE public.OrderType
        USING (
          CASE %I::text
            WHEN 'Entrega/Coleta' THEN 'Entrega'
            WHEN 'Retorno Vazio'  THEN 'Devolução'
            WHEN 'Coleta'         THEN 'Coleta'
            WHEN 'Entrega'        THEN 'Entrega'
            WHEN 'Devolução'      THEN 'Devolução'
            WHEN 'Reentrega'      THEN 'Reentrega'
            WHEN 'Avarias'        THEN 'Avarias'
            ELSE 'Entrega'
          END
        )::public.OrderType
    $f$, v_col.sch, v_col.tbl, v_col.col, v_col.col);
  END LOOP;

  -- restaura defaults conhecidos (evita NOT NULL sem default no INSERT)
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND lower(table_name)='orderitem'
               AND column_name='type_orders') THEN
    ALTER TABLE public.OrderItem ALTER COLUMN type_orders SET DEFAULT 'Entrega';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND lower(table_name)='orders'
               AND column_name='type_orders') THEN
    ALTER TABLE public.Orders ALTER COLUMN type_orders SET DEFAULT 'Entrega';
  END IF;

  DROP TYPE IF EXISTS public.OrderType_old;
END$$;

-- ---------------------------------------------------------------------
-- 1. OrderVehicles — composição (role + position)
-- ---------------------------------------------------------------------
ALTER TABLE public.OrderVehicles
  ADD COLUMN IF NOT EXISTS role     TEXT    NOT NULL DEFAULT 'Cavalo',
  ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 1;

-- ---------------------------------------------------------------------
-- 2. Orders — notes, datas e finalização
-- ---------------------------------------------------------------------
ALTER TABLE public.Orders
  ADD COLUMN IF NOT EXISTS notes           TEXT,
  ADD COLUMN IF NOT EXISTS delivery_date   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scheduled_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS finaled_at      TIMESTAMPTZ;

-- ---------------------------------------------------------------------
-- 3. OrderItem — origem nota OU coleta (XOR via chk_orderitem_source)
--    (depende da tabela public.Collections existir)
-- ---------------------------------------------------------------------
ALTER TABLE public.OrderItem
  ALTER COLUMN invoice_id DROP NOT NULL;

ALTER TABLE public.OrderItem
  ADD COLUMN IF NOT EXISTS collection_id UUID
  REFERENCES public.Collections(id) ON DELETE RESTRICT;

ALTER TABLE public.OrderItem
  DROP CONSTRAINT IF EXISTS chk_orderitem_source;
ALTER TABLE public.OrderItem
  ADD CONSTRAINT chk_orderitem_source
  CHECK (num_nonnulls(invoice_id, collection_id) = 1);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_orderitem_collection
  ON public.OrderItem (collection_id)
  WHERE collection_id IS NOT NULL;

-- ---------------------------------------------------------------------
-- 4. Status "Em Rota" (110) por corporação
-- ---------------------------------------------------------------------
-- created_by vem de um status já existente da mesma corporação
-- (Corporation não tem created_by; o seed usa um usuário).
INSERT INTO public.Status (code, name, description, corporation_id, created_by)
SELECT 110, 'Em Rota',
       'Viagem iniciada automaticamente na data/hora agendada',
       s.corporation_id, s.created_by
FROM (
  SELECT DISTINCT ON (corporation_id) corporation_id, created_by
  FROM public.Status
  ORDER BY corporation_id, code
) s
WHERE NOT EXISTS (
  SELECT 1 FROM public.Status s2
  WHERE s2.corporation_id = s.corporation_id AND s2.code = 110
);

-- ---------------------------------------------------------------------
-- 5. create_order — versão final
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_order(
    p_corporation_id UUID,
    p_created_by      UUID,
    p_status_id       UUID,
    p_driver_id       UUID,
    p_delivery_date   TIMESTAMPTZ,
    p_scheduled_start TIMESTAMPTZ,
    p_notes           TEXT,
    p_vehicles        JSONB,   -- [{ vehicle_id, role, position }]
    p_items           JSONB    -- [{ invoice_id?, collection_id?, type_orders, status_id, tracking? }]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id   UUID;
    v_item       RECORD;
    v_veh        RECORD;
    v_item_id    UUID;
    v_count_veh  INT := 0;
BEGIN
    INSERT INTO public.Orders (
        company_id, driver_id, status_id, notes,
        delivery_date, scheduled_start, created_by
    )
    VALUES (
        p_corporation_id, p_driver_id, p_status_id, p_notes,
        p_delivery_date, p_scheduled_start, p_created_by
    )
    RETURNING id INTO v_order_id;

    INSERT INTO public.OrderStatusHistory (order_id, status_id, changed_by)
    VALUES (v_order_id, p_status_id, p_created_by);

    -- veículos (até 3)
    IF p_vehicles IS NOT NULL AND jsonb_array_length(p_vehicles) > 0 THEN
        FOR v_veh IN
            SELECT * FROM jsonb_to_recordset(p_vehicles)
              AS x(vehicle_id UUID, role TEXT, position INT)
        LOOP
            v_count_veh := v_count_veh + 1;
            IF v_count_veh > 3 THEN
                RAISE EXCEPTION 'Composição excede 3 veículos';
            END IF;
            INSERT INTO public.OrderVehicles (order_id, vehicle_id, role, position)
            VALUES (v_order_id, v_veh.vehicle_id,
                    COALESCE(v_veh.role, 'Cavalo'),
                    COALESCE(v_veh.position, v_count_veh));
        END LOOP;
    END IF;

    -- itens: nota OU coleta — o CHECK chk_orderitem_source garante o XOR
    IF p_items IS NOT NULL AND jsonb_array_length(p_items) > 0 THEN
        FOR v_item IN
            SELECT * FROM jsonb_to_recordset(p_items)
              AS x(invoice_id    UUID,
                   collection_id UUID,
                   type_orders   public.OrderType,
                   tracking      VARCHAR(255),
                   status_id     UUID)
        LOOP
            INSERT INTO public.OrderItem (
                company_id, invoice_id, collection_id,
                type_orders, tracking, status_id, created_by
            )
            VALUES (
                p_corporation_id, v_item.invoice_id, v_item.collection_id,
                v_item.type_orders, v_item.tracking, v_item.status_id, p_created_by
            )
            RETURNING id INTO v_item_id;

            INSERT INTO public.Order_add_itens (order_id, order_item_id)
            VALUES (v_order_id, v_item_id);
        END LOOP;
    END IF;

    RETURN jsonb_build_object(
        'order_id', v_order_id,
        'message', 'Ordem de serviço gerada com sucesso!',
        'vehicles_linked', v_count_veh
    );
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Erro ao criar ordem: %', SQLERRM;
END;
$$;

-- ---------------------------------------------------------------------
-- 6. Recarrega o schema cache do PostgREST (evita PGRST202)
-- ---------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';