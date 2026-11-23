'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { canAccess, createActiveUserFromToken } from '@/lib/permissions';
import api from '@/lib/api';

interface Patient {
  id: number;
  patient_id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  sex: string;
  birthdate: string;
  bloodgroup: string;
  img_url: string;
  doctor_id: number;
  status?: string;
}

const AVATAR_COLORS = ['avatar-0', 'avatar-1', 'avatar-2', 'avatar-3', 'avatar-4'];

function getInitials(name: string) {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getAvatarColor(id: number) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

function calculateAge(birthdate: string): string {
  if (!birthdate) return '—';
  const today = new Date();
  const birth = new Date(birthdate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return `${age}y`;
}

const PAGE_SIZE = 20;

const PatientListPage = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { canAdd } = usePermissions();
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sexFilter, setSexFilter] = useState('');
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  const activeUser = createActiveUserFromToken(user || undefined);
  const hasAccess = canAccess(activeUser, ['patient.read']);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }
    const fetchPatients = async () => {
      if (user?.token && hasAccess) {
        try {
          const data = await api.getPatients(user.token);
          const list = Array.isArray(data) ? data : Array.isArray((data as any)?.results) ? (data as any).results : [];
          setPatients(list);
        } catch (error: any) {
          console.error('Failed to fetch patients:', error);
          if (error.message?.includes('401') || error.message?.includes('token')) {
            router.push('/login');
          }
        } finally {
          setLoading(false);
        }
      } else if (!authLoading) {
        setLoading(false);
      }
    };
    fetchPatients();
  }, [user, isAuthenticated, authLoading, router, hasAccess]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = () => setOpenMenuId(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const filtered = useMemo(() => {
    let list = Array.isArray(patients) ? patients : [];
    const q = searchValue.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.patient_id?.toLowerCase().includes(q) ||
          p.phone?.toLowerCase().includes(q) ||
          p.email?.toLowerCase().includes(q)
      );
    }
    if (sexFilter) {
      list = list.filter((p) => p.sex?.toLowerCase() === sexFilter.toLowerCase());
    }
    return list;
  }, [patients, searchValue, sexFilter]);

  const totalPages = Math.max(1, Math.ceil((Array.isArray(filtered) ? filtered.length : 0) / PAGE_SIZE));
  const paginated = (Array.isArray(filtered) ? filtered : []).slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
    setCurrentPage(1);
  };

  if (!authLoading && user && !hasAccess) {
    return (
      <section className="mpi-page">
        <div className="mpi-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
            Access Restricted
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            Your role does not have permission to view the global patient list.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mpi-page">
      <div className="mpi-card">
        <header className="mpi-header">
          <div>
            <h1>Patients Directory</h1>
            <p className="patient-db-status">
              {loading ? 'Loading…' : `${filtered.length} patient${filtered.length !== 1 ? 's' : ''} found in your practice`}
            </p>
          </div>
          {canAdd('patient') && (
            <Link className="mpi-primary-button" href="/patients/register">
              + Add New Patient
            </Link>
          )}
        </header>

        <div className="mpi-toolbar">
          <form className="mpi-search-form" onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
            <label className="mpi-search" style={{ flex: '1', minWidth: '200px', maxWidth: '310px' }}>
              <span aria-hidden="true">O</span>
              <input
                type="search"
                value={searchValue}
                onChange={handleSearch}
                placeholder="Search name, ID, phone…"
                autoComplete="off"
              />
            </label>

            <select
              value={sexFilter}
              onChange={(e) => { setSexFilter(e.target.value); setCurrentPage(1); }}
              className="mpi-select-button"
              style={{
                height: '34px', border: '1px solid #ccd6e2', borderRadius: '8px', padding: '0 10px',
                fontSize: '13px', fontWeight: 800, color: '#111827', background: '#ffffff', outline: 'none', cursor: 'pointer'
              }}
            >
              <option value="">All Genders</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>

            {(searchValue || sexFilter) && (
              <button
                type="button"
                onClick={() => { setSearchValue(''); setSexFilter(''); setCurrentPage(1); }}
                className="mpi-filter-button"
                style={{
                  display: 'inline-flex', alignItems: 'center', minHeight: '34px', height: '34px',
                  padding: '0 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 800,
                  background: '#f1f5f9', borderColor: '#cbd5e1'
                }}
              >
                Clear
              </button>
            )}
          </form>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No patients found.</div>
        ) : (
          <div className="mpi-table-wrap">
            <table className="mpi-table">
              <thead>
                <tr>
                  <th><input aria-label="Select all" type="checkbox" /></th>
                  <th>Unique Patient ID</th>
                  <th>Patient Name</th>
                  <th>Contact Information</th>
                  <th>Sex/Gender & Age</th>
                  <th>Blood Group</th>
                  <th>Status</th>
                  <th aria-label="More actions" />
                </tr>
              </thead>
              <tbody>
                {paginated.map((patient) => (
                  <tr key={patient.id}>
                    <td><input type="checkbox" aria-label={`Select ${patient.name}`} /></td>
                    <td>
                      <strong>{patient.patient_id || '—'}</strong>
                    </td>
                    <td>
                      <strong>{patient.name}</strong>
                    </td>
                    <td>
                      <strong>{patient.phone || '—'}</strong>
                      <span>{patient.email || '—'}</span>
                    </td>
                    <td>
                      <strong style={{ textTransform: 'capitalize' }}>{patient.sex || '—'}</strong>
                      <span>{calculateAge(patient.birthdate)}</span>
                    </td>
                    <td>
                      <strong style={{ color: '#be123c' }}>{patient.bloodgroup || '—'}</strong>
                    </td>
                    <td>
                      <div className="mpi-confidence">
                        <strong style={{ color: patient.status === 'Admitted' ? '#be123c' : '#059669' }}>
                          {patient.status || 'Clinic'}
                        </strong>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Link className="mpi-action-pill low" href={`/patients/profile/${patient.id}`}>
                          View Chart
                        </Link>
                        {patient.status !== 'Admitted' && (
                          <button 
                            className="mpi-action-pill" 
                            style={{ background: '#dbeafe', color: '#1e40af', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                            onClick={async () => {
                              const bht = window.prompt("Enter BHT Number:", `BHT-${Math.floor(Math.random() * 10000)}`);
                              if (!bht) return;
                              const bed = window.prompt("Enter Bed Assignment:", "Ward A - Bed 1");
                              if (!bed) return;
                              try {
                                const res = await fetch('http://localhost:8000/api/admissions/', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ patient: patient.id, bht, bed, status: 'admitted' })
                                });
                                if (res.ok) {
                                  alert("Patient admitted successfully!");
                                  window.location.reload();
                                } else {
                                  alert("Failed to admit patient");
                                }
                              } catch(e) {
                                console.error(e);
                                alert("Error admitting patient");
                              }
                            }}
                          >
                            Admit to Ward
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="mpi-pagination-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: '14px 24px', borderBottom: '1px solid #e3e9f1' }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#667085', fontWeight: 600 }}>
              Showing <strong>{(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, filtered.length)}</strong> of <strong>{filtered.length}</strong> patient{filtered.length === 1 ? "" : "s"}
            </p>

            <div className="mpi-pagination-controls" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              {currentPage > 1 ? (
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="mpi-filter-button"
                  style={{ display: 'inline-flex', alignItems: 'center', minHeight: '34px', lineHeight: '34px', background: '#fff', border: '1px solid #ccd6e2', borderRadius: '8px', padding: '0 12px', fontSize: '13px', fontWeight: 800, cursor: 'pointer' }}
                >
                  Previous
                </button>
              ) : (
                <span className="mpi-filter-button" style={{ display: 'inline-flex', alignItems: 'center', minHeight: '34px', lineHeight: '34px', background: '#f8fafc', color: '#94a3b8', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0 12px', fontSize: '13px', fontWeight: 800, cursor: 'not-allowed' }}>
                  Previous
                </span>
              )}

              <div className="mpi-page-numbers" style={{ display: 'flex', gap: '4px' }}>
                {(() => {
                  const getPaginationRange = (current: number, total: number) => {
                    const range: (number | string)[] = [];
                    if (total <= 7) {
                      for (let i = 1; i <= total; i++) range.push(i);
                    } else if (current <= 3) {
                      range.push(1, 2, 3, 4, "...", total);
                    } else if (current >= total - 2) {
                      range.push(1, "...", total - 3, total - 2, total - 1, total);
                    } else {
                      range.push(1, "...", current - 1, current, current + 1, "...", total);
                    }
                    return range;
                  };

                  return getPaginationRange(currentPage, totalPages).map((p, idx) => (
                    <button
                      key={`${p}-${idx}`}
                      type="button"
                      disabled={p === '...'}
                      onClick={() => typeof p === 'number' && setCurrentPage(p)}
                      style={{
                        minWidth: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: p === currentPage ? '#f1f5f9' : 'transparent',
                        color: p === currentPage ? '#0f172a' : (p === '...' ? '#94a3b8' : '#64748b'),
                        border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 800,
                        cursor: p === '...' ? 'default' : 'pointer'
                      }}
                    >
                      {p}
                    </button>
                  ));
                })()}
              </div>

              {currentPage < totalPages ? (
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="mpi-filter-button"
                  style={{ display: 'inline-flex', alignItems: 'center', minHeight: '34px', lineHeight: '34px', background: '#fff', border: '1px solid #ccd6e2', borderRadius: '8px', padding: '0 12px', fontSize: '13px', fontWeight: 800, cursor: 'pointer' }}
                >
                  Next
                </button>
              ) : (
                <span className="mpi-filter-button" style={{ display: 'inline-flex', alignItems: 'center', minHeight: '34px', lineHeight: '34px', background: '#f8fafc', color: '#94a3b8', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0 12px', fontSize: '13px', fontWeight: 800, cursor: 'not-allowed' }}>
                  Next
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default PatientListPage;

