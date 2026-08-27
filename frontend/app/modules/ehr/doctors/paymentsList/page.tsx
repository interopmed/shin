'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/helpers/currency';

interface DoctorRow {
  id: number;
  name: string;
  phone?: string;
  due_amount?: number;
}

const DoctorPaymentsListPage = () => {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  const [search, setSearch] = useState(initialSearch);
  const [rows, setRows] = useState<DoctorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const pageSize = 10;

  const filters = useMemo(() => {
    const params: Record<string, string> = { page: String(currentPage) };
    const trimmed = search.trim();
    if (trimmed) params.search = trimmed;
    return params;
  }, [currentPage, search]);

  useEffect(() => {
    const fetchPayments = async () => {
      if (!user?.token) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const data = await api.getDoctors(user.token, filters);
        if (Array.isArray(data)) {
          setRows(data);
          setTotalCount(data.length);
          setHasNext(false);
          setHasPrev(false);
        } else {
          setRows(data?.results || []);
          setTotalCount(data?.count || 0);
          setHasNext(Boolean(data?.next));
          setHasPrev(Boolean(data?.previous));
        }
      } catch (err) {
        console.error('Failed to load doctor payments:', err);
        setError('Failed to load payments');
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [user, filters]);

  const formatDoctorId = (id: number) => `LCDD.${String(id).padStart(3, '0')}`;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <>
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Doctor Payments</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><Link href="/">Home</Link></li>
                <li className="breadcrumb-item">Doctor</li>
                <li className="breadcrumb-item active">Payments</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between flex-wrap">
              <h3 className="card-title mb-0">Doctor Payments</h3>
              <div className="d-flex align-items-center flex-wrap" style={{ gap: '0.5rem' }}>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  style={{ minWidth: 220 }}
                  placeholder="Search name / phone"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </div>
            <div className="card-body p-0">
              {loading ? (
                <div className="text-center p-4">
                  <div className="spinner-border" role="status">
                    <span className="sr-only">Loading...</span>
                  </div>
                </div>
              ) : error ? (
                <div className="alert alert-warning m-3" role="alert">{error}</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover table-striped mb-0">
                    <thead>
                      <tr>
                        <th style={{ width: 140 }}>Doctor ID</th>
                        <th>Name</th>
                        <th style={{ width: 140 }}>Due Balance</th>
                        <th style={{ width: 200 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center text-muted">No doctors found</td>
                        </tr>
                      ) : (
                        rows.map((row) => {
                          const due = row.due_amount !== undefined ? formatCurrency(row.due_amount) : '-';
                          return (
                            <tr key={row.id}>
                              <td className="font-weight-bold">{formatDoctorId(row.id)}</td>
                              <td>
                                <div className="font-weight-bold">{row.name || '-'}</div>
                                <div className="text-xs text-muted">{row.phone || ''}</div>
                              </td>
                              <td>Rs. {due}</td>
                              <td>
                                <div className="btn-group btn-group-sm" role="group">
                                  <Link
                                    href={`/finance/doctorLabSettlements?doctor=${row.id}`}
                                    className="btn btn-primary"
                                    title="Settlements"
                                  >
                                    <i className="fa fa-exchange-alt"></i>
                                  </Link>
                                  <Link
                                    href={`/doctor/profile/${row.id}`}
                                    className="btn btn-info"
                                    title="Info"
                                  >
                                    <i className="fa fa-info-circle"></i>
                                  </Link>
                                  <Link
                                    href={`/doctor/paymentListByMonths?doctor=${row.id}`}
                                    className="btn btn-secondary"
                                    title="By Month"
                                  >
                                    <i className="fa fa-list"></i>
                                  </Link>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="card-footer d-flex justify-content-between align-items-center">
              <div>
                Page {currentPage} of {totalPages}
              </div>
              <div>
                <button
                  className="btn btn-secondary btn-sm mr-2"
                  disabled={!hasPrev && currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={!hasNext && currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default DoctorPaymentsListPage;
