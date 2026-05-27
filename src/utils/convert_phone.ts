export function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `+55${digits}`;
}
