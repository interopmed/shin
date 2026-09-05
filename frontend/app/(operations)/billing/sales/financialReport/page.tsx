'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/helpers/currency';

interface MonthRow {
  key: string;
  label: string;
  dateFrom: string;
  dateTo: string;
  total_sales: number;
  total_amount: number;
  total_discount: number;
  total_commission: number;
}

const PAGE_SIZE = 12;

const SalesFinancialReportPage = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<MonthRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    const fetchSummary = async () => {
      if (!user?.token) return;
      setLoading(true);
      setError('');
      try {
        const data = await api.getSalesMonthlyReport(user.token, {
          page,
          page_size: PAGE_SIZE,
        });

        const results = Array.isArray(data?.results) ? data.results : [];
        const normalized: MonthRow[] = results.map((item: any) => ({
          key: item.label || `${item.year}-${item.month}`,
          label: item.label || `${item.year}-${String(item.month).padStart(2, '0')}`,
          dateFrom: item.date_from,
          dateTo: item.date_to,
          total_sales: Number(item.total_tests || 0), // Backend returns total_tests as key for now
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
              <h1 className="m-0">Sales Financial Report</h1>
              <p className="mb-0 text-sm text-muted">Monthly totals from backend summary</p>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><Link href="/">Home</Link></li>
                <li className="breadcrumb-item"><Link href="/sales">Sales</Link></li>
                <li className="breadcrumb-item active">Financial Report</li>
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
                        <th>Sales Count</th>
                        <th>Total Discount</th>
                        <th>Total Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center p-4 text-muted">No records found</td>
                        </tr>
                      ) : (
                        rows.map((row) => (
                          <tr 
                            key={row.key} 
                            style={{ cursor: 'pointer' }}
                            onClick={() => router.push(`/sales/financialReport/${row.key}`)}
                            title="Click to view details"
                          >
                            <td>{row.label}</td>
                            <td>
                              <small className="text-muted d-block">
                                {row.dateFrom} ~ {row.dateTo}
                              </small>
                            </td>
                            <td>{row.total_sales}</td>
                            <td>Rs. {formatCurrency(row.total_discount)}</td>
                            <td>Rs. {formatCurrency(row.total_amount)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {total > PAGE_SIZE && (
              <div className="card-footer clearfix">
                <div className="d-flex justify-content-end align-items-center">
                  <span className="mr-3 text-sm text-muted">
                    Page {safePage} of {totalPages} (Total: {total})
                  </span>
                  <div className="btn-group">
                    <button
                      className="btn btn-default btn-sm"
                      onClick={goPrev}
                      disabled={loading || page <= 1}
                    >
                      Previous
                    </button>
                    <button
                      className="btn btn-default btn-sm"
                      onClick={goNext}
                      disabled={loading || page >= totalPages}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
};

export default SalesFinancialReportPage;
