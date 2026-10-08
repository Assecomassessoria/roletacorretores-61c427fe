import { expect, test } from "bun:test";
import { dadosPessoaisCorretor } from "./cadastro-corretor-dados";

test("registration start cannot be provided by the applicant", () => {
  const result = dadosPessoaisCorretor({ created_at: "2000-01-01T00:00:00Z" });
  expect(Object.hasOwn(result, "created_at")).toBe(false);
});

test("birth date and complete address survive registration normalization", () => {
  expect(dadosPessoaisCorretor({
    data_nascimento: "1990-05-15", tipo_logradouro: "Avenida", logradouro: "Paulista",
    numero: "100", complemento: "Apto 12", bairro: "Bela Vista", cep: "01310-100", cidade: "São Paulo", uf: "sp",
  })).toEqual({
    data_nascimento: "1990-05-15", tipo_logradouro: "Avenida", logradouro: "Paulista",
    numero: "100", complemento: "Apto 12", bairro: "Bela Vista", cep: "01310100", cidade: "São Paulo", uf: "SP",
  });
});