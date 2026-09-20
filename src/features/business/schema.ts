import { z } from "zod";
import { FEATURE_KEYS } from "@/lib/feature-catalog";

export const setActiveBusinessTypeSchema = z.object({
  businessTypeId: z.string().min(1, { error: "الرجاء اختيار نوع نشاط صحيح" }),
});

export const createBusinessTypeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { error: "الاسم يجب أن يتكون من حرفين على الأقل" })
    .max(60),
});

export const renameBusinessTypeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { error: "الاسم يجب أن يتكون من حرفين على الأقل" })
    .max(60),
});

export const featureDefaultSchema = z.object({
  businessTypeId: z.string().min(1),
  key: z.enum(FEATURE_KEYS, { error: "ميزة غير معروفة" }),
  enabled: z.boolean(),
});

export const featureOverrideSchema = z.object({
  key: z.enum(FEATURE_KEYS, { error: "ميزة غير معروفة" }),
  enabled: z.boolean(),
});

export type FeatureOverrideInput = z.infer<typeof featureOverrideSchema>;
export type FeatureDefaultInput = z.infer<typeof featureDefaultSchema>;
