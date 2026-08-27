'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

interface ExpenseCategory {
  id: number;
  name: string;
  description?: string;
  is_active?: boolean;
}

const today = new Date();
const todayStr = today.toISOString().slice(0, 10);

const AddExpensePage = () => {
  const { user } = useAuth();
  const router = useRouter();

  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    category: '',
    amount: '',
    description: '',
    date: todayStr,
    reference: '',
  });

  useEffect(() => {
    const loadCategories = async () => {
      if (!user?.token) {
        setLoadingCategories(false);
        return;
      }

      try {
        const data = await api.getExpenseCategories(user.token, { ordering: 'name' });
        const active = Array.isArray(data)
          ? data.filter((item: ExpenseCategory) => item.is_active !== false)
          : [];
        setCategories(active as ExpenseCategory[]);
      } catch (err) {
        console.error('Failed to load expense categories', err);
        setError('Failed to load categories. Please retry.');
      } finally {
        setLoadingCategories(false);
      }
    };

    loadCategories();
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.token) {
      setError('You must be logged in to add an expense.');
      return;
    }

    const amountValue = Number(form.amount);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setError('Enter a valid amount greater than zero.');
      return;
    }

    const description = form.description.trim();
    if (!description) {
      setError('Description is required.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await api.createExpense(user.token, {
        category: form.category ? Number(form.category) : null,
        amount: amountValue,
        description,
        date: form.date || todayStr,
        reference: form.reference || null,
      });

      setSuccess('Expense saved successfully.');
      setForm({ category: '', amount: '', description: '', date: todayStr, reference: '' });
      router.refresh();
    } catch (err: any) {
      console.error('Failed to save expense', err);
      setError(err?.message || 'Failed to save expense. Please try again.');
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
              <h1 className="m-0">Add Expense</h1>
              <p className="mb-0 text-muted text-sm">Record a new expense entry</p>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><Link href="/">Home</Link></li>
                <li className="breadcrumb-item">Finance</li>
                <li className="breadcrumb-item active">Add Expense</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          {error && (
            <div className="alert alert-danger" role="alert">{error}</div>
          )}
          {success && (
            <div className="alert alert-success" role="alert">{success}</div>
          )}

          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h3 className="card-title mb-0">Expense Details</h3>
              <div>
                <Link href="/finance/expense" className="btn btn-secondary btn-sm mr-2">Back to List</Link>
                <Link href="/finance/expense_categories" className="btn btn-info btn-sm">Manage Categories</Link>
              </div>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="card-body">
                <div className="form-row">
                  <div className="form-group col-md-6">
                    <label htmlFor="category">Category</label>
                    <select
                      id="category"
                      name="category"
                      className="form-control"
                      value={form.category}
                      onChange={handleChange}
                      disabled={loadingCategories}
                    >
                      <option value="">Select category (optional)</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group col-md-3">
                    <label htmlFor="date">Date</label>
                    <input
                      type="date"
                      id="date"
                      name="date"
                      className="form-control"
                      value={form.date}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group col-md-3">
                    <label htmlFor="amount">Amount (Rs)</label>
                    <input
                      type="number"
                      step="0.01"
                      id="amount"
                      name="amount"
                      className="form-control"
                      value={form.amount}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    name="description"
                    className="form-control"
                    rows={3}
                    value={form.description}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="reference">Reference (optional)</label>
                  <input
                    type="text"
                    id="reference"
                    name="reference"
                    className="form-control"
                    value={form.reference}
                    onChange={handleChange}
                    placeholder="Invoice, receipt, or note"
                  />
                </div>
              </div>
              <div className="card-footer d-flex justify-content-between align-items-center">
                <div className="text-muted text-sm">Fields marked required must be filled</div>
                <div className="d-flex" style={{ gap: '0.5rem' }}>
                  <Link href="/finance/expense" className="btn btn-secondary" aria-label="Cancel and return to expenses">Cancel</Link>
                  <button type="submit" className="btn btn-success" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Expense'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </section>
    </>
  );
};

export default AddExpensePage;
