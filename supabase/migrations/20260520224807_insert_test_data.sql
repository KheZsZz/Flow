CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

INSERT INTO Address (street, city, state, zip_code) VALUES
('Av. Paulista, 1000', 'São Paulo', 'SP', '01310-100'),
('Rua Augusta, 500', 'São Paulo', 'SP', '01305-000'),
('Av. das Nações Unidas, 12000', 'São Paulo', 'SP', '04578-000'),
('Rua Sete de Setembro, 150', 'Rio de Janeiro', 'RJ', '20050-000'),
('Av. Olegário Maciel, 300', 'Belo Horizonte', 'MG', '30180-110'),
('Av. Cândido de Abreu, 400', 'Curitiba', 'PR', '80530-000'),
('Rua dos Andradas, 850', 'Porto Alegre', 'RS', '90020-000'),
('Av. Agamenon Magalhães, 2500', 'Recife', 'PE', '52010-440'),
('Av. Santos Dumont, 1200', 'Fortaleza', 'CE', '60150-160'),
('Av. Anhanguera, 5000', 'Goiânia', 'GO', '74043-010'),
('SCLN 305 Bloco A, 20', 'Brasília', 'DF', '70737-510');

INSERT INTO Corporation (name, cnpj, address_id, phone, logo_url, is_active, created_by) VALUES
(
    'Flow Transportes', 
    '12345678000199', 
    (SELECT id FROM Address WHERE zip_code = '01310-100' LIMIT 1), 
    '(14) 99741-1040', 
    'https://www.transportesflow.com.br/lovable-uploads/181905e7-a700-4785-b4c7-181b13e7b387.png', 
    TRUE, 
    NULL
);

ALTER TABLE Users 
ALTER COLUMN corporation_id DROP NOT NULL;

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
  '{"name_user":"Kevin Oliveira","profile_user":"manager", "phone":"(11) 9.9577-8573", "document_user":"238.610.668-31"}', 
  false, 
  now(), 
  now(), 
  now(), 
  '', '', '', ''
);


UPDATE Corporation SET created_by = (SELECT id FROM Users WHERE email_user = 'kevinklgvg@gmail.com');
UPDATE Users SET created_by = (SELECT id FROM Users WHERE email_user = 'kevinklgvg@gmail.com');


