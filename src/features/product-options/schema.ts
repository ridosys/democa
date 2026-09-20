import { z } from "zod";

export const optionGroupSchema = z.object({
  name: z.string().min(1, { error: "اسم المجموعة مطلوب" }),
  isRequired: z.boolean().default(false),
  allowMultiple: z.boolean().default(false),
});

export type OptionGroupInput = z.infer<typeof optionGroupSchema>;

export const productOptionSchema = z.object({
  name: z.string().min(1, { error: "اسم الخيار مطلوب" }),
  priceAdjustment: z.coerce.number().default(0),
  isActive: z.boolean().default(true),
});

export type ProductOptionInput = z.infer<typeof productOptionSchema>;
