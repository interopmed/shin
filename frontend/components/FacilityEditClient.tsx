"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateFacility, type FacilityRecord, type CreateFacilityInput } from "@/lib/facilities-db";

export default function FacilityEditClient({ facility }: { facility: FacilityRecord }) {
  const router = useRouter();
  const [form, setForm] = useState<CreateFacilityInput>({
    name: facility.name,
    type: facility.type,
    location: facility.location,
    departments: facility.departments,
    rooms: facility.rooms,
    status: facility.status,
    occupancy: facility.occupancy,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function updateForm<K extends keyof CreateFacilityInput>(key: K, value: CreateFacilityInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError("");

    startTransition(() => {
      void (async () => {
        try {
          await updateFacility(facility.id, form);
          router.push(`/facilities/${facility.slug}`);
          router.refresh();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to update facility");
          setIsSaving(false);
        }
      })();
    });
  };

  return (
    <section className="facility-page">
      <div className="facility-card">
        <header className="facility-header">
          <div>
            <h1>Edit Facility</h1>
            <p>Update information for {facility.name}</p>
          </div>
          <div className="facility-actions">
            <Link className="facility-secondary-button" href={`/facilities/${facility.slug}`}>
              Cancel
            </Link>
          </div>
        </header>

        <div className="facility-main" style={{ padding: "24px" }}>
          <form className="patient-create-form" onSubmit={handleSubmit}>
            <div className="patient-form-grid">
              <label>
                Facility name
                <input required value={form.name} onChange={(e) => updateForm("name", e.target.value)} disabled={isSaving} />
              </label>
              <label>
                Type
                <select value={form.type} onChange={(e) => updateForm("type", e.target.value)} disabled={isSaving}>
                  <option value="Hospital">Hospital</option>
                  <option value="Outpatient">Outpatient</option>
                  <option value="Diagnostic Lab">Diagnostic Lab</option>
                  <option value="Telehealth">Telehealth</option>
                  <option value="Clinic">Clinic</option>
                  <option value="Other">Other</option>
                </select>
              </label>
              <label>
                Location
                <input required value={form.location} onChange={(e) => updateForm("location", e.target.value)} disabled={isSaving} />
              </label>
              <label>
                Status
                <select value={form.status} onChange={(e) => updateForm("status", e.target.value)} disabled={isSaving}>
                  <option value="Operational">Operational</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Offline">Offline</option>
                </select>
              </label>
              <label>
                Departments
                <input type="number" min="0" value={form.departments} onChange={(e) => updateForm("departments", Number(e.target.value) || 0)} disabled={isSaving} />
              </label>
              <label>
                Rooms
                <input type="number" min="0" value={form.rooms} onChange={(e) => updateForm("rooms", Number(e.target.value) || 0)} disabled={isSaving} />
              </label>
              <label>
                Occupancy
                <input placeholder="74%" value={form.occupancy} onChange={(e) => updateForm("occupancy", e.target.value)} disabled={isSaving} />
              </label>
            </div>

            {error && <p className="patient-form-error">{error}</p>}

            <div className="patient-form-actions" style={{ marginTop: "24px" }}>
              <button type="submit" className="facility-primary-button" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
