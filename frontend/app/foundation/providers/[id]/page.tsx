import { notFound } from "next/navigation";
import ProviderDetailClient from "./ProviderDetailClient";

type PatientAssignment = {
  id: string;
  patientNumber: string;
  name: string;
  birthDate: string;
  phone: string;
  email: string;
  status: string;
  lastVisit: string;
};

type ProviderDetailPayload = {
  id: string;
  name: string;
  role: string;
  specialty: string;
  department: string;
  status: string;
  tone: string;
  patients: PatientAssignment[];
};

async function getProviderDetails(providerId: string): Promise<ProviderDetailPayload | null> {
  try {
    const res = await fetch(`http://127.0.0.1:8000/api/foundation/providers/${providerId}/`, { cache: "no-store" });
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`Failed to fetch provider details: ${res.status}`);
    }
    return res.json();
  } catch (error) {
    console.error("Provider details load error:", error);
    return null;
  }
}

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProviderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const provider = await getProviderDetails(id);

  if (!provider) {
    notFound();
  }

  return <ProviderDetailClient provider={provider} />;
}
