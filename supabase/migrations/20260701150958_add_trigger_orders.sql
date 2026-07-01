-- Registro de rastreio: grava CADA mudança de status do item em
-- TrackingEvents (data/hora de cada definição). Faltava no banco vivo.
-- Idempotente.

CREATE OR REPLACE FUNCTION public.fn_log_item_status_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT;
BEGIN
  SELECT name INTO v_name FROM public.Status WHERE id = NEW.status_id;

  INSERT INTO public.TrackingEvents
    (order_item_id, status_id, description_item, created_at, updated_at, created_by)
  VALUES (
    NEW.id,
    NEW.status_id,
    v_name,
    clock_timestamp(),   -- distingue eventos na mesma transação (112 -> 200)
    clock_timestamp(),
    COALESCE(auth.uid(), NEW.created_by)
  );
  RETURN NEW;
END;
$$;

-- Nome "trg_00_" garante que este AFTER dispare antes do trg_auto_await_canhoto,
-- preservando a ordem cronológica quando há avanço automático na mesma transação.
DROP TRIGGER IF EXISTS trg_00_log_status_event ON public.OrderItem;
CREATE TRIGGER trg_00_log_status_event
AFTER UPDATE OF status_id ON public.OrderItem
FOR EACH ROW
WHEN (NEW.status_id IS DISTINCT FROM OLD.status_id)
EXECUTE FUNCTION public.fn_log_item_status_event();

-- Backfill: itens já em rota (110) sem evento ganham o evento inicial.
INSERT INTO public.TrackingEvents
  (order_item_id, status_id, description_item, created_at, updated_at, created_by)
SELECT oi.id, oi.status_id, s.name, NOW(), NOW(), oi.created_by
FROM public.OrderItem oi
JOIN public.Status s ON s.id = oi.status_id
WHERE s.code = 110
  AND NOT EXISTS (
    SELECT 1 FROM public.TrackingEvents te WHERE te.order_item_id = oi.id
  );

NOTIFY pgrst, 'reload schema';
