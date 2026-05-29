-- supabase/migrations/20260530000002_trigger_item_status_tracking.sql

CREATE OR REPLACE FUNCTION handle_order_item_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.status_id IS DISTINCT FROM NEW.status_id) THEN
    INSERT INTO TrackingEvents (
      order_item_id,
      status_id,
      description_item,
      created_by
    )
    VALUES (
      NEW.id,
      NEW.status_id,
      (SELECT name FROM Status WHERE id = NEW.status_id),
      NEW.created_by
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_order_item_status_changed ON public.OrderItem;
CREATE TRIGGER on_order_item_status_changed
  AFTER UPDATE ON public.OrderItem
  FOR EACH ROW
  EXECUTE PROCEDURE handle_order_item_status_change();
