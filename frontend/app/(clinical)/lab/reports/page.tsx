'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';

type LabTest = {
  name: string;
  lab_id: number;
  category_id: number;
};

type LabOrder = {
  id: number;
  lab_order_id: number;
  patient_id: string;
  patient_name: string;
  doctor_name: string;
  order_date: string;
  test_date: string;
  is_paid: boolean;
  processing_status_label: string;
  tests: LabTest[];
  results?: {
    id: number | string;
    test_name: string;
    value: string | number;
    unit?: string;
    reference_range?: string;
    comment?: string;
  }[];
};

type ApiResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: LabOrder[];
};

const LabReportsPage = () => {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);

  const { user } = useAuth();
  const { hasAnyRole } = usePermissions();
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    // Only Doctors, Lab Techs, and Admins can view the global reports list.
    if (user && !hasAnyRole(['doctor', 'lab-technician', 'system-admin', 'radiologist'])) {
      setAccessDenied(true);
      setLoading(false);
      return;
    }
    
    const fetchReports = async () => {
      setLoading(true);
      try {
        const response = await fetch(`http://127.0.0.1:8000/api/lab/orders/?page=${page}&page_size=10`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result: ApiResponse = await response.json();
        setData(result);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [page]);

  const toggleOrder = (id: number) => {
    if (expandedOrderId === id) {
      setExpandedOrderId(null);
    } else {
      setExpandedOrderId(id);
    }
  };

  const handlePrevPage = () => {
    if (page > 1) setPage(page - 1);
  };

  const handleNextPage = () => {
    if (data?.next) setPage(page + 1);
  };

  if (error) return (
    <div className="patient-list-header">
      <div style={{ color: '#ef4444', padding: '2rem' }}>Error loading reports: {error}</div>
    </div>
  );

  if (accessDenied) {
    return (
      <section className="mpi-page">
        <div className="mpi-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <i className="fa fa-lock" style={{ fontSize: '3rem', color: '#94a3b8', marginBottom: '1rem', display: 'block' }}></i>
          <h2 style={{ color: '#334155', marginBottom: '0.5rem', fontSize: '24px' }}>Access Restricted</h2>
          <p style={{ color: '#64748b', marginBottom: '2rem' }}>
            The global Lab Reports queue is restricted for your role.<br />
            To view lab reports for a patient, please use the <strong>Patient Profile</strong>.
          </p>
          <Link href="/patients" className="mpi-primary-button">
            <i className="fa fa-users" style={{ marginRight: '8px' }}></i> Go to Patients
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="section-kicker">Lab Reports</p>
          <h2>Order List</h2>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order Info</th>
                <th>Patient & Provider</th>
                <th>Results Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {!data?.results?.length ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
                    No lab reports found.
                  </td>
                </tr>
              ) : (
                data.results.map((order) => (
                  <React.Fragment key={order.id}>
                    <tr onClick={() => toggleOrder(order.id)} style={{ cursor: 'pointer' }}>
                      <td>
                        <strong style={{ display: 'block' }}>LCDB.{String(order.id).padStart(7, '0')}</strong>
                        <span style={{ color: 'var(--muted)', fontSize: '13px', display: 'block', margin: '4px 0' }}>{order.test_date ? new Date(order.test_date).toLocaleDateString() : (order.order_date ? new Date(order.order_date).toLocaleDateString() : 'N/A')}</span>
                        <span className={`status ${order.processing_status_label === 'Completed' ? 'success' : 'warning'}`}>
                          {order.processing_status_label || 'Pending'}
                        </span>
                      </td>
                      <td>
                        <strong style={{ display: 'block' }}>{order.patient_name || 'Unknown Patient'}</strong>
                        <span style={{ color: 'var(--muted)', fontSize: '13px' }}>
                          Patient ID: {order.patient_id}
                        </span>
                      </td>
                      <td>
                        <strong style={{ display: 'block' }}>
                          {order.tests?.length > 0
                            ? order.tests.map((t, idx) => (
                              <React.Fragment key={t.lab_id}>
                                <Link href={`/lab/reports/${t.lab_id}`} style={{ color: 'var(--primary)', textDecoration: 'none' }} onClick={(e) => e.stopPropagation()}>
                                  {t.name}
                                </Link>
                                {idx < order.tests.length - 1 && ', '}
                              </React.Fragment>
                            ))
                            : 'No Tests'}
                        </strong>
                        <span style={{ color: 'var(--muted)', fontSize: '13px' }}>{order.tests?.length || 0} Tests Attached</span>
                      </td>
                      <td>
                        <button className="button compact secondary" onClick={(e) => { e.stopPropagation(); toggleOrder(order.id); }}>
                          {expandedOrderId === order.id ? 'Hide Details' : 'View Results'}
                        </button>
                      </td>
                    </tr>

                    {expandedOrderId === order.id && (
                      <tr>
                        <td colSpan={4} style={{ padding: '16px 24px', backgroundColor: 'var(--panel-soft)' }}>
                          <div>
                            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>Test Results</h4>
                            {order.results && order.results.length > 0 ? (
                              <div className="table-wrap" style={{ border: '1px solid var(--line)', borderRadius: '10px', overflow: 'hidden' }}>
                                <table style={{ minWidth: '100%' }}>
                                  <thead>
                                    <tr>
                                      <th style={{ backgroundColor: 'var(--panel)', fontSize: '12px' }}>Test Name</th>
                                      <th style={{ backgroundColor: 'var(--panel)', fontSize: '12px' }}>Result</th>
                                      <th style={{ backgroundColor: 'var(--panel)', fontSize: '12px' }}>Ref Range</th>
                                      <th style={{ backgroundColor: 'var(--panel)', fontSize: '12px' }}>Comment</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {order.results.map((result) => (
                                      <tr key={result.id}>
                                        <td style={{ fontSize: '13px', fontWeight: 800 }}>{result.test_name}</td>
                                        <td style={{ fontSize: '13px' }}>
                                          <strong>{result.value}</strong> <span style={{ color: 'var(--muted)' }}>{result.unit}</span>
                                        </td>
                                        <td style={{ fontSize: '13px', color: 'var(--muted)' }}>{result.reference_range || '-'}</td>
                                        <td style={{ fontSize: '13px', color: 'var(--muted)' }}>{result.comment || '-'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p style={{ color: 'var(--muted)', fontSize: '13px', margin: 0 }}>No test results available for this order yet.</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {!loading && data && data.count > 0 && (
        <div className="mpi-pagination-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: '14px 24px', borderTop: '1px solid var(--line)' }}>
          <p style={{ margin: 0, fontSize: '13px', color: '#667085', fontWeight: 600 }}>
            Showing <strong>{(page - 1) * 10 + 1}-{Math.min(page * 10, data.count)}</strong> of <strong>{data.count}</strong> report{data.count === 1 ? "" : "s"}
          </p>

          <div className="mpi-pagination-controls" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {page > 1 ? (
              <button
                onClick={handlePrevPage}
                className="mpi-filter-button"
                style={{ display: 'inline-flex', alignItems: 'center', minHeight: '34px', lineHeight: '34px', background: '#fff', border: '1px solid #ccd6e2', borderRadius: '8px', padding: '0 12px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', color: '#111827' }}
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
                const totalPages = Math.max(1, Math.ceil(data.count / 10));
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

                return getPaginationRange(page, totalPages).map((p, idx) => (
                  <button
                    key={`${p}-${idx}`}
                    type="button"
                    disabled={p === '...'}
                    onClick={() => typeof p === 'number' && setPage(p)}
                    style={{
                      minWidth: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: p === page ? '#f1f5f9' : 'transparent',
                      color: p === page ? '#0f172a' : (p === '...' ? '#94a3b8' : '#64748b'),
                      border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 800,
                      cursor: p === '...' ? 'default' : 'pointer'
                    }}
                  >
                    {p}
                  </button>
                ));
              })()}
            </div>

            {data.next ? (
              <button
                onClick={handleNextPage}
                className="mpi-filter-button"
                style={{ display: 'inline-flex', alignItems: 'center', minHeight: '34px', lineHeight: '34px', background: '#fff', border: '1px solid #ccd6e2', borderRadius: '8px', padding: '0 12px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', color: '#111827' }}
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
    </section>
  );
};

export default LabReportsPage;
