import { z } from "zod";

export const createReviewSchema = z.object({
  comment: z
    .string()
    .trim()
    .max(1000, "El comentario no puede superar 1000 caracteres.")
    .optional(),
  rating: z.coerce
    .number({ invalid_type_error: "Seleccioná una calificación." })
    .int("La calificación debe ser un número entero.")
    .min(1, "La calificación debe ser entre 1 y 5.")
    .max(5, "La calificación debe ser entre 1 y 5."),
  requestId: z.string().trim().min(1, "Pedido inválido.").max(128, "Pedido inválido."),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
