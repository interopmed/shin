import { notFound } from "next/navigation";
import { getFacilities, getServiceUnit } from "@/lib/facilities-db";
import ServiceUnitDetailClient from "@/components/ServiceUnitDetailClient";

export const dynamic = "force-dynamic";

export default async function ServiceUnitDetailPage({
  params,
}: {
  params: Promise<{ slug: string; unitId: string }>;
}) {
  const { slug, unitId } = await params;
  const facilities = await getFacilities();
  const facility = facilities.find((item) => item.slug === slug);

  if (!facility) {
    notFound();
  }

  const serviceUnit = await getServiceUnit(unitId);

  if (!serviceUnit || String(serviceUnit.facility_id) !== String(facility.id)) {
    notFound();
  }

  return <ServiceUnitDetailClient facility={facility} initialServiceUnit={serviceUnit} />;
}
