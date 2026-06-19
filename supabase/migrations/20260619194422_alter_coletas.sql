-- =====================================================================
-- Propagação de conclusão (Tópico 1 - alternativa A)
--
-- Quando um item de viagem (OrderItem) é concluído (Status code 102),
-- a Coleta vinculada (collection_id) passa a "Concluído" (102) + finaled_at.
-- Assim a coleta aparece como FINALIZADA na listagem e fica travada para
-- edição/exclusão (a trava de edição por code 102 já existe no controller).
--
-- Observação: Notas/Invoices ficam para o Tópico 4 (em espera). Este
-- gatilho só age sobre itens de COLETA (collection_id IS NOT NULL).
--
-- Destino: supabase/migrations/20260619120000_propagate_collection_conclusion.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Função de propagação
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_propagate_item_conclusion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_new_code   INT;
    v_corp       UUID;
    v_status_102 UUID;
BEGIN
    -- só age quando o item passou a Concluído (102)
    SELECT code INTO v_new_code FROM public.Status WHERE id = NEW.status_id;
    IF v_new_code IS DISTINCT FROM 102 THEN
        RETURN NEW;
    END IF;

    -- por enquanto, apenas Coletas (Notas = Tópico 4)
    IF NEW.collection_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT corporation_id INTO v_corp
    FROM public.Collections
    WHERE id = NEW.collection_id;

    SELECT id INTO v_status_102
    FROM public.Status
    WHERE corporation_id = v_corp AND code = 102
    LIMIT 1;

    IF v_status_102 IS NOT NULL THEN
        UPDATE public.Collections
           SET status_id  = v_status_102,
               finaled_at = COALESCE(finaled_at, NOW()),
               updated_at = NOW()
         WHERE id = NEW.collection_id
           AND finaled_at IS NULL;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_propagate_item_conclusion ON public.OrderItem;
CREATE TRIGGER trg_propagate_item_conclusion
AFTER UPDATE OF status_id ON public.OrderItem
FOR EACH ROW
EXECUTE FUNCTION public.fn_propagate_item_conclusion();

-- ---------------------------------------------------------------------
-- 2. Backfill: coletas vinculadas a itens JÁ concluídos antes deste gatilho
-- ---------------------------------------------------------------------
WITH done AS (
    SELECT DISTINCT oi.collection_id, c.corporation_id
    FROM public.OrderItem oi
    JOIN public.Status s      ON s.id = oi.status_id AND s.code = 102
    JOIN public.Collections c ON c.id = oi.collection_id
    WHERE oi.collection_id IS NOT NULL
      AND c.finaled_at IS NULL
)
UPDATE public.Collections c
SET status_id  = (
        SELECT st.id FROM public.Status st
        WHERE st.corporation_id = done.corporation_id AND st.code = 102
        LIMIT 1
    ),
    finaled_at = NOW(),
    updated_at = NOW()
FROM done
WHERE c.id = done.collection_id;
