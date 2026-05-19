import { z } from 'zod';

import { VehicleTypeSchema } from '@/schemas/enumSchema'

export const vehicleSchema = z.object({
    id: z.string().uuid().optional(), 
    make: z.string().min(1, 'A marca é obrigatória').max(150),
    model: z.string().min(1, 'O modelo é obrigatório').max(150),
    year: z
        .number()
        .int()
        .min(1900, 'Ano inválido')
        .max(new Date().getFullYear() + 1, 'Ano inválido'),
    type: VehicleTypeSchema.default('Cavalo'),
    license_plate: z
    .string()
    .min(7, 'A placa deve ter no mínimo 7 caracteres')
    .max(8, 'A placa deve ter no máximo 8 caracteres')
    .transform((val) => val.toUpperCase())
    .refine((val) => {
            const regexPlaca = /^[A-Z]{3}-?[0-9][A-Z0-9][0-9]{2}$/;
            return regexPlaca.test(val);
        }, { message: 'Placa inválida. Use o formato ABC-1234 ou ABC1D23' }),
    is_active: z.boolean().default(true),

    created_at: z.coerce.date().optional(),
    updated_at: z.coerce.date().optional(),
    created_by: z.string().uuid('ID do criador inválido').optional(),
});


export const vehicleOwnerSchema = z.object({
  vehicle_id: z.string().uuid('ID do veículo inválido'),
  corporation_id: z.string().uuid('ID da corporação inválido'),

  created_at: z.coerce.date().optional(), 
  updated_at: z.coerce.date().optional(),
  created_by: z.string().uuid('ID do criador inválido').optional(),
});


export type VehicleOwnerType = z.infer<typeof vehicleOwnerSchema>;
export type VehicleType = z.infer<typeof vehicleSchema>;