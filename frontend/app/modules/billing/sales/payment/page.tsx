'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/helpers/currency';

interface SalePaymentRow {
  id: number;
  sale_id?: string;
  sale_date?: string;
  patient_name?: string;
  subtotal?: number;
  discount?: number;
  total_amount?: number;
  paid_amount?: number;
  payment_method?: string;
}

const SalesPaymentPage = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<SalePaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [search]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    const loadRows = async () => {
      if (!user?.token) {
        if (!authLoading) setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const params = debouncedSearch ? { search: debouncedSearch } : {};
        const data = await api.getSales(user.token, params) as SalePaymentRow[];
        setRows(Array.isArray(data) ? data : []);
      } catch (error: any) {
        console.error('Failed to fetch sales payments:', error);
        if (error.message?.includes('401') || error.message?.includes('token')) {
          router.push('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    loadRows();
  }, [user, authLoading, isAuthenticated, router, debouncedSearch]);

  return (
    <>
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Sales Payment</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><Link href="/">Home</Link></li>
                <li className="breadcrumb-item"><Link href="/sales">Sales</Link></li>
                <li className="breadcrumb-item active">Payment</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          <div className="card">
            <div className="card-header d-flex align-items-center">
              <h3 className="card-title mb-0">Sales Payment List</h3>
              <div className="d-flex align-items-center ml-auto" style={{ gap: '0.5rem' }}>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Search invoice / patient / method"
                  style={{ minWidth: 260 }}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Link href="/sales/new_sale" className="btn btn-primary btn-sm text-nowrap">
                  <i className="fa fa-plus-circle mr-1"></i>Add Sale
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
              ) : (
                <div className="table-responsive">
                  <table className="table table-striped table-hover table-bordered mb-0">
                    <thead>
                      <tr>
                        <th>Invoice ID</th>
                        <th>Date</th>
                        <th>Sub Total</th>
                        <th>Discount</th>
                        <th>Grand Total</th>
                        <th>Amount Received</th>
                        <th>Due Amount</th>
                        <th>Method</th>
                        <th>Options</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="text-center">No sales payment found</td>
                        </tr>
                      ) : (
                        rows.map((row) => {
                          const total = Number(row.total_amount || 0);
                          const paid = Number(row.paid_amount || 0);
                          const due = total - paid;

                          return (
                            <tr key={row.id}>
                              <td>{row.sale_id || row.id}</td>
                              <td>{row.sale_date ? new Date(row.sale_date).toLocaleDateString() : '-'}</td>
                              <td>Rs. {formatCurrency(row.subtotal as number)}</td>
                              <td>Rs. {formatCurrency(row.discount as number)}</td>
                              <td>Rs. {formatCurrency(total)}</td>
                              <td>Rs. {formatCurrency(paid)}</td>
                              <td>Rs. {formatCurrency(due)}</td>
                              <td className="text-capitalize">{row.payment_method || '-'}</td>
                              <td>
                                <button type="button" className="btn btn-info btn-xs mr-1" title="Invoice" disabled>
                                  <i className="fa fa-file-text"></i>
                                </button>
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
          </div>
        </div>
      </section>
    </>
  );
};

export default SalesPaymentPage;
