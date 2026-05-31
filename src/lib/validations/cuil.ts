import { z } from "zod";

// Prefijos válidos según ANSES / AFIP
// 20, 23 → hombres; 24, 27 → mujeres; 30, 33, 34 → personas jurídicas/empleadores
const VALID_PREFIXES = ["20", "23", "24", "27", "30", "33", "34"] as const;

// Coeficientes del algoritmo de dígito verificador (posiciones 0–9)
const COEFFICIENTS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2] as const;

/**
 * Valida el dígito verificador de un CUIL/CUIT argentino.
 *
 * Algoritmo oficial ANSES:
 *   1. Multiplicar cada uno de los 10 primeros dígitos por su coeficiente.
 *   2. Sumar los productos.
 *   3. resto = suma % 11
 *   4. digito = 11 - resto
 *      digito == 11 → verificador = 0
 *      digito == 10 → para prefijo 27 el verificador convencional es 9;
 *                      para otros prefijos la combinación es inválida.
 *      en otros casos, verificador = digito
 *   5. El dígito 11 del CUIL debe coincidir con el verificador calculado.
 */
function checkDigitIsValid(digits: string): boolean {
  const sum = COEFFICIENTS.reduce(
    (acc, coeff, i) => acc + coeff * Number(digits[i]),
    0,
  );

  const remainder = sum % 11;
  const verifier = 11 - remainder;
  let expected: number;

  if (verifier === 11) {
    expected = 0;
  } else if (verifier === 10) {
    // Prefijo 27 (mujeres con combinaciones especiales): verificador convencional 9.
    expected = digits.startsWith("27") ? 9 : NaN;
  } else {
    expected = verifier;
  }

  return Number(digits[10]) === expected;
}

/** Devuelve true si el string es un CUIL/CUIT válido (con o sin guiones). */
export function isValidCUIL(input: string): boolean {
  const digits = input.replace(/[-\s]/g, "");
  if (!/^\d{11}$/.test(digits)) return false;

  const prefix = digits.slice(0, 2);
  if (!(VALID_PREFIXES as readonly string[]).includes(prefix)) return false;

  return checkDigitIsValid(digits);
}

/** Formatea un CUIL normalizado como "XX-XXXXXXXX-X". */
export function formatCUIL(input: string): string {
  const digits = input.replace(/[-\s]/g, "");
  if (digits.length !== 11) return input;
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
}

/** Normaliza: quita guiones y espacios. */
export function normalizeCUIL(input: string): string {
  return input.replace(/[-\s]/g, "");
}

// ── Zod refinement ────────────────────────────────────────────────────────────

export const cuilSchema = z
  .string()
  .min(1, "El CUIL/CUIT es requerido")
  .transform(normalizeCUIL)
  .pipe(
    z
      .string()
      .regex(/^\d{11}$/, "El CUIL/CUIT debe tener 11 dígitos")
      .refine(isValidCUIL, "CUIL/CUIT inválido: el dígito verificador no coincide"),
  );
