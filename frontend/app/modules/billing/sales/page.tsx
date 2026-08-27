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
    <>
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Sales</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><Link href="/">Home</Link></li>
                <li className="breadcrumb-item active">Sales</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          <div className="row mb-3">
            <div className="col-md-4">
              <div className="card">
                <div className="card-body">
                  <div className="text-muted">Total Sales</div>
                  <h4 className="mb-0">Rs. {formatCurrency(summary.total_amount as number)}</h4>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card">
                <div className="card-body">
                  <div className="text-muted">Amount Received</div>
                  <h4 className="mb-0">Rs. {formatCurrency(summary.total_paid as number)}</h4>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card">
                <div className="card-body">
                  <div className="text-muted">Due / Today Count</div>
                  <h4 className="mb-0">Rs. {formatCurrency(totalDue)} <small className="text-muted">| {todayCount} today</small></h4>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between flex-wrap">
              <h3 className="card-title mb-0">Sales List</h3>
              <Link href="/sales/new_sale" className="btn btn-primary btn-sm ml-auto">
                <i className="fa fa-plus" /> New Sale
              </Link>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Search sale id / patient / method"
                style={{ maxWidth: 320 }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="card-body p-0">
              {loading ? (
                <div className="text-center p-4">
                  <div className="spinner-border" role="status">
                    <span className="sr-only">Loading...</span>
                  </div>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-bordered table-striped mb-0">
                    <thead>
                      <tr>
                        <th>Invoice ID</th>
                        <th>Date</th>
                        <th>Patient</th>
                        <th>Sub Total</th>
                        <th>Discount</th>
                        <th>Tax</th>
                        <th>Total</th>
                        <th>Paid</th>
                        <th>Method</th>
                        <th>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSales.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="text-center">No sales found</td>
                        </tr>
                      ) : (
                        filteredSales.map((sale) => (
                          <tr key={sale.id}>
                            <td className="font-weight-bold">{sale.sale_id || `POS${sale.id}`}</td>
                            <td>{sale.sale_date ? new Date(sale.sale_date).toLocaleString() : '-'}</td>
                            <td>{sale.patient_name || '-'}</td>
                            <td>Rs. {formatCurrency(sale.subtotal as number)}</td>
                            <td>Rs. {formatCurrency(sale.discount as number)}</td>
                            <td>Rs. {formatCurrency(sale.tax as number)}</td>
                            <td>Rs. {formatCurrency(sale.total_amount as number)}</td>
                            <td>Rs. {formatCurrency(sale.paid_amount as number)}</td>
                            <td className="text-capitalize">{sale.payment_method || '-'}</td>
                            <td>{sale.remarks || '-'}</td>
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

export default SalesPage;
