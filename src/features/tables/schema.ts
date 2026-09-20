import { z } from "zod";

export const tableSchema = z.object({
  name: z.string().min(1, { error: "اسم الطاولة مطلوب" }),
  seats: z
    .union([z.coerce.number().int().min(1), z.literal("")])
    .optional()
    .transform((value) => (value === "" || value === undefined ? null : value)),
  isActive: z.boolean().default(true),
});

export type TableInput = z.input<typeof tableSchema>;
export type TableOutput = z.output<typeof tableSchema>;
