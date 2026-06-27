import { notFound } from "next/navigation";
import PatientEditClient from "../../../../components/PatientEditClient";
import { getDoctorOptions, getPatientById } from "../../../../lib/patients-db";

export const dynamic = "force-dynamic";

export default async function PatientEditProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [patient, doctors] = await Promise.all([getPatientById(id), getDoctorOptions()]);

  if (!patient) {
    notFound();
  }

  return <PatientEditClient patient={patient} doctors={doctors} />;
}
