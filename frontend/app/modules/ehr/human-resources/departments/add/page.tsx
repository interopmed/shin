'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

const defaultForm = {
  name: '',
  description: '',
  head: '',
  is_active: true,
};

const AddDepartmentPage = () => {
  const { user } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = event.target;

    if (type === 'checkbox') {
      const target = event.target as HTMLInputElement;
      setForm((prev) => ({ ...prev, [name]: target.checked }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!user?.token) {
      setError('You are not authenticated.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await api.createEmployeeDepartment(user.token, {
        name: form.name.trim(),
        description: form.description.trim(),
        head: form.head ? Number(form.head) : null,
        is_active: form.is_active,
      });

      router.push('/modules/ehr/human-resources/departments');
    } catch (submitError: any) {
      setError(submitError?.message || 'Failed to create department.');
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
              <h1 className="m-0">Add Department</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><Link href="/">Home</Link></li>
                <li className="breadcrumb-item"><Link href="/modules/ehr/human-resources/departments">Departments</Link></li>
                <li className="breadcrumb-item active">Add Department</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          <div className="card card-primary">
            <form onSubmit={handleSubmit}>
              <div className="card-body">
                {error && <div className="alert alert-danger">{error}</div>}

                <div className="form-group">
                  <label>Department Name *</label>
                  <input
                    type="text"
                    name="name"
                    className="form-control"
                    value={form.name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    name="description"
                    className="form-control"
                    rows={3}
                    value={form.description}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Head (User ID)</label>
                  <input
                    type="number"
                    min={1}
                    name="head"
                    className="form-control"
                    value={form.head}
                    onChange={handleChange}
                  />
                  <small className="form-text text-muted">Optional. Enter auth user ID for department head.</small>
                </div>

                <div className="form-check">
                  <input
                    type="checkbox"
                    id="is_active"
                    name="is_active"
                    className="form-check-input"
                    checked={form.is_active}
                    onChange={handleChange}
                  />
                  <label className="form-check-label" htmlFor="is_active">Active</label>
                </div>
              </div>

              <div className="card-footer d-flex justify-content-between">
                <Link href="/modules/ehr/human-resources/departments" className="btn btn-secondary">Cancel</Link>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </>
  );
};

export default AddDepartmentPage;
