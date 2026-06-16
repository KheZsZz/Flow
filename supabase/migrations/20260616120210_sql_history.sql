
create or replace function upsert_client_with_address(
  p_corporation_id uuid,
  p_user_id uuid,
  p_document text,
  p_name text,
  p_address jsonb
) returns uuid as $$
declare
  v_address_id uuid;
  v_client_id uuid;
begin
  -- 1. Tenta encontrar um endereço idêntico primeiro
  select id into v_address_id
  from address
  where street = p_address->>'street'
    and (number = p_address->>'number' or (number is null and p_address->>'number' is null))
    and (complement = p_address->>'complement' or (complement is null and p_address->>'complement' is null))
    and neighborhood = p_address->>'neighborhood'
    and city = p_address->>'city'
    and state = p_address->>'state'
    and zip_code = p_address->>'zip_code'
  limit 1;

  -- 2. Se não encontrou, insere o novo endereço
  if v_address_id is null then
    insert into address (street, number, complement, neighborhood, city, state, zip_code)
    values (
      p_address->>'street', p_address->>'number', p_address->>'complement',
      p_address->>'neighborhood', p_address->>'city', p_address->>'state', p_address->>'zip_code'
    )
    returning id into v_address_id;
  end if;

  -- 3. Upsert do Cliente vinculado ao address_id encontrado ou criado
  insert into clients (corporation_id, created_by, document, name_client, address_id, is_active)
  values (p_corporation_id, p_user_id, p_document, p_name, v_address_id, true)
  on conflict (corporation_id, document) do update
  set address_id = v_address_id -- Atualiza para o endereço atual (ou reaproveita o existente)
  returning id into v_client_id;

  return v_client_id;
end;
$$ language plpgsql;



-- =====================================================================
-- SYNC: colunas que podem não ter sido aplicadas no banco vivo.
-- Seguro rodar mais de uma vez (ADD COLUMN IF NOT EXISTS).
-- Destino: supabase/migrations/20260616090000_sync_colunas.sql
--
-- ATENÇÃO: isto cobre apenas COLUNAS. Se a migration 20260613124913_ordens.sql
-- nunca rodou, ainda faltam: o enum public.OrderType, o status "Em Rota" (110),
-- o job pg_cron (start_due_orders) e os triggers de finalização/trava.
-- Verifique com `supabase migration list` e rode a 20260613 se faltar.
-- =====================================================================

-- 1. OrderVehicles: role/position  (faltando -> erro 42703 na listagem)
ALTER TABLE public.OrderVehicles
  ADD COLUMN IF NOT EXISTS role     TEXT    NOT NULL DEFAULT 'Cavalo',
  ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 1;

-- 2. Orders: datas de entrega e início agendado (Em Rota automático)
ALTER TABLE public.Orders
  ADD COLUMN IF NOT EXISTS delivery_date   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scheduled_start TIMESTAMPTZ;

-- 3. Collections: campos referenciados no COLLECTION_SELECT do controller
ALTER TABLE public.Collections
  ADD COLUMN IF NOT EXISTS quantity           INTEGER,
  ADD COLUMN IF NOT EXISTS weight             NUMERIC(12,3),
  ADD COLUMN IF NOT EXISTS collection_address TEXT,
  ADD COLUMN IF NOT EXISTS finaled_at         TIMESTAMPTZ;
