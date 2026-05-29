CREATE OR REPLACE FUNCTION get_company_driver_counters(p_corporation_id UUID)
RETURNS TABLE (active BIGINT, inactive BIGINT)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(CASE WHEN u.is_active = TRUE THEN 1 END)::BIGINT AS active,
        COUNT(CASE WHEN u.is_active = FALSE THEN 1 END)::BIGINT AS inactive
    FROM public.CorporationUsers cu
    JOIN public.Users u ON cu.manager_id = u.id
    WHERE cu.corporation_id = p_corporation_id
      AND u.profile_user = 'Driver'::public.UserType;
END;
$$;
