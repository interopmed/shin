"use client";

import Link from "next/link";
import { FormEvent, useMemo, useRef, useState } from "react";
import type { DoctorOption, PatientDirectoryRecord, PatientDirectoryResult } from "../lib/patients-db";

type PatientFilter = "all" | "active" | "inactive";
type SortMode = "recent" | "name" | "doctor";

type PatientDirectoryClientProps = PatientDirectoryResult & { doctors: DoctorOption[] };

type PatientFormState = {
  name: string;
  phone: string;
  email: string;
  address: string;
  sex: string;
  birthDate: string;
  bloodGroup: string;
  assignedDoctorId: string;
  doctor: string;
  patientNumber: string;
  note: string;
};

const emptyForm: PatientFormState = {
  name: "",
  phone: "",
  email: "",
  address: "",
  sex: "",
  birthDate: "",
  bloodGroup: "",
  assignedDoctorId: "",
  doctor: "",
  patientNumber: "",
  note: "",
};

function patientMatchesSearch(patient: PatientDirectoryRecord, search: string) {
  const query = search.trim().toLowerCase();

  if (!query) {
    return true;
  }

  return [patient.id, patient.name, patient.phone, patient.email, patient.doctor]
    .join(" ")
    .toLowerCase()
    .includes(query);
}

function sortPatients(patients: PatientDirectoryRecord[], sortMode: SortMode) {
  return [...patients].sort((first, second) => {
    if (sortMode === "name") {
      return first.name.localeCompare(second.name);
    }

    if (sortMode === "doctor") {
      return first.doctor.localeCompare(second.doctor);
    }

    return (Number(second.id) || 0) - (Number(first.id) || 0);
  });
}

function parseCsvRows(text: string) {
  const [headerLine, ...lines] = text.split(/\r?\n/).filter(Boolean);

  if (!headerLine) {
    return [];
  }

  const headers = headerLine.split(",").map((header) => header.trim());

  return lines.map((line) => {
    const values = line.split(",").map((value) => value.trim());

    return headers.reduce<Record<string, string>>((row, header, index) => {
      row[header] = values[index] ?? "";
      return row;
    }, {});
  });
}

export default function PatientDirectoryClient({
  patients: initialPatients,
  total,
  active,
  inactive,
  configured,
  error,
  doctors,
}: PatientDirectoryClientProps) {
  const [patients, setPatients] = useState(initialPatients);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<PatientFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [showFilters, setShowFilters] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [form, setForm] = useState<PatientFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [importStatus, setImportStatus] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const counts = {
    total,
    active,
    inactive,
  };

  const visiblePatients = useMemo(() => {
    const filtered = patients.filter((patient) => {
      const statusMatches = filter === "all" || patient.status.toLowerCase() === filter;
      return statusMatches && patientMatchesSearch(patient, search);
    });

    return sortPatients(filtered, sortMode);
  }, [filter, patients, search, sortMode]);

  const allVisibleSelected =
    visiblePatients.length > 0 && visiblePatients.every((patient) => selectedIds.includes(patient.id));

  function updateForm(field: keyof PatientFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id]
    );
  }

  function toggleAllVisible() {
    setSelectedIds((current) => {
      if (allVisibleSelected) {
        return current.filter((id) => !visiblePatients.some((patient) => patient.id === id));
      }

      return Array.from(new Set([...current, ...visiblePatients.map((patient) => patient.id)]));
    });
  }

  async function submitPatient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError("");

    try {
      const response = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to create patient.");
      }

      setPatients((current) => [payload.patient, ...current]);
      setForm(emptyForm);
      setShowCreate(false);
      setImportStatus(`Created ${payload.patient.name}`);
    } catch (patientError) {
      setFormError(patientError instanceof Error ? patientError.message : "Unable to create patient.");
    } finally {
      setSaving(false);
    }
  }

  async function importPatients(file: File) {
    setImportStatus(`Importing ${file.name}...`);

    try {
      const rows = parseCsvRows(await file.text());
      const createdPatients: PatientDirectoryRecord[] = [];

      for (const row of rows) {
        if (!row.name) {
          continue;
        }

        const response = await fetch("/api/patients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: row.name,
            phone: row.phone,
            email: row.email,
            address: row.address,
            sex: row.sex,
            birthDate: row.birthDate ?? row.ebirthdate ?? row.birthdate,
            bloodGroup: row.bloodGroup ?? row.bloodgroup,
            assignedDoctorId: row.assignedDoctorId ?? row.doctor,
            doctor: row.doctor,
            patientNumber: row.patientNumber ?? row.patient_id,
            note: row.note,
          }),
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error ?? `Unable to import ${row.name}.`);
        }

        createdPatients.push(payload.patient);
      }

      if (createdPatients.length) {
        setPatients((current) => [...createdPatients, ...current]);
      }

      setImportStatus(`Imported ${createdPatients.length} patient${createdPatients.length === 1 ? "" : "s"}.`);
    } catch (patientError) {
      setImportStatus(patientError instanceof Error ? patientError.message : "Unable to import patients.");
    }
  }

  function copyPatientId(id: string) {
    void navigator.clipboard?.writeText(id);
    setImportStatus(`Copied patient ID ${id}`);
    setOpenMenuId(null);
  }

  return (
    <section className="patient-list-page">
      <div className="patient-list-card">
        <header className="patient-list-header">
          <div>
            <h1>Patients List</h1>
            {!configured || error ? <p className="patient-db-status">{error}</p> : null}
            {importStatus ? <p className="patient-import-status">{importStatus}</p> : null}
          </div>
          <div className="patient-header-actions">
            <input
              accept=".csv,text/csv"
              className="patient-file-input"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void importPatients(file);
                }
                event.currentTarget.value = "";
              }}
              ref={fileInputRef}
              type="file"
            />
            <button className="patient-ghost-button" onClick={() => fileInputRef.current?.click()} type="button">
              Import
            </button>
            <button className="patient-primary-button" onClick={() => setShowCreate(true)} type="button">
              + New Patient
            </button>
          </div>
        </header>

        <div className="patient-list-toolbar">
          <div className="patient-tabs" aria-label="Patient filters">
            <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")} type="button">
              All ({counts.total})
            </button>
            <button className={filter === "active" ? "active" : ""} onClick={() => setFilter("active")} type="button">
              Active ({counts.active})
            </button>
            <button
              className={filter === "inactive" ? "active" : ""}
              onClick={() => setFilter("inactive")}
              type="button"
            >
              Inactive ({counts.inactive})
            </button>
          </div>
          <div className="patient-tools">
            <label className="patient-search">
              <span aria-hidden="true">O</span>
              <input
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search..."
                type="search"
                value={search}
              />
            </label>
            <button className="patient-filter-button" onClick={() => setShowFilters((current) => !current)} type="button">
              = Filter
            </button>
          </div>
        </div>

        {showFilters ? (
          <div className="patient-filter-panel">
            <label>
              Status
              <select onChange={(event) => setFilter(event.target.value as PatientFilter)} value={filter}>
                <option value="all">All patients</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <label>
              Sort
              <select onChange={(event) => setSortMode(event.target.value as SortMode)} value={sortMode}>
                <option value="recent">Recently updated</option>
                <option value="name">Patient name</option>
                <option value="doctor">Doctor assigned</option>
              </select>
            </label>
            <button
              className="patient-ghost-button"
              onClick={() => {
                setSearch("");
                setFilter("all");
                setSortMode("recent");
              }}
              type="button"
            >
              Clear
            </button>
          </div>
        ) : null}

        <div className="patient-table-wrap">
          <table className="patient-table">
            <thead>
              <tr>
                <th>
                  <input
                    aria-label="Select all patients"
                    checked={allVisibleSelected}
                    onChange={toggleAllVisible}
                    type="checkbox"
                  />
                </th>
                <th>Patient name</th>
                <th>Contact details</th>
                <th>Date of Birth</th>
                <th>Status</th>
                <th>Doctor Assigned</th>
                <th>Last Visit</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {visiblePatients.map((patient, index) => (
                <tr key={patient.id}>
                  <td>
                    <input
                      aria-label={`Select ${patient.name}`}
                      checked={selectedIds.includes(patient.id)}
                      onChange={() => toggleSelected(patient.id)}
                      type="checkbox"
                    />
                  </td>
                  <td>
                    <div className="patient-name-cell">
                      <span className={`patient-avatar avatar-${index % 5}`}>{patient.name.slice(0, 1)}</span>
                      <div>
                        <Link href={`/patients/${patient.id}`}>
                          <strong>{patient.name}</strong>
                        </Link>
                        <span>{patient.id}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="patient-phone">{patient.phone}</span>
                    <span className="patient-subtext">{patient.email}</span>
                  </td>
                  <td>
                    <span className="patient-date">{patient.birthDate}</span>
                    <span className="patient-subtext">{patient.age ?? "Age unknown"}</span>
                  </td>
                  <td>
                    <span className={`patient-status ${patient.status.toLowerCase()}`}>{patient.status}</span>
                  </td>
                  <td>
                    <span className="patient-doctor">{patient.doctor}</span>
                  </td>
                  <td>
                    <span className="patient-date">{patient.lastVisit}</span>
                  </td>
                  <td>
                    <div className="patient-row-actions">
                      <button
                        aria-expanded={openMenuId === patient.id}
                        aria-label={`More actions for ${patient.name}`}
                        className="patient-row-menu"
                        onClick={() => setOpenMenuId((current) => (current === patient.id ? null : patient.id))}
                        type="button"
                      >
                        :
                      </button>
                      {openMenuId === patient.id ? (
                        <div className="patient-row-actions-menu">
                          <Link href={`/patients/${patient.id}`}>View profile</Link>
                          <Link href={`/patients/${patient.id}/edit`}>Edit profile</Link>
                          <Link href={`/patients/${patient.id}/consent`}>Consent</Link>
                          <Link href={`/patients/${patient.id}/audit`}>Audit trail</Link>
                          <button onClick={() => copyPatientId(patient.id)} type="button">
                            Copy ID
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {visiblePatients.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="patient-empty-state">
                      <strong>No patients match this view</strong>
                      <p>Adjust the search, filters, or create a new PostgreSQL patient record.</p>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <footer className="patient-list-footer">
          <p>
            Showing <strong>{visiblePatients.length ? `1-${visiblePatients.length}` : "0"}</strong> of{" "}
            <strong>{counts.total}</strong> entries
            {selectedIds.length ? <span> | {selectedIds.length} selected</span> : null}
          </p>
          <div className="patient-pagination" aria-label="Patient pagination">
            <button disabled type="button">
              &lt;
            </button>
            <button className="active" type="button">
              1
            </button>
            <button disabled type="button">
              &gt;
            </button>
          </div>
        </footer>
      </div>

      {showCreate ? (
        <div className="patient-modal-backdrop" role="presentation">
          <section aria-labelledby="new-patient-title" className="patient-modal" role="dialog">
            <header className="patient-modal-header">
              <div>
                <h2 id="new-patient-title">Add new patient</h2>
                <p>Create a patient record in PostgreSQL.</p>
              </div>
              <button aria-label="Close add patient" onClick={() => setShowCreate(false)} type="button">
                x
              </button>
            </header>
            <form className="patient-create-form" onSubmit={submitPatient}>
              <div className="patient-form-grid">
                <label>
                  Full name
                  <input required value={form.name} onChange={(event) => updateForm("name", event.target.value)} />
                </label>
                <label>
                  Phone
                  <input value={form.phone} onChange={(event) => updateForm("phone", event.target.value)} />
                </label>
                <label>
                  Email
                  <input type="email" value={form.email} onChange={(event) => updateForm("email", event.target.value)} />
                </label>
                <label>
                  Date of birth
                  <input
                    type="date"
                    value={form.birthDate}
                    onChange={(event) => updateForm("birthDate", event.target.value)}
                  />
                </label>
                <label>
                  Sex
                  <select value={form.sex} onChange={(event) => updateForm("sex", event.target.value)}>
                    <option value="">Not recorded</option>
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </label>
                <label>
                  Blood group
                  <select value={form.bloodGroup} onChange={(event) => updateForm("bloodGroup", event.target.value)}>
                    <option value="">Not recorded</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </label>
                <label>
                  Assigned doctor
                  <select
                    value={form.assignedDoctorId}
                    onChange={(event) => updateForm("assignedDoctorId", event.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {doctors.map((doctor) => (
                      <option key={doctor.id} value={doctor.id}>
                        {doctor.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Legacy doctor text
                  <input value={form.doctor} onChange={(event) => updateForm("doctor", event.target.value)} />
                </label>
                <label>
                  Patient number
                  <input
                    placeholder="Auto-generated if blank"
                    value={form.patientNumber}
                    onChange={(event) => updateForm("patientNumber", event.target.value)}
                  />
                </label>
                <label className="patient-form-wide">
                  Address
                  <input value={form.address} onChange={(event) => updateForm("address", event.target.value)} />
                </label>
                <label className="patient-form-wide">
                  Note
                  <textarea value={form.note} onChange={(event) => updateForm("note", event.target.value)} />
                </label>
              </div>
              {formError ? <p className="patient-form-error">{formError}</p> : null}
              <div className="patient-form-actions">
                <button className="patient-ghost-button" onClick={() => setShowCreate(false)} type="button">
                  Cancel
                </button>
                <button className="patient-primary-button" disabled={saving} type="submit">
                  {saving ? "Saving..." : "Create patient"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  );
}
