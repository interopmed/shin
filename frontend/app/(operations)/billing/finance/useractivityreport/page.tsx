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
  payment_method?: string;
  status?: string;
  payment_date?: string;
}

interface Expense {
  id: number;
  category_name?: string;
  description?: string;
  amount?: number;
  date?: string;
}

const toISODate = (value: Date) => value.toISOString().slice(0, 10);

const getDateRangeByPreset = (preset: string) => {
  const now = new Date();

  if (preset === 'today') {
    const today = toISODate(now);
    return { dateFrom: today, dateTo: today };
  }

  if (preset === 'yesterday') {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const day = toISODate(yesterday);
    return { dateFrom: day, dateTo: day };
  }

  return { dateFrom: '', dateTo: '' };
};

const UserActivityReportPage = () => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const [preset, setPreset] = useState<'today' | 'yesterday' | 'all' | 'custom'>('today');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    const { dateFrom: from, dateTo: to } = getDateRangeByPreset('today');
    setDateFrom(from);
    setDateTo(to);
  }, []);

  const queryParams = useMemo(() => {
    if (!user?.id) return null;

    const params: Record<string, string> = {
      user: String(user.id),
      ordering: '-payment_date',
      page_size: '200',
    };

    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;

    return params;
  }, [user, dateFrom, dateTo]);

  const expenseParams = useMemo(() => {
    if (!user?.id) return null;

    const params: Record<string, string> = {
      user: String(user.id),
      ordering: '-date',
      page_size: '200',
    };

    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;

    return params;
  }, [user, dateFrom, dateTo]);

  const fetchData = async () => {
    if (!user?.token || !queryParams || !expenseParams) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const [paymentsData, expensesData] = await Promise.all([
        api.getPaymentsPage(user.token, queryParams),
        api.getExpensesPage(user.token, expenseParams),
      ]);

      const paymentRows = Array.isArray(paymentsData) ? paymentsData : paymentsData?.results || [];
      const expenseRows = Array.isArray(expensesData) ? expensesData : expensesData?.results || [];

      setPayments(paymentRows as Payment[]);
      setExpenses(expenseRows as Expense[]);
    } catch (err) {
      console.error('Failed to load user activity report:', err);
      setError('Failed to load user activity report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, queryParams, expenseParams]);

  const applyPreset = (nextPreset: 'today' | 'yesterday' | 'all') => {
    setPreset(nextPreset);
    const range = getDateRangeByPreset(nextPreset);
    setDateFrom(range.dateFrom);
    setDateTo(range.dateTo);
  };

  const applyCustomRange = () => {
    setPreset('custom');
    fetchData();
  };

  const paymentTotal = payments.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const expenseTotal = expenses.reduce((sum, row) => sum + Number(row.amount || 0), 0);

  return (
    <>
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">User Activity Report</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><Link href="/">Home</Link></li>
                <li className="breadcrumb-item">Finance</li>
                <li className="breadcrumb-item active">User Activity</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          <div className="card mb-3">
            <div className="card-body d-flex flex-wrap align-items-end" style={{ gap: '0.75rem' }}>
              <button className={`btn btn-sm ${preset === 'today' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => applyPreset('today')}>
                Today
              </button>
              <button className={`btn btn-sm ${preset === 'yesterday' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => applyPreset('yesterday')}>
                Yesterday
              </button>
              <button className={`btn btn-sm ${preset === 'all' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => applyPreset('all')}>
                All
              </button>

              <div className="ml-md-3 d-flex flex-wrap align-items-end" style={{ gap: '0.5rem' }}>
                <div>
                  <label className="d-block mb-1">From</label>
                  <input type="date" className="form-control form-control-sm" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </div>
                <div>
                  <label className="d-block mb-1">To</label>
                  <input type="date" className="form-control form-control-sm" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
                <button className="btn btn-sm btn-info" onClick={applyCustomRange}>Apply</button>
              </div>
            </div>
          </div>

          <div className="row mb-3">
            <div className="col-md-4">
              <div className="small-box bg-primary">
                <div className="inner">
                  <h3>Rs. {formatCurrency(paymentTotal)}</h3>
                  <p>Total Payments</p>
                </div>
                <div className="icon"><i className="fas fa-money-bill-wave"></i></div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="small-box bg-warning">
                <div className="inner">
                  <h3>Rs. {formatCurrency(expenseTotal)}</h3>
                  <p>Total Expenses</p>
                </div>
                <div className="icon"><i className="fas fa-file-invoice-dollar"></i></div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="small-box bg-success">
                <div className="inner">
                  <h3>Rs. {formatCurrency(paymentTotal - expenseTotal)}</h3>
                  <p>Net Activity</p>
                </div>
                <div className="icon"><i className="fas fa-chart-line"></i></div>
              </div>
            </div>
          </div>

          {error && <div className="alert alert-warning">{error}</div>}

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Payment Activity</h3>
            </div>
            <div className="card-body p-0">
              {loading ? (
                <div className="text-center p-4"><div className="spinner-border" role="status"></div></div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-bordered table-striped mb-0">
                    <thead>
                      <tr>
                        <th>Invoice</th>
                        <th>Date</th>
                        <th>Patient</th>
                        <th>Doctor</th>
                        <th>Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.length === 0 ? (
                        <tr><td colSpan={6} className="text-center">No payment activity found</td></tr>
                      ) : (
                        payments.map((row) => (
                          <tr key={row.id}>
                            <td>{row.invoice_id || row.reference_number || '-'}</td>
                            <td>{row.payment_date ? new Date(row.payment_date).toLocaleString() : '-'}</td>
                            <td>{row.patient_name || '-'}</td>
                            <td>{row.doctor_name || '-'}</td>
                            <td>Rs. {formatCurrency(row.amount)}</td>
                            <td>{row.status || '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="card mt-3">
            <div className="card-header">
              <h3 className="card-title">Expense Activity</h3>
            </div>
            <div className="card-body p-0">
              {loading ? (
                <div className="text-center p-4"><div className="spinner-border" role="status"></div></div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-bordered table-striped mb-0">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Category</th>
                        <th>Description</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.length === 0 ? (
                        <tr><td colSpan={4} className="text-center">No expense activity found</td></tr>
                      ) : (
                        expenses.map((row) => (
                          <tr key={row.id}>
                            <td>{row.date ? new Date(row.date).toLocaleDateString() : '-'}</td>
                            <td>{row.category_name || '-'}</td>
                            <td>{row.description || '-'}</td>
                            <td>Rs. {formatCurrency(row.amount)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default UserActivityReportPage;
