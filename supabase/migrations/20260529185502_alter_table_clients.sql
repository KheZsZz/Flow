
ALTER TABLE Clients
  ADD COLUMN corporation_id UUID REFERENCES Corporation(id) ON DELETE CASCADE,

ALTER TABLE Clients DROP CONSTRAINT clients_document_key;

ALTER TABLE Clients ADD CONSTRAINT clients_document_corporation_unique
  UNIQUE (document, corporation_id);

ALTER TABLE Clients ALTER COLUMN email DROP NOT NULL;
ALTER TABLE Clients ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE Clients ALTER COLUMN password_client DROP NOT NULL;


ALTER TABLE Invoices ALTER COLUMN xml_nfe_url DROP NOT NULL;
ALTER TABLE Invoices ALTER COLUMN xml_cte_url DROP NOT NULL;


ALTER TABLE Invoices
  ALTER COLUMN weight_brute TYPE DECIMAL(10, 3) USING weight_brute::DECIMAL,
  ALTER COLUMN quantity_volumes TYPE INTEGER USING quantity_volumes::INTEGER;
