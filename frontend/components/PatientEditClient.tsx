"use client";

import Link from "next/link";
import { useState } from "react";
import type { DoctorOption, PatientDetailRecord } from "../lib/patients-db";

type PatientEditClientProps = {
  patient: PatientDetailRecord;
  doctors: DoctorOption[];
};

type EditFormState = {
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

function toFormState(patient: PatientDetailRecord): EditFormState {
  return {
    name: patient.name ?? "",
    phone: patient.phone ?? "",
    email: patient.email ?? "",
    address: patient.address ?? "",
    sex: patient.sex ?? "",
    birthDate: patient.birthDateRaw ?? "",
    bloodGroup: patient.bloodGroup ?? "",
    assignedDoctorId: patient.assignedDoctorId ?? "",
    doctor: patient.doctor ?? "",
    patientNumber: patient.patientNumber ?? "",
    note: patient.note ?? "",
  };
}

export default function PatientEditClient({ patient, doctors }: PatientEditClientProps) {
  const [form, setForm] = useState<EditFormState>(toFormState(patient));
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  async function save() {
    setSaving(true);
    setStatus("");

    try {
      const response = await fetch(`/api/patients/${patient.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          email: form.email,
          address: form.address,
          sex: form.sex,
          birthDate: form.birthDate,
          bloodGroup: form.bloodGroup,
          assignedDoctorId: form.assignedDoctorId,
          doctor: form.doctor,
          patientNumber: form.patientNumber,
          note: form.note,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save patient.");
      }

      setStatus(`Saved ${payload.patient.name}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save patient.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="patient-profile-page edit-profile-page">
      <div className="patient-profile-card edit-profile-card">
        <header className="profile-view-header">
          <div className="profile-breadcrumb">
            <span>Patient Profile</span>
            <span>&gt;</span>
            <span>Edit</span>
            <span>&gt;</span>
            <strong>{patient.name}</strong>
          </div>
          <div className="profile-view-actions">
            <Link className="profile-back-button" href={`/patients/${patient.id}`}>
              Cancel
            </Link>
            <button className="profile-edit-button" onClick={save} type="button">
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </header>

        <form className="edit-profile-form" onSubmit={(event) => event.preventDefault()}>
          <section className="edit-profile-hero" aria-label="Edit patient identity">
            <div className="edit-photo-wrap">
              <div className="edit-profile-photo" aria-label={`${patient.name} profile photo`}>
                <div className="edit-profile-photo-face" />
              </div>
              <button className="edit-photo-camera" aria-label="Change profile photo" type="button" />
            </div>
            <div className="edit-profile-identity">
              <h1>{patient.name}</h1>
              <p>{patient.patientNumber || patient.id}</p>
            </div>
            <label className="edit-donate-toggle">
              <span>Active</span>
              <input defaultChecked type="checkbox" />
              <span className="edit-toggle-track" />
            </label>
          </section>

          <nav className="profile-tabs edit-profile-tabs" aria-label="Edit profile sections">
            <a className="active" href="#general">
              General
            </a>
            <Link href={`/patients/${patient.id}/consent`}>Consent</Link>
            <Link href={`/patients/${patient.id}/audit`}>Audit Trail</Link>
          </nav>

          <section className="edit-profile-grid" id="general">
            <div className="edit-profile-panel edit-profile-personal">
              <h2>Personal Information</h2>
              <div className="edit-profile-fields">
                <label className="edit-profile-field">
                  <span>Full Name</span>
                  <span className="edit-profile-control">
                    <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
                  </span>
                </label>
                <label className="edit-profile-field">
                  <span>Date of Birth</span>
                  <span className="edit-profile-control has-prefix">
                    <span className="edit-control-prefix" aria-hidden="true" />
                    <input
                      type="date"
                      value={form.birthDate}
                      onChange={(event) => setForm((current) => ({ ...current, birthDate: event.target.value }))}
                    />
                  </span>
                </label>
                <label className="edit-profile-field">
                  <span>Gender</span>
                  <span className="edit-profile-control">
                    <select value={form.sex} onChange={(event) => setForm((current) => ({ ...current, sex: event.target.value }))}>
                      <option value="">Not recorded</option>
                      <option>Female</option>
                      <option>Male</option>
                      <option>Other</option>
                    </select>
                  </span>
                </label>
                <label className="edit-profile-field">
                  <span>Blood Type</span>
                  <span className="edit-profile-control">
                    <select
                      value={form.bloodGroup}
                      onChange={(event) => setForm((current) => ({ ...current, bloodGroup: event.target.value }))}
                    >
                      <option value="">Not recorded</option>
                      <option>A+</option>
                      <option>A-</option>
                      <option>B+</option>
                      <option>B-</option>
                      <option>O+</option>
                      <option>O-</option>
                      <option>AB+</option>
                      <option>AB-</option>
                    </select>
                  </span>
                </label>
              </div>
            </div>

            <div className="edit-profile-panel edit-profile-contact">
              <h2>Contact Details</h2>
              <div className="edit-profile-fields">
                <label className="edit-profile-field">
                  <span>Phone</span>
                  <span className="edit-profile-control">
                    <input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
                  </span>
                </label>
                <label className="edit-profile-field">
                  <span>Email</span>
                  <span className="edit-profile-control">
                    <input value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
                  </span>
                </label>
                <label className="edit-profile-field">
                  <span>Address</span>
                  <span className="edit-profile-control">
                    <input value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} />
                  </span>
                </label>
              </div>
            </div>

            <div className="edit-profile-panel edit-profile-insurance">
              <h2>Legacy / Assignment</h2>
              <div className="edit-profile-fields">
                <label className="edit-profile-field">
                  <span>Assigned Doctor</span>
                  <span className="edit-profile-control">
                    <select
                      value={form.assignedDoctorId}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, assignedDoctorId: event.target.value }))
                      }
                    >
                      <option value="">Unassigned</option>
                      {doctors.map((doctor) => (
                        <option key={doctor.id} value={doctor.id}>
                          {doctor.name}
                        </option>
                      ))}
                    </select>
                  </span>
                </label>
                <label className="edit-profile-field">
                  <span>Legacy doctor text</span>
                  <span className="edit-profile-control">
                    <input value={form.doctor} onChange={(event) => setForm((current) => ({ ...current, doctor: event.target.value }))} />
                  </span>
                </label>
                <label className="edit-profile-field">
                  <span>Patient Number</span>
                  <span className="edit-profile-control">
                    <input
                      value={form.patientNumber}
                      onChange={(event) => setForm((current) => ({ ...current, patientNumber: event.target.value }))}
                    />
                  </span>
                </label>
                <label className="edit-profile-field">
                  <span>Note</span>
                  <span className="edit-profile-control">
                    <textarea
                      value={form.note}
                      onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
                    />
                  </span>
                </label>
              </div>
            </div>

            <div className="edit-profile-panel edit-profile-assignments">
              <h2>Status</h2>
              <div className="edit-status-segment" role="group" aria-label="Patient status">
                <button className="active" type="button">
                  Active
                </button>
                <button type="button">Inactive</button>
              </div>
              {status ? <p className="patient-import-status">{status}</p> : null}
            </div>
          </section>
        </form>
      </div>
    </section>
  );
}
