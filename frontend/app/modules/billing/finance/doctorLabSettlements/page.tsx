'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
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
  discount?: number;
  section?: string;
  payment_method?: string;
  status?: string;
  payment_date?: string;
}

interface Settlement {
  id: number;
  amount: number;
  commission?: number;
  date: string;
  reference_number?: string;
  remarks?: string;
}

interface Doctor {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  due_amount?: number;
}

interface SettlementStats {
  total_amount?: number;
  total_paid?: number;
  total_balance?: number;
  payment_count?: number;
  total_settled?: number;
  total_commission?: number;
  settlement_count?: number;
  due?: number;
}

const today = new Date();
const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
const todayStr = today.toISOString().slice(0, 10);

const DoctorLabSettlementsPage = () => {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const doctorId = searchParams.get('doctor');

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [paymentPage, setPaymentPage] = useState(1);
  const [paymentTotal, setPaymentTotal] = useState(0);
  const [paymentHasNext, setPaymentHasNext] = useState(false);
  const [paymentHasPrev, setPaymentHasPrev] = useState(false);
  const [settlementPage, setSettlementPage] = useState(1);
  const [settlementTotal, setSettlementTotal] = useState(0);
  const [settlementHasNext, setSettlementHasNext] = useState(false);
  const [settlementHasPrev, setSettlementHasPrev] = useState(false);
  const [activeTab, setActiveTab] = useState<'payments' | 'settlements'>('payments');
  const [stats, setStats] = useState<SettlementStats>({});
  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(todayStr);
  const [form, setForm] = useState({
    amount: '',
    commission: '',
    date: todayStr,
    reference_number: '',
    remarks: '',
  });
  const [initializedRange, setInitializedRange] = useState(false);

  const parseDate = (value?: string) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const isWithinRange = (value?: string) => {
    const parsed = parseDate(value);
    if (!parsed) return false;

    if (dateFrom) {
      const start = parseDate(dateFrom);
      if (start && parsed < start) return false;
    }

    if (dateTo) {
      const end = parseDate(`${dateTo}T23:59:59`);
      if (end && parsed > end) return false;
    }

    return true;
  };

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const section = (p.section || '').toLowerCase();
      const isLab = !section || section === 'lab';
      return isLab && isWithinRange(p.payment_date);
    });
  }, [payments, dateFrom, dateTo]);

  const filteredSettlements = useMemo(() => settlements.filter((s) => isWithinRange(s.date)), [settlements, dateFrom, dateTo]);

  const totalAmount = filteredPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const totalPaid = filteredPayments.reduce((sum, p) => sum + Number(p.paid_amount || 0), 0);
  const totalBalance = filteredPayments.reduce((sum, p) => sum + Number(p.balance || 0), 0);
  const totalSettlement = filteredSettlements.reduce((sum, s) => sum + Number(s.amount || 0), 0);
  const totalCommission = filteredSettlements.reduce((sum, s) => sum + Number(s.commission || 0), 0);
  const computedDue = totalAmount - totalSettlement;

  const serverDue = (stats.total_amount || 0) - (stats.total_settled || 0);

  const paymentsPageSize = 25;
  const settlementsPageSize = 25;

  const fetchPaymentsPage = async (page: number) => {
    if (!user?.token || !doctorId) {
      return { rows: [], total: 0, hasNext: false, hasPrev: false };
    }

    const params: Record<string, string> = {
      doctor: doctorId,
      page: String(page),
      page_size: String(paymentsPageSize),
      ordering: '-payment_date',
    };

    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;

    const data = await api.getPaymentsPage(user.token, params);

    if (Array.isArray(data)) {
      const start = (page - 1) * paymentsPageSize;
      const pageSlice = data.slice(start, start + paymentsPageSize);
      return {
        rows: pageSlice,
        total: data.length,
        hasNext: start + paymentsPageSize < data.length,
        hasPrev: start > 0,
      };
    }

    const rows = data?.results || [];
    const total = data?.count || rows.length || 0;
    return {
      rows,
      total,
      hasNext: Boolean(data?.next),
      hasPrev: Boolean(data?.previous),
    };
  };

  const fetchSettlementsPage = async (page: number) => {
    if (!user?.token || !doctorId) {
      return { rows: [], total: 0, hasNext: false, hasPrev: false };
    }

    const params: Record<string, string> = {
      doctor: doctorId,
      page: String(page),
      page_size: String(settlementsPageSize),
      ordering: '-date',
    };

    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;

    const data = await api.getDoctorSettlements(user.token, params);

    if (Array.isArray(data)) {
      const start = (page - 1) * settlementsPageSize;
      const pageSlice = data.slice(start, start + settlementsPageSize);
      return {
        rows: pageSlice,
        total: data.length,
        hasNext: start + settlementsPageSize < data.length,
        hasPrev: start > 0,
      };
    }

    const rows = data?.results || [];
    const total = data?.count || rows.length || 0;
    return {
      rows,
      total,
      hasNext: Boolean(data?.next),
      hasPrev: Boolean(data?.previous),
    };
  };

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!user?.token) {
        setLoading(false);
        return;
      }

      if (!doctorId) {
        setError('Doctor parameter is required.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const [doctorData, paymentResp, settlementResp] = await Promise.all([
          api.getDoctor(user.token, doctorId),
          fetchPaymentsPage(paymentPage),
          fetchSettlementsPage(settlementPage),
        ]);

        if (!active) return;

        setDoctor(doctorData as Doctor);
        setPayments(paymentResp.rows);
        setPaymentTotal(paymentResp.total);
        setPaymentHasNext(paymentResp.hasNext);
        setPaymentHasPrev(paymentResp.hasPrev);
        setSettlements(settlementResp.rows);
        setSettlementTotal(settlementResp.total);
        setSettlementHasNext(settlementResp.hasNext);
        setSettlementHasPrev(settlementResp.hasPrev);

        if (!initializedRange) {
          const earliestPayment = paymentResp.rows
            .map((p) => p.payment_date)
            .filter(Boolean)
            .map((d) => new Date(d as string))
            .filter((d) => !Number.isNaN(d.getTime()))
            .sort((a, b) => a.getTime() - b.getTime())[0];

          const earliestSettlement = settlementResp.rows
            .map((s) => s.date)
            .filter(Boolean)
            .map((d) => new Date(d as string))
            .filter((d) => !Number.isNaN(d.getTime()))
            .sort((a, b) => a.getTime() - b.getTime())[0];

          const earliest = [earliestPayment, earliestSettlement]
            .filter(Boolean)
            .sort((a, b) => a.getTime() - b.getTime())[0] as Date | undefined;

          if (earliest) {
            const isoDate = earliest.toISOString().slice(0, 10);
            setDateFrom(isoDate);
          }

          setInitializedRange(true);
        }
      } catch (err: any) {
        if (!active) return;
        console.error('Failed to load doctor settlements', err);
        setError(err?.message || 'Failed to load doctor settlements');
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [user, doctorId, paymentPage, settlementPage, dateFrom, dateTo]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.token || !doctorId) return;
      try {
        const data = await api.getDoctorSettlementStats(user.token, {
          doctor: doctorId,
          date_from: dateFrom,
          date_to: dateTo,
        });
        setStats(data || {});
      } catch (err) {
        console.error('Failed to fetch doctor settlement stats', err);
      }
    };

    fetchStats();
  }, [user, doctorId, dateFrom, dateTo]);

  useEffect(() => {
    if (!initializedRange) return;
    setPaymentPage(1);
    setSettlementPage(1);
  }, [dateFrom, dateTo, initializedRange]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.token || !doctorId) return;

    const amount = Number(form.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a valid settling amount.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await api.createDoctorSettlement(user.token, {
        doctor: doctorId,
        amount,
        commission: Number(form.commission || 0),
        date: form.date || todayStr,
        reference_number: form.reference_number || undefined,
        remarks: form.remarks || undefined,
      });

      setForm({ ...form, amount: '', commission: '', reference_number: '', remarks: '' });
      const [paymentResp, settlementResp] = await Promise.all([
        fetchPaymentsPage(paymentPage),
        fetchSettlementsPage(settlementPage),
      ]);
      setPayments(paymentResp.rows);
      setPaymentTotal(paymentResp.total);
      setPaymentHasNext(paymentResp.hasNext);
      setPaymentHasPrev(paymentResp.hasPrev);
      setSettlements(settlementResp.rows);
      setSettlementTotal(settlementResp.total);
      setSettlementHasNext(settlementResp.hasNext);
      setSettlementHasPrev(settlementResp.hasPrev);
    } catch (err: any) {
      console.error('Failed to save settlement', err);
      setError(err?.message || 'Failed to save settlement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Doctor Lab Settlements</h1>
              {doctor && (
                <p className="mb-0 text-sm text-muted">{doctor.name} (ID: {doctor.id})</p>
              )}
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><Link href="/">Home</Link></li>
                <li className="breadcrumb-item">Finance</li>
                <li className="breadcrumb-item active">Doctor Lab Settlements</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          {error && (
            <div className="alert alert-warning" role="alert">{error}</div>
          )}

          <div className="row">
            <div className="col-md-8">
              <div className="card">
                <div className="card-header d-flex flex-wrap align-items-center justify-content-between" style={{ gap: '0.75rem' }}>
                  <div className="d-flex align-items-center" style={{ gap: '0.5rem' }}>
                    <ul className="nav nav-pills">
                      <li className="nav-item">
                        <button
                          type="button"
                          className={`nav-link ${activeTab === 'payments' ? 'active' : ''}`}
                          onClick={() => setActiveTab('payments')}
                        >
                          Payment History
                        </button>
                      </li>
                      <li className="nav-item">
                        <button
                          type="button"
                          className={`nav-link ${activeTab === 'settlements' ? 'active' : ''}`}
                          onClick={() => setActiveTab('settlements')}
                        >
                          Settlements
                        </button>
                      </li>
                    </ul>
                  </div>
                  <form className="d-flex align-items-center bg-light rounded px-2 py-1 ml-auto" style={{ gap: '0.5rem' }}>
                    <label className="mb-0 text-muted text-xs">From</label>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                    />
                    <label className="mb-0 text-muted text-xs">To</label>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                    />
                  </form>
                </div>

                <div className="card-body p-0">
                  {loading ? (
                    <div className="text-center p-4">
                      <div className="spinner-border" role="status">
                        <span className="sr-only">Loading...</span>
                      </div>
                    </div>
                  ) : activeTab === 'payments' ? (
                    <div className="table-responsive">
                      <table className="table table-striped table-hover mb-0">
                        <thead>
                          <tr>
                            <th>Invoice</th>
                            <th>Patient</th>
                            <th>Amount</th>
                            <th>Paid</th>
                            <th>Balance</th>
                            <th>Method</th>
                            <th>Status</th>
                            <th>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPayments.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="text-center text-muted">No payments in range</td>
                            </tr>
                          ) : (
                            filteredPayments.map((payment) => (
                              <tr key={payment.id}>
                                <td className="font-weight-bold">{payment.invoice_id || payment.reference_number || '-'}</td>
                                <td>{payment.patient_name || '-'}</td>
                                <td>Rs. {formatCurrency(payment.amount)}</td>
                                <td>Rs. {formatCurrency(payment.paid_amount)}</td>
                                <td>Rs. {formatCurrency(payment.balance)}</td>
                                <td className="text-capitalize">{payment.payment_method || '-'}</td>
                                <td>
                                  <span className={`badge badge-${payment.status === 'paid' ? 'success' : 'warning'}`}>
                                    {payment.status || 'pending'}
                                  </span>
                                </td>
                                <td>{payment.payment_date ? new Date(payment.payment_date).toLocaleString() : '-'}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover mb-0">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Amount</th>
                            <th>Commission</th>
                            <th>Reference</th>
                            <th>Remarks</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredSettlements.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="text-center text-muted">No settlements</td>
                            </tr>
                          ) : (
                            filteredSettlements.map((s) => (
                              <tr key={s.id}>
                                <td>{s.date ? new Date(s.date).toLocaleDateString() : '-'}</td>
                                <td>Rs. {formatCurrency(s.amount)}</td>
                                <td>Rs. {formatCurrency(s.commission)}</td>
                                <td>{s.reference_number || '-'}</td>
                                <td>{s.remarks || '-'}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="card-footer d-flex flex-wrap align-items-center" style={{ gap: '0.5rem' }}>
                  {activeTab === 'payments' ? (
                    <div className="d-flex align-items-center" style={{ gap: '0.5rem' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        disabled={!paymentHasPrev || paymentPage <= 1}
                        onClick={() => setPaymentPage((p) => Math.max(1, p - 1))}
                      >
                        Previous
                      </button>
                      <span className="text-muted text-sm">Page {paymentPage}</span>
                      <button
                        className="btn btn-secondary btn-sm"
                        disabled={!paymentHasNext}
                        onClick={() => setPaymentPage((p) => p + 1)}
                      >
                        Next
                      </button>
                    </div>
                  ) : (
                    <div className="d-flex align-items-center" style={{ gap: '0.5rem' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        disabled={!settlementHasPrev || settlementPage <= 1}
                        onClick={() => setSettlementPage((p) => Math.max(1, p - 1))}
                      >
                        Previous
                      </button>
                      <span className="text-muted text-sm">Page {settlementPage}</span>
                      <button
                        className="btn btn-secondary btn-sm"
                        disabled={!settlementHasNext}
                        onClick={() => setSettlementPage((p) => p + 1)}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="col-md-4">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title mb-0">Financial Summary</h3>
                </div>
                <div className="card-body">
                  <div className="d-flex justify-content-between mb-2"><span>Total Bill</span><strong>Rs. {formatCurrency(stats.total_amount)}</strong></div>
                  <div className="d-flex justify-content-between mb-2"><span>Paid</span><strong>Rs. {formatCurrency(stats.total_paid)}</strong></div>
                  <div className="d-flex justify-content-between mb-2"><span>Balance</span><strong>Rs. {formatCurrency(stats.total_balance)}</strong></div>
                  <div className="d-flex justify-content-between mb-2"><span>Settled</span><strong>Rs. {formatCurrency(stats.total_settled)}</strong></div>
                  <div className="d-flex justify-content-between mb-2"><span>Commission</span><strong>Rs. {formatCurrency(stats.total_commission)}</strong></div>
                  <div className="d-flex justify-content-between"><span>Due</span><strong>Rs. {formatCurrency(serverDue)}</strong></div>
                </div>
              </div>


              <div className="card">
                <div className="card-header">
                  <h3 className="card-title mb-0">Settle Doctor</h3>
                </div>
                <div className="card-body">
                  <form onSubmit={handleSubmit}>
                    <div className="form-group">
                      <label>Settling Amount</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control"
                        value={form.amount}
                        onChange={(e) => setForm({ ...form, amount: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Commission</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control"
                        value={form.commission}
                        onChange={(e) => setForm({ ...form, commission: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={form.date}
                        onChange={(e) => setForm({ ...form, date: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Reference #</label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.reference_number}
                        onChange={(e) => setForm({ ...form, reference_number: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Remarks</label>
                      <textarea
                        className="form-control"
                        rows={2}
                        value={form.remarks}
                        onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                      />
                    </div>
                    <button type="submit" className="btn btn-success" disabled={saving}>
                      {saving ? 'Saving...' : 'Settle'}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default DoctorLabSettlementsPage;
