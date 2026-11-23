"use client";

import { useState, useTransition, useEffect } from "react";
import { getBackendBaseUrl } from "@/lib/backend-config";
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

  const [dbFirms, setDbFirms] = useState<any[]>([]);
  const [coverageId, setCoverageId] = useState<number | null>(null);
  const [coverageType, setCoverageType] = useState<'exclusive' | 'shared'>('shared');
  const [firmId, setFirmId] = useState<string>('');

  useEffect(() => {
    const apiBase = getBackendBaseUrl();
    fetch(`${apiBase}/api/clinical-firms/`)
      .then(res => res.json())
      .then(data => setDbFirms(Array.isArray(data) ? data : (data.results || [])))
      .catch(console.error);

    fetch(`${apiBase}/api/firm-ward-coverages/`)
      .then(res => res.json())
      .then(data => {
        const results = Array.isArray(data) ? data : (data.results || []);
        const cov = results.find((c: any) => String(c.unit) === String(initialServiceUnit.id));
        if (cov) {
          setCoverageId(cov.id);
          setCoverageType(cov.is_exclusive ? 'exclusive' : 'shared');
          if (cov.firm) setFirmId(String(cov.firm.id || cov.firm));
        }
      })
      .catch(console.error);
  }, [initialServiceUnit.id]);

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

        // Update Coverage
        const covPayload = {
          unit_id: initialServiceUnit.id,
          firm_id: firmId ? parseInt(firmId, 10) : null,
          is_exclusive: coverageType === 'exclusive'
        };

        const apiBase = getBackendBaseUrl();
        if (coverageId) {
          await fetch(`${apiBase}/api/firm-ward-coverages/${coverageId}/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(covPayload)
          });
        } else if (firmId || coverageType === 'exclusive') {
          await fetch(`${apiBase}/api/firm-ward-coverages/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(covPayload)
          });
        }

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
                  <select
                    required
                    value={unitForm.department}
                    onChange={(e) => setUnitForm({ ...unitForm, department: e.target.value })}
                    disabled={isPending}
                  >
                    <option value="">Select a department...</option>
                    <option value="Medicine">Medicine</option>
                    <option value="Surgery">Surgery</option>
                    <option value="Cardiology">Cardiology</option>
                    <option value="Pediatrics">Pediatrics</option>
                    <option value="Obstetrics & Gynecology">Obstetrics & Gynecology</option>
                    <option value="Oncology">Oncology</option>
                    <option value="Orthopedics">Orthopedics</option>
                    <option value="Neurology">Neurology</option>
                    <option value="Psychiatry">Psychiatry</option>
                    <option value="Radiology">Radiology</option>
                    <option value="Emergency">Emergency</option>
                    <option value="Other">Other</option>
                  </select>
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

              <h3 style={{ marginTop: '24px', fontSize: '1.1rem', fontWeight: 600, color: '#1e293b' }}>Clinical Coverage</h3>
              <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '16px' }}>Configure how this ward connects to consultant units.</p>
              
              <div className="patient-form-grid" style={{ marginBottom: '24px' }}>
                <label>
                  Coverage Type
                  <select
                    value={coverageType}
                    onChange={(e) => setCoverageType(e.target.value as 'exclusive' | 'shared')}
                    disabled={isPending}
                  >
                    <option value="shared">Shared Coverage (Multiple Consultants)</option>
                    <option value="exclusive">Exclusive (Single Consultant Unit)</option>
                  </select>
                </label>
                
                {coverageType === 'exclusive' && (
                  <label>
                    Assigned Clinical Firm
                    <select
                      value={firmId}
                      onChange={(e) => setFirmId(e.target.value)}
                      disabled={isPending}
                      required={coverageType === 'exclusive'}
                    >
                      <option value="">Select a firm...</option>
                      {dbFirms.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </label>
                )}
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
