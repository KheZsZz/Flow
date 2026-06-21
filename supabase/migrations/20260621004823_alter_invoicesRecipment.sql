-- =====================================================================
-- Notas: status de entrega + comprovante/canhoto (Tópico 4 - alternativa A)
--
-- Regra:
--   - Quando a nota é finalizada na viagem (item da viagem concluído, code 102),
--     marcamos invoices.delivered_at -> na listagem vira "Aguardando comprovante".
--   - Quando o canhoto é enviado, invoices.comprovante_url é preenchido ->
--     vira "Finalizada".
--
-- Destino: supabase/migrations/20260619130000_invoice_comprovante.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Colunas de comprovante / entrega na nota
-- ---------------------------------------------------------------------
ALTER TABLE public.Invoices
  ADD COLUMN IF NOT EXISTS comprovante_url         TEXT,
  ADD COLUMN IF NOT EXISTS comprovante_uploaded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at            TIMESTAMPTZ;

-- ---------------------------------------------------------------------
-- 2. Propagação de conclusão: agora cobre COLETA e NOTA.
--    (estende a função do Tópico 1; CREATE OR REPLACE é idempotente)
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
    SELECT code INTO v_new_code FROM public.Status WHERE id = NEW.status_id;
    IF v_new_code IS DISTINCT FROM 102 THEN
        RETURN NEW;
    END IF;

    -- Coleta -> Concluído (102) + finaled_at
    IF NEW.collection_id IS NOT NULL THEN
        SELECT corporation_id INTO v_corp
        FROM public.Collections WHERE id = NEW.collection_id;

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
    END IF;

    -- Nota fiscal -> marca entrega (delivered_at); aguarda o comprovante
    IF NEW.invoice_id IS NOT NULL THEN
        UPDATE public.Invoices
           SET delivered_at = COALESCE(delivered_at, NOW()),
               updated_at   = NOW()
         WHERE id = NEW.invoice_id
           AND delivered_at IS NULL;
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
-- 3. Backfill: notas vinculadas a itens já concluídos
-- ---------------------------------------------------------------------
UPDATE public.Invoices inv
SET delivered_at = NOW(),
    updated_at   = NOW()
FROM public.OrderItem oi
JOIN public.Status s ON s.id = oi.status_id AND s.code = 102
WHERE oi.invoice_id = inv.id
  AND inv.delivered_at IS NULL;

-- ---------------------------------------------------------------------
-- 4. Bucket de comprovantes (Storage) — espelha o padrão do 'avatars'
-- ---------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('comprovantes', 'comprovantes', TRUE)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "comprovantes_public_read" ON storage.objects;
CREATE POLICY "comprovantes_public_read"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'comprovantes');

-- upload real é feito pelo backend (service_role ignora RLS); estas liberam
-- também upload/atualização autenticada direta, se um dia precisar.
DROP POLICY IF EXISTS "comprovantes_auth_write" ON storage.objects;
CREATE POLICY "comprovantes_auth_write"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'comprovantes');

DROP POLICY IF EXISTS "comprovantes_auth_update" ON storage.objects;
CREATE POLICY "comprovantes_auth_update"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'comprovantes');