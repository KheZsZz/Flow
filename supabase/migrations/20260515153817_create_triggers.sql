CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (
    id,
    document_user,  -- Batendo com o VARCHAR(14) da sua tabela
    name_user,
    email_user,
    password_user,
    phone, 
    profile_user, 
    avatar_url,
    is_active,
    corporation_id,
    created_by 
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'document_user', '00000000000'),
    COALESCE(new.raw_user_meta_data->>'name_user', 'Usuário Novo'),
    new.email,
    'managed_by_auth',
    COALESCE(new.raw_user_meta_data->>'phone', '00000000000'),
    (COALESCE(new.raw_user_meta_data->>'profile', 'Commum'))::UserType,
    COALESCE(new.raw_user_meta_data->>'avatar_url', 'https://api.dicebear.com/7.x/bottts/svg'),
    TRUE,
    (new.raw_user_meta_data->>'corporation_id')::UUID,
    (COALESCE(new.raw_user_meta_data->>'created_by', new.id::text))::UUID 
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created 
  AFTER INSERT ON auth.users 
  FOR EACH ROW 
  EXECUTE PROCEDURE public.handle_new_user();