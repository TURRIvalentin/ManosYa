import { z } from "zod";

const priceStringSchema = z
  .string()
  .trim()
  .min(1, "Ingresá un monto.")
  .refine((value) => /^\d+([.,]\d{1,2})?$/.test(value), "Ingresá un monto válido.")
  .transform((value) => Number(value.replace(",", ".")))
  .refine((value) => value > 0, "El monto debe ser mayor a cero.")
  .refine((value) => value <= 999_999_999, "El monto es demasiado alto.");

const estimatedDaysSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? Number(value) : null))
  .refine((value) => value === null || Number.isInteger(value), "Ingresá días válidos.")
  .refine((value) => value === null || value >= 1, "El plazo mínimo es 1 día.")
  .refine((value) => value === null || value <= 365, "El plazo máximo es 365 días.");

export const createQuoteSchema = z.object({
  comment: z
    .string()
    .trim()
    .min(10, "El mensaje debe tener al menos 10 caracteres.")
    .max(1200, "El mensaje no puede superar 1200 caracteres."),
  estimatedDays: estimatedDaysSchema,
  price: priceStringSchema,
  requestId: z.string().trim().min(1, "Pedido inválido.").max(128, "Pedido inválido."),
});

export const quoteDecisionSchema = z.object({
  quoteId: z.string().trim().min(1, "Presupuesto inválido.").max(128, "Presupuesto inválido."),
});

export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;
export type QuoteDecisionInput = z.infer<typeof quoteDecisionSchema>;
