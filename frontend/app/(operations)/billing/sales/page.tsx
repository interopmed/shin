'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/helpers/currency';

interface Sale {
  id: number;
  sale_id?: string;
  patient_name?: string;
  sale_date?: string;
  subtotal?: number;
  discount?: number;
  tax?: number;
  total_amount?: number;
  paid_amount?: number;
  change_amount?: number;
  payment_method?: string;
  remarks?: string;
}

interface SaleSummary {
  total_amount?: number;
  total_paid?: number;
}

const SalesPage = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [sales, setSales] = useState<Sale[]>([]);
  const [summary, setSummary] = useState<SaleSummary>({});
  const [todayCount, setTodayCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    const loadData = async () => {
      if (!user?.token) {
        if (!authLoading) setLoading(false);
        return;
      }

      try {
        const [salesData, summaryData, todayData] = await Promise.all([
          api.getSales(user.token),
          api.getSalesSummary(user.token),
          api.getTodaySales(user.token),
        ]);

        const salesRows = Array.isArray(salesData) ? salesData : [];
        const todayRows = Array.isArray(todayData) ? todayData : [];

        setSales(salesRows);
        setSummary(summaryData || {});
        setTodayCount(todayRows.length);
      } catch (error: any) {
        console.error('Failed to load sales:', error);
        if (error.message?.includes('401') || error.message?.includes('token')) {
          router.push('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, authLoading, isAuthenticated, router]);

  const filteredSales = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sales;

    return sales.filter((sale) => {
      const saleCode = (sale.sale_id || '').toLowerCase();
      const patientName = (sale.patient_name || '').toLowerCase();
      const paymentMethod = (sale.payment_method || '').toLowerCase();
      return saleCode.includes(q) || patientName.includes(q) || paymentMethod.includes(q);
    });
  }, [sales, search]);

  const totalDue = useMemo(() => {
    const total = Number(summary.total_amount || 0);
    const paid = Number(summary.total_paid || 0);
    return total - paid;
  }, [summary]);

  return (
    <section className="mpi-page">
      <div className="mpi-card">
        <header className="mpi-header">
          <div>
            <h1>Sales & Transactions</h1>
            <p className="patient-db-status">Manage point of sale transactions, review daily revenue, and track patient payments.</p>
          </div>
          <Link href="/billing/sales/new_sale" className="mpi-primary-button">
            + New Sale
          </Link>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', padding: '0 24px 24px 24px', borderBottom: '1px solid #e3e9f1' }}>
          <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Sales</span>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', lineHeight: '1' }}>Rs. {formatCurrency(summary.total_amount as number)}</div>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500, marginTop: '4px' }}>Overall volume</span>
          </div>
          <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount Received</span>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#059669', lineHeight: '1' }}>Rs. {formatCurrency(summary.total_paid as number)}</div>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500, marginTop: '4px' }}>Total collected</span>
          </div>
          <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Outstanding Due</span>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#e11d48', lineHeight: '1' }}>Rs. {formatCurrency(totalDue)}</div>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500, marginTop: '4px' }}>Pending collection</span>
          </div>
          <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Today's Activity</span>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', lineHeight: '1' }}>{todayCount}</div>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500, marginTop: '4px' }}>Transactions today</span>
          </div>
        </div>

        <div className="mpi-toolbar">
          <form className="mpi-search-form" onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
            <label className="mpi-search" style={{ flex: '1', minWidth: '200px', maxWidth: '350px' }}>
              <span aria-hidden="true">O</span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search sale id / patient / method"
                autoComplete="off"
              />
            </label>
          </form>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>
        ) : (
          <div className="mpi-table-wrap">
            <table className="mpi-table">
              <thead>
                <tr>
                  <th><input aria-label="Select all" type="checkbox" /></th>
                  <th>Invoice ID</th>
                  <th>Date</th>
                  <th>Patient</th>
                  <th>Sub Total</th>
                  <th>Discount</th>
                  <th>Tax</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Method</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                      No sales found
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((sale) => (
                    <tr key={sale.id}>
                      <td><input type="checkbox" aria-label={`Select sale ${sale.sale_id || sale.id}`} /></td>
                      <td><strong>{sale.sale_id || `POS${sale.id}`}</strong></td>
                      <td><span style={{ color: '#475569' }}>{sale.sale_date ? new Date(sale.sale_date).toLocaleString() : '-'}</span></td>
                      <td><strong>{sale.patient_name || '-'}</strong></td>
                      <td><span style={{ color: '#475569' }}>Rs. {formatCurrency(sale.subtotal as number)}</span></td>
                      <td><span style={{ color: '#059669' }}>Rs. {formatCurrency(sale.discount as number)}</span></td>
                      <td><span style={{ color: '#475569' }}>Rs. {formatCurrency(sale.tax as number)}</span></td>
                      <td><strong>Rs. {formatCurrency(sale.total_amount as number)}</strong></td>
                      <td><strong style={{ color: '#059669' }}>Rs. {formatCurrency(sale.paid_amount as number)}</strong></td>
                      <td>
                        <span style={{
                          textTransform: 'capitalize',
                          backgroundColor: '#f1f5f9',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#334155'
                        }}>
                          {sale.payment_method || '-'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};

export default SalesPage;
