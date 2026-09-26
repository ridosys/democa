import { Heart } from "lucide-react";
import { ReceiptRule } from "@/components/shared/receipt-parts";
import { cn } from "@/lib/utils";

/**
 * Pieces of the "bold" and "icons" receipt styles (src/lib/receipt-style.ts),
 * shared by every printed document. Sized in `em`, like receipt-parts.
 */

/** "— ♥ —" closing ornament. */
export function HeartLine() {
  return (
    <div className="mt-[0.4em] flex items-center justify-center gap-[0.5em]">
      <span className="h-0 w-[4em] border-t-[1.5px] border-black" />
      <Heart className="size-[1.1em] fill-black" />
      <span className="h-0 w-[4em] border-t-[1.5px] border-black" />
    </div>
  );
}

export function SolidRule() {
  return <hr className="my-[0.4em] border-0 border-t-[1.5px] border-black" />;
}

/** A line with a dotted leader between the name and the values. */
export function LeaderLine({
  name,
  values,
  className,
}: {
  name: React.ReactNode;
  values: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-[0.5em]", className)}>
      <span className="min-w-0 [overflow-wrap:anywhere]">{name}</span>
      <span className="mb-[0.25em] min-w-[1.5em] flex-1 self-end border-b-[0.15em] border-dotted border-black" />
      <span className="ms-auto flex shrink-0 items-baseline gap-x-[1em] whitespace-nowrap">
        {values}
      </span>
    </div>
  );
}

export function BoldSection({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-[0.2em] mb-[0.4em] inline-block rounded-[0.2em] bg-black px-[0.8em] py-[0.15em] text-[1.15em] font-bold text-white uppercase [print-color-adjust:exact] [-webkit-print-color-adjust:exact]">
      {children}
    </h2>
  );
}

export function IconsSection({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  children: React.ReactNode;
}) {
  return (
    <>
      <h2 className="mt-[0.6em] flex items-center gap-[0.6em] text-[1.2em] font-bold uppercase">
        <Icon className="size-[1.4em] shrink-0" strokeWidth={2.25} />
        {children}
      </h2>
      <ReceiptRule className="mt-[0.3em] mb-[0.4em]" />
    </>
  );
}

/** Grand total on a black band (bold style). */
export function BoldGrandTotal({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="mt-[0.5em] flex flex-wrap items-baseline justify-between gap-x-[1em] rounded-[0.2em] bg-black px-[0.6em] py-[0.3em] text-white [print-color-adjust:exact] [-webkit-print-color-adjust:exact]">
      <span className="text-[1.2em] font-bold uppercase">{label}</span>
      <span className="ms-auto text-[1.45em] font-extrabold whitespace-nowrap">{value}</span>
    </div>
  );
}

/** Uppercase title with a short rule under it (bold style). */
export function BoldTitle({ children }: { children: React.ReactNode }) {
  return (
    <>
      <h1 className="mt-[0.3em] text-center text-[1.8em] leading-tight font-extrabold uppercase">
        {children}
      </h1>
      <div className="mx-auto mt-[0.2em] w-[30%] border-t-[1.5px] border-black" />
    </>
  );
}

/** Closing line of the bold style: script-like thank-you and a heart. */
export function BoldThankYou({ children }: { children: React.ReactNode }) {
  return (
    <>
      <p className="mt-[0.4em] text-center font-serif text-[1.4em] font-bold italic">{children}</p>
      <HeartLine />
    </>
  );
}

/** Closing line of the icons style: spaced-out capitals and a heart. */
export function IconsThankYou({ children }: { children: React.ReactNode }) {
  return (
    <>
      <p className="mt-[0.5em] text-center text-[1.15em] tracking-wider uppercase">{children}</p>
      <HeartLine />
    </>
  );
}
