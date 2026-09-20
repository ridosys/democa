import { z } from "zod";

export const waiterSchema = z.object({
  name: z.string().trim().min(2, { error: "الاسم يجب أن يتكون من حرفين على الأقل" }),
  phone: z
    .union([z.string().min(6, { error: "رقم الهاتف غير صحيح" }), z.literal("")])
    .optional(),
  isActive: z.boolean(),
  // Undefined = leave the existing photo untouched; null = remove it; an
  // object = set/replace it — mirrors customerSchema's image field.
  image: z
    .object({ publicId: z.string(), secureUrl: z.string() })
    .nullable()
    .optional(),
});

export type WaiterInput = z.infer<typeof waiterSchema>;
