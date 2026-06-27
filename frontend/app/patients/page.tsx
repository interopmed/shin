import PatientDirectoryClient from "../../components/PatientDirectoryClient";
import { getDoctorOptions, getPatientDirectory } from "../../lib/patients-db";

export const dynamic = "force-dynamic";

export default async function PatientDirectoryPage() {
  const [directory, doctors] = await Promise.all([getPatientDirectory(), getDoctorOptions()]);
  return <PatientDirectoryClient {...directory} doctors={doctors} />;
}
