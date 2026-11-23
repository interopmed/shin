"use client";

import { getBackendBaseUrl } from "@/lib/backend-config";

const API_URL = getBackendBaseUrl();

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import type { FacilityRecord, ServiceUnitRecord } from "../lib/facilities-db";
import { useAuth } from "@/context/AuthContext";
import { canAccess } from "@/lib/permissions";

type FacilityDetailClientProps = {
  facility: FacilityRecord;
  initialServiceUnits: ServiceUnitRecord[];
};

export default function FacilityDetailClient({ facility, initialServiceUnits }: FacilityDetailClientProps) {
  const router = useRouter();
  const searchParams = require("next/navigation").useSearchParams();
  const { user } = useAuth();
  const { createActiveUserFromToken } = require("@/lib/permissions");
  const activeUser = createActiveUserFromToken(user || undefined);
  const hasManageUnitsPerm = canAccess(activeUser, ["facility.manage", "module.manage"]);

  const [serviceUnits, setServiceUnits] = useState<ServiceUnitRecord[]>(initialServiceUnits);
  const [showManageUnits, setShowManageUnits] = useState(searchParams?.get("manageUnits") === "true");
  const [unitForm, setUnitForm] = useState({ name: "", snomed_unit_type_id: "", snomed_department_id: "", capacity: 0, parent_id: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [snomedDepartments, setSnomedDepartments] = useState<any[]>([]);
  const [snomedUnitTypes, setSnomedUnitTypes] = useState<any[]>([]);

  useEffect(() => {
    if (showManageUnits && snomedDepartments.length === 0) {
      fetch(`${API_URL}/api/terminology/?category=department`)
        .then(res => res.json())
        .then(data => setSnomedDepartments(Array.isArray(data) ? data : (data.results || [])))
        .catch(console.error);

      fetch(`${API_URL}/api/terminology/?category=unit_type`)
        .then(res => res.json())
        .then(data => setSnomedUnitTypes(Array.isArray(data) ? data : (data.results || [])))
        .catch(console.error);
    }
  }, [showManageUnits, snomedDepartments.length]);

  async function handleCreateUnit(event: FormEvent) {
    event.preventDefault();
    
    // Auto-generate name if empty
    let finalName = unitForm.name.trim();
    if (!finalName) {
      const dept = snomedDepartments.find(d => String(d.id) === unitForm.snomed_department_id)?.display;
      const uType = snomedUnitTypes.find(t => String(t.id) === unitForm.snomed_unit_type_id)?.display;
      if (dept && uType) finalName = `${dept} - ${uType}`;
      else if (dept) finalName = dept;
      else if (uType) finalName = uType;
      else finalName = "General Unit";
    }

    setIsSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/service-units/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user?.token}`,
        },
        body: JSON.stringify({ 
            name: finalName,
            snomed_department_id: unitForm.snomed_department_id || null,
            snomed_unit_type_id: unitForm.snomed_unit_type_id || null,
            facility_id: facility.id, 
            parent_id: unitForm.parent_id || null,
            description: "",
            capacity: unitForm.capacity,
            // Fallbacks for non-snomed legacy string fields required by model
            department: snomedDepartments.find(d => String(d.id) === unitForm.snomed_department_id)?.display || "",
            unit_type: "ward",
        }),
      });
      if (!res.ok) throw new Error("Failed to create unit");
      const data = await res.json();
      // If it's a sub-unit, add it to the parent's sub_units array instead of top-level
      if (data.parent_id) {
        setServiceUnits((prev) => prev.map(u => u.id === data.parent_id ? { ...u, sub_units: [...(u.sub_units || []), data] } : u));
      } else {
        setServiceUnits((prev) => [...prev, data]);
      }
      setUnitForm({ name: "", snomed_unit_type_id: "", snomed_department_id: "", capacity: 0, parent_id: "" });
    } catch (err) {
      alert("Failed to create Service Unit. Do you have permissions?");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteUnit(id: string) {
    if (!confirm("Are you sure?")) return;
    try {
      const res = await fetch(`${API_URL}/api/service-units/${id}/`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${user?.token}` },
      });
      if (!res.ok) throw new Error("Failed to delete unit");
      setServiceUnits((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      alert("Failed to delete Service Unit.");
    }
  }

  // Filter unit types based on selected department to prevent incoherent options
  const filteredUnitTypes = snomedUnitTypes.filter(t => {
    const dept = snomedDepartments.find(d => String(d.id) === unitForm.snomed_department_id);
    if (!dept) return true; // Show all if no department selected
    
    const deptName = dept.display.toLowerCase();
    const typeName = t.display.toLowerCase();
    
    // Explicit exclusions to keep the list coherent
    if (typeName.includes("dental") && !deptName.includes("dental") && !deptName.includes("dentistry")) return false;
    if (typeName.includes("operating theater") && !deptName.includes("surgery") && !deptName.includes("surgical")) return false;
    if (typeName.includes("pathology") && !deptName.includes("pathology") && !deptName.includes("laboratory")) return false;
    if (typeName.includes("radiology") && !deptName.includes("radiology") && !deptName.includes("imaging")) return false;
    if (typeName.includes("pharmacy") && !deptName.includes("pharmacy")) return false;
    
    return true;
  });

  return (
    <section className="facility-page">
      <div className="facility-card">
        <header className="facility-header">
          <div>
            <h1>{facility.name}</h1>
            <p>
              {facility.type} in {facility.location}
            </p>
            <small style={{ color: 'var(--muted)', display: 'block', marginTop: '0.25rem' }}>
              Status: <strong style={{ color: 'var(--foreground)' }}>{facility.status}</strong> (Current operational state)
            </small>
          </div>
          <div className="facility-actions">
            <Link className="facility-secondary-button" href="/facilities">
              Back to Facilities
            </Link>
            <Link className="facility-secondary-button" href={`/facilities/${facility.slug}/firms`}>
              Manage Clinical Firms
            </Link>
            <button className="facility-primary-button" onClick={() => setShowManageUnits(true)} type="button">
              + Add Service Unit
            </button>
            <Link className="facility-secondary-button" href={`/facilities/${facility.slug}/edit`}>
              Manage Facility
            </Link>
          </div>
        </header>

        <section className="facility-summary">
          <div>
            <span>Departments</span>
            <strong>{facility.departments}</strong>
            <p>Tracked service units</p>
          </div>
          <div>
            <span>Rooms</span>
            <strong>{facility.rooms}</strong>
            <p>Clinical and support spaces</p>
          </div>
          <div>
            <span>Occupancy</span>
            <strong>{facility.occupancy}</strong>
            <p>Current utilization snapshot</p>
          </div>
          <div onClick={() => router.push(`/human-resources/employees?facility=${facility.id}`)} style={{ cursor: 'pointer' }} title="Go to assign employee page">
            <span>Employees</span>
            <strong>{facility.staff ? facility.staff.length : 0}</strong>
            <p>Assigned staff members</p>
          </div>
        </section>

        <section className="facility-grid">
          <div className="facility-main">
            <section className="facility-panel">
              <div className="facility-panel-header">
                <h2>Service Units</h2>
                <div className="facility-tools">
                </div>
              </div>
              <div className="facility-department-list">
                {serviceUnits.map((unit) => (
                  <div key={unit.id}>
                    <div className="facility-department" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <Link href={`/facilities/${facility.slug}/units/${unit.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                          <strong className="hover:underline">{unit.name}</strong>
                        </Link>
                        <p>
                          {unit.unit_type} • {unit.capacity} capacity
                        </p>
                      </div>
                    </div>
                    {unit.sub_units && unit.sub_units.length > 0 && (
                      <div style={{ marginLeft: '2rem', borderLeft: '2px solid var(--border)', paddingLeft: '1rem', marginTop: '0.5rem' }}>
                        {unit.sub_units.map(subUnit => (
                          <div className="facility-department" key={subUnit.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', padding: '0.5rem' }}>
                            <div>
                              <Link href={`/facilities/${facility.slug}/units/${subUnit.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                <strong className="hover:underline">{subUnit.name}</strong>
                              </Link>
                              <p style={{ margin: 0 }}>
                                {subUnit.unit_type} • {subUnit.capacity} capacity
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {serviceUnits.length === 0 && (
                  <div className="facility-empty-state">
                    <strong>No service units found</strong>
                    <p>Add departments or wards to manage capacities.</p>
                  </div>
                )}
              </div>
            </section>
          </div>

          <aside className="facility-side">
            <section className="facility-panel">
              <h2>Facility Details</h2>
              <div className="facility-infrastructure">
                <div>
                  <span>Facility ID</span>
                  <strong>{facility.id}</strong>
                  <p>Backend record identifier</p>
                </div>
                <div>
                  <span>Type</span>
                  <strong>{facility.type}</strong>
                  <p>Registered care-site category</p>
                </div>
                <div>
                  <span>Location</span>
                  <strong>{facility.location}</strong>
                  <p>Primary site or service location</p>
                </div>
              </div>
            </section>

          </aside>
        </section>
      </div>

      {showManageUnits ? (
        <div className="patient-modal-backdrop" role="presentation">
          <section aria-labelledby="manage-units-title" className="patient-modal" role="dialog">
            <header className="patient-modal-header">
              <div>
                <h2 id="manage-units-title">Manage Service Units</h2>
                <p>Add or remove hospital departments and wards for this center.</p>
              </div>
              <button aria-label="Close manage units" onClick={() => setShowManageUnits(false)} type="button">
                x
              </button>
            </header>

            <div className="facility-department-list" style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '1rem' }}>
              {serviceUnits.map(unit => (
                <div key={unit.id}>
                  <div className="facility-department" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <strong>{unit.name}</strong> {unit.snomed_unit_type?.display ? `(${unit.snomed_unit_type.display})` : ""}
                    </div>
                    <button onClick={() => handleDeleteUnit(unit.id)} style={{ color: 'red', border: 'none', background: 'transparent', cursor: 'pointer' }}>Delete</button>
                  </div>
                  {unit.sub_units && unit.sub_units.map(subUnit => (
                    <div className="facility-department" key={subUnit.id} style={{ display: 'flex', justifyContent: 'space-between', marginLeft: '2rem', marginTop: '0.5rem', padding: '0.5rem' }}>
                      <div>
                        <strong>↳ {subUnit.name}</strong> {subUnit.snomed_unit_type?.display ? `(${subUnit.snomed_unit_type.display})` : ""}
                      </div>
                      <button onClick={() => handleDeleteUnit(subUnit.id)} style={{ color: 'red', border: 'none', background: 'transparent', cursor: 'pointer' }}>Delete</button>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <form className="patient-create-form" onSubmit={handleCreateUnit} style={{ borderTop: '1px solid #ddd', paddingTop: '1rem' }}>
              <h3>Add New Unit</h3>
              <div className="patient-form-grid">
                <label>
                  Custom Name (Optional)
                  <input placeholder="e.g. Cardiology Ward A" value={unitForm.name} onChange={e => setUnitForm({ ...unitForm, name: e.target.value })} disabled={isSaving} />
                </label>
                <label>
                  Unit Type (SNOMED)
                  <select value={unitForm.snomed_unit_type_id} onChange={e => setUnitForm({ ...unitForm, snomed_unit_type_id: e.target.value })} disabled={isSaving}>
                    <option value="">Select Unit Type</option>
                    {filteredUnitTypes.map(t => (
                      <option key={t.id} value={t.id}>{t.display} ({t.code})</option>
                    ))}
                  </select>
                </label>
                <label>
                  Department (SNOMED)
                  <select value={unitForm.snomed_department_id} onChange={e => setUnitForm({ ...unitForm, snomed_department_id: e.target.value })} disabled={isSaving}>
                    <option value="">Select Department</option>
                    {snomedDepartments.map(d => (
                      <option key={d.id} value={d.id}>{d.display} ({d.code})</option>
                    ))}
                  </select>
                </label>
                <label>
                  Capacity
                  <input type="number" min="0" value={unitForm.capacity} onChange={e => setUnitForm({ ...unitForm, capacity: Number(e.target.value) || 0 })} disabled={isSaving} />
                </label>
                <label>
                  Parent Unit (Optional)
                  <select value={unitForm.parent_id} onChange={e => setUnitForm({ ...unitForm, parent_id: e.target.value })} disabled={isSaving}>
                    <option value="">None (Top-Level)</option>
                    {serviceUnits.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="patient-form-actions">
                <button className="facility-secondary-button" onClick={() => setShowManageUnits(false)} type="button" disabled={isSaving}>
                  Close
                </button>
                <button className="facility-primary-button" disabled={isSaving} type="submit">
                  {isSaving ? "Adding..." : "Add Unit"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  );
}
