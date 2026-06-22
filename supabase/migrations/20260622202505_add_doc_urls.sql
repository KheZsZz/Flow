
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS crlv_doc_url      TEXT,
  ADD COLUMN IF NOT EXISTS seguro_doc_url    TEXT,
  ADD COLUMN IF NOT EXISTS tacografo_doc_url TEXT;

-- Drivers: document file URLs
ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS cnh_doc_url  TEXT,
  ADD COLUMN IF NOT EXISTS mopp_doc_url TEXT;
