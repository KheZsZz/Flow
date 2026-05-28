import { z } from "zod";

import { FuelTypeShema, VehicleTypeSchema } from "@/schemas/enumSchema";

export const vehicleSchema = z.object({
  id: z.string().uuid().optional(),
  make: z.string().min(1, "A marca é obrigatória").max(150),
  model: z.string().min(1, "O modelo é obrigatório").max(150),
  year: z
    .number()
    .int()
    .min(1900, "Ano inválido")
    .max(new Date().getFullYear() + 1, "Ano inválido"),
  type: VehicleTypeSchema.default("Cavalo"),
  capacity_fuel: z.number().optional(),
  license_plate: z
    .string()
    .transform((val) => val.toUpperCase().replace(/\s|-/g, "")) // Transforma em maiúsculo e remove espaços ou hifens acidentais
    .pipe(
      z
        .string()
        .length(7, "A placa Mercosul deve ter exatamente 7 caracteres")
        .refine(
          (val) => {
            const regexMercosul = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;
            return regexMercosul.test(val);
          },
          {
            message: "Placa inválida. Use o formato Mercosul (Ex: ABC1D23)",
          },
        ),
    ),
  is_active: z.boolean().default(true),
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
  created_by: z.string().uuid("ID do criador inválido").optional(),
});

export const vehicleOwnerSchema = z.object({
  vehicle_id: z.string().uuid("ID do veículo inválido").optional(),
  corporation_id: z.string().uuid("ID da corporação inválido").optional(),
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
  created_by: z.string().uuid("ID do criador inválido").optional(),
});

export const FuelSchema = z
  .object({
    id: z.string().uuid("ID do abastecimento inválido").optional(),
    vehicle_id: z.string().uuid("ID do veículo inválido"),
    gas_station_name: z
      .string()
      .min(1, "O nome da estação de combustível é obrigatório"),
    fuel_type: z.enum(FuelTypeShema).default("Diesel S10"),
    liters: z
      .number()
      .positive("A quantidade de litros deve ser maior que zero"),
    total_price: z.number().positive("O preço total deve ser maior que zero"),
    unit_price: z.number().positive().optional(),
    current_odometer: z
      .number()
      .nonnegative("O odômetro atual deve ser maior ou igual a zero"),
    is_full_tank: z.boolean().default(false),
    date_fuel: z.coerce.date({
      error: "Data de abastecimento inválida",
    }).optional(),
    created_by: z.string().uuid("ID do criador inválido").optional(),
  })
  .transform((data) => {
    data.unit_price = Math.round((data.total_price / data.liters) * 100) / 100;
    data.date_fuel = data.date_fuel ? new Date(data.date_fuel) : new Date();
    return data;
  });

export type FuelType = z.infer<typeof FuelTypeShema>;
export type VehicleOwnerType = z.infer<typeof vehicleOwnerSchema>;
export type VehicleType = z.infer<typeof vehicleSchema>;
