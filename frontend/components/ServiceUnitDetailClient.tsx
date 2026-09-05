"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FacilityRecord, ServiceUnitRecord, updateServiceUnit } from "@/lib/facilities-db";

import { useAuth } from "@/context/AuthContext";

export default function ServiceUnitDetailClient({
  facility,
  initialServiceUnit,
}: {
  facility: FacilityRecord;
  initialServiceUnit: ServiceUnitRecord;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const [isPending, startTransition] = useTransition();

  const [unitForm, setUnitForm] = useState({
    name: initialServiceUnit.name,
    unit_type: initialServiceUnit.unit_type,
    department: initialServiceUnit.department,
    capacity: initialServiceUnit.capacity,
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!unitForm.name || !unitForm.unit_type || !unitForm.department) {
      setError("Please fill in all required fields.");
      return;
    }

    startTransition(async () => {
      try {
        await updateServiceUnit(
          initialServiceUnit.id,
          {
            ...unitForm,
            facility_id: facility.id,
          },
          user?.token
        );
        setSuccess("Service unit updated successfully.");
        router.refresh();
      } catch (err) {
        console.error(err);
        setError("Failed to update service unit.");
      }
    });
  };

  return (
    <section className="facility-page">
      <div className="facility-card">
        <header className="facility-header">
          <div>
            <h1>{initialServiceUnit.name}</h1>
            <p>
              {initialServiceUnit.department} Department • {facility.name}
            </p>
          </div>
          <div className="facility-actions">
            <Link className="facility-secondary-button" href={`/facilities/${facility.slug}`}>
              Back to {facility.name}
            </Link>
          </div>
        </header>

        <section className="facility-summary">
          <div>
            <span>Type</span>
            <strong>{initialServiceUnit.unit_type}</strong>
            <p>Registered unit type</p>
          </div>
          <div>
            <span>Capacity</span>
            <strong>{initialServiceUnit.capacity}</strong>
            <p>Maximum capacity</p>
          </div>
          <div>
            <span>Current Patients</span>
            <strong>{initialServiceUnit.current_patients || 0}</strong>
            <p>Admitted / Assigned patients</p>
          </div>
          <div style={{ position: 'relative', cursor: 'pointer' }} className="facility-summary-clickable">
            <Link 
              href={`/human-resources/employees?unit=${initialServiceUnit.id}`} 
              style={{ position: 'absolute', inset: 0, zIndex: 1 }}
              title="View unit staff"
            />
            <span>Number of Employees</span>
            <strong>{initialServiceUnit.staff?.length || 0}</strong>
            <p>Total assigned staff</p>
          </div>
        </section>

        <div className="facility-main" style={{ marginTop: "2rem" }}>
          <section className="facility-panel">
            <h2>Manage Service Unit</h2>
            <form className="patient-create-form" onSubmit={handleUpdate}>
              <div className="patient-form-grid">
                <label>
                  Unit Name
                  <input
                    required
                    value={unitForm.name}
                    onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })}
                    disabled={isPending}
                  />
                </label>
                <label>
                  Type
                  <select
                    value={unitForm.unit_type}
                    onChange={(e) => setUnitForm({ ...unitForm, unit_type: e.target.value })}
                    disabled={isPending}
                  >
                    <option value="ward">Inpatient Ward</option>
                    <option value="icu">ICU</option>
                    <option value="emergency">Emergency / ETU</option>
                    <option value="opd">Outpatient Dept</option>
                    <option value="clinic">Clinic</option>
                    <option value="lab">Lab</option>
                    <option value="pharmacy">Pharmacy</option>
                  </select>
                </label>
                <label>
                  Department
                  <input
                    required
                    value={unitForm.department}
                    onChange={(e) => setUnitForm({ ...unitForm, department: e.target.value })}
                    disabled={isPending}
                  />
                </label>
                <label>
                  Capacity
                  <input
                    type="number"
                    min="0"
                    value={unitForm.capacity}
                    onChange={(e) => setUnitForm({ ...unitForm, capacity: Number(e.target.value) || 0 })}
                    disabled={isPending}
                  />
                </label>
              </div>

              {error && <p className="patient-form-error">{error}</p>}
              {success && <p style={{ color: "green", fontSize: "0.875rem", marginBottom: "1rem" }}>{success}</p>}

              <div className="patient-form-actions">
                <button className="facility-primary-button" disabled={isPending} type="submit">
                  {isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </section>
          
        </div>
      </div>
    </section>
  );
}
