CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TYPE VehicleType AS ENUM ('Truck','Carreta','Cavalo','Van','Vuc', 'Fiorino');
CREATE TYPE UserType AS ENUM ('Manager','Admin','Financer','Requestor','Driver','Commum');
CREATE TYPE OrderType AS ENUM ('Coleta','Entrega','Devolução','Reentrega', 'Avarias');
CREATE TYPE FuelType AS ENUM ('Diesel O500', 'Gasolina aditivada', 'Etanol', 'Diesel S10', 'Gasolina Comum');

CREATE TABLE Address(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    street VARCHAR(255) NOT NULL,
    neighborhood VARCHAR(255) NOT NULL,
    city VARCHAR(255) NOT NULL,
    state VARCHAR(255) NOT NULL,
    zip_code VARCHAR(20) NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


INSERT INTO Address (street, neighborhood, city, state, zip_code) VALUES
('Rua Agnaldo Ferreira Lopez, 05', 'Potuvera', 'São Paulo', 'SP', '06852-845'),
('Avenida Teste', 'Jardim Botânico', 'Rio de Janeiro', 'RJ', '23456-789'),
('Praça Modelo', 'Funcionários', 'Belo Horizonte', 'MG', '34567-890'),
('Av. Paulista, 1000', 'Centro','São Paulo', 'SP', '01310-100'),
('Rua Augusta, 500', 'Centro', 'São Paulo', 'SP', '01305-000');

CREATE INDEX idx_zip_code ON Address(zip_code);


CREATE TABLE Users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_user VARCHAR(255) NOT NULL,
    email_user VARCHAR(255) NOT NULL UNIQUE,
    password_user VARCHAR(255) NOT NULL,
    phone_user VARCHAR(20) NOT NULL,
    profile_user UserType NOT NULL DEFAULT 'Commum',
    avatar_url text default 'https://api.dicebear.com/7.x/bottts/svg',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES Users(id) ON DELETE CASCADE
);

CREATE INDEX idx_users_email ON Users(email_user);

GRANT ALL ON public.users TO supabase_auth_admin;
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (
    id,
    name_user,
    email_user,
    password_user,
    phone_user,
    profile_user,
    avatar_url,
    is_active,
    created_by
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name_user', 'Usuário Novo'),
    new.email,
    'managed_by_auth',
    COALESCE(new.raw_user_meta_data->>'phone_user', '(00) 0.0000-0000'),
    (COALESCE(new.raw_user_meta_data->>'profile_user', 'Commum'))::public.UserType,
    COALESCE(new.raw_user_meta_data->>'avatar_url', 'https://api.dicebear.com/7.x/bottts/svg'),
    TRUE,
    NULL
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();


INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at,
  last_sign_in_at, confirmation_token, recovery_token, email_change_token_new, email_change
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  extensions.gen_random_uuid(),
  'authenticated',
  'authenticated',
  'kevinklgvg@gmail.com',
  extensions.crypt('IsaKev@10', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"name_user":"Kevin Oliveira","profile_user":"Manager", "phone_user":"(11) 9.9577-8573", "document_user":"238.610.668-31"}',
  True,
  now(),
  now(),
  now(),
  '', '', '', ''
);


INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at,
  last_sign_in_at, confirmation_token, recovery_token, email_change_token_new, email_change
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  extensions.gen_random_uuid(),
  'authenticated',
  'authenticated',
  'milena.reis@flow.com.br',
  extensions.crypt('IsaKev@10', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"name_user":"Milena Reis","profile_user":"Commum", "phone":"(11) 9.9577-8572", "document_user":"238.610.668-32"}',
  False,
  now(),
  now(),
  now(),
  '', '', '', ''
);


INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at,
  last_sign_in_at, confirmation_token, recovery_token, email_change_token_new, email_change
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  extensions.gen_random_uuid(),
  'authenticated',
  'authenticated',
  'thamyres.doc@flow.com.br',
  extensions.crypt('IsaKev@10', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"name_user":"Thamyres Doc","profile_user":"Requestor", "phone_user":"(11) 9.9577-8571", "document_user":"238.610.668-33"}',
  False,
  now(),
  now(),
  now(),
  '', '', '', ''
);


INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at,
  last_sign_in_at, confirmation_token, recovery_token, email_change_token_new, email_change
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  extensions.gen_random_uuid(),
  'authenticated',
  'authenticated',
  'edson.barbosa@flow.com.br',
  extensions.crypt('IsaKev@10', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"name_user":"Edson Barbosa","profile_user":"Financer", "phone_user":"(11) 9.9577-8569", "document_user":"238.610.668-30"}',
  False,
  now(),
  now(),
  now(),
  '', '', '', ''
);


INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at,
  last_sign_in_at, confirmation_token, recovery_token, email_change_token_new, email_change
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  extensions.gen_random_uuid(),
  'authenticated',
  'authenticated',
  'cesar.filho@flow.com.br',
  extensions.crypt('IsaKev@10', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"name_user":"Cesar Filho","profile_user":"Driver", "phone_user":"(11) 9.9577-8540", "document_user":"138.610.668-34"}',
  False,
  now(),
  now(),
  now(),
  '', '', '', ''
);



CREATE TABLE Corporation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    cnpj VARCHAR(18) NOT NULL UNIQUE,
    address_id UUID NOT NULL REFERENCES Address(id) ON DELETE CASCADE,
    phone VARCHAR(20) NOT NULL,
    logo_url VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_corporation_cnpj ON Corporation(cnpj);

INSERT INTO Corporation (name, cnpj, address_id, phone, logo_url, is_active) VALUES(
    'Flow Transportes',
    '12.345.678/0001-99',
    (SELECT id FROM Address WHERE zip_code = '06852-845' LIMIT 1),
    '(14) 99741-1040',
    'https://www.transportesflow.com.br/lovable-uploads/181905e7-a700-4785-b4c7-181b13e7b387.png',
    TRUE
);


CREATE TABLE CorporationUsers (
    corporation_id UUID NOT NULL REFERENCES Corporation(id) ON DELETE CASCADE,
    manager_id UUID NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    PRIMARY KEY (corporation_id, manager_id)
);

INSERT INTO CorporationUsers (corporation_id, manager_id) VALUES (
    (SELECT id FROM Corporation WHERE cnpj = '12.345.678/0001-99' LIMIT 1),
    (SELECT id FROM Users WHERE email_user = 'cesar.filho@flow.com.br' LIMIT 1)
), (
    (SELECT id FROM Corporation WHERE cnpj = '12.345.678/0001-99' LIMIT 1),
    (SELECT id FROM Users WHERE email_user = 'edson.barbosa@flow.com.br' LIMIT 1)
), (
    (SELECT id FROM Corporation WHERE cnpj = '12.345.678/0001-99' LIMIT 1),
    (SELECT id FROM Users WHERE email_user = 'thamyres.doc@flow.com.br' LIMIT 1)
), (
    (SELECT id FROM Corporation WHERE cnpj = '12.345.678/0001-99' LIMIT 1),
    (SELECT id FROM Users WHERE email_user = 'milena.reis@flow.com.br' LIMIT 1)
), (
    (SELECT id FROM Corporation WHERE cnpj = '12.345.678/0001-99' LIMIT 1),
    (SELECT id FROM Users WHERE email_user = 'kevinklgvg@gmail.com' LIMIT 1)
);

CREATE TABLE Drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    cnh VARCHAR(20) NOT NULL UNIQUE,
    validade_cnh DATE NOT NULL,
    categoria_cnh VARCHAR(20) NOT NULL,
    mopp BOOLEAN NOT NULL default false,
    moop_validade DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES Users(id) ON DELETE CASCADE
);

INSERT INTo Drivers (user_id, cnh, validade_cnh, categoria_cnh, mopp, moop_validade, created_by) VALUES (
    (SELECT id FROM Users WHERE email_user = 'cesar.filho@flow.com.br' LIMIT 1),
    '12345678901',
    '2023-12-31',
    'C',
    False,
    '2023-12-31',
    (SELECT id FROM Users WHERE email_user = 'kevinklgvg@gmail.com' LIMIT 1)
);

CREATE TABLE Vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    make VARCHAR(150) NOT NULL,
    model VARCHAR(150) NOT NULL,
    year INT NOT NULL,
    type VehicleType DEFAULT 'Cavalo',
    license_plate VARCHAR(7) NOT NULL UNIQUE,
    capacity_fuel DECIMAL(10, 2),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_vehicles_license_plate ON Vehicles(license_plate);

INSERT INTO Vehicles (make, model, year, type, license_plate, is_active) VALUES
('Volvo', 'FH16', 2020, 'Cavalo', 'ABC1234', TRUE),
('Scania', 'R500', 2019, 'Carreta', 'DEF5678', TRUE),
('Mercedes-Benz', 'Actros', 2021, 'Cavalo', 'GHI9012', TRUE),
('Ford', 'Cargo 2429', 2018, 'Truck', 'JKL3456', TRUE),
('Volkswagen', 'Constellation 24.280', 2017, 'Truck', 'MNO7890', TRUE),
('Fiat', 'Ducato', 2020, 'Van', 'PQR2345', TRUE),
('Renault', 'Master', 2019, 'Van', 'STU6789', TRUE);


CREATE TABLE VehicleOwners (
    corporation_id UUID NOT NULL REFERENCES Corporation(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES Vehicles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    PRIMARY KEY (vehicle_id, corporation_id)
);

INSERT INTO VehicleOwners (corporation_id, vehicle_id, created_by) VALUES (
    (SELECT id FROM Corporation WHERE cnpj = '12.345.678/0001-99' LIMIT 1),
    (SELECT id FROM Vehicles WHERE license_plate = 'ABC1234' LIMIT 1),
    (SELECT id FROM Users WHERE email_user = 'kevinklgvg@gmail.com' LIMIT 1)
),
(
    (SELECT id FROM Corporation WHERE cnpj = '12.345.678/0001-99' LIMIT 1),
    (SELECT id FROM Vehicles WHERE license_plate = 'DEF5678' LIMIT 1),
    (SELECT id FROM Users WHERE email_user = 'kevinklgvg@gmail.com' LIMIT 1)
),
(
    (SELECT id FROM Corporation WHERE cnpj = '12.345.678/0001-99' LIMIT 1),
    (SELECT id FROM Vehicles WHERE license_plate = 'GHI9012' LIMIT 1),
    (SELECT id FROM Users WHERE email_user = 'kevinklgvg@gmail.com' LIMIT 1)
),
(
    (SELECT id FROM Corporation WHERE cnpj = '12.345.678/0001-99' LIMIT 1),
    (SELECT id FROM Vehicles WHERE license_plate = 'JKL3456' LIMIT 1),
    (SELECT id FROM Users WHERE email_user = 'kevinklgvg@gmail.com' LIMIT 1)
),
(
    (SELECT id FROM Corporation WHERE cnpj = '12.345.678/0001-99' LIMIT 1),
    (SELECT id FROM Vehicles WHERE license_plate = 'MNO7890' LIMIT 1),
    (SELECT id FROM Users WHERE email_user = 'kevinklgvg@gmail.com' LIMIT 1)
),
(
    (SELECT id FROM Corporation WHERE cnpj = '12.345.678/0001-99' LIMIT 1),
    (SELECT id FROM Vehicles WHERE license_plate = 'PQR2345' LIMIT 1),
    (SELECT id FROM Users WHERE email_user = 'kevinklgvg@gmail.com' LIMIT 1)
),
(
    (SELECT id FROM Corporation WHERE cnpj = '12.345.678/0001-99' LIMIT 1),
    (SELECT id FROM Vehicles WHERE license_plate = 'STU6789' LIMIT 1),
    (SELECT id FROM Users WHERE email_user = 'kevinklgvg@gmail.com' LIMIT 1)
);

CREATE TABLE Fuel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES Vehicles(id) ON DELETE CASCADE,
    gas_station_name VARCHAR(100),
    fuel_type FuelType NOT NULL DEFAULT 'Diesel S10',
    liters DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    unit_price DECIMAL(10, 2) GENERATED ALWAYS AS (total_price / liters) STORED
    current_odometer INT NOT NULL,
    is_full_tank BOOLEAN NOT NULL DEFAULT TRUE,
    date_fuel DATE NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES Users(id)
);

CREATE INDEX idx_fuel_vehicle_date ON Fuel (vehicle_id, created_at DESC);

INSERT INTO Fuel (
    vehicle_id,
    fuel_type,
    liters,
    unit_price,
    total_price,
    current_odometer,
    is_full_tank,
    gas_station_name,
    created_by
) VALUES
(
    (SELECT id FROM Vehicles WHERE license_plate = 'ABC1234' LIMIT 1),
    'Gasolina', 45.50, 5.80, 263.90, 12500, TRUE, 'Posto Shell Central',
    (SELECT id FROM Users WHERE email_user = 'kevinklgvg@gmail.com' LIMIT 1)
),
(
    (SELECT id FROM Vehicles WHERE license_plate = 'DEF5678' LIMIT 1),
    'Etanol', 38.20, 5.80, 221.56, 34200, TRUE, 'Posto Ipiranga Rodo',
    (SELECT id FROM Users WHERE email_user = 'kevinklgvg@gmail.com' LIMIT 1)
),
(
    (SELECT id FROM Vehicles WHERE license_plate = 'GHI9012' LIMIT 1),
    'Gasolina', 50.00, 5.80, 290.00, 8910, TRUE, 'Auto Posto BR 101',
    (SELECT id FROM Users WHERE email_user = 'kevinklgvg@gmail.com' LIMIT 1)
),
(
    (SELECT id FROM Vehicles WHERE license_plate = 'JKL3456' LIMIT 1),
    'Diesel S10', 42.15, 5.80, 244.47, 51650, TRUE, 'Posto Graal Sul',
    (SELECT id FROM Users WHERE email_user = 'kevinklgvg@gmail.com' LIMIT 1)
),
(
    (SELECT id FROM Vehicles WHERE license_plate = 'MNO7890' LIMIT 1),
    'Diesel S10', 55.00, 5.80, 319.00, 120400, TRUE, 'Posto Graal Sul',
    (SELECT id FROM Users WHERE email_user = 'kevinklgvg@gmail.com' LIMIT 1)
),
(
    (SELECT id FROM Vehicles WHERE license_plate = 'PQR2345' LIMIT 1),
    'Gasolina', 35.80, 5.80, 207.64, 23150, TRUE, 'Posto Shell Central',
    (SELECT id FROM Users WHERE email_user = 'kevinklgvg@gmail.com' LIMIT 1)
),
(
    (SELECT id FROM Vehicles WHERE license_plate = 'STU6789' LIMIT 1),
    'Diesel S10', 48.90, 5.80, 283.62, 41320, TRUE, 'Auto Posto BR 101',
    (SELECT id FROM Users WHERE email_user = 'kevinklgvg@gmail.com' LIMIT 1)
),

(
    (SELECT id FROM Vehicles WHERE license_plate = 'ABC1234' LIMIT 1),
    'Gasolina', 44.10, 5.80, 255.78, 13120, TRUE, 'Posto Ipiranga Rodo',
    (SELECT id FROM Users WHERE email_user = 'kevinklgvg@gmail.com' LIMIT 1)
),

(
    (SELECT id FROM Vehicles WHERE license_plate = 'DEF5678' LIMIT 1),
    'Etanol', 39.50, 5.80, 229.10, 34850, TRUE, 'Posto Ipiranga Rodo',
    (SELECT id FROM Users WHERE email_user = 'kevinklgvg@gmail.com' LIMIT 1)
),

(
    (SELECT id FROM Vehicles WHERE license_plate = 'GHI9012' LIMIT 1),
    'Gasolina', 52.30, 5.80, 303.34, 9540, TRUE, 'Posto Shell Central',
    (SELECT id FROM Users WHERE email_user = 'kevinklgvg@gmail.com' LIMIT 1)
);

CREATE TABLE Status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code integer NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(255) NOT NULL,
    corporation_id UUID NOT NULL REFERENCES Corporation(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES Users(id) ON DELETE CASCADE
);

INSERT INTO Status (code, name, description, corporation_id, created_by) VALUES
(
    1,
    'Produto Entregue',
    'Mercadoria entregue ao cliente',
    (SELECT id FROM Corporation WHERE cnpj = '12.345.678/0001-99' LIMIT 1),
    (SELECT id FROM Users WHERE email_user = 'kevinklgvg@gmail.com' LIMIT 1)
),
(
    22,
    'Mercadoria em Trânsito',
    'Produto em trânsito para o cliente',
    (SELECT id FROM Corporation WHERE cnpj = '12.345.678/0001-99' LIMIT 1),
    (SELECT id FROM Users WHERE email_user = 'kevinklgvg@gmail.com' LIMIT 1)
),
(
    5,
    'Coleta Realizada',
    'Produto aguardando retirada pelo cliente',
    (SELECT id FROM Corporation WHERE cnpj = '12.345.678/0001-99' LIMIT 1),
    (SELECT id FROM Users WHERE email_user = 'kevinklgvg@gmail.com' LIMIT 1)
),
(
    10,
    'Retorno de mercadoria',
    'Produto aguardando envio para o cliente',
    (SELECT id FROM Corporation WHERE cnpj = '12.345.678/0001-99' LIMIT 1),
    (SELECT id FROM Users WHERE email_user = 'kevinklgvg@gmail.com' LIMIT 1)
);

CREATE INDEX idx_fuel_corporation_vehicle ON Fuel (corporation_id, vehicle_id, created_at DESC);


CREATE TABLE Clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document VARCHAR(14) NOT NULL UNIQUE, -- CNPJ ou CPF
    name_client VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    password_client VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES Users(id) ON DELETE CASCADE
);




CREATE TABLE Invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES Clients(id),
    barcode VARCHAR(44) NOT NULL,
    nfe VARCHAR(20) NOT NULL,
    serie_nf VARCHAR(20) NOT NULL,
    cte VARCHAR(20) NOT NULL,
    cte_value DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    value_nfe DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    issuer_id UUID NOT NULL REFERENCES Clients(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES Clients(id) ON DELETE CASCADE,
    issue_date DATE NOT NULL,
    nature_transaction VARCHAR(255) NOT NULL,
    weight_brute VARCHAR(255) NOT NULL,
    quantity_volumes VARCHAR(255) NOT NULL,
    observation VARCHAR(255) NOT NULL,
    xml_nfe_url VARCHAR(255) NOT NULL,
    xml_cte_url VARCHAR(255) NOT NULL,
    created_by UUID NOT NULL REFERENCES Users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    corporation_id UUID NOT NULL REFERENCES Corporation(id) ON DELETE CASCADE
);

CREATE TABLE Orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES Corporation(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES Users(id),
    status_id UUID NOT NULL REFERENCES Status(id) ON DELETE CASCADE
);



CREATE TABLE OrderItem(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES Corporation(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES Invoices(id) ON DELETE CASCADE,
    type_orders OrderType NOT NULL DEFAULT 'Entrega',
    tracking VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    status_id UUID NOT NULL REFERENCES Status(id) ON DELETE CASCADE
);

CREATE TABLE OrderReceipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES Corporation(id)ON DELETE CASCADE,
    order_item_id UUID NOT NULL REFERENCES OrderItem(id) ON DELETE CASCADE,
    url VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES Users(id)
);

CREATE TABLE TrackingEvents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_item_id UUID REFERENCES OrderItem(id) ON DELETE CASCADE,
    location_item TEXT,
    description_item TEXT,
    status_id UUID NOT NULL REFERENCES Status(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES Users(id)
);

CREATE TABLE Order_add_itens (
    order_id UUID NOT NULL REFERENCES Orders(id) ON DELETE CASCADE,
    order_item_id UUID NOT NULL REFERENCES OrderItem(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (order_id, order_item_id)
);
