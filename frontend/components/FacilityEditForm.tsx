"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import type { FacilityDepartmentRecord, FacilityRecord } from "../lib/facilities-db";

type FacilityEditFormProps = {
  facility: FacilityRecord;
  initialDepartments: FacilityDepartmentRecord[];
};

type FormState = {
  name: string;
  type: string;
  location: string;
  rooms: number;
  status: string;
  occupancy: number; // 0–100 integer
};

const FACILITY_TYPE_ICONS: Record<string, string> = {
  Hospital: "🏥",
  Outpatient: "🏢",
  "Diagnostic Lab": "🔬",
  Telehealth: "💻",
  Other: "🏗️",
};

const DEPT_STATUS_STYLE: Record<string, { background: string; color: string }> = {
  Ready: { background: "#cdeccd", color: "#11622f" },
  "High load": { background: "#fff4cc", color: "#7a4d00" },
  Maintenance: { background: "#e8f0fb", color: "#14385f" },
  Offline: { background: "#fde8e8", color: "#7a1919" },
};

function parseOccupancy(value: string): number {
  const num = Number.parseFloat(value.replace("%", "").trim());
  if (Number.isNaN(num)) return 0;
  return Math.min(100, Math.max(0, Math.round(num)));
}

function validateForm(form: FormState) {
  if (!form.name.trim()) return "Facility name is required.";
  if (!Number.isInteger(form.rooms) || form.rooms < 0) return "Rooms must be a whole number ≥ 0.";
  return "";
}

export default function FacilityEditForm({ facility, initialDepartments }: FacilityEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [banner, setBanner] = useState("");
  const [departmentRows, setDepartmentRows] = useState<FacilityDepartmentRecord[]>(
    initialDepartments.length > 0
      ? initialDepartments
      : [{ name: "", lead: "", capacity: "", status: "Ready" }]
  );
  const [form, setForm] = useState<FormState>({
    name: facility.name,
    type: facility.type,
    location: facility.location,
    rooms: facility.rooms,
    status: facility.status,
    occupancy: parseOccupancy(facility.occupancy),
  });

  // Unsaved changes detection
  const hasChanges = useMemo(() => {
    const depsChanged = JSON.stringify(departmentRows) !== JSON.stringify(
      initialDepartments.length > 0
        ? initialDepartments
        : [{ name: "", lead: "", capacity: "", status: "Ready" }]
    );
    return (
      form.name !== facility.name ||
      form.type !== facility.type ||
      form.location !== facility.location ||
      form.rooms !== facility.rooms ||
      form.status !== facility.status ||
      depsChanged
    );
  }, [form, facility, departmentRows, initialDepartments]);

  // Active department count (rows with a name)
  const activeDeptCount = useMemo(
    () => departmentRows.filter((r) => r.name.trim()).length,
    [departmentRows]
  );

  // Occupancy color: red ≥90%, amber ≥75%, blue otherwise
  const occupancyColor = form.occupancy >= 90 ? "#dc2626" : form.occupancy >= 75 ? "#f59e0b" : "#2f66d9";

  const statusClass = form.status === "Operational" ? "facility-status" : "facility-status warning";

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((c) => ({ ...c, [key]: value }));
  }

  function updateDepartment(index: number, key: keyof FacilityDepartmentRecord, value: string) {
    setDepartmentRows((c) => c.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
  }

  function addDepartmentRow() {
    setDepartmentRows((c) => [...c, { name: "", lead: "", capacity: "", status: "Ready" }]);
  }

  function removeDepartmentRow(index: number) {
    setDepartmentRows((c) => {
      const next = c.filter((_, i) => i !== index);
      return next.length > 0 ? next : [{ name: "", lead: "", capacity: "", status: "Ready" }];
    });
  }

  function onCancel() {
    router.push(`/facilities/${facility.id}`);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBanner("");

    const validationMessage = validateForm(form);
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    const cleanedDepartments = departmentRows
      .map((row) => ({
        name: row.name.trim(),
        lead: row.lead.trim(),
        capacity: row.capacity.trim(),
        status: row.status.trim() || "Ready",
      }))
      .filter((row) => row.name);

    if (cleanedDepartments.length === 0) {
      setError("Add at least one department with a name.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      type: form.type,
      location: form.location.trim(),
      departments: cleanedDepartments.length,
      rooms: form.rooms,
      status: form.status,
      occupancy: `${form.occupancy}%`,
    };

    startTransition(() => {
      void (async () => {
        try {
          const res = await fetch(`/api/facilities/${facility.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const json = (await res.json()) as { facility?: FacilityRecord; error?: string };
          if (!res.ok || !json.facility) throw new Error(json.error ?? "Unable to update facility.");

          const deptRes = await fetch(`/api/facilities/${facility.id}/departments`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ departments: cleanedDepartments }),
          });
          if (!deptRes.ok) {
            const deptJson = (await deptRes.json()) as { error?: string };
            throw new Error(deptJson.error ?? "Unable to save department details.");
          }

          setBanner(`Saved changes for ${json.facility.name}. Redirecting…`);
          router.refresh();
          setTimeout(() => router.push(`/facilities/${facility.id}`), 700);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Unable to update facility.");
        }
      })();
    });
  }

  return (
    <form onSubmit={onSubmit}>
      {/* ── Unsaved changes notice ── */}
      {hasChanges && !banner && (
        <div className="facility-unsaved-notice">
          <span />
          You have unsaved changes
        </div>
      )}

      {/* ── Two-column layout ── */}
      <div className="facility-edit-layout">

        {/* ── Left: form sections ── */}
        <div className="facility-main">

          {/* Section 1: Identity & Classification */}
          <div className="facility-panel">
            <div className="facility-panel-header">
              <div>
                <h2 className="facility-section-title">
                  Identity &amp; Classification
                </h2>
                <p className="facility-section-copy">Core details used across dashboards and records.</p>
              </div>
            </div>
            <div className="facility-form-body">
              <div className="facility-form-section-grid">
                <label>
                  Facility ID
                  <input disabled value={facility.id} />
                </label>
                <label>
                  <span>Facility name&nbsp;<span aria-hidden="true" style={{ color: "#dc2626" }}>*</span></span>
                  <input
                    aria-required="true"
                    disabled={isPending}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="e.g. City General Hospital"
                    required
                    value={form.name}
                  />
                </label>
                <label>
                  Type
                  <select disabled={isPending} onChange={(e) => updateField("type", e.target.value)} value={form.type}>
                    <option value="Hospital">Hospital</option>
                    <option value="Outpatient">Outpatient</option>
                    <option value="Diagnostic Lab">Diagnostic Lab</option>
                    <option value="Telehealth">Telehealth</option>
                    <option value="Other">Other</option>
                  </select>
                </label>
                <label>
                  Location
                  <input
                    disabled={isPending}
                    onChange={(e) => updateField("location", e.target.value)}
                    placeholder="City, State"
                    value={form.location}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Section 2: Operations & Capacity */}
          <div className="facility-panel">
            <div className="facility-panel-header">
              <div>
                <h2 className="facility-section-title">Operations &amp; Capacity</h2>
                <p className="facility-section-copy">Maintain operational readiness and physical capacity.</p>
              </div>
            </div>
            <div className="facility-form-body">
              <div className="facility-form-section-grid">
                <label>
                  Operational status
                  <select disabled={isPending} onChange={(e) => updateField("status", e.target.value)} value={form.status}>
                    <option value="Operational">Operational</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Offline">Offline</option>
                  </select>
                </label>
                <label>
                  Total rooms
                  <input
                    disabled={isPending}
                    min="0"
                    onChange={(e) => updateField("rooms", Math.max(0, Number.parseInt(e.target.value, 10) || 0))}
                    type="number"
                    value={form.rooms}
                  />
                </label>
              </div>


            </div>
          </div>

          {/* Section 3: Department Directory */}
          <div className="facility-panel">
            <div className="facility-panel-header">
              <div>
                <h2 className="facility-section-title">Department Directory</h2>
                <p className="facility-section-copy">
                  {activeDeptCount > 0
                    ? `${activeDeptCount} department${activeDeptCount !== 1 ? "s" : ""} configured`
                    : "No departments yet — add at least one to save."}
                </p>
              </div>
              <button
                className="facility-primary-button compact"
                disabled={isPending}
                onClick={addDepartmentRow}
                type="button"
              >
                + Add department
              </button>
            </div>
            <div className="facility-form-body">
              <div className="facility-department-editor-list">
                {departmentRows.map((dept, index) => (
                  <div className="facility-department-editor-row" key={index}>
                    <label>
                      Name
                      <input
                        disabled={isPending}
                        onChange={(e) => updateDepartment(index, "name", e.target.value)}
                        placeholder="Emergency"
                        value={dept.name}
                      />
                    </label>
                    <label>
                      Lead
                      <input
                        disabled={isPending}
                        onChange={(e) => updateDepartment(index, "lead", e.target.value)}
                        placeholder="Dr. Jane Doe"
                        value={dept.lead}
                      />
                    </label>
                    <label>
                      Capacity
                      <input
                        disabled={isPending}
                        onChange={(e) => updateDepartment(index, "capacity", e.target.value)}
                        placeholder="24 beds"
                        value={dept.capacity}
                      />
                    </label>
                    <label>
                      Status
                      <select
                        disabled={isPending}
                        onChange={(e) => updateDepartment(index, "status", e.target.value)}
                        value={dept.status}
                        style={{
                          ...(DEPT_STATUS_STYLE[dept.status] ?? {}),
                          fontWeight: 800,
                        }}
                      >
                        <option value="Ready">Ready</option>
                        <option value="High load">High load</option>
                        <option value="Maintenance">Maintenance</option>
                        <option value="Offline">Offline</option>
                      </select>
                    </label>
                    <button
                      aria-label={`Remove ${dept.name || `department ${index + 1}`}`}
                      className="facility-secondary-button compact"
                      disabled={isPending}
                      onClick={() => removeDepartmentRow(index)}
                      data-variant="danger"
                      type="button"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: sticky sidebar ── */}
        <div className="facility-edit-sidebar">

          {/* Live preview card */}
          <div className="facility-preview-card">
            <div className="preview-badge">
              {FACILITY_TYPE_ICONS[form.type] ?? "🏗️"}&nbsp;{form.type}
            </div>
            <p className="preview-name">{form.name || "Facility name"}</p>
            <p className="preview-location">📍 {form.location || "No location set"}</p>

            <div className="preview-stats">
              <div className="preview-stat">
                <span className="stat-icon">🏢</span>
                <div>
                  <span className="stat-value">{activeDeptCount}</span>
                  <span className="stat-label">Departments</span>
                </div>
              </div>
              <div className="preview-stat">
                <span className="stat-icon">🛏️</span>
                <div>
                  <span className="stat-value">{form.rooms}</span>
                  <span className="stat-label">Rooms</span>
                </div>
              </div>
            </div>

            <div className="preview-status-row">
              <span className="preview-status-label">Status</span>
              <span className={statusClass}>{form.status}</span>
            </div>


          </div>

          {/* Tips panel */}
          <div className="tips-panel">
            <p className="tips-panel-title">💡 Editing tips</p>
            <ul className="tips-list">
              <li>Facility ID is system-assigned and cannot be changed.</li>
              <li>The preview card updates in real time as you type.</li>

              <li>At least one named department is required to save.</li>
              <li>Rows without a department name are ignored on save.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* ── Feedback messages ── */}
      {error && (
        <div className="facility-alert facility-alert-error">
          ⚠&nbsp;{error}
        </div>
      )}
      {banner && (
        <p className="facility-banner facility-edit-banner">
          ✓&nbsp;{banner}
        </p>
      )}

      {/* ── Action bar ── */}
      <div className="facility-actions facility-submit-bar">
        <button className="facility-secondary-button" disabled={isPending} onClick={onCancel} type="button">
          Cancel
        </button>
        <button
          className="facility-primary-button"
          disabled={isPending || !hasChanges}
          type="submit"
        >
          {isPending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
