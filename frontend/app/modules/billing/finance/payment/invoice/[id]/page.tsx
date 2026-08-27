'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/helpers/currency';

interface PaymentItem {
  id: number;
  description?: string;
  quantity?: number;
  rate?: number;
  amount?: number;
  payment_category?: number | null;
  category_name?: string | null;
}

interface Payment {
  id: number;
  invoice_id?: string;
  reference_number?: string;
  patient?: number;
  patient_name?: string;
  doctor?: number | null;
  doctor_name?: string | null;
  amount?: number;
  gross_total?: number;
  discount?: number;
  paid_amount?: number;
  balance?: number;
  payment_method?: string;
  status?: string;
  payment_date?: string;
  created_at?: string;
  remarks?: string;
  items?: PaymentItem[];
}

const InvoicePage = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!user?.token) {
        setLoading(false);
        return;
      }
      if (!params?.id) {
        setError('Missing invoice id');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');
      try {
        const data = await api.getPayment(user.token, params.id);
        setPayment(data as Payment);
      } catch (err: any) {
        console.error('Failed to load invoice', err);
        setError(err?.message || 'Failed to load invoice');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user, params?.id]);

  const items = payment?.items || [];
  const subtotal = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const discount = Number(payment?.discount || 0);
  const total = Number(payment?.amount || subtotal - discount);

  return (
    <>
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Invoice {payment?.invoice_id || payment?.reference_number || params?.id}</h1>
              {payment?.patient_name && (
                <p className="mb-0 text-sm text-muted">Patient: {payment.patient_name}</p>
              )}
              {payment?.doctor_name && (
                <p className="mb-0 text-sm text-muted">Doctor: {payment.doctor_name}</p>
              )}
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><Link href="/">Home</Link></li>
                <li className="breadcrumb-item"><Link href="/finance/payment">Payments</Link></li>
                <li className="breadcrumb-item active">Invoice</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          {error && <div className="alert alert-warning" role="alert">{error}</div>}
          {loading ? (
            <div className="text-center p-4">
              <div className="spinner-border" role="status"><span className="sr-only">Loading...</span></div>
            </div>
          ) : !payment ? (
            <div className="alert alert-info" role="alert">Invoice not found.</div>
          ) : (
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-muted text-sm">Invoice ID</div>
                  <h3 className="card-title">{payment.invoice_id || payment.reference_number || '-'} </h3>
                </div>
                <div className="text-right">
                  <div className="text-muted text-sm">Payment Date</div>
                  <strong>{payment.payment_date ? new Date(payment.payment_date).toLocaleString() : '-'}</strong>
                </div>
              </div>
              <div className="card-body">
                <div className="row mb-3">
                  <div className="col-md-4">
                    <h6 className="text-muted">Patient</h6>
                    <div className="font-weight-bold">{payment.patient_name || '-'}</div>
                  </div>
                  <div className="col-md-4">
                    <h6 className="text-muted">Doctor</h6>
                    <div className="font-weight-bold">{payment.doctor_name || '-'}</div>
                  </div>
                  <div className="col-md-4">
                    <h6 className="text-muted">Method</h6>
                    <div className="font-weight-bold text-capitalize">{payment.payment_method || '-'}</div>
                  </div>
                </div>

                <div className="table-responsive mb-3">
                  <table className="table table-sm table-bordered">
                    <thead>
                      <tr>
                        <th style={{ width: '55%' }}>Description</th>
                        <th style={{ width: '15%' }}>Qty</th>
                        <th style={{ width: '15%' }}>Rate</th>
                        <th style={{ width: '15%' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.length === 0 ? (
                        <tr><td colSpan={4} className="text-center text-muted">No items</td></tr>
                      ) : (
                        items.map((item) => (
                          <tr key={item.id}>
                            <td>{item.description || item.category_name || '-'}</td>
                            <td>{item.quantity ?? 1}</td>
                            <td>Rs. {formatCurrency(item.rate)}</td>
                            <td>Rs. {formatCurrency(item.amount)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="row justify-content-end">
                  <div className="col-md-4">
                    <table className="table table-sm">
                      <tbody>
                        <tr>
                          <th>Subtotal:</th>
                          <td className="text-right">Rs. {formatCurrency(subtotal)}</td>
                        </tr>
                        <tr>
                          <th>Discount:</th>
                          <td className="text-right">Rs. {formatCurrency(discount)}</td>
                        </tr>
                        <tr>
                          <th>Total:</th>
                          <td className="text-right">Rs. {formatCurrency(total)}</td>
                        </tr>
                        <tr>
                          <th>Paid:</th>
                          <td className="text-right">Rs. {formatCurrency(payment.paid_amount)}</td>
                        </tr>
                        <tr>
                          <th>Balance:</th>
                          <td className="text-right">Rs. {formatCurrency(payment.balance)}</td>
                        </tr>
                        <tr>
                          <th>Status:</th>
                          <td className="text-right"><span className={`badge badge-${payment.status === 'paid' ? 'success' : 'warning'}`}>{payment.status || 'pending'}</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {payment.remarks && (
                  <div className="mt-3">
                    <h6 className="text-muted">Remarks</h6>
                    <p className="mb-0">{payment.remarks}</p>
                  </div>
                )}
              </div>
              <div className="card-footer d-flex justify-content-between">
                <button className="btn btn-secondary" onClick={() => router.back()}>Back</button>
                <Link href="/finance/payment" className="btn btn-outline-primary">Payments</Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default InvoicePage;
