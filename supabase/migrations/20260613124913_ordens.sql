-- =====================================================================
-- Orders / Viagens — motor de viagem
-- Conserta: vínculo de itens, composição de veículos (role/position),
-- agenda de início (scheduled_start), status "Em Rota" automático (pg_cron),
-- finalização automática e travas de alteração.
-- Revise os blocos marcados com  ⚠  antes de rodar em produção.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. OrderType — fonte única = enumSchema do app
--    (Coleta / Entrega / Devolução / Reentrega / Avarias)
--    ⚠ Postgres não remove valores de enum facilmente: recriamos o tipo
--    e remapeamos os dados antigos ('Entrega/Coleta' -> 'Entrega' etc.).
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ordertype') THEN
    ALTER TYPE public.OrderType RENAME TO OrderType_old;
  END IF;
END$$;

CREATE TYPE public.OrderType AS ENUM
  ('Coleta', 'Entrega', 'Devolução', 'Reentrega', 'Avarias');

ALTER TABLE public.OrderItem
  ALTER COLUMN type_orders DROP DEFAULT;

ALTER TABLE public.OrderItem
  ALTER COLUMN type_orders TYPE public.OrderType
  USING (
    CASE type_orders::text
      WHEN 'Entrega/Coleta' THEN 'Entrega'
      WHEN 'Retorno Vazio'  THEN 'Devolução'
      WHEN 'Coleta'         THEN 'Coleta'
      WHEN 'Entrega'        THEN 'Entrega'
      WHEN 'Devolução'      THEN 'Devolução'
      WHEN 'Reentrega'      THEN 'Reentrega'
      WHEN 'Avarias'        THEN 'Avarias'
      ELSE 'Entrega'
    END
  )::public.OrderType;

ALTER TABLE public.OrderItem
  ALTER COLUMN type_orders SET DEFAULT 'Entrega';

DROP TYPE IF EXISTS public.OrderType_old;

-- ---------------------------------------------------------------------
-- 1. OrderVehicles — composição completa (role + position)
-- ---------------------------------------------------------------------
ALTER TABLE public.OrderVehicles
  ADD COLUMN IF NOT EXISTS role     TEXT    NOT NULL DEFAULT 'Cavalo',
  ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 1;

-- ---------------------------------------------------------------------
-- 2. Orders — datas de entrega e de início agendado
-- ---------------------------------------------------------------------
ALTER TABLE public.Orders
  ADD COLUMN IF NOT EXISTS delivery_date   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scheduled_start TIMESTAMPTZ;

-- ---------------------------------------------------------------------
-- 3. Status "Em Rota" (code 110) por corporação
-- ---------------------------------------------------------------------
INSERT INTO public.Status (code, name, description, corporation_id, created_by)
SELECT 110, 'Em Rota', 'Viagem iniciada automaticamente na data/hora agendada',
       c.id, c.created_by
FROM public.Corporation c
WHERE NOT EXISTS (
  SELECT 1 FROM public.Status s
  WHERE s.corporation_id = c.id AND s.code = 110
);

-- ---------------------------------------------------------------------
-- 4. create_order — agora vincula itens em Order_add_itens (BUG corrigido)
--    e aceita veículos estruturados {vehicle_id, role, position}
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
    p_items           JSONB    -- [{ invoice_id, type_orders, status_id, tracking }]
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

    -- registra status inicial no histórico
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

    -- itens / notas
    IF p_items IS NOT NULL AND jsonb_array_length(p_items) > 0 THEN
        FOR v_item IN
            SELECT * FROM jsonb_to_recordset(p_items)
              AS x(invoice_id UUID, type_orders public.OrderType,
                   tracking VARCHAR(255), status_id UUID)
        LOOP
            INSERT INTO public.OrderItem (
                company_id, invoice_id, type_orders, tracking, status_id, created_by
            )
            VALUES (
                p_corporation_id, v_item.invoice_id,
                COALESCE(v_item.type_orders, 'Entrega'),
                v_item.tracking, v_item.status_id, p_created_by
            )
            RETURNING id INTO v_item_id;

            -- ✅ vínculo que estava comentado
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
-- 5. Finalização automática: quando TODOS os itens da ordem ficam
--    Concluídos (code 102), a ordem encerra (status 102 + finaled_at).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_auto_finalize_order()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_order_id     UUID;
    v_company_id   UUID;
    v_total        INT;
    v_done         INT;
    v_status_done  UUID;
BEGIN
    SELECT oai.order_id INTO v_order_id
    FROM public.Order_add_itens oai
    WHERE oai.order_item_id = NEW.id;

    IF v_order_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT count(*) FILTER (WHERE TRUE),
           count(*) FILTER (WHERE st.code = 102)
      INTO v_total, v_done
    FROM public.Order_add_itens oai
    JOIN public.OrderItem oi ON oi.id = oai.order_item_id
    JOIN public.Status st     ON st.id = oi.status_id
    WHERE oai.order_id = v_order_id;

    IF v_total > 0 AND v_total = v_done THEN
        SELECT company_id INTO v_company_id FROM public.Orders WHERE id = v_order_id;
        SELECT id INTO v_status_done
        FROM public.Status
        WHERE corporation_id = v_company_id AND code = 102
        LIMIT 1;

        UPDATE public.Orders
        SET status_id = v_status_done, finaled_at = NOW(), updated_at = NOW()
        WHERE id = v_order_id AND finaled_at IS NULL;

        INSERT INTO public.OrderStatusHistory (order_id, status_id, changed_by)
        SELECT v_order_id, v_status_done, o.created_by
        FROM public.Orders o WHERE o.id = v_order_id;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_finalize_order ON public.OrderItem;
CREATE TRIGGER trg_auto_finalize_order
AFTER UPDATE OF status_id ON public.OrderItem
FOR EACH ROW
EXECUTE FUNCTION public.fn_auto_finalize_order();

-- ---------------------------------------------------------------------
-- 6. Travas (locks)
--    a) ordem finalizada não pode ser alterada
--    b) item de ordem finalizada não muda
--    c) item Concluído (102) não pode ser removido
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_block_finalized_order()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.finaled_at IS NOT NULL THEN
        RAISE EXCEPTION 'Viagem finalizada não pode ser alterada';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_finalized_order ON public.Orders;
CREATE TRIGGER trg_block_finalized_order
BEFORE UPDATE ON public.Orders
FOR EACH ROW
WHEN (OLD.finaled_at IS NOT NULL)
EXECUTE FUNCTION public.fn_block_finalized_order();

CREATE OR REPLACE FUNCTION public.fn_block_concluded_item_delete()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_code INT;
BEGIN
    SELECT code INTO v_code FROM public.Status WHERE id = OLD.status_id;
    IF v_code = 102 THEN
        RAISE EXCEPTION 'Nota/invoice concluída não pode ser removida da viagem';
    END IF;
    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_concluded_item_delete ON public.OrderItem;
CREATE TRIGGER trg_block_concluded_item_delete
BEFORE DELETE ON public.OrderItem
FOR EACH ROW
EXECUTE FUNCTION public.fn_block_concluded_item_delete();

-- ---------------------------------------------------------------------
-- 7. "Em Rota" automático ao chegar a data/hora agendada (pg_cron)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.start_due_orders()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE v_affected INT := 0;
BEGIN
    WITH due AS (
        SELECT o.id AS order_id, o.created_by,
               (SELECT s2.id FROM public.Status s2
                 WHERE s2.corporation_id = o.company_id AND s2.code = 110 LIMIT 1) AS rota_status
        FROM public.Orders o
        JOIN public.Status s ON s.id = o.status_id
        WHERE s.code = 100                       -- Em Aberto
          AND o.finaled_at IS NULL
          AND o.scheduled_start IS NOT NULL
          AND o.scheduled_start <= NOW()
    ), upd AS (
        UPDATE public.Orders o
        SET status_id = due.rota_status, updated_at = NOW()
        FROM due
        WHERE o.id = due.order_id AND due.rota_status IS NOT NULL
        RETURNING o.id, due.rota_status, due.created_by
    )
    INSERT INTO public.OrderStatusHistory (order_id, status_id, changed_by)
    SELECT id, rota_status, created_by FROM upd;

    GET DIAGNOSTICS v_affected = ROW_COUNT;
    RETURN v_affected;
END;
$$;

-- ⚠ Requer a extensão pg_cron habilitada no Supabase
--   (Dashboard → Database → Extensions → pg_cron).
-- Roda a cada minuto:
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('start-due-orders')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'start-due-orders');
    PERFORM cron.schedule('start-due-orders', '* * * * *',
                          'SELECT public.start_due_orders();');
  END IF;
END$$;
