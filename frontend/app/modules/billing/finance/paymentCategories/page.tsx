'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

interface PaymentCategory {
  id: number;
  name: string;
  display_name?: string;
  price: number;
  category_type?: string;
  d_commission?: number;
  h_commission?: number;
  description?: string;
}

const PaymentCategoriesPage = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<PaymentCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return categories;
    return categories.filter((cat) =>
      cat.name.toLowerCase().includes(term) ||
      (cat.display_name || '').toLowerCase().includes(term) ||
      String(cat.id).includes(term)
    );
  }, [categories, search]);

  useEffect(() => {
    const fetchCategories = async () => {
      if (!user?.token) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const data = await api.getAllPaymentCategories(user.token);
        const normalized = Array.isArray(data)
          ? data.map((item: any) => ({
              id: Number(item.id),
              name: String(item.name ?? '').trim(),
              display_name: String(item.display_name ?? item.name ?? '').trim(),
              price: Number(item.price ?? item.c_price ?? 0),
              category_type: item.category_type || item.type || 'lab',
              d_commission: item.d_commission !== undefined ? Number(item.d_commission) : undefined,
              h_commission: item.h_commission !== undefined ? Number(item.h_commission) : undefined,
              description: item.description || '',
            }))
          : [];
        setCategories(normalized);
      } catch (err: any) {
        console.error('Failed to load payment categories:', err);
        setError('Failed to load payment categories');
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [user]);

  return (
    <>
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Payment Categories</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><Link href="/">Home</Link></li>
                <li className="breadcrumb-item">Finance</li>
                <li className="breadcrumb-item active">Payment Categories</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between flex-wrap">
              <h3 className="card-title mb-0">Categories</h3>
              <div className="d-flex align-items-center">
                <input
                  type="text"
                  className="form-control form-control-sm mr-2"
                  style={{ minWidth: 220 }}
                  placeholder="Search by name or id"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Link href="/finance/payment/add" className="btn btn-primary btn-sm">
                  <i className="fa fa-plus"></i> Add Payment
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
              ) : error ? (
                <div className="alert alert-warning m-3" role="alert">
                  {error}
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover table-striped mb-0">
                    <thead>
                      <tr>
                        <th style={{ width: 90 }}>ID</th>
                        <th>Name</th>
                        <th style={{ width: 140 }}>Type</th>
                        <th style={{ width: 140 }}>Price</th>
                        <th style={{ width: 140 }}>Doctor Comm.</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center text-muted">No categories found</td>
                        </tr>
                      ) : (
                        filtered.map((cat) => (
                          <tr key={cat.id}>
                            <td className="font-weight-bold">{cat.id}</td>
                            <td>
                              <div className="font-weight-bold">{cat.display_name || cat.name || 'Unnamed'}</div>
                              <div className="text-xs text-muted">{cat.name}</div>
                            </td>
                            <td><span className="badge badge-secondary">{cat.category_type || 'lab'}</span></td>
                            <td>Rs. {cat.price.toFixed(2)}</td>
                            <td>{cat.d_commission !== undefined ? `${cat.d_commission}` : '-'}</td>
                            <td>{cat.description || '-'}</td>
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

export default PaymentCategoriesPage;
