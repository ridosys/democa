export default function PublicMenuLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-dvh bg-muted/20">{children}</div>;
}
