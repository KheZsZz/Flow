CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (
    id,
    name,
    email,
    password,
    type,
    cpf,
    avatar_url,
    is_active,
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', 'Usuário Novo'),
    new.email,
    'managed_by_auth',
    (COALESCE(new.raw_user_meta_data->>'type', 'Commum'))::UserType,
    COALESCE(new.raw_user_meta_data->>'cpf', '000.000.000-00'),
    new.raw_user_meta_data->>'avatar_url',
    TRUE
  );
  RETURN new;
EXCEPTION
  WHEN others THEN
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
