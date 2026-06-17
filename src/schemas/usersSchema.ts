import { z } from "zod";
import { blacklistedDomains, UserTypeSchema } from "@/schemas/enumSchema";

export const UserSchema = z.object({
  id: z.string().uuid().optional(),
  token: z.string().optional(),
  document_user: z
    .string()
    .transform((val) => val.replace(/\D/g, ""))
    .refine((val) => val.length === 11, {
      message: "CPF deve conter exatamente 11 dígitos numéricos",
    })
    .optional(),

  name_user: z
    .string()
    .trim()
    .min(3, "O nome deve ter pelo menos 3 caracteres")
    .max(100)
    .refine(
      (fullname) => {
        const words = fullname.split(/\s+/).filter((word) => word.length > 0);
        return words.length >= 2;
      },
      {
        message: "Por favor, insira seu nome completo (nome e sobrenome)",
      },
    ),

  email_user: z
    .string()
    .trim()
    .toLowerCase()
    .email("Formato de e-mail inválido")
    .max(255, "O e-mail é muito longo")
    .refine(
      (email) => {
        const domain = email.split("@")[1];
        return !blacklistedDomains.includes(domain);
      },
      {
        message: "Por favor, use um provedor de e-mail confiável",
      },
    ),

  password_user: z
    .string()
    .min(8, "A senha deve ter no mínimo 8 caracteres")
    .max(255)
    .refine((val) => /[A-Z]/.test(val), {
      message: "A senha deve conter pelo menos uma letra maiúscula.",
    })
    .refine((val) => /\d/.test(val), {
      message: "A senha deve conter pelo menos um número.",
    })
    .refine(
      (val) => {
        const matches = val.match(/\d{2}/g);
        if (!matches) return true;

        for (const pair of matches) {
          const num1 = parseInt(pair[0], 10);
          const num2 = parseInt(pair[1], 10);

          if (num2 === num1 + 1) {
            return false;
          }
        }
        return true;
      },
      {
        message: "A senha não pode conter números em sequência (ex: 12, 45).",
      },
    ),

  avatar_url: z
    .string()
    .url("URL do avatar inválida")
    .max(255)
    .nullish()
    .optional(),

  is_active: z.boolean().default(true),
  created_by: z.string().uuid("ID do criador inválido").optional(),
  phone_user: z
    .string()
    .max(11, { message: "O telefone deve ter no máximo 11 caracteres" })
    .regex(/^[1-9]{2}9?[2-9][0-9]{7}$/, {
      message: "O telefone deve estar no formato XX9XXXXXX",
    }),
  profile_user: UserTypeSchema.default("Commum").optional(),
  corporation_id: z.string().uuid().optional(),

  cnh: z.string().trim().max(20).optional(),
  validade_cnh: z.string().optional(), // ISO vindo do date input
  categoria_cnh: z.array(z.enum(["A", "B", "C", "D", "E"])).optional(),
  mopp: z.boolean().optional(),
  moop_validade: z.string().nullish(), // sempre opcional
});

const requireDriverFields = (data: any, ctx: z.RefinementCtx) => {
  if (data.profile_user !== "Driver") return;
  if (!data.cnh?.trim())
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["cnh"],
      message: "CNH é obrigatória para motoristas",
    });
  if (!data.validade_cnh)
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["validade_cnh"],
      message: "Informe a validade da CNH",
    });
  if (!data.categoria_cnh || data.categoria_cnh.length === 0)
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["categoria_cnh"],
      message: "Selecione ao menos uma categoria",
    });
};

export const RegisterUserSchema = UserSchema.omit({
  id: true,
  is_active: true,
}).superRefine(requireDriverFields);

export const UpdateUserSchema = UserSchema.partial({
  password_user: true,
}).superRefine(requireDriverFields);

export const LoginUserSchema = UserSchema.pick({
  email_user: true,
  password_user: true,
});

export type UpdateUserType = z.infer<typeof UpdateUserSchema>;
export type RegisterUserType = z.infer<typeof RegisterUserSchema>;
export type LoginUserType = z.infer<typeof LoginUserSchema>;
export type UserType = z.infer<typeof UserSchema>;
