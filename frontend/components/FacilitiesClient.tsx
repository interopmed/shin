"use client";

import Link from "next/link";
import { useDeferredValue, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import type { CreateFacilityInput, FacilityRecord, ServiceUnitRecord } from "../lib/facilities-db";
import { useAuth } from "@/context/AuthContext";
import { canAccess } from "@/lib/permissions";

type FacilitiesClientProps = {
  initialFacilities: FacilityRecord[];
};



const infrastructure = [
  { label: "Bed Capacity", value: "82%", detail: "Across inpatient rooms" },
  { label: "Room Utilization", value: "68%", detail: "Clinical and diagnostic" },
  { label: "Device Uptime", value: "97%", detail: "Connected equipment" },
];

const demoFacilities: CreateFacilityInput[] = [
  { name: "Central Medical Center", type: "Hospital", location: "Colombo", departments: 14, rooms: 128, status: "Operational", occupancy: "82%" },
  { name: "Northside Clinic", type: "Outpatient", location: "Kandy", departments: 6, rooms: 42, status: "Operational", occupancy: "61%" },
  { name: "InterOpMed Lab Hub", type: "Diagnostic Lab", location: "Galle", departments: 5, rooms: 31, status: "Maintenance", occupancy: "74%" },
  { name: "Virtual Care Center", type: "Telehealth", location: "Remote", departments: 3, rooms: 18, status: "Operational", occupancy: "45%" },
];

const emptyForm: CreateFacilityInput = {
  name: "",
  type: "Hospital",
  location: "",
  departments: 0,
  rooms: 0,
  status: "Operational",
  occupancy: "0%",
};

export default function FacilitiesClient({ initialFacilities }: FacilitiesClientProps) {
  const router = useRouter();
  const [facilities, setFacilities] = useState(initialFacilities);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [menuId, setMenuId] = useState("");
  const [form, setForm] = useState<CreateFacilityInput>(emptyForm);
  const [formError, setFormError] = useState("");
  const [banner, setBanner] = useState("");
  // State for managing the saving state of the create-facility form
  const [isSaving, setIsSaving] = useState(false);

  const [isPending, startTransition] = useTransition();
  const deferredSearch = useDeferredValue(search);

  const typeOptions = Array.from(new Set(facilities.map((facility) => facility.type))).sort((left, right) =>
    left.localeCompare(right)
  );

  const filteredFacilities = facilities.filter((facility) => {
    const searchTerm = deferredSearch.trim().toLowerCase();
    const matchesSearch =
      !searchTerm ||
      facility.name.toLowerCase().includes(searchTerm) ||
      facility.location.toLowerCase().includes(searchTerm) ||
      facility.type.toLowerCase().includes(searchTerm);
    const matchesType = typeFilter === "all" || facility.type === typeFilter;
    const matchesStatus = statusFilter === "all" || facility.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const totalDepartments = facilities.reduce((sum, facility) => sum + facility.departments, 0);
  const totalRooms = facilities.reduce((sum, facility) => sum + facility.rooms, 0);
  const occupancyTotal = facilities.reduce(
    (sum, facility) => sum + Number.parseFloat(facility.occupancy.replace("%", "") || "0"),
    0
  );
  const occupancyDisplay = `${facilities.length ? Math.round(occupancyTotal / facilities.length) : 0}%`;

  function updateForm<K extends keyof CreateFacilityInput>(key: K, value: CreateFacilityInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function createFacility(payload: CreateFacilityInput) {
    const response = await fetch("/api/facilities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = (await response.json()) as { facility?: FacilityRecord; error?: string };
    if (!response.ok || !json.facility) {
      throw new Error(json.error || "Unable to create facility.");
    }

    return json.facility;
  }

  function sortFacilities(items: FacilityRecord[]) {
    return [...items].sort((left, right) => left.name.localeCompare(right.name));
  }

  function openMap(location: string) {
    const query = encodeURIComponent(location || "facility");
    window.open(`https://www.google.com/maps/search/${query}`, "_blank", "noopener,noreferrer");
  }

  function copyName(name: string) {
    void navigator.clipboard?.writeText(name);
    setBanner(`Copied ${name}.`);
    setMenuId("");
  }

  function manageMap() {
    const locations = filteredFacilities
      .map((facility) => facility.location)
      .filter((location) => location && location !== "Not recorded")
      .slice(0, 3);
    const query = locations.length ? locations.join(", ") : "healthcare facilities";
    openMap(query);
  }

  function importLocations() {
    setFormError("");
    setBanner("");

    const existingNames = new Set(facilities.map((facility) => facility.name.toLowerCase()));
    const missing = demoFacilities.filter((facility) => !existingNames.has(facility.name.toLowerCase()));

    if (!missing.length) {
      setBanner("All demo facilities are already loaded.");
      return;
    }

    startTransition(() => {
      void (async () => {
        try {
          const created: FacilityRecord[] = [];
          for (const facility of missing) {
            created.push(await createFacility(facility));
          }
          setFacilities((current) => sortFacilities([...current, ...created]));
          setBanner(`Imported ${created.length} facilities.`);
          router.refresh();
        } catch (error) {
          setFormError(error instanceof Error ? error.message : "Unable to import facilities.");
        }
      })();
    });
  }

  function submitFacility(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setBanner("");

    const payload: CreateFacilityInput = {
      ...form,
      name: form.name.trim(),
      location: form.location.trim(),
      occupancy: form.occupancy.trim().endsWith("%") ? form.occupancy.trim() : `${form.occupancy.trim()}%`,
    };

    if (!payload.name) {
      setFormError("Facility name is required.");
      return;
    }

    // Show saving indicator while the POST request is in flight
    setIsSaving(true);
    startTransition(() => {
      void (async () => {
        try {
          const facility = await createFacility(payload);
          setFacilities((current) => sortFacilities([...current, facility]));
          setForm(emptyForm);
          setShowCreate(false);
          setBanner(`Added ${facility.name}.`);
          router.refresh();
        } catch (error) {
          setFormError(error instanceof Error ? error.message : "Unable to create facility.");
        } finally {
          setIsSaving(false);
        }
      })();
    });
  }

  return (
    <section className="facility-page">
      <div className="facility-card">
        <header className="facility-header">
          <div>
            <h1>Facilities & Locations</h1>
            <p>Sites, departments, rooms, beds, labs, and virtual care locations.</p>
            {banner ? <p className="facility-banner">{banner}</p> : null}
          </div>
          <div className="facility-actions">
            <button className="facility-secondary-button" onClick={importLocations} type="button">
              {isPending ? "Working..." : "Import Locations"}
            </button>
            <button className="facility-primary-button" onClick={() => setShowCreate(true)} type="button">
              + New Facility
            </button>
          </div>
        </header>

        <section className="facility-summary">
          <div>
            <span>Facilities</span>
            <strong>{facilities.length}</strong>
            <p>Active care sites</p>
          </div>
          <div>
            <span>Departments</span>
            <strong>{totalDepartments}</strong>
            <p>Clinical and operational units</p>
          </div>
          <div>
            <span>Rooms & Beds</span>
            <strong>{totalRooms}</strong>
            <p>Tracked spaces</p>
          </div>
          <div>
            <span>Location Health</span>
            <strong>{occupancyDisplay}</strong>
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
                    <input
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search facilities..."
                      type="search"
                      value={search}
                    />
                  </label>
                  <select className="facility-filter-select" onChange={(event) => setTypeFilter(event.target.value)} value={typeFilter}>
                    <option value="all">All types</option>
                    {typeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <select className="facility-filter-select" onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
                    <option value="all">All status</option>
                    <option value="Operational">Operational</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Offline">Offline</option>
                  </select>
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
                    {filteredFacilities.map((facility) => (
                      <tr key={facility.id || facility.name}>
                        <td>
                          <Link href={`/facilities/${facility.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                            <strong>{facility.name}</strong>
                          </Link>
                        </td>
                        <td>{facility.type}</td>
                        <td>{facility.location}</td>
                        <td>{facility.departments}</td>
                        <td>{facility.rooms}</td>
                        <td>
                          <span className="facility-occupancy">
                            <i>
                              <b style={{ width: facility.occupancy }} />
                            </i>
                            {facility.occupancy}
                          </span>
                        </td>
                        <td>
                          <span className={facility.status === "Operational" ? "facility-status" : "facility-status warning"}>
                            {facility.status}
                          </span>
                        </td>
                        <td>
                          {/* Actions removed */}
                        </td>
                      </tr>
                    ))}
                    {filteredFacilities.length === 0 ? (
                      <tr>
                        <td colSpan={8}>
                          <div className="facility-empty-state">
                            <strong>No facilities match this view</strong>
                            <p>Adjust the search, change filters, or add a new facility.</p>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
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
                    <i>
                      <b style={{ width: item.value }} />
                    </i>
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

      {showCreate ? (
        <div className="patient-modal-backdrop" role="presentation">
          <section aria-labelledby="new-facility-title" className="patient-modal" role="dialog">
            <header className="patient-modal-header">
              <div>
                <h2 id="new-facility-title">Add new facility</h2>
                <p>Create a facility record in the backend database.</p>
              </div>
              <button aria-label="Close add facility" onClick={() => setShowCreate(false)} type="button">
                x
              </button>
            </header>
            <form className="patient-create-form" onSubmit={submitFacility}>
              <div className="patient-form-grid">
                <label>
                  Facility name
                  <input onChange={(event) => updateForm("name", event.target.value)} required value={form.name} disabled={isSaving} />
                </label>
                <label>
                  Type
                  <select onChange={(event) => updateForm("type", event.target.value)} value={form.type} disabled={isSaving}>
                    <option value="Hospital">Hospital</option>
                    <option value="Outpatient">Outpatient</option>
                    <option value="Diagnostic Lab">Diagnostic Lab</option>
                    <option value="Telehealth">Telehealth</option>
                    <option value="Other">Other</option>
                  </select>
                </label>
                <label>
                  Location
                  <input onChange={(event) => updateForm("location", event.target.value)} value={form.location} disabled={isSaving} />
                </label>
                <label>
                  Status
                  <select onChange={(event) => updateForm("status", event.target.value)} value={form.status} disabled={isSaving}>
                    <option value="Operational">Operational</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Offline">Offline</option>
                  </select>
                </label>
                <label>
                  Departments
                  <input
                    min="0"
                    onChange={(event) => updateForm("departments", Number(event.target.value) || 0)}
                    type="number"
                    value={form.departments}
                    disabled={isSaving}
                  />
                </label>
                <label>
                  Rooms
                  <input
                    min="0"
                    onChange={(event) => updateForm("rooms", Number(event.target.value) || 0)}
                    type="number"
                    value={form.rooms}
                    disabled={isSaving}
                  />
                </label>
                <label>
                  Occupancy
                  <input onChange={(event) => updateForm("occupancy", event.target.value)} placeholder="74%" value={form.occupancy} disabled={isSaving} />
                </label>
              </div>
              {formError ? <p className="patient-form-error">{formError}</p> : null}
              <div className="patient-form-actions">
                <button className="facility-secondary-button" onClick={() => setShowCreate(false)} type="button" disabled={isSaving}>
                  Cancel
                </button>
                <button className="facility-primary-button" disabled={isSaving} type="submit">
                  {isSaving ? "Saving..." : "Save facility"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  );
}
