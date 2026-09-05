import { notFound } from "next/navigation";
import { getFacilities, getServiceUnits } from "@/lib/facilities-db";
import FacilityDetailClient from "@/components/FacilityDetailClient";

export const dynamic = "force-dynamic";

export default async function FacilityDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const facilities = await getFacilities();
  const facility = facilities.find((item) => item.slug === slug);

  if (!facility) {
    notFound();
  }

  const serviceUnits = await getServiceUnits(facility.id);

  return <FacilityDetailClient facility={facility} initialServiceUnits={serviceUnits} />;
}
