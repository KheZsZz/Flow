CREATE OR REPLACE FUNCTION get_company_employee_counters(p_corporation_id UUID)
RETURNS TABLE (total BIGINT, admins BIGINT, common BIGINT) 
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM Users WHERE corporation_id = p_corporation_id AND profile != 'Driver'::UserType),
        (SELECT COUNT(*) FROM Users WHERE corporation_id = p_corporation_id AND profile = 'Admin'::UserType),
        (SELECT COUNT(*) FROM Users WHERE corporation_id = p_corporation_id AND profile = 'Commum'::UserType);
END;
$$;