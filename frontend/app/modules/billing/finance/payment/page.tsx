'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/helpers/currency';

interface Payment {
  id: number;
  invoice_id?: string;
  reference_number?: string;
  patient_name?: string;
  doctor_name?: string | null;
  amount?: number;
  paid_amount?: number;
  balance?: number;
  payment_method?: string;
  status?: string;
  payment_date?: string;
}

interface PaymentStats {
  total_amount?: number;
  total_count?: number;
  average_amount?: number;
}

const PaymentListPage = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [stats, setStats] = useState<PaymentStats>({});
  const pageSize = 25;

  const queryParams = useMemo(() => {
    const params: Record<string, string> = {
      page: String(currentPage),
      page_size: String(pageSize),
      ordering: '-payment_date',
    };
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
        const data = await (api as any).getPaymentsPage(user.token, queryParams);
        if (Array.isArray(data)) {
          const start = (currentPage - 1) * pageSize;
          const pageSlice = data.slice(start, start + pageSize);
          setPayments(pageSlice);
          setTotalCount(data.length);
          setHasNext(start + pageSize < data.length);
          setHasPrev(start > 0);
        } else {
          const rows = data?.results || [];
          setPayments(rows);
          setTotalCount(data?.count || rows.length || 0);
          setHasNext(Boolean(data?.next));
          setHasPrev(Boolean(data?.previous));
        }
      } catch (err) {
        console.error('Failed to fetch payments:', err);
        setError('Failed to load payments');
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [user, queryParams]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.token) return;
      try {
        const data = await (api as any).getPaymentStatistics(user.token, queryParams);
        setStats(data || {});
      } catch (err) {
        console.error('Failed to fetch payment stats:', err);
      }
    };

    fetchStats();
  }, [user, queryParams]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <>
      {/* Content Header */}
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Payments</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><Link href="/">Home</Link></li>
                <li className="breadcrumb-item">Finance</li>
                <li className="breadcrumb-item active">Payments</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <section className="content">
        <div className="container-fluid">
          <div className="row mb-3">
            <div className="col-md-4">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title mb-0">Financial Summary</h3>
                  <div className="text-muted text-sm">Server totals (may not reflect filters)</div>
                </div>
                <div className="card-body">
                  <div className="d-flex justify-content-between mb-2"><span>Total Amount</span><strong>Rs. {formatCurrency(stats.total_amount as number)}</strong></div>
                  <div className="d-flex justify-content-between mb-2"><span>Payments</span><strong>{stats.total_count ?? '-'}</strong></div>
                  <div className="d-flex justify-content-between"><span>Average</span><strong>Rs. {formatCurrency(stats.average_amount as number)}</strong></div>
                </div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between flex-wrap">
              <h3 className="card-title mb-0">Payment List</h3>
              <div className="d-flex align-items-center" style={{ gap: '0.5rem' }}>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Search invoice/patient"
                  style={{ minWidth: 240 }}
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                />
                <Link href="/finance/payment/add" className="btn btn-primary btn-sm">
                  <i className="fa fa-plus"></i> Add Payment
                </Link>
                <Link href="/finance/paymentCategories" className="btn btn-info btn-sm">
                  <i className="fa fa-list"></i> Payment Categories
                </Link>
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
                  <table id="paymentsTable" className="table table-bordered table-striped mb-0">
                    <thead>
                      <tr>
                        <th>Invoice</th>
                        <th>Patient</th>
                        <th>Doctor</th>
                        <th>Amount</th>
                        <th>Paid</th>
                        <th>Balance</th>
                        <th>Method</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="text-center">No payments found</td>
                        </tr>
                      ) : (
                        payments.map((payment) => {
                          const invoice = payment.invoice_id || payment.reference_number || '-';
                          return (
                            <tr key={payment.id}>
                              <td className="font-weight-bold">{invoice}</td>
                              <td>{payment.patient_name || '-'}</td>
                              <td>{payment.doctor_name || '-'}</td>
                              <td>Rs. {formatCurrency(payment.amount)}</td>
                              <td>Rs. {formatCurrency(payment.paid_amount)}</td>
                              <td>Rs. {formatCurrency(payment.balance)}</td>
                              <td>{payment.payment_method || '-'}</td>
                              <td>
                                <span className={`badge badge-${payment.status === 'paid' ? 'success' : 'warning'}`}>
                                  {payment.status || 'pending'}
                                </span>
                              </td>
                              <td>{payment.payment_date ? new Date(payment.payment_date).toLocaleString() : '-'}</td>
                              <td>
                                <Link href={`/finance/payment/invoice/${payment.id}`} className="btn btn-info btn-sm" title="View Invoice">
                                  <i className="fa fa-file-invoice"></i>
                                </Link>
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

export default PaymentListPage;
