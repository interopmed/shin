const facilities = [
  { name: "Central Medical Center", type: "Hospital", location: "Colombo", departments: 14, rooms: 128, status: "Operational", occupancy: "82%" },
  { name: "Northside Clinic", type: "Outpatient", location: "Kandy", departments: 6, rooms: 42, status: "Operational", occupancy: "61%" },
  { name: "InterOpMed Lab Hub", type: "Diagnostic Lab", location: "Galle", departments: 5, rooms: 31, status: "Maintenance", occupancy: "74%" },
  { name: "Virtual Care Center", type: "Telehealth", location: "Remote", departments: 3, rooms: 18, status: "Operational", occupancy: "45%" },
];

const departments = [
  { name: "Emergency", site: "Central Medical Center", lead: "Dr. Adam Bennett", capacity: "24 beds", status: "High load" },
  { name: "Primary Care", site: "Northside Clinic", lead: "Dr. William Scott", capacity: "18 rooms", status: "Ready" },
  { name: "Specimen Collection", site: "InterOpMed Lab Hub", lead: "Leslie Alexander", capacity: "8 stations", status: "Ready" },
  { name: "Telehealth Pods", site: "Virtual Care Center", lead: "Theresa Webb", capacity: "12 sessions", status: "Ready" },
];

const infrastructure = [
  { label: "Bed Capacity", value: "82%", detail: "Across inpatient rooms" },
  { label: "Room Utilization", value: "68%", detail: "Clinical and diagnostic" },
  { label: "Device Uptime", value: "97%", detail: "Connected equipment" },
];

export default function FacilitiesPage() {
  return (
    <section className="facility-page">
      <div className="facility-card">
        <header className="facility-header">
          <div>
            <h1>Facilities & Locations</h1>
            <p>Sites, departments, rooms, beds, labs, and virtual care locations.</p>
          </div>
          <div className="facility-actions">
            <button className="facility-secondary-button" type="button">Import Locations</button>
            <button className="facility-primary-button" type="button">+ New Facility</button>
          </div>
        </header>

        <section className="facility-summary">
          <div>
            <span>Facilities</span>
            <strong>4</strong>
            <p>Active care sites</p>
          </div>
          <div>
            <span>Departments</span>
            <strong>28</strong>
            <p>Clinical and operational units</p>
          </div>
          <div>
            <span>Rooms & Beds</span>
            <strong>219</strong>
            <p>Tracked spaces</p>
          </div>
          <div>
            <span>Location Health</span>
            <strong>94%</strong>
            <p>Infrastructure readiness</p>
          </div>
        </section>

        <section className="facility-grid">
          <div className="facility-main">
            <section className="facility-panel">
              <div className="facility-panel-header">
                <h2>Facility Directory</h2>
                <div className="facility-tools">
                  <label>
                    <span aria-hidden="true">O</span>
                    <input type="search" placeholder="Search facilities..." />
                  </label>
                  <button type="button">Type v</button>
                  <button type="button">Status v</button>
                </div>
              </div>
              <div className="facility-table-wrap">
                <table className="facility-table">
                  <thead>
                    <tr>
                      <th>Facility</th>
                      <th>Type</th>
                      <th>Location</th>
                      <th>Departments</th>
                      <th>Rooms</th>
                      <th>Occupancy</th>
                      <th>Status</th>
                      <th aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {facilities.map((facility) => (
                      <tr key={facility.name}>
                        <td><strong>{facility.name}</strong></td>
                        <td>{facility.type}</td>
                        <td>{facility.location}</td>
                        <td>{facility.departments}</td>
                        <td>{facility.rooms}</td>
                        <td>
                          <span className="facility-occupancy">
                            <i><b style={{ width: facility.occupancy }} /></i>
                            {facility.occupancy}
                          </span>
                        </td>
                        <td><span className={facility.status === "Operational" ? "facility-status" : "facility-status warning"}>{facility.status}</span></td>
                        <td>
                          <button className="facility-menu-button" type="button" aria-label={`More actions for ${facility.name}`}>
                            :
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="facility-panel">
              <div className="facility-panel-header">
                <h2>Departments & Service Areas</h2>
                <button className="facility-secondary-button compact" type="button">Manage Map</button>
              </div>
              <div className="facility-department-list">
                {departments.map((department) => (
                  <div className="facility-department" key={department.name}>
                    <div>
                      <strong>{department.name}</strong>
                      <p>{department.site} | Lead: {department.lead}</p>
                    </div>
                    <span>{department.capacity}</span>
                    <button type="button">{department.status}</button>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="facility-side">
            <section className="facility-panel">
              <h2>Infrastructure Snapshot</h2>
              <div className="facility-infrastructure">
                {infrastructure.map((item) => (
                  <div key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                    <p>{item.detail}</p>
                    <i><b style={{ width: item.value }} /></i>
                  </div>
                ))}
              </div>
            </section>

            <section className="facility-panel">
              <h2>Operational Alerts</h2>
              <div className="facility-alert-list">
                <div>
                  <strong>Lab Hub maintenance</strong>
                  <p>Analyzer room ventilation inspection due today.</p>
                </div>
                <div>
                  <strong>Emergency high load</strong>
                  <p>Bed capacity above target threshold.</p>
                </div>
                <div>
                  <strong>Virtual care availability</strong>
                  <p>3 telehealth rooms open for scheduling.</p>
                </div>
              </div>
            </section>
          </aside>
        </section>
      </div>
    </section>
  );
}
