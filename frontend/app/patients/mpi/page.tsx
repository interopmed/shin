import Link from "next/link";
import { getPatientMpi } from "../../../lib/patients-db";

export const dynamic = "force-dynamic";

function MpiProgress({ value, tone }: { value: number; tone: "high" | "low" }) {
  return (
    <div className={`mpi-gauge ${tone}`}>
      <span>{value}%</span>
    </div>
  );
}

export default async function MasterPatientIndexPage() {
  const mpi = await getPatientMpi();
  const loadedCount = mpi.patients.length;

  return (
    <section className="mpi-page">
      <nav className="facility-breadcrumb" aria-label="Breadcrumb">
        <Link href="/dashboard">Dashboard</Link>
        <span className="separator">/</span>
        <Link href="/patients">Patients</Link>
        <span className="separator">/</span>
        <span className="current">MPI</span>
      </nav>

      <div className="mpi-card">
        <header className="mpi-header">
          <div>
            <h1>Master Patient Index</h1>
            <p className="patient-db-status">
              {mpi.summary.duplicateClusters} duplicate cluster{mpi.summary.duplicateClusters === 1 ? "" : "s"} detected
              · {mpi.summary.assignedDoctorLinks} assigned doctor link{mpi.summary.assignedDoctorLinks === 1 ? "" : "s"}
            </p>
          </div>
          <Link className="mpi-primary-button" href="/patients">
            + Add New Patient
          </Link>
        </header>

        <div className="mpi-toolbar">
          <label className="mpi-search">
            <span aria-hidden="true">O</span>
            <input type="search" placeholder="Search MPI records" />
          </label>
          <div className="mpi-toolbar-actions">
            <button className="mpi-select-button" type="button">
              Patients v
            </button>
            <button className="mpi-filter-button" type="button">
              = Filter
            </button>
          </div>
        </div>

        <nav className="mpi-tabs" aria-label="MPI views">
          <a className="active" href="#patient-list">
            Patient List
          </a>
          <a href="#merge-status">Merge Status</a>
          <a href="#identity-validation">Identity Validation</a>
          <a href="#system-matches">System Matches</a>
        </nav>

        <div className="mpi-table-wrap" id="patient-list">
          <table className="mpi-table">
            <thead>
              <tr>
                <th>
                  <input aria-label="Select all MPI patients" type="checkbox" />
                </th>
                <th>Unique Patient ID</th>
                <th>Patient Name</th>
                <th>Sex/Gender</th>
                <th>Date of Birth</th>
                <th>Address</th>
                <th>Match Confidence Score</th>
                <th>Actions</th>
                <th aria-label="More actions" />
              </tr>
            </thead>
            <tbody>
              {mpi.patients.map((patient) => (
                <tr key={patient.id}>
                  <td>
                    <input aria-label={`Select ${patient.name}`} type="checkbox" />
                  </td>
                  <td>
                    <strong>{patient.patientNumber}</strong>
                  </td>
                  <td>
                    <strong>{patient.name}</strong>
                    <span>{patient.id}</span>
                  </td>
                  <td>{patient.sex}</td>
                  <td>{patient.birthDate}</td>
                  <td>{patient.address}</td>
                  <td>
                    <div className="mpi-confidence">
                      <strong>{patient.confidence}%</strong>
                      <span>
                        <i className={patient.confidence < 80 ? "warning" : ""} style={{ width: `${patient.confidence}%` }} />
                      </span>
                    </div>
                  </td>
                  <td>
                    <Link className={`mpi-action-pill ${patient.tone}`} href={`/patients/${patient.id}`}>
                      {patient.action}
                    </Link>
                  </td>
                  <td>
                    <button className="mpi-row-menu" aria-label={`More actions for ${patient.name}`} type="button">
                      :
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="mpi-bottom-grid">
          <div className="mpi-panel mpi-health" id="identity-validation">
            <h2>MPI System Health</h2>
            <div className="mpi-health-grid">
              <div>
                <h3>Data Integrity</h3>
                <MpiProgress tone="high" value={mpi.summary.integrity} />
                <div className="mpi-bars">
                  <i />
                  <i />
                  <i className="active" />
                  <i />
                </div>
              </div>
              <div>
                <h3>Duplicate Patient Rate</h3>
                <MpiProgress tone="low" value={Math.min(99, Math.round(mpi.summary.duplicateRate * 10) / 10)} />
                <div className="mpi-bars muted">
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
              </div>
            </div>
          </div>

          <div className="mpi-panel" id="merge-status">
            <h2>Identity Conflict Queue</h2>
            <div className="mpi-conflict-list">
              {mpi.conflicts.length ? (
                mpi.conflicts.map((item) => (
                  <div className="mpi-conflict-item" key={item.id}>
                    <span className={`mpi-conflict-icon ${item.tone}`}>!</span>
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.time}</p>
                    </div>
                    <button aria-label={`More actions for ${item.title}`} type="button">
                      :
                    </button>
                  </div>
                ))
              ) : (
                <div className="mpi-conflict-item">
                  <span className="mpi-conflict-icon info">i</span>
                  <div>
                    <strong>No duplicate clusters found</strong>
                    <p>The current database snapshot is clean.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mpi-panel" id="system-matches">
            <h2>Key Data Sources</h2>
            <div className="mpi-source-list">
              {mpi.dataSources.map((source) => (
                <div className="mpi-source-item" key={source.name}>
                  <span className={`mpi-source-mark ${source.tone}`}>{source.mark}</span>
                  <div>
                    <strong>{source.name}</strong>
                    <p>{source.records} records</p>
                  </div>
                  <button aria-label={`More actions for ${source.name}`} type="button">
                    :
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="patient-list-footer">
          <p>
            Showing <strong>{loadedCount}</strong> loaded MPI record{loadedCount === 1 ? "" : "s"}
          </p>
        </footer>
      </div>
    </section>
  );
}
