CREATE OR REPLACE FUNCTION get_company_vehicle_counters(p_corporation_id UUID)
RETURNS TABLE (active BIGINT, inactive BIGINT)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(CASE WHEN v.is_active = TRUE THEN 1 END)::BIGINT AS active,
        COUNT(CASE WHEN v.is_active = FALSE THEN 1 END)::BIGINT AS inactive
    FROM public.VehicleOwners vo
    JOIN public.Vehicles v ON vo.vehicle_id = v.id
    WHERE vo.corporation_id = p_corporation_id;
END;
$$;
