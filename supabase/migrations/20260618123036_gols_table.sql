-- =====================================================================
-- 20260618120000_settings_foundation.sql
-- Fundação do módulo de Configurações (Settings)
--   1. Metas flexíveis            -> tabela Goals + enums GoalMetric/GoalPeriod
--   2. Documentos de veículo      -> colunas de validade em Vehicles
--   3. Alertas de vencimento      -> view unificada document_alerts
--   4. Auditoria                  -> tabela audit_log
--   5. Avatares                   -> bucket de Storage + policies
--
-- NÃO-DESTRUTIVO: usa IF NOT EXISTS / ADD VALUE / ON CONFLICT.
-- Pode rodar mais de uma vez sem quebrar.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. METAS FLEXÍVEIS
-- ---------------------------------------------------------------------

-- CREATE TYPE não tem IF NOT EXISTS -> bloco idempotente
DO $$ BEGIN
  CREATE TYPE GoalMetric AS ENUM (
    'entregas_concluidas',
    'coletas_concluidas',
    'ordens_criadas',
    'notas_lancadas'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE GoalPeriod AS ENUM ('Diária', 'Semanal', 'Mensal');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Para evoluir os tipos no futuro (sempre não-destrutivo):
--   ALTER TYPE GoalMetric ADD VALUE IF NOT EXISTS 'km_rodados';

CREATE TABLE IF NOT EXISTS Goals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    corporation_id  UUID NOT NULL REFERENCES Corporation(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    metric          GoalMetric NOT NULL,
    target_value    NUMERIC(10, 2) NOT NULL CHECK (target_value > 0),
    period          GoalPeriod NOT NULL DEFAULT 'Diária',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      UUID NOT NULL REFERENCES Users(id)
);

-- Impede duas metas ATIVAS iguais (mesmo usuário + métrica + período)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_goal
    ON Goals (corporation_id, user_id, metric, period)
    WHERE is_active;

CREATE INDEX IF NOT EXISTS idx_goals_corp_user
    ON Goals (corporation_id, user_id);


-- ---------------------------------------------------------------------
-- 2. DOCUMENTOS DE VEÍCULO (validades)
-- ---------------------------------------------------------------------
ALTER TABLE Vehicles ADD COLUMN IF NOT EXISTS crlv_validade       DATE;
ALTER TABLE Vehicles ADD COLUMN IF NOT EXISTS seguro_validade     DATE;
ALTER TABLE Vehicles ADD COLUMN IF NOT EXISTS antt_validade       DATE;
ALTER TABLE Vehicles ADD COLUMN IF NOT EXISTS tacografo_validade  DATE;


-- ---------------------------------------------------------------------
-- 3. VIEW UNIFICADA DE ALERTAS DE VENCIMENTO
--    Junta documentos de MOTORISTA e de VEÍCULO em uma única feed.
--    days_remaining < 0  => documento VENCIDO.
--    Backend filtra por corporation_id e por janela (ex.: .lte('days_remaining', 30))
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW document_alerts AS

-- Motorista: CNH
SELECT
    cu.corporation_id,
    'driver'::text                       AS entity_kind,
    d.id                                 AS entity_id,
    u.name_user                          AS entity_label,
    'CNH'::text                          AS doc_type,
    d.validade_cnh                       AS expires_at,
    (d.validade_cnh - CURRENT_DATE)      AS days_remaining
FROM Drivers d
JOIN Users u            ON u.id = d.user_id
JOIN CorporationUsers cu ON cu.manager_id = d.user_id
WHERE d.validade_cnh IS NOT NULL

UNION ALL

-- Motorista: MOPP (só quando possui)
SELECT
    cu.corporation_id, 'driver', d.id, u.name_user, 'MOPP',
    d.moop_validade, (d.moop_validade - CURRENT_DATE)
FROM Drivers d
JOIN Users u            ON u.id = d.user_id
JOIN CorporationUsers cu ON cu.manager_id = d.user_id
WHERE d.mopp = TRUE AND d.moop_validade IS NOT NULL

UNION ALL

-- Veículo: CRLV / Licenciamento
SELECT
    vo.corporation_id, 'vehicle', v.id,
    v.make || ' ' || v.model || ' — ' || v.license_plate, 'CRLV',
    v.crlv_validade, (v.crlv_validade - CURRENT_DATE)
FROM Vehicles v
JOIN VehicleOwners vo ON vo.vehicle_id = v.id
WHERE v.crlv_validade IS NOT NULL

UNION ALL

-- Veículo: Seguro
SELECT
    vo.corporation_id, 'vehicle', v.id,
    v.make || ' ' || v.model || ' — ' || v.license_plate, 'Seguro',
    v.seguro_validade, (v.seguro_validade - CURRENT_DATE)
FROM Vehicles v
JOIN VehicleOwners vo ON vo.vehicle_id = v.id
WHERE v.seguro_validade IS NOT NULL

UNION ALL

-- Veículo: ANTT / RNTRC
SELECT
    vo.corporation_id, 'vehicle', v.id,
    v.make || ' ' || v.model || ' — ' || v.license_plate, 'ANTT/RNTRC',
    v.antt_validade, (v.antt_validade - CURRENT_DATE)
FROM Vehicles v
JOIN VehicleOwners vo ON vo.vehicle_id = v.id
WHERE v.antt_validade IS NOT NULL

UNION ALL

-- Veículo: Tacógrafo
SELECT
    vo.corporation_id, 'vehicle', v.id,
    v.make || ' ' || v.model || ' — ' || v.license_plate, 'Tacógrafo',
    v.tacografo_validade, (v.tacografo_validade - CURRENT_DATE)
FROM Vehicles v
JOIN VehicleOwners vo ON vo.vehicle_id = v.id
WHERE v.tacografo_validade IS NOT NULL;


-- ---------------------------------------------------------------------
-- 4. LOG DE AUDITORIA
--    Populado pela camada de aplicação (req.user.id = actor confiável).
--    'action' é VARCHAR de propósito: lista de ações pode crescer
--    (LOGIN, STATUS_CHANGE, ...) sem precisar de migration de enum.
--    actor_name é desnormalizado: o log sobrevive à exclusão do usuário.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    corporation_id  UUID REFERENCES Corporation(id) ON DELETE CASCADE,
    actor_id        UUID REFERENCES Users(id) ON DELETE SET NULL,
    actor_name      VARCHAR(255),
    action          VARCHAR(50) NOT NULL,   -- INSERT | UPDATE | DELETE | ...
    entity          VARCHAR(100) NOT NULL,  -- 'users' | 'orders' | 'goals' ...
    entity_id       UUID,
    summary         TEXT,                   -- "Criou o usuário João Silva"
    before          JSONB,
    after           JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_corp_time ON audit_log (corporation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity    ON audit_log (entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor     ON audit_log (actor_id);


-- ---------------------------------------------------------------------
-- 5. BUCKET DE AVATARES (Storage)
-- ---------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Leitura pública (o avatar_url é uma URL pública)
DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
CREATE POLICY "avatars_public_read"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

-- O upload real é feito pelo backend com service_role (ignora RLS).
-- As policies abaixo liberam também upload/atualização autenticada direta,
-- caso um dia o app suba o arquivo direto pro Storage.
DROP POLICY IF EXISTS "avatars_auth_write" ON storage.objects;
CREATE POLICY "avatars_auth_write"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_auth_update" ON storage.objects;
CREATE POLICY "avatars_auth_update"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'avatars');
