CREATE OR REPLACE FUNCTION get_company_employee_counters(p_corporation_id UUID)
RETURNS TABLE (total BIGINT, admins BIGINT, common BIGINT)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(CASE WHEN u.profile_user != 'Driver'::public.UserType THEN 1 END)::BIGINT AS total,
        COUNT(CASE WHEN u.profile_user = 'Admin'::public.UserType THEN 1 END)::BIGINT AS admins,
        COUNT(CASE WHEN u.profile_user = 'Commum'::public.UserType THEN 1 END)::BIGINT AS common
    FROM public.CorporationUsers cu
    JOIN public.Users u ON cu.manager_id = u.id
    WHERE cu.corporation_id = p_corporation_id;
END;
$$;
