import Link from "next/link";

const auditRows = [
  { eventId: "10013", user: "Admin-TW", action: "PATIENT_READ", object: "Bessie Cooper (EID-P10001)", source: "MedTrackr Core", severity: "Primary", trace: "32eV8Bul" },
  { eventId: "10013", user: "Admin-TW", action: "PATIENT_READ", object: "Bessie Cooper (EID-P10001)", source: "MedTrackr Core", severity: "Primary", trace: "32eV8Oul" },
  { eventId: "10013", user: "Admin-TW", action: "MPI_LINK_EDIT", object: "Bessie Cooper (EID-P10001)", source: "MedTrackr Core", severity: "Severity", trace: "ATNA Rule 4.1.2" },
  { eventId: "10013", user: "Admin-TW", action: "PHI_VIEW", object: "Epic Data Feed", source: "Epic Feed Node", severity: "Severity", trace: "32eV8Oul" },
  { eventId: "10015", user: "Admin-TW", action: "PHI_VIEW", object: "Epic Data Feed", source: "Epic Feed Node", severity: "Severity", trace: "32eV8Oul" },
  { eventId: "10015", user: "Admin-TW", action: "PHI_VIEW", object: "Epic Data Feed", source: "Epic Feed Node", severity: "Severity", trace: "ATNA Rule" },
  { eventId: "10013", user: "Admin-TW", action: "CONSENT_FLAG", object: "Bessie Cooper (EID-P10001)", source: "MedTrackr Core", severity: "Severity", trace: "32eV8Uul" },
  { eventId: "10013", user: "Admin-TW", action: "LOGIN_ATTEMPT", object: "Epic Data Feed", source: "MedTrackr Core", severity: "Severity", trace: "32enBUl" },
  { eventId: "10013", user: "Admin-TW", action: "LOGIN_ATTEMPT", object: "Epic Data Feed", source: "Epic Feed Node", severity: "Severity", trace: "32enBUl" },
];

const filters = ["Date Range", "User ID", "Action Type", "Module", "Source System", "Risk Level"];

const alerts = [
  { title: "PHI_VIEW from unusual location", score: 1, confidence: 50 },
  { title: "Failed Login Brute Force", score: 0, confidence: 61 },
];

const templates = [
  "Analyze Bessie Cooper Access",
  "Analyze Bessie Cooper Access",
  "Analyze Bessie Cooper Access",
  "Analyze Bessie Cooper Access",
];

export default function AuditLogPage() {
  return (
    <section className="audit-page">
      <div className="audit-card">
        <header className="audit-header">
          <h1>Security, Privacy, and Compliance: Technical/Security Audit Log</h1>
          <div className="audit-header-actions">
            <Link className="audit-secondary-button" href="/">
              &lt; Back
            </Link>
            <button className="audit-primary-button" type="button">
              Select Trail
            </button>
          </div>
        </header>

        <section className="audit-layout">
          <div className="audit-main">
            <section className="audit-panel audit-monitor">
              <div className="audit-panel-header">
                <h2>Real-time Threat & Compliance Monitor</h2>
                <button className="audit-secondary-button compact" type="button">
                  Summary
                </button>
              </div>
              <div className="audit-metrics">
                <div className="audit-metric">
                  <span>Total Events (24h)</span>
                  <strong>12,450</strong>
                  <p>Total Logs age: <b>12,450</b></p>
                </div>
                <div className="audit-metric">
                  <span>Anomalous Activity Alerts</span>
                  <strong>23</strong>
                  <p className="audit-chip danger">Anomalous Activity 23</p>
                </div>
                <div className="audit-metric">
                  <span>Compliance Drift (HIPAA/ATNA)</span>
                  <strong>21</strong>
                  <p className="audit-chip warning">Compliance Drift 19</p>
                </div>
                <div className="audit-metric audit-users-metric">
                  <span>Top Active Users</span>
                  <div className="audit-bars-chart" aria-label="Top active users chart">
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                  </div>
                  <div className="audit-user-labels">
                    <span>User 1</span>
                    <span>User 2</span>
                    <span>User 3</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="audit-panel audit-trail-panel">
              <div className="audit-panel-header">
                <h2>Live Security Event Trail</h2>
                <button className="audit-secondary-button compact" type="button">
                  Advanced Filter
                </button>
              </div>

              <div className="audit-filter-row">
                {filters.map((filter) => (
                  <button key={filter} type="button">
                    {filter} v
                  </button>
                ))}
              </div>

              <div className="audit-table-wrap">
                <table className="audit-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Event ID</th>
                      <th>User ID/Node</th>
                      <th>Action</th>
                      <th>Object Type</th>
                      <th>Source System</th>
                      <th>Severity</th>
                      <th>Trace ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditRows.map((row, index) => (
                      <tr key={`${row.eventId}-${row.action}-${index}`}>
                        <td>
                          <strong>10:43:20 PM +0530</strong>
                          <span>22 Jun 2026</span>
                        </td>
                        <td>{row.eventId}</td>
                        <td>{row.user}</td>
                        <td>{row.action}</td>
                        <td>{row.object}</td>
                        <td>{row.source}</td>
                        <td>{row.severity}</td>
                        <td>{row.trace}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <aside className="audit-side">
            <section className="audit-panel audit-feed">
              <h2>Threat Intelligence Feed</h2>
              <div className="audit-live-alerts">
                <div className="audit-alert-title">
                  <span>!</span>
                  <strong>Live Alerts</strong>
                  <button aria-label="More live alert actions" type="button">:</button>
                </div>
                {alerts.map((alert) => (
                  <div className="audit-alert-card" key={alert.title}>
                    <strong>{alert.title}</strong>
                    <p>Confidence Score: {alert.score}</p>
                    <div className="audit-map" aria-hidden="true">
                      <span className="pin one" />
                      <span className="pin two" />
                    </div>
                    <span className="audit-confidence">Confidence: {alert.confidence}%</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="audit-panel audit-search-panel">
              <h2>Audit Trail Search & Analysis</h2>
              <p>Advanced Boolean logic with Advanced Boolean logic</p>
              <div className="audit-query-row">
                <button type="button">Boolean v</button>
                <button type="button">if v</button>
                <button type="button">It</button>
                <button type="button">...</button>
              </div>
              <div className="audit-query-row">
                <button type="button">All near v</button>
                <button className="primary" type="button">&lt;</button>
                <button className="primary" type="button">&gt;</button>
              </div>
              <h3>Investigation templates</h3>
              <div className="audit-template-list">
                {templates.map((template, index) => (
                  <button key={`${template}-${index}`} type="button">
                    {template}
                  </button>
                ))}
              </div>
            </section>
          </aside>
        </section>

        <section className="audit-question">
          <h2>Key Question Resolved: "Did someone look at or modify medical records who shouldn't have?"</h2>
          <p>Automatically flagged, unresolved high-risk access events "Did someone look at or modify medical codes (EID-P10001)!"</p>
        </section>
      </div>
    </section>
  );
}
