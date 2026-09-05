'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/helpers/currency';

interface SaleItem {
  stock_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface SaleRow {
  id: number;
  sale_id: string;
  sale_date: string;
  patient_name: string;
  total_amount: number;
  payment_method: string;
  items: SaleItem[];
}

const MonthlySalesDetailPage = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const period = params?.period as string; // Format: YYYY-MM
  
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    const fetchSales = async () => {
      if (!user?.token || !period) return;
      setLoading(true);

      try {
        const [year, month] = period.split('-');
        // Calculate start and end date for the month
        // Pad month with 0 if necessary for parsing (though API likely handles YYYY-MM-DD)
        const yearInt = parseInt(year);
        const monthInt = parseInt(month);

        const lastDay = new Date(yearInt, monthInt, 0).getDate();
        const startDate = `${year}-${month.padStart(2, '0')}-01`;
        const endDate = `${year}-${month.padStart(2, '0')}-${lastDay}`;
        
        const response: any = await api.getSales(user.token, {
          start_date: startDate,
          end_date: endDate,
        });

        const results = Array.isArray(response) ? response : (response.results || []);
        setSales(results);
        
        // Calculate total
        const sum = results.reduce((acc: number, row: any) => acc + Number(row.total_amount || 0), 0);
        setTotalAmount(sum);

      } catch (error) {
        console.error('Failed to fetch monthly sales:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSales();
  }, [user, period]);

  const formatPeriod = (p: string) => {
    if (!p) return '';
    try {
      const [year, month] = p.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return date.toLocaleDateString('default', { month: 'long', year: 'numeric' });
    } catch {
      return p;
    }
  };

  return (
    <>
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Monthly Sales Detail</h1>
              <p className="mb-0 text-muted">Sales for {formatPeriod(period)}</p>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><Link href="/">Home</Link></li>
                <li className="breadcrumb-item"><Link href="/sales">Sales</Link></li>
                <li className="breadcrumb-item"><Link href="/sales/financialReport">Financial Report</Link></li>
                <li className="breadcrumb-item active">Detail</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h3 className="card-title">Transactions</h3>
              <div className="card-tools">
                <span className="badge badge-success p-2" style={{ fontSize: '1rem' }}>
                  Total: Rs. {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>
            <div className="card-body p-0">
              {loading ? (
                <div className="text-center p-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="sr-only">Loading...</span>
                  </div>
                </div>
              ) : sales.length === 0 ? (
                <div className="text-center p-5 text-muted">
                  <i className="fas fa-receipt fa-3x mb-3 text-gray-300 d-block"></i>
                  No sales found for this period.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-striped table-hover mb-0">
                    <thead>
                      <tr>
                        <th>Sale ID</th>
                        <th>Date</th>
                        <th>Patient</th>
                        <th style={{ width: '40%' }}>Items</th>
                        <th>Method</th>
                        <th className="text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sales.map((sale) => (
                        <tr key={sale.id}>
                          <td>
                            <span className="font-weight-bold text-primary">
                              {sale.sale_id}
                            </span>
                          </td>
                          <td>
                            {new Date(sale.sale_date).toLocaleString()}
                          </td>
                          <td>{sale.patient_name || <span className="text-muted font-italic">Walk-in</span>}</td>
                          <td>
                            <ul className="list-unstyled mb-0 small">
                              {sale.items?.map((item, idx) => (
                                <li key={idx}>
                                  <span className="font-weight-bold">{item.quantity}</span> x {item.stock_name}
                                </li>
                              ))}
                            </ul>
                          </td>
                          <td className="text-capitalize">
                            <span className={`badge badge-${sale.payment_method === 'cash' ? 'success' : 'info'}`}>
                              {sale.payment_method}
                            </span>
                          </td>
                          <td className="text-right font-weight-bold">
                             Rs. {formatCurrency(Number(sale.total_amount))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="card-footer clearfix">
               <Link href="/sales/financialReport" className="btn btn-secondary btn-sm">
                 <i className="fas fa-arrow-left mr-1"></i> Back to Report
               </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default MonthlySalesDetailPage;
