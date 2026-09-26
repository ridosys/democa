import { DocumentLogo } from "@/components/shared/document-logo";
import { cn } from "@/lib/utils";

/**
 * Building blocks for content inside <ReceiptPaper>. Everything is sized in
 * `em` so it scales with the paper's base font size (58mm → A4).
 */

/** Dashed separator line. */
export function ReceiptRule({ className }: { className?: string }) {
  return (
    <hr
      className={cn(
        "my-[0.6em] border-0 border-t-[1.5px] border-dashed border-black",
        className,
      )}
    />
  );
}

/** Centered logo (or the system name when no logo is set). */
export function ReceiptBrand({
  logoUrl,
  name,
}: {
  logoUrl: string | null;
  name: string;
}) {
  return (
    <div className="flex justify-center">
      <DocumentLogo
        logoUrl={logoUrl}
        name={name}
        imgClassName="h-auto max-h-[11em] w-[55%] object-contain"
        nameClassName="text-center text-[1.6em] font-bold"
      />
    </div>
  );
}

/** "Label ........ value" line, value pinned to the end edge. */
export function ReceiptLine({
  label,
  value,
  className,
}: {
  label: React.ReactNode;
  value?: React.ReactNode;
  className?: string;
}) {
  return (
    // Wraps (value on its own line, still at the end) when a large text
    // size doesn't leave room for both on narrow paper.
    <div
      className={cn(
        "flex flex-wrap items-baseline justify-between gap-x-[1em]",
        className,
      )}
    >
      <span className="min-w-0">{label}</span>
      {value !== undefined && (
        <span className="ms-auto shrink-0 text-end whitespace-nowrap">{value}</span>
      )}
    </div>
  );
}

export function ReceiptThankYou({ children }: { children: React.ReactNode }) {
  return <p className="mt-[0.8em] text-center text-[1.1em]">{children}</p>;
}
