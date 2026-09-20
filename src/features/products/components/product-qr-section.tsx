import { QRCodeSVG } from "qrcode.react";
import { ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Dictionary } from "@/i18n/dictionaries";

/** A scannable link to this product's public storefront page — always the
 * same `/products/{slug}` route the Retail storefront already serves, no
 * new page or token involved. Only ever resolves once the product is
 * ACTIVE (see (public)/products/[slug]/page.tsx), so an inactive product
 * shows a plain heads-up instead of a QR that would 404 if scanned. */
export function ProductQrSection({
  productUrl,
  isActive,
  t,
}: {
  productUrl: string;
  isActive: boolean;
  t: Dictionary;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.products.qr.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3">
        <QRCodeSVG value={productUrl} size={160} />
        <p className="break-all text-center text-xs text-muted-foreground">{productUrl}</p>
        {!isActive && (
          <p className="text-center text-xs text-destructive">{t.products.qr.inactiveWarning}</p>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full cursor-pointer"
          nativeButton={false}
          render={<a href={productUrl} target="_blank" rel="noreferrer" />}
        >
          <ExternalLink className="size-4" />
          {t.products.qr.viewPageButton}
        </Button>
      </CardContent>
    </Card>
  );
}
