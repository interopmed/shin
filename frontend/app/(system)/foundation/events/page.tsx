import Link from "next/link";

const events = [
  { severity: "Critical", user: "Nurse-AM", action: "PHI_VIEW", object: "EID-P10001", module: "EHR Clinical", source: "Epic Node 2", compliance: "32ev800000" },
  { severity: "Critical", user: "Nurse-AM", action: "LOGIN_ATTEMPT", object: "EID-P10001", module: "EHR Clinical", source: "Epic Node 2", compliance: "32ev800000" },
  { severity: "Critical", user: "Billing_API_Feed", action: "LOGIN_ATTEMPT", object: "EID-P10001", module: "EHR Clinical", source: "Epic Node 2", compliance: "32ev800001" },
  { severity: "High", user: "Billing_API_Feed", action: "DATA_EXPORT_REQUEST", object: "MPI_Merge_Queue", module: "EHR Clinical", source: "Epic Node 2", compliance: "32ev800000" },
  { severity: "High", user: "Dr-Jones", action: "DATA_EXPORT_REQUEST", object: "MPI_Merge_Queue", module: "SHIN Core", source: "Epic Node 2", compliance: "32ev800001" },
  { severity: "High", user: "Dr-Jones", action: "DATA_EXPORT_REQUEST", object: "MPI_Merge_Queue", module: "EHR Clinical", source: "Epic Node 2", compliance: "32ev800001" },
  { severity: "Info", user: "Dr-Jones", action: "LOGIN_ATTEMPT", object: "Sys_Config_Update", module: "SHIN Core", source: "Local DB", compliance: "32ev800001" },
  { severity: "Info", user: "Billing_API_Feed", action: "PHI_VIEW", object: "Sys_Config_Update", module: "SHIN Core", source: "Local DB", compliance: "32ev800001" },
  { severity: "Critical", user: "Dr-Jones", action: "PHI_VIEW", object: "Sys_Config_Update", module: "EHR Clinical", source: "Epic Node 2", compliance: "32ev800001" },
  { severity: "High", user: "Dr-Jones", action: "PHI_VIEW", object: "Sys_Config_Update", module: "EHR Clinical", source: "Epic Node 2", compliance: "32ev800001" },
  { severity: "Info", user: "Dr-Jones", action: "CONSENT_FLAG_CHANGE", object: "Sys_Config_Update", module: "SHIN Core", source: "Epic Node 2", compliance: "32ev800001" },
  { severity: "Info", user: "Billing_API_Feed", action: "CONSENT_FLAG_CHANGE", object: "Sys_Config_Update", module: "MPI", source: "Local DB", compliance: "32ev800001" },
];

const severityFilters = ["Critical", "High", "Medium", "Low"];
const moduleFilters = ["SHIN Core", "EHR Clinical", "MPI"];

export default function SystemEventViewerPage() {
  return (
    <section className="events-page">
      <div className="events-card">
        <header className="events-header">
          <h1>System Event Viewer</h1>
          <div className="events-header-actions">
            <Link className="events-secondary-button" href="/">
              &lt; Back
            </Link>
            <button className="events-primary-button" type="button">
              Select Trail
            </button>
          </div>
        </header>

        <section className="events-summary-grid">
          <div className="events-filter-card">
            <label>Date Range</label>
            <button type="button">2026-06-22</button>
          </div>
          <div className="events-filter-card">
            <label>Severity</label>
            <div className="events-chip-list">
              {severityFilters.map((severity) => (
                <span className={`events-chip ${severity.toLowerCase()}`} key={severity}>
                  {severity}
                </span>
              ))}
            </div>
          </div>
          <div className="events-filter-card">
            <label>Module</label>
            <div className="events-chip-list vertical">
              {moduleFilters.map((module) => (
                <span className="events-chip module" key={module}>
                  {module}
                </span>
              ))}
            </div>
          </div>
          <div className="events-stat-card">
            <span>Events (Last 24h)</span>
            <strong>15,280</strong>
          </div>
          <div className="events-stat-card">
            <span>Active Alerts</span>
            <strong>11</strong>
            <p>(High-Risk)</p>
          </div>
          <div className="events-stat-card distribution">
            <span>Module Distribution (Core/EHR)</span>
            <div className="events-donut" aria-label="Module distribution chart" />
          </div>
        </section>

        <section className="events-toolbar">
          <button type="button">Date Range v</button>
          <button type="button">Filter v</button>
          <button className="wide" type="button">
            Action Type (PATIENT_READ, LOGIN, PHI_VIEW, DATA_EXPORT) v
          </button>
          <label>
            <span aria-hidden="true">O</span>
            <input type="search" placeholder="Search across all fields..." />
          </label>
        </section>

        <section className="events-table-wrap">
          <table className="events-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Severity</th>
                <th>User ID/Node</th>
                <th>Action</th>
                <th>Object ID/Context</th>
                <th>Affected Module <span>^</span></th>
                <th>Source System</th>
                <th>Compliance ID</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event, index) => (
                <tr key={`${event.action}-${event.user}-${index}`}>
                  <td>
                    <strong>2026-06-22 10:45:10 PM</strong>
                  </td>
                  <td>
                    <span className={`events-severity ${event.severity.toLowerCase()}`}>{event.severity}</span>
                  </td>
                  <td>{event.user}</td>
                  <td>{event.action}</td>
                  <td>{event.object}</td>
                  <td>
                    <span className={`events-module ${event.module === "SHIN Core" || event.module === "MPI" ? "core" : "ehr"}`}>
                      {event.module}
                    </span>
                  </td>
                  <td>{event.source}</td>
                  <td>{event.compliance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <footer className="events-footer">
          <div className="events-pagination">
            <button type="button">&lt;</button>
            <button className="active" type="button">1</button>
            <button type="button">2</button>
            <span>...</span>
            <button type="button">4</button>
            <button type="button">&gt;</button>
          </div>
          <p>Showing 1 of events</p>
        </footer>
      </div>
    </section>
  );
}
