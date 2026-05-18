CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_address ON Address;
CREATE TRIGGER set_timestamp_address BEFORE UPDATE ON Address FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();


DROP TRIGGER IF EXISTS set_timestamp_users ON Users;
CREATE TRIGGER set_timestamp_users BEFORE UPDATE ON Users FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();


DROP TRIGGER IF EXISTS set_timestamp_corporate ON Corporate;
CREATE TRIGGER set_timestamp_corporate BEFORE UPDATE ON Corporate FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();


DROP TRIGGER IF EXISTS set_timestamp_vehicles ON Vehicles;
CREATE TRIGGER set_timestamp_vehicles BEFORE UPDATE ON Vehicles FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();


DROP TRIGGER IF EXISTS set_timestamp_vehicleOwners ON VehicleOwners;
CREATE TRIGGER set_timestamp_vehicleOwners BEFORE UPDATE ON VehicleOwners FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();


DROP TRIGGER IF EXISTS set_timestamp_clients ON Clients;
CREATE TRIGGER set_timestamp_clients BEFORE UPDATE ON Clients FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_status ON Status;
CREATE TRIGGER set_timestamp_status BEFORE UPDATE ON Status FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();


DROP TRIGGER IF EXISTS set_timestamp_invoices ON Invoices;
CREATE TRIGGER set_timestamp_invoices BEFORE UPDATE ON Invoices FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();


DROP TRIGGER IF EXISTS set_timestamp_orders ON Orders;
CREATE TRIGGER set_timestamp_orders BEFORE UPDATE ON Orders FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();


DROP TRIGGER IF EXISTS set_timestamp_orderReceipts ON OrderReceipts;
CREATE TRIGGER set_timestamp_orderReceipts BEFORE UPDATE ON OrderReceipts FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();


DROP TRIGGER IF EXISTS set_timestamp_orderItem ON OrderItem;
CREATE TRIGGER set_timestamp_orderItem BEFORE UPDATE ON OrderItem FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();
