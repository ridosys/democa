import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { companyConfig } from "@/config/company";
import type { ColorTokens } from "./schema";
import {
  resolveReceiptPaper,
  resolveReceiptTextSize,
  type ReceiptPaperSize,
  type ReceiptTextSize,
} from "@/lib/receipt-paper";
import {
  resolveReceiptLanguage,
  resolveReceiptStyle,
  type ReceiptStyle,
} from "@/lib/receipt-style";
import { resolvePrintMethod, type PrintMethod } from "@/lib/print-method";

export type SystemSettingsData = {
  appName: string;
  appShortName: string;
  /** Custom logo delivery URL, or the company.ts default (which may be null). */
  logoUrl: string | null;
  colorsLight: ColorTokens;
  colorsDark: ColorTokens;
  /** Default paper printed invoices are laid out for (58mm, 80mm, A5, A4). */
  receiptPaperSize: ReceiptPaperSize;
  /** How receipts are printed: browser dialog, Thermer app or ESC/POS service. */
  printMethod: PrintMethod;
  /** Default text size of printed documents (%). */
  receiptTextSize: ReceiptTextSize;
  /** Default language of printed documents; null = each document's own. */
  receiptLanguage: "ar" | "fr" | "en" | null;
  /** Look of every printed document (sales / purchase / waiter invoice). */
  receiptStyle: ReceiptStyle;
};

function mergeColors(base: ColorTokens, override: unknown): ColorTokens {
  if (!override || typeof override !== "object") return base;
  return { ...base, ...(override as Partial<ColorTokens>) };
}

export const getSystemSettings = cache(
  async (): Promise<SystemSettingsData> => {
    const row = await prisma.systemSettings.findFirst();
    return {
      appName: row?.appName || companyConfig.name,
      appShortName: row?.appShortName || companyConfig.shortName,
      logoUrl: row?.logoUrl || companyConfig.logo,
      colorsLight: mergeColors(companyConfig.colors.light, row?.colorsLight),
      colorsDark: mergeColors(companyConfig.colors.dark, row?.colorsDark),
      receiptPaperSize: resolveReceiptPaper(undefined, row?.receiptPaperSize),
      printMethod: resolvePrintMethod(row?.printMethod),
      receiptTextSize: resolveReceiptTextSize(row?.receiptTextSize),
      receiptLanguage: resolveReceiptLanguage(row?.receiptLanguage),
      receiptStyle: resolveReceiptStyle(row?.receiptStyle),
    };
  },
);

export async function getSystemSettingsRow() {
  return prisma.systemSettings.findFirst();
}
