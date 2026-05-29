CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS set_timestamp_address ON public.Address;
CREATE TRIGGER set_timestamp_address BEFORE UPDATE ON public.Address FOR EACH ROW EXECUTE PROCEDURE public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_corporate ON public.Corporation;
CREATE TRIGGER set_timestamp_corporate BEFORE UPDATE ON public.Corporation FOR EACH ROW EXECUTE PROCEDURE public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_users ON public.Users;
CREATE TRIGGER set_timestamp_users BEFORE UPDATE ON public.Users FOR EACH ROW EXECUTE PROCEDURE public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_drivers ON public.Drivers;
CREATE TRIGGER set_timestamp_drivers BEFORE UPDATE ON public.Drivers FOR EACH ROW EXECUTE PROCEDURE public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_vehicles ON public.Vehicles;
CREATE TRIGGER set_timestamp_vehicles BEFORE UPDATE ON public.Vehicles FOR EACH ROW EXECUTE PROCEDURE public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_fuel ON public.Fuel;
CREATE TRIGGER set_timestamp_fuel BEFORE UPDATE ON public.Fuel FOR EACH ROW EXECUTE PROCEDURE public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_clients ON public.Clients;
CREATE TRIGGER set_timestamp_clients BEFORE UPDATE ON public.Clients FOR EACH ROW EXECUTE PROCEDURE public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_status ON public.Status;
CREATE TRIGGER set_timestamp_status BEFORE UPDATE ON public.Status FOR EACH ROW EXECUTE PROCEDURE public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_invoices ON public.Invoices;
CREATE TRIGGER set_timestamp_invoices BEFORE UPDATE ON public.Invoices FOR EACH ROW EXECUTE PROCEDURE public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_orders ON public.Orders;
CREATE TRIGGER set_timestamp_orders BEFORE UPDATE ON public.Orders FOR EACH ROW EXECUTE PROCEDURE public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_orderItem ON public.OrderItem;
CREATE TRIGGER set_timestamp_orderItem BEFORE UPDATE ON public.OrderItem FOR EACH ROW EXECUTE PROCEDURE public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_orderReceipts ON public.OrderReceipts;
CREATE TRIGGER set_timestamp_orderReceipts BEFORE UPDATE ON public.OrderReceipts FOR EACH ROW EXECUTE PROCEDURE public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_trackingEvents ON public.TrackingEvents;
CREATE TRIGGER set_timestamp_trackingEvents BEFORE UPDATE ON public.TrackingEvents FOR EACH ROW EXECUTE PROCEDURE public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_order_add_itens ON public.Order_add_itens;
CREATE TRIGGER set_timestamp_order_add_itens BEFORE UPDATE ON public.Order_add_itens FOR EACH ROW EXECUTE PROCEDURE public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_vehicleOwners ON public.VehicleOwners;
CREATE TRIGGER set_timestamp_vehicleOwners BEFORE UPDATE ON public.VehicleOwners FOR EACH ROW EXECUTE PROCEDURE public.trigger_set_timestamp();
