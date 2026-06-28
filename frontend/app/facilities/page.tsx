import FacilitiesClient from "@/components/FacilitiesClient";
import { getFacilities } from "@/lib/facilities-db";

export const dynamic = "force-dynamic";

export default async function FacilitiesPage() {
  const facilities = await getFacilities();
  return <FacilitiesClient initialFacilities={facilities} />;
}
