import { notFound } from "next/navigation";
import PatientConsentClient from "../../../../components/PatientConsentClient";
import { getPatientConsent } from "../../../../lib/patients-db";

export const dynamic = "force-dynamic";

export default async function PatientConsentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const consent = await getPatientConsent(id);

  if (!consent) {
    notFound();
  }

  return <PatientConsentClient consent={consent} />;
}
