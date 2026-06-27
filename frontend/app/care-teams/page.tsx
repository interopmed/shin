const teamMembers = [
  {
    name: "Dr. Adam Bennett",
    role: "Primary Physician",
    specialty: "Internal Medicine",
    department: "Adult Care",
    patients: 34,
    status: "Available",
    tone: "blue",
  },
  {
    name: "Leslie Alexander",
    role: "Charge Nurse",
    specialty: "Clinical Staff",
    department: "Care Coordination",
    patients: 28,
    status: "On shift",
    tone: "warm",
  },
  {
    name: "Dr. Emily Roberts",
    role: "Specialist",
    specialty: "Cardiology",
    department: "Specialty Care",
    patients: 18,
    status: "In consult",
    tone: "green",
  },
  {
    name: "Theresa Webb",
    role: "Care Coordinator",
    specialty: "Transitions",
    department: "Operations",
    patients: 42,
    status: "Available",
    tone: "gray",
  },
  {
    name: "Dr. William Scott",
    role: "Consulting Physician",
    specialty: "Family Medicine",
    department: "Primary Care",
    patients: 22,
    status: "On call",
    tone: "dark",
  },
];

const careTeams = [
  { name: "Bessie Cooper Care Team", lead: "Dr. Adam Bennett", members: 5, risk: "High priority", status: "Active" },
  { name: "Chronic Care Panel", lead: "Dr. Emily Roberts", members: 8, risk: "Routine", status: "Active" },
  { name: "Post-Discharge Follow-up", lead: "Theresa Webb", members: 4, risk: "Needs review", status: "Active" },
];

const coverage = [
  { label: "Primary Care", value: "96%", detail: "Provider coverage" },
  { label: "Nursing", value: "88%", detail: "Shift coverage" },
  { label: "Specialists", value: "73%", detail: "Consult capacity" },
];

export default function CareTeamsPage() {
  return (
    <section className="care-team-page">
      <div className="care-team-card">
        <header className="care-team-header">
          <div>
            <h1>Care Teams</h1>
            <p>Clinical teams, provider assignments, and patient care coordination.</p>
          </div>
          <div className="care-team-actions">
            <button className="care-team-secondary-button" type="button">Import Roster</button>
            <button className="care-team-primary-button" type="button">+ New Team</button>
          </div>
        </header>

        <section className="care-team-summary">
          <div>
            <span>Active Care Teams</span>
            <strong>18</strong>
            <p>Across patient panels</p>
          </div>
          <div>
            <span>Assigned Providers</span>
            <strong>64</strong>
            <p>Clinicians and coordinators</p>
          </div>
          <div>
            <span>Unassigned Patients</span>
            <strong>7</strong>
            <p>Need care owner review</p>
          </div>
          <div>
            <span>Coverage Health</span>
            <strong>91%</strong>
            <p>Current shift readiness</p>
          </div>
        </section>

        <section className="care-team-grid">
          <div className="care-team-main">
            <section className="care-team-panel">
              <div className="care-team-panel-header">
                <h2>Provider Directory</h2>
                <div className="care-team-tools">
                  <label>
                    <span aria-hidden="true">O</span>
                    <input type="search" placeholder="Search providers..." />
                  </label>
                  <button type="button">Role v</button>
                  <button type="button">Department v</button>
                </div>
              </div>

              <div className="care-team-table-wrap">
                <table className="care-team-table">
                  <thead>
                    <tr>
                      <th>Provider</th>
                      <th>Role</th>
                      <th>Specialty</th>
                      <th>Department</th>
                      <th>Patient Load</th>
                      <th>Status</th>
                      <th aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {teamMembers.map((member) => (
                      <tr key={member.name}>
                        <td>
                          <div className="care-team-provider">
                            <span className={`care-team-avatar ${member.tone}`} aria-hidden="true" />
                            <strong>{member.name}</strong>
                          </div>
                        </td>
                        <td>{member.role}</td>
                        <td>{member.specialty}</td>
                        <td>{member.department}</td>
                        <td>{member.patients} patients</td>
                        <td><span className="care-team-status">{member.status}</span></td>
                        <td>
                          <button className="care-team-menu-button" type="button" aria-label={`More actions for ${member.name}`}>
                            :
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="care-team-panel">
              <div className="care-team-panel-header">
                <h2>Care Team Assignments</h2>
                <button className="care-team-secondary-button compact" type="button">Review Queue</button>
              </div>
              <div className="care-team-assignment-list">
                {careTeams.map((team) => (
                  <div className="care-team-assignment" key={team.name}>
                    <div>
                      <strong>{team.name}</strong>
                      <p>Lead: {team.lead} | {team.members} members</p>
                    </div>
                    <span>{team.risk}</span>
                    <button type="button">{team.status}</button>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="care-team-side">
            <section className="care-team-panel">
              <h2>Coverage Snapshot</h2>
              <div className="care-team-coverage">
                {coverage.map((item) => (
                  <div key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                    <p>{item.detail}</p>
                    <i><b style={{ width: item.value }} /></i>
                  </div>
                ))}
              </div>
            </section>

            <section className="care-team-panel">
              <h2>Coordination Notes</h2>
              <div className="care-team-notes">
                <div>
                  <strong>Bessie Cooper</strong>
                  <p>Medication reconciliation needs physician sign-off.</p>
                </div>
                <div>
                  <strong>Post-discharge panel</strong>
                  <p>3 follow-up calls pending before end of shift.</p>
                </div>
                <div>
                  <strong>Specialist queue</strong>
                  <p>Cardiology consult capacity is below target.</p>
                </div>
              </div>
            </section>
          </aside>
        </section>
      </div>
    </section>
  );
}
