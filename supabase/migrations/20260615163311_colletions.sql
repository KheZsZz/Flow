-- =====================================================================
-- Coletas — ordens de coleta emitidas e vinculadas a uma viagem
-- Cria: tabela Collections, vínculo OrderItem.collection_id (XOR invoice_id),
--       sequência de código legível, trigger updated_at e atualiza a RPC
--       create_order para aceitar itens de coleta.
-- Destino: supabase/migrations/20260615120000_coletas.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Sequência para o código legível da coleta (COL-000001, COL-000002...)
-- ---------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.collection_code_seq;

-- ---------------------------------------------------------------------
-- 2. Tabela Collections
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.Collections (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    corporation_id UUID NOT NULL REFERENCES public.Corporation(id) ON DELETE RESTRICT,
    code           TEXT NOT NULL
                   DEFAULT ('COL-' || lpad(nextval('public.collection_code_seq')::text, 6, '0')),
    client_id      UUID NOT NULL REFERENCES public.Clients(id)   ON DELETE RESTRICT,
    address_id     UUID          REFERENCES public.Address(id)   ON DELETE SET NULL,
    description    VARCHAR(500),
    scheduled_date TIMESTAMPTZ,
    status_id      UUID NOT NULL REFERENCES public.Status(id)    ON DELETE RESTRICT,
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by     UUID NOT NULL REFERENCES public.Users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_collections_code
    ON public.Collections (corporation_id, code);
CREATE INDEX IF NOT EXISTS idx_collections_corp
    ON public.Collections (corporation_id);
CREATE INDEX IF NOT EXISTS idx_collections_client
    ON public.Collections (client_id);

-- updated_at automático (reusa a função já existente trigger_set_timestamp)
DROP TRIGGER IF EXISTS set_timestamp_collections ON public.Collections;
CREATE TRIGGER set_timestamp_collections
    BEFORE UPDATE ON public.Collections
    FOR EACH ROW EXECUTE PROCEDURE public.trigger_set_timestamp();

-- ---------------------------------------------------------------------
-- 3. OrderItem — origem passa a ser nota OU coleta (XOR)
--    Linhas existentes têm invoice_id preenchido e collection_id NULL,
--    então o CHECK (num_nonnulls = 1) não viola dados atuais.
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

-- uma coleta só pode estar vinculada a um único item de viagem
CREATE UNIQUE INDEX IF NOT EXISTS uniq_orderitem_collection
    ON public.OrderItem (collection_id)
    WHERE collection_id IS NOT NULL;

-- ---------------------------------------------------------------------
-- 4. create_order — aceitar itens de coleta (collection_id) além de nota
--    Mantém todo o resto da função idêntico à versão atual.
--    type_orders NÃO recebe COALESCE para um literal: o valor vem do app
--    (OrderTypeSchema) e o enum real é a fonte da verdade.
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
