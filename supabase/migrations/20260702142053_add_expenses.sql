CREATE TYPE ExpenseCategory AS ENUM ('Operacional', 'Administrativo');

CREATE TABLE expense_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corporation_id UUID NOT NULL REFERENCES Corporation(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  category ExpenseCategory NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES Users(id)
);

CREATE TABLE operational_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corporation_id UUID NOT NULL REFERENCES Corporation(id) ON DELETE CASCADE,
  expense_type_id UUID NOT NULL REFERENCES expense_types(id) ON DELETE RESTRICT,
  order_id UUID REFERENCES Orders(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES Vehicles(id) ON DELETE SET NULL,
  description TEXT,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  expense_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  receipt_url VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES Users(id)
);

CREATE TABLE administrative_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corporation_id UUID NOT NULL REFERENCES Corporation(id) ON DELETE CASCADE,
  expense_type_id UUID NOT NULL REFERENCES expense_types(id) ON DELETE RESTRICT,
  department VARCHAR(150),
  description TEXT,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  expense_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  receipt_url VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES Users(id)
);

CREATE TABLE maintenances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corporation_id UUID NOT NULL REFERENCES Corporation(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES Vehicles(id) ON DELETE RESTRICT,
  maintenance_type VARCHAR(150) NOT NULL,
  description TEXT,
  cost NUMERIC(12,2) NOT NULL CHECK (cost >= 0),
  odometer INT,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  next_due_at TIMESTAMPTZ,
  receipt_url VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES Users(id)
);

-- triggers de updated_at, seguindo o padrão já usado nas outras tabelas
CREATE TRIGGER set_timestamp_expense_types BEFORE UPDATE ON expense_types FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();
CREATE TRIGGER set_timestamp_operational_expenses BEFORE UPDATE ON operational_expenses FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();
CREATE TRIGGER set_timestamp_administrative_expenses BEFORE UPDATE ON administrative_expenses FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();
CREATE TRIGGER set_timestamp_maintenances BEFORE UPDATE ON maintenances FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

NOTIFY pgrst, 'reload schema';
