
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
    -- 1. Upsert do Endereço (tenta inserir, se der conflito, ignora ou atualiza conforme regra de negócio)
    -- Aqui assumimos a criação de um novo registro para simplificar,
    -- mas você pode adaptar com ON CONFLICT se tiver um identificador único para endereço.
    insert into address (street, number, complement, neighborhood, city, state, zip_code)
    values (
      p_address->>'street',
      p_address->>'number',
      p_address->>'complement',
      p_address->>'neighborhood',
      p_address->>'city',
      p_address->>'state',
      p_address->>'zip_code'
    )
    returning id into v_address_id;

    -- 2. Busca ou insere o Cliente
    insert into clients (corporation_id, created_by, document, name_client, address_id, is_active)
    values (p_corporation_id, p_user_id, p_document, p_name, v_address_id, true)
    on conflict (corporation_id, document) do update
    set address_id = v_address_id -- Atualiza o endereço se o cliente já existir
    returning id into v_client_id;

    return v_client_id;
  end;
  $$ language plpgsql;
