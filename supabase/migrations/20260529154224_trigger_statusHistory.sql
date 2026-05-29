CREATE OR REPLACE FUNCTION public.handle_order_status_history()
RETURNS trigger AS $$
BEGIN
    IF (OLD.status_id IS DISTINCT FROM NEW.status_id) THEN
        INSERT INTO public.OrderStatusHistory (
            order_id,
            status_id,
            changed_at,
            changed_by
        )
        VALUES (
            NEW.id,
            NEW.status_id,
            NOW(),
            NEW.created_by
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


DROP TRIGGER IF EXISTS on_order_status_changed ON public.Orders;
CREATE TRIGGER on_order_status_changed
    AFTER UPDATE ON public.Orders
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_order_status_history();
