"use client";

import Link from "next/link";
import { useState, useMemo } from "react";

type PatientAssignment = {
  id: string;
  patientNumber: string;
  name: string;
  birthDate: string;
  phone: string;
  email: string;
  status: string;
  lastVisit: string;
};

type ProviderDetailPayload = {
  id: string;
  name: string;
  role: string;
  specialty: string;
  department: string;
  status: string;
  tone: string;
  patients: PatientAssignment[];
};

type ProviderDetailClientProps = {
  provider: ProviderDetailPayload;
};

export default function ProviderDetailClient({ provider }: ProviderDetailClientProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const itemsPerPage = 10;

  const filteredPatients = useMemo(() => {
    return provider.patients.filter(patient =>
      patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.patientNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.phone.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [provider.patients, searchQuery]);

  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage) || 1;

  const paginatedPatients = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPatients.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPatients, currentPage]);

  const startEntry = filteredPatients.length ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endEntry = Math.min(currentPage * itemsPerPage, filteredPatients.length);

  // Generate dynamic pagination range with ellipsis
  const paginationRange = useMemo(() => {
    const range: (number | string)[] = [];
    const total = totalPages;
    const current = currentPage;

    if (total <= 8) {
      for (let i = 1; i <= total; i++) {
        range.push(i);
      }
      return range;
    }

    if (current <= 4) {
      range.push(1, 2, 3, 4, "...", total - 2, total - 1, total);
    } else if (current >= total - 3) {
      range.push(1, 2, 3, "...", total - 3, total - 2, total - 1, total);
    } else {
      range.push(1, "...", current - 1, current, current + 1, "...", total);
    }

    return range;
  }, [currentPage, totalPages]);

  return (
    <section className="provider-detail-page">
      <header className="page-header" style={{ marginBottom: "2rem" }}>
        <div>
          <div className="eyebrow" style={{ color: "var(--accent)", textTransform: "uppercase", fontSize: "0.85rem", fontWeight: "bold" }}>
            Provider Registry Profile
          </div>
          <h1>{provider.name}</h1>
          <p className="muted">
            Department: <strong>{provider.department}</strong> · Specialty: <strong>{provider.specialty}</strong>
          </p>
        </div>
      </header>

      <div className="grid cols-3 gap-6" style={{ marginBottom: "2.5rem" }}>
        <div className="panel col-span-1" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <h2>Demographics & Credentials</h2>
            <p className="muted" style={{ marginBottom: "1.5rem" }}>Core Identity Records</p>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <span className="muted" style={{ fontSize: "0.85rem", display: "block" }}>Unique Core ID</span>
                <strong>{provider.id.toUpperCase()}</strong>
              </div>
              <div>
                <span className="muted" style={{ fontSize: "0.85rem", display: "block" }}>Qualifications / Job Title</span>
                <strong>{provider.role}</strong>
              </div>
              <div>
                <span className="muted" style={{ fontSize: "0.85rem", display: "block" }}>Current Operations Status</span>
                <span className={`mpi-action-pill ${provider.tone}`} style={{ display: "inline-block", marginTop: "4px" }}>
                  {provider.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="panel col-span-2">
          <h2>Clinical Statistics</h2>
          <p className="muted" style={{ marginBottom: "1.5rem" }}>Active Integration Volume</p>
          <div className="grid cols-2 gap-4">
            <div style={{ background: "rgba(0,0,0,0.02)", padding: "1.2rem", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.05)" }}>
              <span className="muted" style={{ display: "block", fontSize: "0.9rem" }}>Total Assigned Patients</span>
              <span style={{ fontSize: "2.2rem", fontWeight: "bold", color: "var(--accent)" }}>{provider.patients.length}</span>
              <span style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>Active clinical links</span>
            </div>
            <div style={{ background: "rgba(0,0,0,0.02)", padding: "1.2rem", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.05)" }}>
              <span className="muted" style={{ display: "block", fontSize: "0.9rem" }}>HIE Connection Health</span>
              <span style={{ fontSize: "2.2rem", fontWeight: "bold", color: "var(--success)" }}>100%</span>
              <span style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>Interface synchronization</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mpi-card">
        <header className="mpi-header">
          <div>
            <h2>Assigned Patient Roster</h2>
            <p className="patient-db-status">
              Review patients matching this provider in the central clinical registry
            </p>
          </div>
        </header>

        <div className="patient-list-toolbar" style={{ borderBottom: "1px solid rgba(0,0,0,0.05)", paddingBottom: "1rem" }}>
          <div className="patient-tools" style={{ marginLeft: "auto" }}>
            <label className="patient-search">
              <span aria-hidden="true">O</span>
              <input
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search patients..."
                type="search"
                value={searchQuery}
              />
            </label>
          </div>
        </div>

        <div className="mpi-table-wrap">
          <table className="mpi-table">
            <thead>
              <tr>
                <th>Patient Number</th>
                <th>Patient Name</th>
                <th>Date of Birth</th>
                <th>Phone Number</th>
                <th>Email Address</th>
                <th>Clinical Status</th>
                <th>Last Registry Update</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPatients.map((patient) => (
                <tr key={patient.id}>
                  <td>
                    <strong>{patient.patientNumber}</strong>
                  </td>
                  <td>
                    <Link href={`/patients/${patient.id}`} style={{ color: "var(--accent)", textDecoration: "none", fontWeight: "bold" }}>
                      {patient.name}
                    </Link>
                  </td>
                  <td>{patient.birthDate}</td>
                  <td>{patient.phone}</td>
                  <td>{patient.email}</td>
                  <td>
                    <span className="patient-status active">
                      {patient.status}
                    </span>
                  </td>
                  <td style={{ fontSize: "0.85rem" }}>{patient.lastVisit}</td>
                </tr>
              ))}
              {paginatedPatients.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="patient-empty-state">
                      <strong>No assigned patients found</strong>
                      <p>There are no current core patient assignments mapped to this physician.</p>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <footer className="patient-list-footer">
          <p>
            Showing <strong>{startEntry}-{endEntry}</strong> of{" "}
            <strong>{filteredPatients.length}</strong> entries
          </p>
          <div className="patient-pagination" aria-label="Patient pagination">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              type="button"
            >
              Pre
            </button>

            {paginationRange.map((page, index) => {
              if (page === "...") {
                return (
                  <span key={`ellipsis-${index}`} style={{ padding: "0 8px", color: "var(--text-muted)" }}>
                    ...
                  </span>
                );
              }

              const pageNumber = page as number;
              return (
                <button
                  key={pageNumber}
                  className={currentPage === pageNumber ? "active" : ""}
                  onClick={() => setCurrentPage(pageNumber)}
                  type="button"
                >
                  {pageNumber}
                </button>
              );
            })}

            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              type="button"
            >
              Next
            </button>
          </div>
        </footer>
      </div>
    </section>
  );
}
