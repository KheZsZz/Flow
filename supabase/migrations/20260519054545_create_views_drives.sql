CREATE OR REPLACE FUNCTION get_company_driver_counters(p_corporation_id UUID)
RETURNS TABLE (active BIGINT, inactive BIGINT) 
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM Users WHERE corporation_id = p_corporation_id AND profile = 'Driver'::UserType AND is_active = TRUE),
        (SELECT COUNT(*) FROM Users WHERE corporation_id = p_corporation_id AND profile = 'Driver'::UserType AND is_active = FALSE);
END;
$$;