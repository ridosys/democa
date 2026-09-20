import { z } from "zod";

// Anonymous, untrusted input — only product/option IDs and quantities are
// trusted; price and every other fact is re-resolved server-side from the
// DB (see submitCafeOrderRequest). Bounds below exist purely as abuse
// limits, not business rules.
export const cafeOrderRequestItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(50),
  optionIds: z.array(z.string().min(1)).max(20).default([]),
});

export const submitCafeOrderRequestSchema = z.object({
  qrToken: z.string().min(1),
  idempotencyKey: z.string().uuid(),
  notes: z.string().max(300).optional(),
  items: z.array(cafeOrderRequestItemSchema).min(1).max(30),
});

export type SubmitCafeOrderRequestInput = z.input<typeof submitCafeOrderRequestSchema>;
