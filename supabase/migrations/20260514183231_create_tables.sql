CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TYPE VehicleType AS ENUM (
    'Truck',
    'Carreta',
    'Cavalo',
    'Van',
    'Vuc',
    'Fiorino'
);

CREATE TYPE UserType AS ENUM (
    'Manager',
    'Admin',
    'Financer',
    'Requestor'
    'Driver',
    'Commum'
);

CREATE TYPE OrderType AS ENUM (
    'Coleta',
    'Entrega',
    'Devolução',
    'Reentrega',
    'Avarias'
);

-- *** Revisar a necessidade de guardar o endereço de forma separada dos clientes e NFs
CREATE TABLE Address(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    street VARCHAR(255) NOT NULL,
    city VARCHAR(255) NOT NULL,
    state VARCHAR(255) NOT NULL,
    zip_code VARCHAR(20) NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE Users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_user VARCHAR(14) NOT NULL UNIQUE,
    name_user VARCHAR(255) NOT NULL,
    email_user VARCHAR(255) NOT NULL UNIQUE,
    password_user VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    profile UserType NOT NULL DEFAULT 'Commum',
    avatar_url text default 'https://png.pngtree.com/png-clipart/20200224/original/pngtree-avatar-icon-profile-icon-member-login-vector-isolated-png-image_5247852.jpg',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    corporation_id UUID NOT NULL REFERENCES Corporations(id) ON DELETE CASCADE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
);

CREATE INDEX idx_users_email ON Users(email_user);

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
    created_by UUID NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
);


CREATE TABLE Corporation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    cnpj VARCHAR(14) NOT NULL UNIQUE,
    address_id UUID NOT NULL REFERENCES Address(id) ON DELETE CASCADE,
    phone VARCHAR(20) NOT NULL,
    logo_url VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES Users(id) ON DELETE CASCADE
);

CREATE TABLE CorporationAdmins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    corporation_id UUID NOT NULL REFERENCES Corporation(id) ON DELETE CASCADE,
    manager_id UUID NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    PRIMARY KEY (corporation_id, user_id)
);

CREATE INDEX idx_corporation_cnpj ON Corporation(cnpj);

-- ## Veículos
CREATE TABLE Vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    make VARCHAR(150) NOT NULL,
    model VARCHAR(150) NOT NULL,
    year INT NOT NULL,
    type VehicleType DEFAULT 'Cavalo',
    license_plate VARCHAR(6) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES Users(id),
);

CREATE INDEX idx_vehicles_license_plate ON Vehicles(license_plate);

-- ### Realação M:M entre Veículos e empresa
CREATE TABLE VehicleOwners (
    corporation_id UUID NOT NULL REFERENCES Corporation(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES Vehicles(id) ON DELETE CASCADE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES Users(id) ON DELETE CASCADE,

    PRIMARY KEY (vehicle_id, corporation_id)
);

CREATE TABLE Clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document VARCHAR(14) NOT NULL UNIQUE, -- CNPJ ou CPF
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    password VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
);

-- ## Tabela para Status gerais (ex: Pendente, Em Transito, Entregue, Cancelado)
CREATE TABLE Status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(255) NOT NULL,
    corporation_id UUID NOT NULL REFERENCES Corporation(id) ON DELETE CASCADE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES Users(id) ON DELETE CASCADE
);

-- # Nfs e Ctes
CREATE TABLE Invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES Clients(id),
    barcode VARCHAR(44) NOT NULL,
    nfe VARCHAR(20) NOT NULL,
    serie_nf VARCHAR(20) NOT NULL,
    cte VARCHAR(20) NOT NULL,
    value_nfe DECIMAL(10, 2) NOT NULL,
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
);

-- # Logica de Minuta de viagem
CREATE TABLE Orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES Companies(id) ON DELETE CASCADE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES Users(id),

    status_id UUID NOT NULL REFERENCES Status(id) ON DELETE CASCADE,
);

-- ## Comprovantes de entrega (deve integrar com bucket de arquivos)
CREATE TABLE OrderReceipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES Companies(id)ON DELETE CASCADE,
    order_item_id UUID NOT NULL REFERENCES OrderItem(id) ON DELETE CASCADE,
    url VARCHAR(255) NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES Users(id),
);

-- ## Item de viagem
CREATE TABLE OrderItem(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES Companies(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES Invoices(id) ON DELETE CASCADE,
    type_orders OrderType NOT NULL DEFAULT 'Entrega',
    tracking VARCHAR(255),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES Users(id),

    status_id UUID NOT NULL REFERENCES Status(id),
);

-- ### Rastreio de eventos de entrega (att app Drives com localização realtime)
CREATE TABLE TrackingEvents (
  id uuid default gen_random_uuid() primary key,
  OrderItem uuid references OrderItem(id) on delete cascade,
  locationItem text,
  descriptionItem text,
  status_id UUID NOT NULL REFERENCES Status(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES Users(id),
);

-- ## Relação de M:M entre Order e OrderItem
CREATE TABLE Order_add_itens (
    order_id UUID NOT NULL REFERENCES Orders(id) ON DELETE CASCADE,
    order_item_id UUID NOT NULL REFERENCES OrderItem(id) ON DELETE CASCADE,
    PRIMARY KEY (order_id, order_item_id)
);


CREATE TABLE Fuel (
    id uuid default gen_random_uuid() primary key,
    vehicle_id uuid references Vehicles(id) on delete cascade,

);
