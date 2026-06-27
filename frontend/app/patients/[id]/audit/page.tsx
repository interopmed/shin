import Link from "next/link";

const patientAuditRows = [
  { time: "10:43:20 PM +0530", date: "22 Jun 2026", actor: "Admin-TW", action: "PATIENT_READ", object: "Bessie Cooper Profile", module: "MedTrackr Core", risk: "Low", result: "Allowed" },
  { time: "10:43:20 PM +0530", date: "22 Jun 2026", actor: "Admin-TW", action: "PHI_VIEW", object: "Epic Data Feed", module: "EHR Overview", risk: "High", result: "Flagged" },
  { time: "10:43:20 PM +0530", date: "22 Jun 2026", actor: "Admin-TW", action: "CONSENT_FLAG", object: "Research Participation", module: "Consent", risk: "Medium", result: "Updated" },
  { time: "09:38:12 PM +0530", date: "22 Jun 2026", actor: "Dr. Adam Bennett", action: "CLINICAL_NOTE_READ", object: "Clinical Notes", module: "EHR Notes", risk: "Low", result: "Allowed" },
  { time: "08:15:01 PM +0530", date: "22 Jun 2026", actor: "Epic Feed Node", action: "MPI_LINK_EDIT", object: "External Identifier", module: "MPI", risk: "Medium", result: "Reviewed" },
  { time: "06:02:44 PM +0530", date: "22 Jun 2026", actor: "Theresa Webb", action: "PROFILE_VERIFY", object: "Bessie Cooper Identity", module: "Patient Directory", risk: "Low", result: "Verified" },
  { time: "05:47:33 PM +0530", date: "22 Jun 2026", actor: "Admin-TW", action: "LOGIN_ATTEMPT", object: "Patient Chart", module: "Identity Access", risk: "High", result: "Flagged" },
];

const timeline = [
  { label: "PHI views", value: "12", detail: "3 high-risk flags" },
  { label: "Consent changes", value: "4", detail: "2 updated by admin" },
  { label: "External links", value: "3", detail: "1 MPI review" },
  { label: "Last verified", value: "Today", detail: "Theresa Webb" },
];

const investigations = [
  "Show all Bessie Cooper PHI access",
  "Find consent changes for this patient",
  "Review access outside care team",
  "Export patient audit packet",
];

export default function PatientAuditPage() {
  return (
    <section className="audit-page patient-audit-page">
      <div className="audit-card">
        <header className="audit-header">
          <div>
            <h1>Patient Audit Trail</h1>
            <p className="patient-audit-subtitle">Bessie Cooper &gt; Security, Privacy, and Access History</p>
          </div>
          <div className="audit-header-actions">
            <Link className="audit-secondary-button" href="/patients/P10001">
              &lt; Back
            </Link>
            <button className="audit-primary-button" type="button">
              Export Trail
            </button>
          </div>
        </header>

        <section className="patient-audit-banner">
          <div className="consent-patient-photo" aria-label="Bessie Cooper portrait">
            <div />
          </div>
          <div>
            <h2>Bessie Cooper</h2>
            <p>EID-P10001</p>
          </div>
          <span>DOB: 4/12/1979</span>
          <span>Primary Physician: Dr. Adam Bennett</span>
          <span className="patient-audit-risk">2 unresolved flags</span>
        </section>

        <section className="patient-audit-grid">
          <div className="audit-main">
            <section className="audit-panel">
              <div className="audit-panel-header">
                <h2>Patient Access Monitor</h2>
                <button className="audit-secondary-button compact" type="button">
                  Patient Scope
                </button>
              </div>
              <div className="patient-audit-metrics">
                {timeline.map((item) => (
                  <div className="audit-metric" key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                    <p>{item.detail}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="audit-panel audit-trail-panel">
              <div className="audit-panel-header">
                <h2>Patient-Specific Security Event Trail</h2>
                <button className="audit-secondary-button compact" type="button">
                  Advanced Filter
                </button>
              </div>
              <div className="audit-filter-row">
                {["Date Range", "Actor", "Action Type", "Module", "Risk Level"].map((filter) => (
                  <button key={filter} type="button">
                    {filter} v
                  </button>
                ))}
              </div>
              <div className="audit-table-wrap">
                <table className="audit-table patient-audit-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Actor</th>
                      <th>Action</th>
                      <th>Object</th>
                      <th>Module</th>
                      <th>Risk</th>
                      <th>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patientAuditRows.map((row, index) => (
                      <tr key={`${row.action}-${index}`}>
                        <td>
                          <strong>{row.time}</strong>
                          <span>{row.date}</span>
                        </td>
                        <td>{row.actor}</td>
                        <td>{row.action}</td>
                        <td>{row.object}</td>
                        <td>{row.module}</td>
                        <td><span className={`patient-audit-pill ${row.risk.toLowerCase()}`}>{row.risk}</span></td>
                        <td>{row.result}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <aside className="audit-side">
            <section className="audit-panel audit-search-panel">
              <h2>Patient Audit Analysis</h2>
              <p>Focused investigation templates for Bessie Cooper access, consent, and chart activity.</p>
              <div className="audit-template-list">
                {investigations.map((template) => (
                  <button key={template} type="button">
                    {template}
                  </button>
                ))}
              </div>
            </section>

            <section className="audit-panel patient-audit-summary">
              <h2>Why This Matters</h2>
              <p>Patient audit trails answer who accessed Bessie Cooper's record, why, from which module, and whether any event needs compliance review.</p>
              <strong>Current review status: Open</strong>
            </section>
          </aside>
        </section>
      </div>
    </section>
  );
}
