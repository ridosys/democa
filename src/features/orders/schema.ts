import { z } from "zod";

// A price-adjusting option selected for a line, snapshotted at the moment
// it's added (see OrderItemOption/InvoiceItemOption) — never re-read live
// from ProductOption once persisted, so a later price change on the option
// can't alter an already-placed line's total.
export const selectedOptionSchema = z.object({
  groupName: z.string().min(1),
  optionName: z.string().min(1),
  priceAdjustment: z.coerce.number(),
  optionId: z.string().optional(),
});

export const orderItemsSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().optional(),
        productId: z.string(),
        price: z.coerce
          .number()
          .min(0, { error: "السعر يجب أن يكون رقماً موجباً" }),
        quantity: z.coerce
          .number()
          .min(0.001, { error: "الكمية يجب أن تكون رقماً موجباً" }),
        options: z.array(selectedOptionSchema).optional(),
      }),
    )
    .refine((items) => items.some((item) => item.productId !== ""))
    .transform((items) => items.filter((item) => item.productId !== "")),
});

export type OrderItemsInput = z.input<typeof orderItemsSchema>;
export type OrderItemsOutput = z.output<typeof orderItemsSchema>;

export const reassignOrderCustomerSchema = z.object({
  customerId: z.string().min(1, { error: "الرجاء اختيار عميل" }),
});

export const createOrderSchema = z.object({
  // Optional — a RETAIL order always supplies this through its own
  // customer-picker UX, but a Cafe walk-in DINE_IN/TAKEAWAY order may have
  // no linked Customer at all (see Order.customerId, already nullable).
  customerId: z.string().min(1).optional(),
  notes: z.string().optional(),
  type: z.enum(["RETAIL", "DINE_IN", "TAKEAWAY"]).default("RETAIL"),
  tableId: z.string().optional(),
  // The Cafe floor waiter serving/handling this order — distinct from
  // createdById (the actor that technically created the record) and never
  // an Admin. Only meaningful for Cafe DINE_IN/TAKEAWAY orders; RETAIL
  // never sets it.
  waiterId: z.string().optional(),
  // Analytics-only: how this order originated. Set explicitly only by
  // acceptCafeOrderRequest; every other caller keeps the STAFF default.
  source: z.enum(["STAFF", "QR"]).default("STAFF"),
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.coerce
          .number()
          .min(0.001, { error: "الكمية يجب أن تكون رقماً موجباً" }),
        price: z.coerce
          .number()
          .min(0, { error: "السعر يجب أن يكون رقماً موجباً" }),
        options: z.array(selectedOptionSchema).optional(),
      }),
    )
    .refine((items) => items.some((item) => item.productId !== ""), {
      error: "أضف منتجاً واحداً على الأقل",
    })
    .transform((items) => items.filter((item) => item.productId !== "")),
});

export type CreateOrderInput = z.input<typeof createOrderSchema>;
export type CreateOrderOutput = z.output<typeof createOrderSchema>;
