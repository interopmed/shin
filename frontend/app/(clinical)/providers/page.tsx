import ProviderIndexClient from "./ProviderIndexClient";

type ProviderRecord = {
  id: string;
  name: string;
  role: string;
  specialty: string;
  department: string;
  patients: number;
  status: string;
  tone: string;
};

async function getProviders(): Promise<ProviderRecord[]> {
  try {
    const res = await fetch("http://127.0.0.1:8000/api/care-team-providers/", { cache: "no-store" });
    if (!res.ok) {
      throw new Error("Failed to fetch provider list from backend");
    }
    return res.json();
  } catch (error) {
    console.error("Provider Index load error:", error);
    return [];
  }
}

export const dynamic = "force-dynamic";

export default async function ProviderIndexPage() {
  const providers = await getProviders();
  return <ProviderIndexClient initialProviders={providers} />;
}
