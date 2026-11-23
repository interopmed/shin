import { notFound } from "next/navigation";
import { getFacilities } from "@/lib/facilities-db";
import FacilityFirmsClient from "@/components/FacilityFirmsClient";

export const dynamic = "force-dynamic";

export default async function FacilityFirmsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const facilities = await getFacilities();
  const facility = facilities.find((item) => item.slug === slug);

  if (!facility) {
    notFound();
  }

  return <FacilityFirmsClient facility={facility} />;
}
