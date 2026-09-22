import { FullscreenAutoEnter } from "@/components/shared/fullscreen-toggle";

// Lives in a layout rather than each café page so the "go fullscreen on the
// first tap" default arms once per visit, like the retail caisse — moving
// between the tables list, a table and the waiter picker keeps this layout
// mounted, so a cashier who exits fullscreen isn't pulled back into it.
export default function CafeCaisseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <FullscreenAutoEnter />
      {children}
    </>
  );
}
