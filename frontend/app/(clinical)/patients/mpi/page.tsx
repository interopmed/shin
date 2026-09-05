import Link from "next/link";
import { getPatientMpi } from "@/lib/patients-db";
import IdentityConflictQueue from "@/components/IdentityConflictQueue";

export const dynamic = "force-dynamic";

function MpiProgress({ value, tone }: { value: number; tone: "high" | "low" }) {
  return (
    <div className={`mpi-gauge ${tone}`}>
      <span>{value}%</span>
    </div>
  );
}

export default async function MasterPatientIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; query?: string; sex?: string; confidence?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const page = parseInt(resolvedSearchParams.page || "1", 10);
  const query = resolvedSearchParams.query || "";
  const sex = resolvedSearchParams.sex || "";
  const confidenceFilter = resolvedSearchParams.confidence || "";
  const pageSize = 10;

  const mpi = await getPatientMpi(page, pageSize, query, sex, confidenceFilter);
  const loadedCount = mpi.patients.length;
  const totalCount = mpi.pagination?.total ?? loadedCount;
  const totalPages = mpi.pagination?.totalPages ?? 1;

  const startRecord = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRecord = Math.min(page * pageSize, totalCount);

  const getPaginationRange = (current: number, total: number) => {
    const range: (number | string)[] = [];
    if (total <= 8) {
      for (let i = 1; i <= total; i++) {
        range.push(i);
      }
      return range;
    }

    if (current <= 4) {
      range.push(1, 2, 3, 4, "...", total - 2, total - 1, total);
    } else if (current >= total - 3) {
      range.push(1, 2, 3, "...", total - 3, total - 2, total - 1, total);
    } else {
      range.push(1, "...", current - 1, current, current + 1, "...", total);
    }
    return range;
  };

  const paginationRange = getPaginationRange(page, totalPages);

  return (
    <section className="mpi-page">
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
          <form className="mpi-search-form" method="GET" action="/patients/mpi" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
            <label className="mpi-search" style={{ flex: '1', minWidth: '200px', maxWidth: '310px' }}>
              <span aria-hidden="true">O</span>
              <input type="search" name="query" defaultValue={query} placeholder="Search MPI records" />
            </label>

            <select
              name="sex"
              defaultValue={sex}
              className="mpi-select-button"
              style={{
                height: '34px',
                border: '1px solid #ccd6e2',
                borderRadius: '8px',
                padding: '0 10px',
                fontSize: '13px',
                fontWeight: 800,
                color: '#111827',
                background: '#ffffff',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="">All Genders</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
            </select>

            <select
              name="confidence"
              defaultValue={confidenceFilter}
              className="mpi-filter-button"
              style={{
                height: '34px',
                border: '1px solid #ccd6e2',
                borderRadius: '8px',
                padding: '0 10px',
                fontSize: '13px',
                fontWeight: 800,
                color: '#111827',
                background: '#ffffff',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="">All Scores</option>
              <option value="high">High Confidence (≥ 80%)</option>
              <option value="low">Low Confidence (&lt; 80%)</option>
            </select>

            <button type="submit" className="mpi-primary-button" style={{ height: '34px', minHeight: '34px', padding: '0 14px', borderRadius: '8px', fontWeight: 800 }}>
              Apply
            </button>

            {(query || sex || confidenceFilter) && (
              <Link
                href="/patients/mpi"
                className="mpi-filter-button"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  textDecoration: 'none',
                  minHeight: '34px',
                  height: '34px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 800,
                  background: '#f1f5f9',
                  borderColor: '#cbd5e1'
                }}
              >
                Clear
              </Link>
            )}
          </form>
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

        {/* Pagination just below the table */}
        <div className="mpi-pagination-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: '14px 24px', borderBottom: '1px solid #e3e9f1' }}>
          <p style={{ margin: 0, fontSize: '13px', color: '#667085', fontWeight: 600 }}>
            Showing <strong>{startRecord}-{endRecord}</strong> of <strong>{totalCount}</strong> MPI record{totalCount === 1 ? "" : "s"}
          </p>

          <div className="mpi-pagination-controls" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {/* Previous Page Button */}
            {page > 1 ? (
              <Link
                href={{
                  pathname: "/patients/mpi",
                  query: { page: page - 1, ...(query ? { query } : {}), ...(sex ? { sex } : {}), ...(confidenceFilter ? { confidence: confidenceFilter } : {}) },
                }}
                className="mpi-filter-button"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  textDecoration: 'none',
                  minHeight: '34px',
                  lineHeight: '34px'
                }}
              >
                Previous
              </Link>
            ) : (
              <span
                className="mpi-filter-button disabled"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  color: '#98a2b3',
                  background: '#f8fafc',
                  borderColor: '#e2e8f0',
                  cursor: 'not-allowed',
                  minHeight: '34px',
                  lineHeight: '34px'
                }}
              >
                Previous
              </span>
            )}

            {/* Page Numbers */}
            {paginationRange.map((pageNum, index) => {
              if (pageNum === "...") {
                return (
                  <span
                    key={`ellipsis-${index}`}
                    style={{
                      padding: '0 8px',
                      fontSize: '13px',
                      fontWeight: 800,
                      color: '#98a2b3',
                      display: 'inline-flex',
                      alignItems: 'center',
                      minHeight: '34px',
                      lineHeight: '34px'
                    }}
                  >
                    ...
                  </span>
                );
              }

              const pageNumber = pageNum as number;
              const isActive = pageNumber === page;
              return (
                <Link
                  key={`page-${pageNumber}`}
                  href={{
                    pathname: "/patients/mpi",
                    query: { page: pageNumber, ...(query ? { query } : {}), ...(sex ? { sex } : {}), ...(confidenceFilter ? { confidence: confidenceFilter } : {}) },
                  }}
                  className={`mpi-filter-button ${isActive ? "active" : ""}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    textDecoration: 'none',
                    background: isActive ? '#2f66d9' : '#ffffff',
                    borderColor: isActive ? '#2457c5' : '#ccd6e2',
                    color: isActive ? '#ffffff' : '#111827',
                    minHeight: '34px',
                    lineHeight: '34px'
                  }}
                >
                  {pageNumber}
                </Link>
              );
            })}

            {/* Next Page Button */}
            {page < totalPages ? (
              <Link
                href={{
                  pathname: "/patients/mpi",
                  query: { page: page + 1, ...(query ? { query } : {}), ...(sex ? { sex } : {}), ...(confidenceFilter ? { confidence: confidenceFilter } : {}) },
                }}
                className="mpi-filter-button"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  textDecoration: 'none',
                  minHeight: '34px',
                  lineHeight: '34px'
                }}
              >
                Next
              </Link>
            ) : (
              <span
                className="mpi-filter-button disabled"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  color: '#98a2b3',
                  background: '#f8fafc',
                  borderColor: '#e2e8f0',
                  cursor: 'not-allowed',
                  minHeight: '34px',
                  lineHeight: '34px'
                }}
              >
                Next
              </span>
            )}
          </div>
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

          <IdentityConflictQueue initialConflicts={mpi.conflicts} />

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

