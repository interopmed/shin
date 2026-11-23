"use client";

const DEFAULT_PROD_API = 'https://shin-backend-mg15.onrender.com';
const API_URL = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'production' ? DEFAULT_PROD_API : 'http://127.0.0.1:8000');

import Link from "next/link";
import { useState, useEffect, type FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import type { FacilityRecord } from "@/lib/facilities-db";

type Firm = {
  id: number;
  name: string;
  lead_consultant: string | null;
  specialty: string;
  facility_id?: number | null;
  facility?: number | null;
};

function SearchableDropdown({ 
  options, 
  value, 
  onChange, 
  placeholder, 
  disabled 
}: { 
  options: { id: string | number, name: string }[], 
  value: string | number, 
  onChange: (val: string) => void, 
  placeholder: string,
  disabled?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  
  const selectedOption = options.find(o => String(o.id) === String(value));
  const displayValue = selectedOption ? selectedOption.name : "";

  const filteredOptions = options.filter(o => o.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          border: '1px solid #d7e0eb',
          borderRadius: '8px',
          padding: '0 11px',
          fontSize: '14px',
          minHeight: '38px',
          background: disabled ? '#f8fafc' : '#ffffff',
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: displayValue ? '#111827' : '#94a3b8'
        }}
      >
        <span>{displayValue || placeholder}</span>
        <span style={{ fontSize: '10px' }}>▼</span>
      </div>
      
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '4px',
          background: '#ffffff',
          border: '1px solid #d7e0eb',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          zIndex: 10,
          overflow: 'hidden'
        }}>
          <div style={{ padding: '8px', borderBottom: '1px solid #f1f5f9' }}>
            <input 
              autoFocus
              type="text" 
              placeholder="Search..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '6px 10px', border: '1px solid #d7e0eb', borderRadius: '4px', fontSize: '13px' }}
            />
          </div>
          <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
            <div 
              onClick={() => { onChange(""); setIsOpen(false); setSearch(""); }}
              style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '13px', borderBottom: '1px solid #f1f5f9', background: value === "" ? '#f8fafc' : 'transparent' }}
            >
              Unassigned
            </div>
            {filteredOptions.length === 0 ? (
              <div style={{ padding: '8px 12px', fontSize: '13px', color: '#64748b', textAlign: 'center' }}>No results found</div>
            ) : (
              filteredOptions.map(o => (
                <div 
                  key={o.id}
                  onClick={() => { onChange(String(o.id)); setIsOpen(false); setSearch(""); }}
                  style={{ 
                    padding: '8px 12px', 
                    cursor: 'pointer', 
                    fontSize: '13px', 
                    borderBottom: '1px solid #f1f5f9',
                    background: String(value) === String(o.id) ? '#f8fafc' : 'transparent',
                    fontWeight: String(value) === String(o.id) ? 700 : 400
                  }}
                >
                  {o.name}
                </div>
              ))
            )}
          </div>
        </div>
      )}
      
      {isOpen && (
        <div 
          style={{ position: 'fixed', inset: 0, zIndex: 9 }}
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

export default function FacilityFirmsClient({ facility }: { facility: FacilityRecord }) {
  const { user } = useAuth();
  
  const [firms, setFirms] = useState<Firm[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  
  const [doctors, setDoctors] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  
  const [form, setForm] = useState({
    name: "",
    specialty: "",
    lead_consultant_id: "",
    ward_id: ""
  });
  
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    // Fetch firms
    fetch(`${API_URL}/api/clinical-firms/`)
      .then(res => res.json())
      .then(data => {
        const results = Array.isArray(data) ? data : (data.results || []);
        // Filter firms for this facility
        const facilityFirms = results.filter((f: Firm) => String(f.facility_id || f.facility) === String(facility.id));
        setFirms(facilityFirms);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
      
    // Fetch doctors for the dropdown
    fetch(`${API_URL}/api/doctors/`)
      .then(res => res.json())
      .then(data => {
        setDoctors(Array.isArray(data) ? data : (data.results || []));
      })
      .catch(console.error);

    // Fetch service units (wards)
    fetch(`${API_URL}/api/service-units/?facility_id=${facility.id}`)
      .then(res => res.json())
      .then(data => {
        const units = Array.isArray(data) ? data : (data.results || []);
        // Only show wards/inpatient units
        const inpatientWards = units.filter((u: any) => u.unit_type === 'ward' || u.unit_type === 'icu');
        setWards(inpatientWards);
      })
      .catch(console.error);
  }, [facility.id]);

  async function handleCreateFirm(e: FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setError("");
    setSuccess("");
    
    try {
      const payload = {
        name: form.name,
        specialty: form.specialty,
        lead_consultant_id: form.lead_consultant_id ? parseInt(form.lead_consultant_id, 10) : null,
        facility_id: parseInt(facility.id as string, 10)
      };
      
      const res = await fetch(`${API_URL}/api/clinical-firms/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user?.token}`,
        },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        throw new Error("Failed to create firm");
      }
      
      const data = await res.json();

      // If a ward is selected, link it
      if (form.ward_id) {
        await fetch(`${API_URL}/api/firm-ward-coverages/`, {
          method: 'POST',
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${user?.token}`,
          },
          body: JSON.stringify({
            unit_id: parseInt(form.ward_id, 10),
            firm_id: data.id,
            is_exclusive: true
          })
        }).catch(err => {
          console.error("Failed to link ward to firm:", err);
        });
      }

      setFirms([...firms, data]);
      setForm({ name: "", specialty: "", lead_consultant_id: "", ward_id: "" });
      setSuccess("Clinical firm successfully created.");
      setShowAddModal(false);
    } catch (err) {
      console.error(err);
      setError("Failed to create firm.");
    } finally {
      setIsSaving(false);
    }
  }

  // Find doctor name helper
  const getDoctorName = (id: string | number | null) => {
    if (!id) return "Unassigned";
    const doc = doctors.find(d => String(d.id) === String(id));
    return doc ? doc.name : `Doctor #${id}`;
  };

  return (
    <section className="mpi-page">
      <div className="mpi-card">
        <header className="mpi-header">
          <div>
            <h1>Clinical Firms</h1>
            <p style={{ color: '#667085', fontSize: '13px', fontWeight: 700, margin: '5px 0 0' }}>
              Consultant Units • {facility.name}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Link className="mpi-select-button" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }} href={`/facilities/${facility.slug}`}>
              Back to Dashboard
            </Link>
            <button className="mpi-primary-button" onClick={() => setShowAddModal(true)} type="button">
              + Add New Firm
            </button>
          </div>
        </header>

        <div className="mpi-table-wrap">
                <table className="mpi-table">
                  <thead>
                    <tr>
                      <th>Firm Name</th>
                      <th>Specialty</th>
                      <th>Lead Consultant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'center', padding: '24px' }}>Loading...</td>
                      </tr>
                    ) : firms.length === 0 ? (
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                          No clinical firms assigned to this facility.
                        </td>
                      </tr>
                    ) : (
                      firms.map(firm => (
                        <tr key={firm.id}>
                          <td><strong>{firm.name}</strong></td>
                          <td>{firm.specialty || "General"}</td>
                          <td>{getDoctorName(firm.lead_consultant)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
        </div>
      </div>

      {showAddModal && (
        <div className="patient-modal-backdrop">
          <section className="patient-modal" style={{ maxWidth: '500px' }}>
            <header className="patient-modal-header">
              <div>
                <h2>Add New Firm</h2>
                <p>Create a new consultant unit at {facility.name}.</p>
              </div>
              <button onClick={() => setShowAddModal(false)} type="button" aria-label="Close">×</button>
            </header>
            
            <form className="patient-create-form" onSubmit={handleCreateFirm} style={{ border: 'none', boxShadow: 'none' }}>
              <div className="patient-form-grid" style={{ gridTemplateColumns: '1fr' }}>
                <label>
                  Firm Name
                  <input
                    required
                    placeholder="e.g. Medical Unit 1"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    disabled={isSaving}
                  />
                </label>
                
                <label>
                  Specialty
                  <input
                    placeholder="e.g. Cardiology"
                    value={form.specialty}
                    onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                    disabled={isSaving}
                  />
                </label>
                
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', marginBottom: '8px' }}>Lead Consultant</label>
                  <SearchableDropdown 
                    options={doctors}
                    value={form.lead_consultant_id}
                    onChange={(val) => setForm({ ...form, lead_consultant_id: val })}
                    placeholder="Select a consultant..."
                    disabled={isSaving}
                  />
                </div>

                <label>
                  Assign to Ward
                  <select
                    value={form.ward_id}
                    onChange={(e) => setForm({ ...form, ward_id: e.target.value })}
                    disabled={isSaving}
                  >
                    <option value="">None</option>
                    {wards.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </label>
              </div>

              {error && <p className="patient-form-error">{error}</p>}
              {success && <p style={{ color: "green", fontSize: "0.875rem", marginTop: '8px' }}>{success}</p>}

              <div className="patient-form-actions" style={{ marginTop: '24px' }}>
                <button className="facility-secondary-button" onClick={() => setShowAddModal(false)} type="button" disabled={isSaving}>
                  Cancel
                </button>
                <button className="facility-primary-button" disabled={isSaving} type="submit">
                  {isSaving ? "Adding..." : "Add Clinical Firm"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
