'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/helpers/currency';

interface MonthRow {
  key: string;
  label: string;
  dateFrom: string;
  dateTo: string;
  total_tests: number;
  total_amount: number;
  total_discount: number;
  total_commission: number;
}

const PAGE_SIZE = 12;

const FinanceReportPage = () => {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<MonthRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSummary = async () => {
      if (!user?.token) return;
      setLoading(true);
      setError('');
      try {
        const data = await api.getPaymentMonthlySummary(user.token, {
          page,
          page_size: PAGE_SIZE,
          section: 'lab',
        });

        const results = Array.isArray(data?.results) ? data.results : [];
        const normalized: MonthRow[] = results.map((item: any) => ({
          key: item.label || `${item.year}-${item.month}`,
          label: item.label || `${item.year}-${String(item.month).padStart(2, '0')}`,
          dateFrom: item.date_from,
          dateTo: item.date_to,
          total_tests: Number(item.total_tests || 0),
          total_amount: Number(item.total_amount || 0),
          total_discount: Number(item.total_discount || 0),
          total_commission: Number(item.total_commission || 0),
        }));

        setRows(normalized);
        setTotal(Number(data?.count || normalized.length));
      } catch (err: any) {
        console.error('Failed to load finance summary', err);
        setError(err?.message || 'Failed to load finance summary');
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [user, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => Math.min(totalPages, p + 1));

  return (
    <>
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Finance Report</h1>
              <p className="mb-0 text-sm text-muted">Monthly totals from backend summary</p>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><Link href="/">Home</Link></li>
                <li className="breadcrumb-item"><Link href="/lab">Lab</Link></li>
                <li className="breadcrumb-item active">Finance Report</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          {!user?.token && (
            <div className="alert alert-warning" role="alert">
              Please log in to view financial reports.
            </div>
          )}

          <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between flex-wrap">
              <h3 className="card-title mb-0">Finance Report</h3>
              <span className="text-muted text-sm">Monthly totals from backend summary</span>
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
                        <th>Month</th>
                        <th>Date Range</th>
                        <th>Total Tests</th>
                        <th>Total Amount</th>
                        <th>Total Discount</th>
                        <th>Doctor Commission</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center text-muted">No data</td>
                        </tr>
                      ) : (
                        rows.map((m) => (
                          <tr key={m.key}>
                            <td>{m.label}</td>
                            <td>{m.dateFrom} → {m.dateTo}</td>
                            <td>{m.total_tests}</td>
                            <td>Rs. {formatCurrency(m.total_amount)}</td>
                            <td>Rs. {formatCurrency(m.total_discount)}</td>
                            <td>Rs. {formatCurrency(m.total_commission)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="card-footer d-flex align-items-center justify-content-between flex-wrap" style={{ gap: '0.75rem' }}>
              <div className="text-muted text-sm">Page {safePage} of {totalPages} (showing {PAGE_SIZE} per page)</div>
              <div className="d-flex" style={{ gap: '0.5rem' }}>
                <button className="btn btn-secondary btn-sm" onClick={goPrev} disabled={safePage <= 1}>Previous</button>
                <button className="btn btn-secondary btn-sm" onClick={goNext} disabled={safePage >= totalPages}>Next</button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default FinanceReportPage;
