/** Printed-invoice labels in the invoice's own language (not the UI
 * locale) — shared by the browser receipt and the Bluetooth Print JSON. */
export type Lang = "ar" | "en" | "fr";

export function resolveInvoiceLang(
  param: string | undefined,
  fallback: string,
): Lang {
  const requested = param ?? fallback.toLowerCase();
  return requested === "en" || requested === "fr" ? requested : "ar";
}

export const INVOICE_PRINT_LABELS: Record<
  Lang,
  {
    title: string;
    invoiceNumber: string;
    date: string;
    billTo: string;
    phone: string;
    product: string;
    quantity: string;
    unitPrice: string;
    lineTotal: string;
    total: string;
    previousPayment: string;
    previousDebts: string;
    oldAccountPrompt: string;
    includeOldAccount: string;
    excludeOldAccount: string;
    selectInvoicesTitle: string;
    selectAllInvoices: string;
    invoiceTotal: string;
    totalPaid: string;
    remaining: string;
    done: string;
    grandTotal: string;
    itemsCount: string;
    totalWeight: string;
    thankYou: string;
    walkInCustomer: string;
  }
> = {
  ar: {
    title: "فاتورة",
    invoiceNumber: "رقم الفاتورة",
    date: "التاريخ",
    billTo: "فاتورة إلى",
    phone: "الهاتف",
    product: "نوع البضاعة",
    quantity: "العدد",
    unitPrice: "الثمن",
    lineTotal: "المجموع",
    total: "إجمالي المنتجات",
    previousPayment: "الدفع السابق",
    previousDebts: "الحساب القديم",
    oldAccountPrompt: "يوجد على هذا العميل حساب قديم بقيمة",
    includeOldAccount: "تضمين الحساب القديم",
    excludeOldAccount: "بدون الحساب القديم",
    selectInvoicesTitle: "اختر الفواتير القديمة المضمَّنة",
    selectAllInvoices: "تحديد الكل",
    invoiceTotal: "الإجمالي",
    totalPaid: "المدفوع",
    remaining: "المتبقي",
    done: "تم",
    grandTotal: "الإجمالي الكلي",
    itemsCount: "عدد المنتجات",
    totalWeight: "الوزن الإجمالي (kg)",
    thankYou: "شكراً لتعاملكم معنا",
    walkInCustomer: "زبون مباشر",
  },
  fr: {
    title: "Facture",
    invoiceNumber: "Numéro de facture",
    date: "Date",
    billTo: "Facturé à",
    phone: "Téléphone",
    product: "Produit",
    quantity: "Qté",
    unitPrice: "P.U.",
    lineTotal: "Total",
    total: "Total des produits",
    previousPayment: "Paiement précédent",
    previousDebts: "Ancien compte",
    oldAccountPrompt: "Ce client a un ancien compte de",
    includeOldAccount: "Inclure l'ancien compte",
    excludeOldAccount: "Sans l'ancien compte",
    selectInvoicesTitle: "Choisir les anciennes factures incluses",
    selectAllInvoices: "Tout sélectionner",
    invoiceTotal: "Total",
    totalPaid: "Payé",
    remaining: "Restant",
    done: "Terminé",
    grandTotal: "Total général",
    itemsCount: "Nombre de produits",
    totalWeight: "Poids total (kg)",
    thankYou: "Merci pour votre confiance !",
    walkInCustomer: "Client de passage",
  },
  en: {
    title: "Invoice",
    invoiceNumber: "Invoice number",
    date: "Date",
    billTo: "Bill to",
    phone: "Phone",
    product: "Product",
    quantity: "Qty",
    unitPrice: "Unit",
    lineTotal: "Total",
    total: "Products total",
    previousPayment: "Previous payment",
    previousDebts: "Previous balance",
    oldAccountPrompt: "This customer has a previous balance of",
    includeOldAccount: "Include previous balance",
    excludeOldAccount: "Exclude previous balance",
    selectInvoicesTitle: "Select previous invoices to include",
    selectAllInvoices: "Select all",
    invoiceTotal: "Total",
    totalPaid: "Paid",
    remaining: "Remaining",
    done: "Done",
    grandTotal: "Grand total",
    itemsCount: "Number of products",
    totalWeight: "Total weight (kg)",
    thankYou: "Thank you for your business!",
    walkInCustomer: "Walk-in",
  },
};
