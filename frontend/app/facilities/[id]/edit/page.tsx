import Link from "next/link";
import { notFound } from "next/navigation";
import FacilityEditForm from "../../../../components/FacilityEditForm";
import { getFacilities, getFacilityDepartments } from "../../../../lib/facilities-db";

export const dynamic = "force-dynamic";

export default async function FacilityEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const facilities = await getFacilities();
  const facility = facilities.find((f) => f.id === id);

  if (!facility) {
    notFound();
  }

  const initialDepartments = await getFacilityDepartments(facility.id).catch(() => []);

  return (
    <section className="facility-page">
      <nav className="facility-breadcrumb" aria-label="Breadcrumb">
        <Link href="/facilities">Facilities</Link>
        <span className="separator">/</span>
        <Link href={`/facilities/${facility.id}`}>{facility.name}</Link>
        <span className="separator">/</span>
        <span className="current">Edit</span>
      </nav>

      <div className="facility-card">
        <header className="facility-header">
          <div>
            <h1>Edit {facility.name}</h1>
            <p>Refine the operational record and keep the service profile current.</p>
          </div>
          <div className="facility-actions">
            <Link className="facility-secondary-button" href={`/facilities/${facility.id}`}>
              View Facility
            </Link>
          </div>
        </header>

        <FacilityEditForm facility={facility} initialDepartments={initialDepartments} />
      </div>
    </section>
  );
}

