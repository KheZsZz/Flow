
CREATE OR REPLACE FUNCTION handle_order_status_auto()
RETURNS TRIGGER AS $$
DECLARE
  v_order_id        UUID;
  v_corporation_id  UUID;
  v_total           INT;
  v_concluded       INT;
  v_cancelled       INT;
  v_in_progress     INT;
  v_status_id       UUID;
  v_status_code     INT;
BEGIN
  SELECT order_id INTO v_order_id
  FROM Order_add_itens
  WHERE order_item_id = NEW.id
  LIMIT 1;

  IF v_order_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT company_id INTO v_corporation_id
  FROM Orders WHERE id = v_order_id;

  SELECT
    COUNT(*)                                                          AS total,
    COUNT(*) FILTER (WHERE s.code = 102)                             AS concluded,
    COUNT(*) FILTER (WHERE s.code = 103)                             AS cancelled,
    COUNT(*) FILTER (WHERE s.code NOT IN (102, 103))                 AS in_progress
  INTO v_total, v_concluded, v_cancelled, v_in_progress
  FROM Order_add_itens oai
  JOIN OrderItem oi ON oi.id = oai.order_item_id
  JOIN Status s     ON s.id  = oi.status_id
  WHERE oai.order_id = v_order_id;

  -- Define o novo status da ordem
  v_status_code :=
    CASE
      WHEN v_total > 0 AND v_concluded = v_total                    THEN 102  -- todos concluídos
      WHEN v_total > 0 AND v_cancelled = v_total                    THEN 103  -- todos cancelados
      WHEN v_total > 0 AND v_concluded + v_cancelled = v_total      THEN 102  -- concluídos + cancelados = fecha
      WHEN v_in_progress > 0                                        THEN 101  -- algum em andamento
      ELSE NULL
    END;

  IF v_status_code IS NULL THEN
    RETURN NEW;
  END IF;

  -- Busca o UUID do status calculado
  SELECT id INTO v_status_id
  FROM Status
  WHERE corporation_id = v_corporation_id
    AND code = v_status_code
  LIMIT 1;

  IF v_status_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Só atualiza se o status realmente mudou
  UPDATE Orders
  SET status_id = v_status_id
  WHERE id = v_order_id
    AND status_id IS DISTINCT FROM v_status_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_order_item_status_auto ON public.OrderItem;
CREATE TRIGGER on_order_item_status_auto
  AFTER UPDATE ON public.OrderItem
  FOR EACH ROW
  EXECUTE PROCEDURE handle_order_status_auto();
