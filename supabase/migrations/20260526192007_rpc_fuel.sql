ALTER TABLE Fuel
  ADD COLUMN corporation_id   UUID REFERENCES Corporation(id); -- ← adiciona aqui

CREATE OR REPLACE FUNCTION get_fuel_summary(
  p_corporation_id UUID,
  start_date TIMESTAMPTZ DEFAULT '-infinity',
  end_date   TIMESTAMPTZ DEFAULT 'infinity'
)
RETURNS TABLE (
  total_spent         DECIMAL(12, 2),
  total_liters        DECIMAL(12, 2),
  avg_price_per_liter DECIMAL(10, 2)
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(f.total_price), 0),
    COALESCE(SUM(f.liters), 0),
    COALESCE(SUM(f.total_price) / NULLIF(SUM(f.liters), 0), 0)
  FROM Fuel f
  WHERE f.corporation_id = p_corporation_id
    AND f.date_fuel BETWEEN start_date AND end_date;
END;
$$;

CREATE OR REPLACE FUNCTION get_vehicle_efficiency(p_corporation_id UUID)
RETURNS TABLE (
  fuel_id    UUID,
  vehicle_id UUID,
  liters     DECIMAL(10, 2),
  total_price DECIMAL(10, 2),
  kms_driven INT,
  km_per_liter DECIMAL(10, 2),
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  WITH OdometerCalculations AS (
    SELECT
      f.id,
      f.vehicle_id,
      f.liters,
      f.total_price,
      f.current_odometer,
      f.is_full_tank,
      f.created_at,
      LAG(f.current_odometer) OVER (
        PARTITION BY f.vehicle_id ORDER BY f.created_at
      ) AS previous_odometer
    FROM Fuel f
    WHERE f.corporation_id = p_corporation_id
  )
  SELECT
    oc.id,
    oc.vehicle_id,
    oc.liters,
    oc.total_price,
    (oc.current_odometer - oc.previous_odometer)::INT,
    CASE
      WHEN oc.is_full_tank = TRUE AND (oc.current_odometer - oc.previous_odometer) > 0
      THEN ROUND(((oc.current_odometer - oc.previous_odometer) / oc.liters), 2)
      ELSE 0
    END,
    oc.created_at
  FROM OdometerCalculations oc
  WHERE oc.previous_odometer IS NOT NULL;
END;
$$;

CREATE OR REPLACE FUNCTION get_driver_ranking(
  p_corporation_id UUID,
  limit_rows INT DEFAULT 10
)
RETURNS TABLE (
  driver_id                UUID,
  driver_name              TEXT,
  total_spent              DECIMAL(12, 2),
  abastecimentos_realizados BIGINT
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.created_by,
    u.name_user::TEXT,
    SUM(f.total_price),
    COUNT(f.id)
  FROM Fuel f
  JOIN Users u ON f.created_by = u.id
  WHERE f.corporation_id = p_corporation_id
  GROUP BY f.created_by, u.name_user
  ORDER BY SUM(f.total_price) DESC
  LIMIT limit_rows;
END;
$$;