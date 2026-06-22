-- Migration: add document URL columns to vehicles and drivers tables
-- Run this in your Supabase SQL editor or via Supabase CLI

-- Vehicles: document file URLs
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS crlv_doc_url      TEXT,
  ADD COLUMN IF NOT EXISTS seguro_doc_url    TEXT,
  ADD COLUMN IF NOT EXISTS tacografo_doc_url TEXT;

-- Drivers: document file URLs
ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS cnh_doc_url  TEXT,
  ADD COLUMN IF NOT EXISTS mopp_doc_url TEXT;

-- Supabase Storage: create 'documents' bucket (run via dashboard or CLI if not exists)
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('documents', 'documents', true)
-- ON CONFLICT DO NOTHING;
