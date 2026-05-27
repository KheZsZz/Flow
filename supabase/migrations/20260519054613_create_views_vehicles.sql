CREATE OR REPLACE FUNCTION get_company_vehicle_counters(p_corporation_id UUID)
RETURNS TABLE (active BIGINT, inactive BIGINT)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM VehicleOwners vo JOIN Vehicles v ON vo.vehicle_id = v.id WHERE vo.corporation_id = p_corporation_id AND v.is_active = TRUE),
        (SELECT COUNT(*) FROM VehicleOwners vo JOIN Vehicles v ON vo.vehicle_id = v.id WHERE vo.corporation_id = p_corporation_id AND v.is_active = FALSE);
END;
$$;
