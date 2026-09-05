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
    <section className="mpi-page">
      <div className="mpi-card" style={{ marginBottom: '24px' }}>
        <header className="mpi-header">
          <div>
            <h1>Financial Summary</h1>
            <p className="patient-db-status">Server totals (may not reflect filters)</p>
          </div>
        </header>
        <div style={{ padding: '24px', display: 'flex', gap: '32px', borderBottom: '1px solid #e3e9f1' }}>
          <div>
            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>Total Amount</div>
            <div style={{ fontSize: '20px', fontWeight: 600, color: '#0f172a' }}>Rs. {formatCurrency(stats.total_amount || 0)}</div>
          </div>
          <div>
            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>Payments</div>
            <div style={{ fontSize: '20px', fontWeight: 600, color: '#0f172a' }}>{stats.total_count ?? '-'}</div>
          </div>
          <div>
            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>Average</div>
            <div style={{ fontSize: '20px', fontWeight: 600, color: '#0f172a' }}>Rs. {formatCurrency(stats.average_amount || 0)}</div>
          </div>
        </div>
      </div>

      <div className="mpi-card">
        <header className="mpi-header">
          <div>
            <h1>Payment List</h1>
            <p className="patient-db-status">Manage payments, balances, and invoices.</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Search invoice/patient..."
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none'
              }}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
            <Link href="/billing/finance/payment/add" className="mpi-primary-button">
              + Add Payment
            </Link>
          </div>
        </header>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>
        ) : error ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#be123c' }}>{error}</div>
        ) : (
          <div className="mpi-table-wrap">
            <table className="mpi-table">
              <thead>
                <tr>
                  <th><input aria-label="Select all" type="checkbox" /></th>
                  <th>Invoice & Patient</th>
                  <th>Amounts</th>
                  <th>Payment Info</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                      No payments found.
                    </td>
                  </tr>
                ) : (
                  payments.map((payment) => {
                    const invoice = payment.invoice_id || payment.reference_number || '-';
                    return (
                      <tr key={payment.id}>
                        <td><input type="checkbox" aria-label={`Select ${invoice}`} /></td>
                        <td>
                          <strong>{invoice}</strong>
                          <span>{payment.patient_name || '-'} {payment.doctor_name ? `(Dr. ${payment.doctor_name})` : ''}</span>
                        </td>
                        <td>
                          <strong>Total: Rs. {formatCurrency(payment.amount)}</strong>
                          <span style={{ color: '#059669', display: 'block', fontSize: '13px' }}>Paid: Rs. {formatCurrency(payment.paid_amount)}</span>
                          <span style={{ color: '#be123c', display: 'block', fontSize: '13px' }}>Bal: Rs. {formatCurrency(payment.balance)}</span>
                        </td>
                        <td>
                          <strong>{payment.payment_method || '-'}</strong>
                          <div className="mpi-confidence">
                            <strong style={{ color: payment.status === 'paid' ? '#059669' : '#d97706' }}>
                              {payment.status || 'pending'}
                            </strong>
                          </div>
                        </td>
                        <td>
                          {payment.payment_date ? new Date(payment.payment_date).toLocaleString() : '-'}
                        </td>
                        <td>
                          <Link href={`/billing/finance/payment/invoice/${payment.id}`} style={{ color: '#2563eb', fontWeight: 600, fontSize: '13px', textDecoration: 'none' }} title="View Invoice">
                            View Invoice
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
        
        {!loading && payments.length > 0 && (
          <div className="mpi-pagination-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: '14px 24px', borderTop: '1px solid #e3e9f1' }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#667085', fontWeight: 600 }}>
              Showing <strong>{(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, totalCount)}</strong> of <strong>{totalCount}</strong> payments
            </p>

            <div className="mpi-pagination-controls" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <button
                type="button"
                disabled={!hasPrev && currentPage <= 1}
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                className="mpi-filter-button"
                style={{
                  display: 'inline-flex', alignItems: 'center', minHeight: '34px', lineHeight: '34px',
                  background: !hasPrev && currentPage <= 1 ? '#f8fafc' : '#fff',
                  color: !hasPrev && currentPage <= 1 ? '#94a3b8' : '#0f172a',
                  border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0 12px', fontSize: '13px', fontWeight: 800,
                  cursor: !hasPrev && currentPage <= 1 ? 'not-allowed' : 'pointer'
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
                disabled={!hasNext}
                onClick={() => setCurrentPage((prev) => prev + 1)}
                className="mpi-filter-button"
                style={{
                  display: 'inline-flex', alignItems: 'center', minHeight: '34px', lineHeight: '34px',
                  background: !hasNext ? '#f8fafc' : '#fff',
                  color: !hasNext ? '#94a3b8' : '#0f172a',
                  border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0 12px', fontSize: '13px', fontWeight: 800,
                  cursor: !hasNext ? 'not-allowed' : 'pointer'
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default PaymentListPage;
