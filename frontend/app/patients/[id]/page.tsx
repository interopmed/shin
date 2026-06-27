import Link from "next/link";
import { notFound } from "next/navigation";
import { getPatientById } from "../../../lib/patients-db";

const dataSources = [
  { name: "SHIN PostgreSQL", records: 1, mark: "DB", tone: "blue" },
  { name: "Legacy Patient Table", records: 1, mark: "PT", tone: "green" },
  { name: "Module Access", records: 0, mark: "M", tone: "pink" },
];

function DetailRow({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value ?? "Not recorded"}</strong>
    </div>
  );
}

export default async function PatientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const patient = await getPatientById(id);

  if (!patient) {
    notFound();
  }

  const activity = [
    { title: "Record Created", detail: patient.createdAt, icon: "user" },
    { title: "Last Updated", detail: patient.updatedAt, icon: "check" },
    { title: "Source Table", detail: "public.patient", icon: "merge" },
  ];

  return (
    <section className="patient-profile-page">
      <div className="patient-profile-card">
        <header className="profile-view-header">
          <div className="profile-breadcrumb">
            <span>Patient Profile</span>
            <span>&gt;</span>
            <span>View</span>
            <span>&gt;</span>
            <strong>{patient.name}</strong>
          </div>
          <div className="profile-view-actions">
            <Link className="profile-back-button" href="/patients">
              &lt; Back
            </Link>
            <Link className="profile-edit-button" href={`/patients/${patient.id}/edit`}>
              Edit Profile
            </Link>
          </div>
        </header>

        <nav className="profile-tabs" aria-label="Patient profile sections">
          <a className="active" href="#patients">
            Patients
          </a>
          <a href="#summary">Summary</a>
          <Link href={`/patients/${patient.id}/consent`}>Consent</Link>
          <Link href={`/patients/${patient.id}/audit`}>Audit Trail</Link>
          <a href="#resources">Resources</a>
          <a href="#testing">Testing</a>
        </nav>

        <section className="profile-view-grid">
          <div className="profile-panel profile-summary-panel" id="summary">
            <h2>Patient Summary</h2>
            <div className="profile-photo" aria-label={`${patient.name} portrait`}>
              <div className="profile-photo-face" />
            </div>
            <h3>{patient.name}</h3>
            <dl className="summary-fields">
              <div>
                <dt>Database ID</dt>
                <dd>{patient.id}</dd>
              </div>
              <div>
                <dt>Patient ID</dt>
                <dd>{patient.patientNumber}</dd>
              </div>
              <div>
                <dt>DOB</dt>
                <dd>{patient.birthDate}</dd>
              </div>
              <div>
                <dt>Gender</dt>
                <dd>{patient.sex}</dd>
              </div>
              <div>
                <dt>Blood Group</dt>
                <dd>{patient.bloodGroup}</dd>
              </div>
            </dl>
          </div>

          <div className="profile-panel">
            <h2>Contact Details</h2>
            <div className="profile-detail-list">
              <DetailRow label="Phone" value={patient.phone} />
              <DetailRow label="Email" value={patient.email} />
              <DetailRow label="Address" value={patient.address} />
            </div>
          </div>

          <div className="profile-panel">
            <h2>Clinical Assignment</h2>
            <div className="profile-detail-list">
              <DetailRow label="Doctor" value={patient.doctor} />
              <DetailRow label="Age" value={patient.age} />
              <DetailRow label="Last Visit" value={patient.lastVisit} />
            </div>
          </div>

          <div className="profile-panel profile-wide-panel">
            <h2>Legacy Metadata</h2>
            <div className="profile-detail-list two-column">
              <DetailRow label="User ID" value={patient.userId} />
              <DetailRow label="Method of Arrival" value={patient.methodOfArrival} />
              <DetailRow label="Edited Time" value={patient.editedTime} />
              <DetailRow label="Image URL" value={patient.imageUrl || "Not recorded"} />
            </div>
          </div>

          <div className="profile-panel">
            <h2>Key Data Sources</h2>
            <div className="profile-source-list">
              {dataSources.map((source) => (
                <div className="profile-source-item" key={source.name}>
                  <span className={`mpi-source-mark ${source.tone}`}>{source.mark}</span>
                  <div>
                    <strong>{source.name}</strong>
                    <p>{source.records} records</p>
                  </div>
                  <button className="profile-verification-button" type="button">
                    Verification
                  </button>
                  <button className="profile-menu-button" aria-label={`More actions for ${source.name}`} type="button">
                    :
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="profile-panel profile-wide-panel">
            <h2>Profile Activity Log</h2>
            <div className="profile-activity-list">
              {activity.map((item) => (
                <div className="profile-activity-item" key={item.title}>
                  <span className={`profile-activity-icon ${item.icon}`}>{item.icon === "check" ? "v" : item.icon === "merge" ? "m" : "o"}</span>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.detail}</p>
                  </div>
                  <button className="profile-menu-button" aria-label={`More actions for ${item.title}`} type="button">
                    :
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="profile-panel profile-wide-panel">
            <h2>Patient Note</h2>
            <div className="profile-detail-list">
              <DetailRow label="Note" value={patient.note} />
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
