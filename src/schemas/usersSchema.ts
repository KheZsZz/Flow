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
    .max(16, { message: "O telefone deve ter no máximo 16 caracteres" })
    .regex(/^\(\d{2}\)\s\d\.\d{4}-\d{4}$/, {
      message: "O telefone deve estar no formato (XX) 9.XXXX-XXXX",
    }),
  profile_user: UserTypeSchema.default("Commum").optional(),
  corporation_id: z.string().uuid().optional(),
});

export const RegisterUserSchema = UserSchema.omit({
  id: true,
  is_active: true,
});

export const LoginUserSchema = UserSchema.pick({
  email_user: true,
  password_user: true,
});

export type RegisterUserType = z.infer<typeof RegisterUserSchema>;
export type LoginUserType = z.infer<typeof LoginUserSchema>;
export type UserType = z.infer<typeof UserSchema>;
