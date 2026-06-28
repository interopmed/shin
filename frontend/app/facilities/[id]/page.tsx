import Link from "next/link";
import { notFound } from "next/navigation";
import { getFacilities, getFacilityDepartments } from "../../../lib/facilities-db";

type ServiceArea = {
  name: string;
  lead: string;
  capacity: string;
  status: string;
};

const facilityServiceAreas: Record<string, ServiceArea[]> = {
  "Central Medical Center": [
    { name: "Emergency", lead: "Dr. Adam Bennett", capacity: "24 beds", status: "High load" },
    { name: "Imaging", lead: "Dr. Maria Foster", capacity: "6 rooms", status: "Ready" },
    { name: "Inpatient Care", lead: "Dr. Helen Ward", capacity: "48 beds", status: "Ready" },
  ],
  "Northside Clinic": [
    { name: "Primary Care", lead: "Dr. William Scott", capacity: "18 rooms", status: "Ready" },
    { name: "Chronic Care", lead: "Dr. Nina Joseph", capacity: "7 rooms", status: "Ready" },
  ],
  "InterOpMed Lab Hub": [
    { name: "Specimen Collection", lead: "Leslie Alexander", capacity: "8 stations", status: "Ready" },
    { name: "Diagnostics", lead: "Dr. Omar Khan", capacity: "5 analyzers", status: "Maintenance" },
  ],
  "Virtual Care Center": [
    { name: "Telehealth Pods", lead: "Theresa Webb", capacity: "12 sessions", status: "Ready" },
    { name: "Remote Monitoring", lead: "James Carter", capacity: "30 patients", status: "Ready" },
  ],
};

function buildFallbackServiceAreas(departments: number, rooms: number, status: string): ServiceArea[] {
  return [
    {
      name: "General Operations",
      lead: "Operations Team",
      capacity: `${departments} departments`,
      status,
    },
    {
      name: "Clinical Rooms",
      lead: "Facility Administration",
      capacity: `${rooms} rooms`,
      status: status === "Offline" ? "Offline" : "Ready",
    },
  ];
}

export const dynamic = "force-dynamic";

export default async function FacilityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const facilities = await getFacilities();
  const facility = facilities.find((item) => item.id === id);

  if (!facility) {
    notFound();
  }

  const storedDepartments = await getFacilityDepartments(facility.id).catch(() => []);
  const serviceAreas =
    storedDepartments.length > 0
      ? storedDepartments
      : facilityServiceAreas[facility.name] ?? buildFallbackServiceAreas(facility.departments, facility.rooms, facility.status);

  return (
    <section className="facility-page">
      <nav className="facility-breadcrumb" aria-label="Breadcrumb">
        <Link href="/facilities">Facilities</Link>
        <span className="separator">/</span>
        <span className="current">{facility.name}</span>
      </nav>

      <div className="facility-card">
        <header className="facility-header">
          <div>
            <h1>{facility.name}</h1>
            <p>
              {facility.type} in {facility.location}
            </p>
          </div>
          <div className="facility-actions">
            <Link className="facility-secondary-button" href="/facilities">
              Back to Facilities
            </Link>
            {/* Manage button – currently points to the edit placeholder page */}
            <Link className="facility-primary-button" href={`/facilities/${facility.id}/edit`}>
              Manage Facility
            </Link>
          </div>
        </header>

        <section className="facility-summary">
          <div>
            <span>Status</span>
            <strong>{facility.status}</strong>
            <p>Current operational state</p>
          </div>
          <div>
            <span>Departments</span>
            <strong>{facility.departments}</strong>
            <p>Tracked service units</p>
          </div>
          <div>
            <span>Rooms</span>
            <strong>{facility.rooms}</strong>
            <p>Clinical and support spaces</p>
          </div>
          <div>
            <span>Occupancy</span>
            <strong>{facility.occupancy}</strong>
            <p>Current utilization snapshot</p>
          </div>
        </section>

        <section className="facility-grid">
          <div className="facility-main">
            <section className="facility-panel">
              <div className="facility-panel-header">
                <h2>Departments & Service Areas</h2>
              </div>
              <div className="facility-department-list">
                {serviceAreas.map((area) => (
                  <div className="facility-department" key={area.name}>
                    <div>
                      <strong>{area.name}</strong>
                      <p>
                        {facility.name} | Lead: {area.lead}
                      </p>
                    </div>
                    <span>{area.capacity}</span>
                    <button type="button">{area.status}</button>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="facility-side">
            <section className="facility-panel">
              <h2>Facility Details</h2>
              <div className="facility-infrastructure">
                <div>
                  <span>Facility ID</span>
                  <strong>{facility.id}</strong>
                  <p>Backend record identifier</p>
                </div>
                <div>
                  <span>Type</span>
                  <strong>{facility.type}</strong>
                  <p>Registered care-site category</p>
                </div>
                <div>
                  <span>Location</span>
                  <strong>{facility.location}</strong>
                  <p>Primary site or service location</p>
                </div>
              </div>
            </section>
          </aside>
        </section>
      </div>
    </section>
  );
}