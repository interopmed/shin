'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

interface ExpenseCategory {
  id: number;
  name: string;
  description?: string | null;
  is_active?: boolean;
  created_at?: string;
}

const ExpenseCategoriesPage = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', description: '', is_active: true });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return categories;
    return categories.filter((cat) =>
      cat.name.toLowerCase().includes(term) || (cat.description || '').toLowerCase().includes(term)
    );
  }, [categories, search]);

  const fetchCategories = async () => {
    if (!user?.token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await api.getExpenseCategories(user.token, { ordering: 'name' });
      const normalized = Array.isArray(data)
        ? data.map((item: any) => ({
            id: Number(item.id),
            name: String(item.name || '').trim(),
            description: item.description || '',
            is_active: item.is_active !== false,
            created_at: item.created_at,
          }))
        : [];
      setCategories(normalized);
    } catch (err: any) {
      console.error('Failed to load expense categories', err);
      setError(err?.message || 'Failed to load expense categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [user]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.token) {
      setError('You must be logged in to add a category.');
      return;
    }

    const name = form.name.trim();
    if (!name) {
      setError('Name is required.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await api.createExpenseCategory(user.token, {
        name,
        description: form.description.trim() || null,
        is_active: form.is_active,
      });
      setSuccess('Category created successfully.');
      setForm({ name: '', description: '', is_active: true });
      await fetchCategories();
    } catch (err: any) {
      console.error('Failed to create category', err);
      setError(err?.message || 'Failed to create category');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (category: ExpenseCategory) => {
    if (!user?.token) return;
    try {
      await api.updateExpenseCategory(user.token, category.id, {
        name: category.name,
        description: category.description,
        is_active: !category.is_active,
      });
      setCategories((prev) =>
        prev.map((item) =>
          item.id === category.id ? { ...item, is_active: !category.is_active } : item
        )
      );
    } catch (err) {
      console.error('Failed to update category status', err);
      setError('Failed to update category');
    }
  };

  return (
    <>
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Expense Categories</h1>
              <p className="mb-0 text-sm text-muted">Manage categories for expense tracking</p>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><Link href="/">Home</Link></li>
                <li className="breadcrumb-item">Finance</li>
                <li className="breadcrumb-item active">Expense Categories</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          <div className="row">
            <div className="col-lg-7">
              <div className="card">
                <div className="card-header d-flex align-items-center justify-content-between flex-wrap">
                  <h3 className="card-title mb-0">Categories</h3>
                  <div className="d-flex align-items-center">
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      style={{ minWidth: 220 }}
                      placeholder="Search by name or description"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
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
                    <div className="alert alert-warning m-3" role="alert">{error}</div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover table-striped mb-0">
                        <thead>
                          <tr>
                            <th style={{ width: 80 }}>ID</th>
                            <th>Name</th>
                            <th style={{ width: 140 }}>Status</th>
                            <th>Description</th>
                            <th style={{ width: 120 }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="text-center text-muted">No categories found</td>
                            </tr>
                          ) : (
                            filtered.map((cat) => (
                              <tr key={cat.id}>
                                <td className="font-weight-bold">{cat.id}</td>
                                <td>{cat.name}</td>
                                <td>
                                  <span className={`badge badge-${cat.is_active ? 'success' : 'secondary'}`}>
                                    {cat.is_active ? 'Active' : 'Inactive'}
                                  </span>
                                </td>
                                <td>{cat.description || '-'}</td>
                                <td>
                                  <button
                                    className="btn btn-sm btn-outline-secondary"
                                    onClick={() => toggleActive(cat)}
                                    disabled={saving}
                                  >
                                    {cat.is_active ? 'Disable' : 'Activate'}
                                  </button>
                                </td>
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

            <div className="col-lg-5">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title mb-0">Add Category</h3>
                </div>
                <form onSubmit={handleSubmit}>
                  <div className="card-body">
                    {error && !loading && (
                      <div className="alert alert-danger" role="alert">{error}</div>
                    )}
                    {success && (
                      <div className="alert alert-success" role="alert">{success}</div>
                    )}
                    <div className="form-group">
                      <label htmlFor="name">Name</label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        className="form-control"
                        value={form.name}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="description">Description</label>
                      <textarea
                        id="description"
                        name="description"
                        className="form-control"
                        rows={2}
                        value={form.description}
                        onChange={handleInputChange}
                        placeholder="Optional details"
                      />
                    </div>
                    <div className="form-group form-check">
                      <input
                        type="checkbox"
                        id="is_active"
                        name="is_active"
                        className="form-check-input"
                        checked={form.is_active}
                        onChange={handleInputChange}
                      />
                      <label className="form-check-label" htmlFor="is_active">Active</label>
                    </div>
                  </div>
                  <div className="card-footer d-flex justify-content-end" style={{ gap: '0.5rem' }}>
                    <Link href="/finance/expense" className="btn btn-secondary">Back to Expenses</Link>
                    <button type="submit" className="btn btn-success" disabled={saving}>
                      {saving ? 'Saving...' : 'Save Category'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default ExpenseCategoriesPage;
