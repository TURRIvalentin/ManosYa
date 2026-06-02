import { z } from "zod";

export const createRequestSchema = z.object({
  categoryId: z.string().trim().min(1, "Seleccioná una categoría."),
  description: z
    .string()
    .trim()
    .min(20, "La descripción debe tener al menos 20 caracteres.")
    .max(2000, "La descripción no puede superar 2000 caracteres."),
  providerId: z
    .string()
    .trim()
    .min(1, "Prestador inválido.")
    .max(128, "Prestador inválido."),
  title: z
    .string()
    .trim()
    .min(5, "El título debe tener al menos 5 caracteres.")
    .max(120, "El título no puede superar 120 caracteres."),
  zoneId: z.string().trim().min(1, "Seleccioná una zona."),
});

export type CreateRequestInput = z.infer<typeof createRequestSchema>;

export const requestDecisionSchema = z.object({
  requestId: z.string().trim().min(1, "Pedido inválido.").max(128, "Pedido inválido."),
});

export type RequestDecisionInput = z.infer<typeof requestDecisionSchema>;
