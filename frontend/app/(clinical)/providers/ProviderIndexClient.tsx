"use client";

import Link from "next/link";
import { useState, useMemo } from "react";

type ProviderRecord = {
  id: string;
  name: string;
  role: string;
  specialty: string;
  department: string;
  patients: number;
  status: string;
  tone: string;
};

type ProviderIndexClientProps = {
  initialProviders: ProviderRecord[];
};

export default function ProviderIndexClient({ initialProviders }: ProviderIndexClientProps) {
  const [providers] = useState<ProviderRecord[]>(initialProviders);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const itemsPerPage = 10;

  const filteredProviders = useMemo(() => {
    return providers.filter(provider =>
      provider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      provider.specialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
      provider.department.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [providers, searchQuery]);

  const totalPages = Math.ceil(filteredProviders.length / itemsPerPage) || 1;
  const paginatedProviders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredProviders.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProviders, currentPage]);

  const startEntry = filteredProviders.length ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endEntry = Math.min(currentPage * itemsPerPage, filteredProviders.length);

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
      // Near beginning: 1 2 3 4 ... 6 7 8
      range.push(1, 2, 3, 4, "...", total - 2, total - 1, total);
    } else if (current >= total - 3) {
      // Near end: 1 2 3 ... total-3 total-2 total-1 total
      range.push(1, 2, 3, "...", total - 3, total - 2, total - 1, total);
    } else {
      // Middle: 1 ... current-1 current current+1 ... total
      range.push(1, "...", current - 1, current, current + 1, "...", total);
    }

    return range;
  }, [currentPage, totalPages]);

  return (
    <section className="providers-page">
      <div className="mpi-card">
        <header className="mpi-header">
          <div>
            <h1>Master Provider Index</h1>
            <p className="patient-db-status">
              Showing unified credentials, specialties, and active statuses across organizations
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
                placeholder="Search providers..."
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
                <th>Unique ID</th>
                <th>Provider Name</th>
                <th>Credentials / Role</th>
                <th>Specialty</th>
                <th>Department</th>
                <th>Assigned Patients</th>
                <th>Active Status</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProviders.map((provider) => (
                <tr key={provider.id}>
                  <td>
                    <strong>{provider.id.toUpperCase()}</strong>
                  </td>
                  <td>
                    <Link href={`/providers/${provider.id}`} style={{ color: "var(--accent)", textDecoration: "none", fontWeight: "bold" }}>
                      {provider.name}
                    </Link>
                  </td>
                  <td>{provider.role}</td>
                  <td>{provider.specialty}</td>
                  <td>{provider.department}</td>
                  <td>
                    <strong>{provider.patients}</strong> patients
                  </td>
                  <td>
                    <span className={`mpi-action-pill ${provider.tone}`}>
                      {provider.status}
                    </span>
                  </td>
                </tr>
              ))}
              {paginatedProviders.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="patient-empty-state">
                      <strong>No provider records found</strong>
                      <p>Ensure the database contains active doctor and staff seed records.</p>
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
            <strong>{filteredProviders.length}</strong> entries
          </p>
          <div className="patient-pagination" aria-label="Provider pagination">
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
