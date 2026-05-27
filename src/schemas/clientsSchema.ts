import { z } from "zod";
import { blacklistedDomains } from "./enumSchema";

const validarCPF = (cpf: string) => {
  const cleanCpf = cpf.replace(/\D/g, "");
  if (cleanCpf.length !== 11 || /^(\d)\1+$/.test(cleanCpf)) return false;
  let soma = 0,
    resto;
  for (let i = 1; i <= 9; i++)
    soma += parseInt(cleanCpf.substring(i - 1, i)) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cleanCpf.substring(9, 10))) return false;
  soma = 0;
  for (let i = 1; i <= 10; i++)
    soma += parseInt(cleanCpf.substring(i - 1, i)) * (12 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  return resto === parseInt(cleanCpf.substring(10, 11));
};

const validarCNPJ = (cnpj: string) => {
  const cleanCnpj = cnpj.replace(/\D/g, "");
  if (cleanCnpj.length !== 14 || /^(\d)\1+$/.test(cleanCnpj)) return false;
  let tamanho = cleanCnpj.length - 2;
  let numeros = cleanCnpj.substring(0, tamanho);
  const digitos = cleanCnpj.substring(tamanho);
  let soma = 0,
    pos = tamanho - 7;
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(0))) return false;
  tamanho = tamanho + 1;
  numeros = cleanCnpj.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  return resultado === parseInt(digitos.charAt(1));
};

export const clientSchema = z.object({
  id: z.string().uuid().optional(),
  document: z
    .string()
    .min(1, "O documento é obrigatório")
    .transform((val) => val.replace(/\D/g, ""))
    .refine((val) => val.length === 11 || val.length === 14, {
      message: "O documento deve ter 11 dígitos (CPF) ou 14 dígitos (CNPJ)",
    })
    .refine((val) => (val.length === 11 ? validarCPF(val) : validarCNPJ(val)), {
      message: "CPF ou CNPJ inválido",
    }),
  name: z.string().min(1, "O nome é obrigatório").max(255),
  email: z
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
  phone_user: z
    .string()
    .max(16, { message: "O telefone deve ter no máximo 16 caracteres" })
    .regex(/^\(\d{2}\)\s\d\.\d{4}-\d{4}$/, {
      message: "O telefone deve estar no formato (XX) 9.XXXX-XXXX",
    }),
  password: z
    .string()
    .min(6, "A senha deve ter no mínimo 6 caracteres")
    .max(255),
  is_active: z.boolean().default(true),

  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
  created_by: z.string().uuid("ID do criador inválido").optional(),
});

export type ClientType = z.infer<typeof clientSchema>;
