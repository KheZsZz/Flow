ALTER TABLE public.Orders DROP COLUMN IF EXISTS vehicle_id;

CREATE TABLE IF NOT EXISTS public.OrderVehicles (
    order_id UUID NOT NULL REFERENCES public.Orders(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES public.Vehicles(id) ON DELETE RESTRICT,
    PRIMARY KEY (order_id, vehicle_id)
);

CREATE OR REPLACE FUNCTION public.create_order(
    p_corporation_id UUID,
    p_created_by UUID,
    p_status_id UUID,
    p_driver_id UUID,
    p_delivery_date TIMESTAMPTZ,
    p_notes TEXT,
    p_vehicles UUID[], -- Array contendo os IDs de até 3 veículos/placas
    p_items JSONB      -- Array JSON com os itens/invoices da ordem
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id UUID;
    v_item RECORD;
    v_response JSONB;
BEGIN
    -- 1. Inserir a Ordem Principal
    INSERT INTO public.Orders (
        company_id,
        driver_id,
        status_id,
        created_by,
        created_at
    )
    VALUES (
        p_corporation_id,
        p_driver_id,
        p_status_id,
        p_created_by,
        p_delivery_date  -- Usando a data de entrega informada ou ajustando conforme seu fluxo
    )
    RETURNING id INTO v_order_id;

    -- 2. Vincular os Veículos (Armazena até 3 placas passadas no array)
    IF p_vehicles IS NOT NULL AND array_length(p_vehicles, 1) > 0 THEN
        INSERT INTO public.OrderVehicles (order_id, vehicle_id)
        SELECT v_order_id, unnest(p_vehicles);
    END IF;

    -- 3. Loop para ler os Itens do JSONB e inserir nas tabelas correspondentes
    IF p_items IS NOT NULL AND jsonb_array_length(p_items) > 0 THEN
        FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items)
            AS x(invoice_id UUID, type_orders public.OrderType, tracking VARCHAR(255), status_id UUID)
        LOOP
            -- Insere o Item da Ordem
            INSERT INTO public.OrderItem (
                company_id,
                invoice_id,
                type_orders,
                tracking,
                status_id,
                created_by
            )
            VALUES (
                p_corporation_id,
                v_item.invoice_id,
                v_item.type_orders,
                v_item.tracking,
                v_item.status_id,
                p_created_by
            );

            -- Vincula na tabela de relacionamento se você utilizar a Order_add_itens
            -- INSERT INTO public.Order_add_itens (order_id, order_item_id) VALUES (v_order_id, ...);
        END LOOP;
    END IF;

    -- 4. Montar o retorno de sucesso
    SELECT jsonb_build_object(
        'order_id', v_order_id,
        'message', 'Ordem de serviço gerada com sucesso!',
        'vehicles_linked', array_length(p_vehicles, 1)
    ) INTO v_response;

    RETURN v_response;

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Erro ao criar ordem: %', SQLERRM;
END;
$$;
