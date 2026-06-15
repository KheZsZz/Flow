-- =====================================================================
-- Coletas: data de finalização (finaled_at)
-- Preenchida automaticamente quando o status da coleta vira Concluído (102);
-- limpa se a coleta voltar para um status aberto.
-- Destino: supabase/migrations/20260615130000_coletas_finaled.sql
-- =====================================================================

ALTER TABLE public.Collections
    ADD COLUMN IF NOT EXISTS finaled_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.fn_collection_set_finaled()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_code INT;
BEGIN
    SELECT code INTO v_code FROM public.Status WHERE id = NEW.status_id;

    IF v_code = 102 THEN
        IF NEW.finaled_at IS NULL THEN
            NEW.finaled_at := NOW();
        END IF;
    ELSE
        -- reabriu / mudou para status não-concluído
        NEW.finaled_at := NULL;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_collection_set_finaled ON public.Collections;
CREATE TRIGGER trg_collection_set_finaled
    BEFORE INSERT OR UPDATE OF status_id ON public.Collections
    FOR EACH ROW EXECUTE FUNCTION public.fn_collection_set_finaled();
