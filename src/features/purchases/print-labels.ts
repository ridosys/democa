/** Printed purchase-invoice labels, in the document's own language —
 * shared by the print page and the printer-app receipt. */
import type { Lang } from "@/features/invoices/print-labels";

export const PURCHASE_PRINT_LABELS: Record<
  Lang,
  {
    title: string;
    orderNumber: string;
    date: string;
    supplier: string;
    phone: string;
    product: string;
    quantity: string;
    unitCost: string;
    lineTotal: string;
    total: string;
    itemsCount: string;
    totalWeight: string;
    supplierSignature: string;
    itemsSection: string;
    summarySection: string;
  }
> = {
  ar: {
    title: "فاتورة شراء",
    orderNumber: "رقم أمر الشراء",
    date: "التاريخ",
    supplier: "المورد",
    phone: "الهاتف",
    product: "نوع البضاعة",
    quantity: "العدد",
    unitCost: "التمن",
    lineTotal: "الإجمالي",
    total: "الإجمالي الكلي",
    itemsCount: "عدد المنتجات",
    totalWeight: "الوزن الإجمالي (kg)",
    supplierSignature: "توقيع المورد",
    itemsSection: "المنتجات",
    summarySection: "الملخص",
  },
  fr: {
    title: "Facture d'achat",
    orderNumber: "Numéro de commande",
    date: "Date",
    supplier: "Fournisseur",
    phone: "Téléphone",
    product: "Produit",
    quantity: "Quantité",
    unitCost: "Prix unitaire",
    lineTotal: "Sous-total",
    total: "Total",
    itemsCount: "Nombre de produits",
    totalWeight: "Poids total (kg)",
    supplierSignature: "Signature du fournisseur",
    itemsSection: "Articles",
    summarySection: "Récapitulatif",
  },
  en: {
    title: "Purchase invoice",
    orderNumber: "Purchase order number",
    date: "Date",
    supplier: "Supplier",
    phone: "Phone",
    product: "Product",
    quantity: "Quantity",
    unitCost: "Unit cost",
    lineTotal: "Line total",
    total: "Grand total",
    itemsCount: "Number of products",
    totalWeight: "Total weight (kg)",
    supplierSignature: "Supplier signature",
    itemsSection: "Items",
    summarySection: "Summary",
  },
};
