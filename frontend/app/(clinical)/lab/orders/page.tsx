'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { UserRole } from '@/lib/roles';
import api from '@/lib/api';

interface LabTest {
  id: number; // lab_order_id
  lab_id?: number;
  patient_id?: number | string;
  patient_name?: string;
  doctor_name?: string;
  tests?: Array<{ name: string; lab_id: number }>;
  category_count?: number;
  test_date?: string;
  status?: string;
  processing_status?: number;
  processing_status_label?: string;
  priority?: 'Routine' | 'Urgent' | 'STAT';
  specimen_status?: 'Pending' | 'Collected' | 'In Transit' | 'Received' | 'Rejected';
  loinc_code?: string;
}

const LabListPage = () => {
  const { user } = useAuth();
  const router = useRouter();
  const { canAdd, canEdit, canDelete, isDoctor, hasAnyRole } = usePermissions();
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchValue, setSearchValue] = useState('');
  const [accessDenied, setAccessDenied] = useState(false);
  const pageSize = 10;

  const searchParams = useMemo(() => {
    const trimmed = searchValue.trim();
    return trimmed ? { search: trimmed } : {};
  }, [searchValue]);

  const formatBillingNumber = (orderId?: number | string) => {
    if (orderId === undefined || orderId === null) return '-';
    return `LCDB.${String(orderId).padStart(7, '0')}`;
  };

  const formatDateTime = (value?: string) => {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString();
  };

  const getTestItems = (test: LabTest) => {
    const items = Array.isArray(test.tests) ? test.tests : [];
    return items.filter((item) => item?.name);
  };

  const getProcessingStatusStyle = (status: number) => {
    if (status === 2) return { color: '#059669', background: '#d1fae5' }; // Success
    if (status === 1) return { color: '#d97706', background: '#fef3c7' }; // Warning
    if (status === 3) return { color: '#dc2626', background: '#fee2e2' }; // Danger
    return { color: '#64748b', background: '#f1f5f9' }; // Default
  };

  useEffect(() => {
    const fetchLabTests = async () => {
      // RBAC: Global lab queue is for LIS staff only.
      if (user && !hasAnyRole([UserRole.ADMIN, UserRole.LAB_TECHNICIAN])) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }

      if (user?.token) {
        setLoading(true);
        try {
          const data = await api.getLabTests(user.token, {
            page: String(currentPage),
            page_size: String(pageSize),
            ...searchParams
          }) as any;
          if (Array.isArray(data)) {
            setLabTests(data);
            setTotalCount(data.length);
          } else {
            setLabTests(data?.results || []);
            setTotalCount(data?.count || 0);
          }
        } catch (error) {
          console.error('Failed to fetch lab tests:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    fetchLabTests();
  }, [user, currentPage, searchParams]);

  const handleDelete = async (labId?: number) => {
    if (!user?.token || !labId) return;
    if (!confirm('Are you sure you want to delete this lab order?')) return;

    try {
      await api.deleteLabTest(user.token, String(labId));
      setLabTests((prev) => prev.filter((item) => item.lab_id !== labId));
      setTotalCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to delete lab order:', error);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const canAddLab = canAdd('lab');
  const canEditLab = canEdit('lab') && !isDoctor;
  const canDeleteLab = canDelete('lab') && !isDoctor;

  if (accessDenied) {
    return (
      <section className="mpi-page">
        <div className="mpi-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <i className="fa fa-lock" style={{ fontSize: '3rem', color: '#94a3b8', marginBottom: '1rem', display: 'block' }}></i>
          <h2 style={{ color: '#334155', marginBottom: '0.5rem', fontSize: '24px' }}>Access Restricted</h2>
          <p style={{ color: '#64748b', marginBottom: '2rem' }}>
            The global Lab Orders queue is for Laboratory staff only.<br />
            To order or view lab tests for a patient, please use the <strong>Patient Profile</strong>.
          </p>
          <Link href="/patients" className="mpi-primary-button">
            <i className="fa fa-users" style={{ marginRight: '8px' }}></i> Go to Patients
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mpi-page">
      <div className="mpi-card">
        <header className="mpi-header">
          <div>
            <h1>Lab Orders Dashboard</h1>
            <p className="patient-db-status">Manage laboratory requests, specimens, and processing queues.</p>
          </div>
          {canAddLab && (
            <Link href="/lab/orders/add" className="mpi-primary-button" style={{ padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa fa-plus"></i> New Lab Order
            </Link>
          )}
        </header>

        <div className="mpi-toolbar">
          <form className="mpi-search-form" onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
            <label className="mpi-search" style={{ flex: '1', minWidth: '200px', maxWidth: '350px' }}>
              <span aria-hidden="true">O</span>
              <input
                type="search"
                placeholder="Search Patient, Doctor, or Billing Number"
                value={searchValue}
                onChange={(event) => {
                  setSearchValue(event.target.value);
                  setCurrentPage(1);
                }}
                autoComplete="off"
              />
            </label>
          </form>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading...</div>
        ) : (
          <>
            <div className="mpi-table-wrap">
              <table className="mpi-table">
                <thead>
                  <tr>
                    <th><input aria-label="Select all" type="checkbox" /></th>
                    <th>Order Info</th>
                    <th>Patient Details & Tests</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {labTests.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                        No lab orders found for the current search.
                      </td>
                    </tr>
                  ) : (
                    labTests.map((test) => {
                      const testItems = getTestItems(test);
                      const primaryLabId = testItems[0]?.lab_id;
                      const reportHref = (test.category_count || 0) > 1
                        ? `/lab/order/${test.id}`
                        : (primaryLabId ? `/lab/reports/${primaryLabId}` : `/lab/order/${test.id}`);
                      const editPaymentHref = `/billing/finance/payment/add?section=lab&id=${test.id}`;

                      return (
                        <tr key={test.id}>
                          <td><input type="checkbox" aria-label={`Select order ${test.id}`} /></td>
                          <td>
                            <strong>{formatBillingNumber(test.id)}</strong>
                            <span style={{ display: 'block', color: '#475569', fontSize: '13px', margin: '4px 0 8px 0' }}>{formatDateTime(test.test_date)}</span>
                            
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              <span style={{ 
                                padding: '2px 6px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, 
                                ...getProcessingStatusStyle(test.processing_status ?? 0)
                              }}>
                                {test.processing_status_label || 'Not processing'}
                              </span>
                              {test.status && (
                                <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, color: test.status === 'Completed' ? '#059669' : test.status === 'Pending' ? '#d97706' : '#2563eb', background: test.status === 'Completed' ? '#ecfdf5' : test.status === 'Pending' ? '#fef3c7' : '#eff6ff' }}>
                                  {test.status}
                               </span>
                              )}
                              {test.priority && (
                                <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, color: test.priority === 'STAT' ? '#dc2626' : test.priority === 'Urgent' ? '#ea580c' : '#475569', background: test.priority === 'STAT' ? '#fee2e2' : test.priority === 'Urgent' ? '#ffedd5' : '#f1f5f9' }}>
                                  {test.priority === 'STAT' || test.priority === 'Urgent' ? <i className="fa fa-exclamation-triangle" style={{ marginRight: '4px' }}></i> : null}
                                  {test.priority}
                                </span>
                              )}
                              {test.specimen_status && (
                                <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, color: '#4f46e5', background: '#e0e7ff' }}>
                                  <i className="fa fa-vial" style={{ marginRight: '4px' }}></i>
                                  {test.specimen_status}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <strong>{test.patient_name || 'Unknown Patient'}</strong>
                            <span style={{ display: 'block', color: '#64748b', fontSize: '13px', margin: '4px 0 8px 0' }}>
                              {test.patient_id ? `ID: ${test.patient_id}` : ''}
                              {test.doctor_name ? ` • Dr. ${test.doctor_name}` : ''}
                            </span>
                            
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              {testItems.length ? (
                                testItems.map((item) => (
                                  <Link
                                    key={`${item.lab_id}-${item.name}`}
                                    href={`/lab/reports/${item.lab_id}`}
                                    style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 500, color: '#334155', border: '1px solid #cbd5e1', textDecoration: 'none', background: '#fff' }}
                                  >
                                    {item.name}
                                  </Link>
                                ))
                              ) : (
                                <span style={{ fontSize: '12px', color: '#94a3b8' }}>No categories assigned</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              {(test.category_count || 0) > 1 ? (
                                <Link href={`/lab/order/${test.id}`} style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '6px 12px', fontWeight: 600, fontSize: '12px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <i className="fa fa-list" style={{ opacity: 0.8 }}></i> View Tests
                                </Link>
                              ) : (
                                <Link href={reportHref} style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '6px 12px', fontWeight: 600, fontSize: '12px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <i className="fa fa-eye" style={{ opacity: 0.8 }}></i> View Report
                                </Link>
                              )}
                              
                              {canEditLab && (
                                <Link href={editPaymentHref} style={{ backgroundColor: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '6px 12px', fontWeight: 600, fontSize: '12px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <i className="fa fa-edit" style={{ opacity: 0.8 }}></i> Payment
                                </Link>
                              )}
                              
                              {canDeleteLab && (
                                <button
                                  type="button"
                                  onClick={() => handleDelete(primaryLabId)}
                                  disabled={!primaryLabId}
                                  style={{ 
                                    backgroundColor: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: '6px', padding: '6px 12px', fontWeight: 600, fontSize: '12px', 
                                    cursor: primaryLabId ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: '6px', opacity: primaryLabId ? 1 : 0.5
                                  }}
                                >
                                  <i className="fa fa-trash" style={{ opacity: 0.8 }}></i> Delete
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {!loading && labTests.length > 0 && (
              <div className="mpi-pagination-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: '14px 24px', borderTop: '1px solid #e3e9f1' }}>
                <p style={{ margin: 0, fontSize: '13px', color: '#667085', fontWeight: 600 }}>
                  Showing <strong>{(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, totalCount)}</strong> of <strong>{totalCount}</strong> orders
                </p>

                <div className="mpi-pagination-controls" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="mpi-filter-button"
                    style={{
                      display: 'inline-flex', alignItems: 'center', minHeight: '34px', lineHeight: '34px',
                      background: currentPage <= 1 ? '#f8fafc' : '#fff',
                      color: currentPage <= 1 ? '#94a3b8' : '#0f172a',
                      border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0 12px', fontSize: '13px', fontWeight: 800,
                      cursor: currentPage <= 1 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Previous
                  </button>

                  <div className="mpi-page-numbers" style={{ display: 'flex', gap: '4px' }}>
                    {(() => {
                      const items: (number | string)[] = [];
                      if (totalPages <= 7) {
                        for (let i = 1; i <= totalPages; i++) items.push(i);
                      } else {
                        if (currentPage <= 3) {
                          items.push(1, 2, 3, 4, '...', totalPages);
                        } else if (currentPage >= totalPages - 2) {
                          items.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
                        } else {
                          items.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
                        }
                      }
                      
                      return items.map((p, idx) => (
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

                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="mpi-filter-button"
                    style={{
                      display: 'inline-flex', alignItems: 'center', minHeight: '34px', lineHeight: '34px',
                      background: currentPage >= totalPages ? '#f8fafc' : '#fff',
                      color: currentPage >= totalPages ? '#94a3b8' : '#0f172a',
                      border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0 12px', fontSize: '13px', fontWeight: 800,
                      cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default LabListPage;

