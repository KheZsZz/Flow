CREATE OR REPLACE FUNCTION get_company_order_counters(p_corporation_id UUID)
RETURNS TABLE (status_code VARCHAR, total BIGINT) 
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.code AS status_code,
        COUNT(oi.id) AS total
    FROM OrderItem oi
    JOIN Status s ON oi.status_id = s.id
    WHERE oi.corporation_id = p_corporation_id
    GROUP BY s.code
    HAVING COUNT(oi.id) > 0;
END;
$$;