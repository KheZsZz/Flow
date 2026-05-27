export async function fetchViaCep(cep: string) {
  const cepLimpo = cep.replace(/\D/g, "");

  if (cepLimpo.length !== 8) {
    throw new Error("CEP deve ter 8 dígitos");
  }

  const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);

  if (!res.ok) {
    throw new Error("CEP não encontrado");
  }

  const data: any = await res.json();

  if (data.erro) {
    throw new Error("CEP inválido ou não encontrado");
  }

  return {
    street: data.logradouro || "",
    neighborhood: data.bairro || "",
    city: data.localidade || "",
    state: data.uf || "",
    zip_code: cep,
  };
}
