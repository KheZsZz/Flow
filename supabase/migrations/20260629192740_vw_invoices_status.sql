-- =====================================================================
-- View de status de entrega das notas (Opção 2 — banco-cêntrico)
--   finalizada             -> comprovante_url preenchido (canhoto recebido)
--   aguardando_comprovante -> delivered_at preenchido (item baixado, code 102)
--   em_rota                -> nota em viagem iniciada (Orders code 101/110, não finalizada)
--   carga                  -> demais (recém-importada, sem viagem ativa)
-- Pré-req: 20260621004823_alter_invoicesRecipment.sql aplicada + Status code 110.
-- =====================================================================

CREATE OR REPLACE VIEW public.vw_invoices_delivery
WITH (security_invoker = true) AS
SELECT
  i.*,
  CASE
    WHEN i.comprovante_url IS NOT NULL THEN 'finalizada'
    WHEN i.delivered_at    IS NOT NULL THEN 'aguardando_comprovante'
    WHEN EXISTS (
      SELECT 1
      FROM public.OrderItem       oi
      JOIN public.Order_add_itens oai ON oai.order_item_id = oi.id
      JOIN public.Orders          o   ON o.id  = oai.order_id
      JOIN public.Status          s   ON s.id  = o.status_id
      WHERE oi.invoice_id = i.id
        AND o.finaled_at IS NULL
        AND s.code IN (101, 110)   -- Em Andamento / Em Rota
    ) THEN 'em_rota'
    ELSE 'carga_base'
  END AS delivery_status
FROM public.Invoices i;

GRANT SELECT ON public.vw_invoices_delivery TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
