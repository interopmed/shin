'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import api from '@/lib/api';

interface RequestedLabItem {
  id: number; // lab_order_id
  payment_id?: number;
  payment_invoice_id?: string;
  patient_id?: number | string;
  patient_name?: string;
  tests?: Array<{ name: string; lab_id: number; category_id?: number | string }>;
  test_date?: string;
  processing_status?: number;
  processing_status_label?: string;
}

const RequestedInvestigationsPage = () => {
  const { user } = useAuth();
  const { canAdd, canEdit, canDelete, isDoctor } = usePermissions();
  const router = useRouter();
  const [rows, setRows] = useState<RequestedLabItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchValue, setSearchValue] = useState('');
  const pageSize = 25;

  const searchParams = useMemo(() => {
    const trimmed = searchValue.trim();
    return trimmed ? { search: trimmed } : {};
  }, [searchValue]);

  const formatBillingNumber = (orderId?: number | string) => {
    if (orderId === undefined || orderId === null) return '-';
    return `LCDB.${String(orderId).padStart(8, '0')}`;
  };

  const formatDateTime = (value?: string) => {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString();
  };

  const getTestNames = (item: RequestedLabItem) => {
    const items = Array.isArray(item.tests) ? item.tests : [];
    return items.map((test) => test.name).filter(Boolean);
  };

  const getPrimaryLabId = (item: RequestedLabItem) => {
    const items = Array.isArray(item.tests) ? item.tests : [];
    return items[0]?.lab_id;
  };

  const getPrimaryCategoryId = (item: RequestedLabItem) => {
    const items = Array.isArray(item.tests) ? item.tests : [];
    return items[0]?.category_id;
  };

  const formatProcessingStatus = (item: RequestedLabItem) => {
    const status = item.processing_status ?? 0;
    const label = item.processing_status_label || 'Not processing';
    const badgeClass = status === 2 ? 'success' : status === 1 ? 'warning' : status === 3 ? 'danger' : 'secondary';
    return <span className={`badge badge-${badgeClass}`}>{label}</span>;
  };

  useEffect(() => {
    const fetchRequested = async () => {
      if (!user?.token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const data = await api.getLabTests(user.token, {
          page: String(currentPage),
          exclude_completed: '1',
          ...searchParams,
        }) as any;

        if (Array.isArray(data)) {
          setRows(data);
          setTotalCount(data.length);
        } else {
          setRows(data?.results || []);
          setTotalCount(data?.count || 0);
        }
      } catch (error) {
        console.error('Failed to fetch requested investigations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRequested();
  }, [user, currentPage, searchParams]);

  const handleDelete = async (labId?: number) => {
    if (!user?.token || !labId) return;
    if (!confirm('Are you sure you want to delete this requested investigation?')) return;

    try {
      await api.deleteLabTest(user.token, String(labId));
      setRows((prev) => prev.filter((item) => getPrimaryLabId(item) !== labId));
      setTotalCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to delete requested investigation:', error);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const canAddLab = canAdd('lab');
  const canEditLab = canEdit('lab') && !isDoctor;
  const canDeleteLab = canDelete('lab') && !isDoctor;

  return (
    <section className="content">
      <div className="container-fluid">
        <div className="card">
          <div className="card-header no-print">
            <div className="d-flex justify-content-between align-items-center flex-wrap">
              <div className="input-group input-group-sm" style={{ maxWidth: 360 }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Patient, Doctor, Billing Number"
                  value={searchValue}
                  onChange={(event) => {
                    setSearchValue(event.target.value);
                    setCurrentPage(1);
                  }}
                />
                <div className="input-group-append">
                  <button className="btn btn-default" type="button">
                    <i className="fa fa-search"></i>
                  </button>
                </div>
              </div>

              {canAddLab && (
                <Link href="/modules/billing/finance/payment/add?section=lab" className="btn btn-success btn-xs">
                  <i className="fa fa-plus-circle"></i>
                </Link>
              )}
            </div>
          </div>

          <div className="card-body">
            {loading ? (
              <div className="text-center">
                <div className="spinner-border" role="status">
                  <span className="sr-only">Loading...</span>
                </div>
              </div>
            ) : (
              <>
                <div className="data-table active">
                  <table className="table table-stripe table-hover table-bordered">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Date</th>
                        <th>Details</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center">No requested investigations found</td>
                        </tr>
                      ) : (
                        rows.map((item) => {
                          const testItems = Array.isArray(item.tests) ? item.tests : [];
                          const visibleTests = testItems.slice(0, 5);
                          const labId = getPrimaryLabId(item);
                          const categoryId = getPrimaryCategoryId(item);
                          const targetPaymentId = item.payment_id || item.id;
                          const enterReportHref = categoryId
                            ? `/modules/billing/finance/payment/add?section=lab&id=${targetPaymentId}`
                            : `\/modules/lab/order/${item.id}`;

                          return (
                            <tr
                              key={item.id}
                              role="button"
                              onClick={() => router.push(enterReportHref)}
                            >
                              <td>
                                <div className="font-weight-bold">
                                  {item.id}
                                </div>
                              </td>
                              <td>
                                {formatDateTime(item.test_date)}
                              </td>
                              <td>
                                <div className="font-weight-bold">
                                  {item.patient_name || 'Unknown Patient'}
                                </div>
                                {item.patient_id ? (
                                  <div className="text-xs text-muted">Patient ID: {item.patient_id}</div>
                                ) : null}
                                <div className="mt-1 text-sm">
                                  {visibleTests.length ? (
                                    visibleTests.map((test, index) => (
                                      <span key={`${item.id}-${test.lab_id}-${test.name}`}>
                                        {test.category_id ? (
                                          <Link href={`\/modules/lab/enter/${item.id}/${test.category_id}`}>
                                            {test.name}
                                          </Link>
                                        ) : (
                                          test.name
                                        )}
                                        {index < visibleTests.length - 1 ? ', ' : ''}
                                      </span>
                                    ))
                                  ) : (
                                    'No investigations'
                                  )}
                                </div>
                                <div className="mt-2">
                                  {formatProcessingStatus(item)}
                                </div>
                              </td>
                              <td className="no-print">
                                <Link
                                  href={`/modules/billing/finance/payment/add?section=lab&id=${item.id}`}
                                  className="btn btn-primary btn-sm mr-1"
                                  title="Edit"
                                >
                                  <i className="fa fa-edit"></i>
                                </Link>
                                {canDeleteLab && (
                                  <button
                                    type="button"
                                    className="btn btn-danger btn-sm mr-1"
                                    title="Delete"
                                    onClick={() => handleDelete(labId)}
                                    disabled={!labId}
                                  >
                                    <i className="fa fa-trash"></i>
                                  </button>
                                )}
                                <Link
                                  href={`/modules/billing/finance/payment/invoice/${item.id}`}
                                  className="btn btn-info btn-sm mr-1"
                                  title="View"
                                >
                                  <i className="fa fa-eye"></i>
                                </Link>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="d-flex justify-content-between align-items-center mt-3">
                  <div>
                    Page {currentPage} of {totalPages}
                  </div>
                  <div>
                    <button
                      className="btn btn-secondary btn-sm mr-2"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default RequestedInvestigationsPage;
