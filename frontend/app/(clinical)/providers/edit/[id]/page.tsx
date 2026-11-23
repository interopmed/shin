import ProviderEditClient from './ProviderEditClient';

async function getProvider(id: string) {
  const res = await fetch(`http://127.0.0.1:8000/api/foundation/providers/${id}/`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch provider");
  return res.json();
}

export default async function ProviderEditPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const provider = await getProvider(resolvedParams.id);
  return <ProviderEditClient provider={provider} providerId={resolvedParams.id} />;
}
