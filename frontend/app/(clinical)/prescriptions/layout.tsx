export default function PrescriptionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-full w-full">
      <main className="flex-1 w-full h-full overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
