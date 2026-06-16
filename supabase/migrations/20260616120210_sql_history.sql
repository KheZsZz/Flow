
alter table clients
drop email_client,
drop phone_client;

ALTER TABLE Invoices
  ALTER COLUMN weight_brute TYPE DECIMAL(10, 3) USING weight_brute::DECIMAL,
  ALTER COLUMN quantity_volumes TYPE INTEGER USING quantity_volumes::INTEGER;



ALTER TABLE address
  ADD COLUMN IF NOT EXISTS number      VARCHAR(20),
  ADD COLUMN IF NOT EXISTS complement  VARCHAR(255),
  ADD COLUMN IF NOT EXISTS neighborhood VARCHAR(255);

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS address_id UUID REFERENCES address(id) ON DELETE SET NULL;



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

rollback

CREATE UNIQUE INDEX idx_unique_client_per_corporation
ON clients (corporation_id, document);



ALTER TABLE public.Orders DROP COLUMN IF EXISTS vehicle_id;

CREATE TABLE IF NOT EXISTS public.OrderVehicles (
    order_id   UUID NOT NULL REFERENCES public.Orders(id)   ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES public.Vehicles(id) ON DELETE RESTRICT,
    PRIMARY KEY (order_id, vehicle_id)
);


ALTER TABLE public.orderVe
ADD CONSTRAINT fk_order
FOREIGN KEY (order_id) REFERENCES public.orders(id);

ALTER TABLE public.orderitem
ADD CONSTRAINT fk_orderitem_collection
FOREIGN KEY (collection_id) REFERENCES public.collections(id);
