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

      router.push('/human-resources/employees/departments');
    } catch (submitError: any) {
      setError(submitError?.message || 'Failed to create department.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="stack" style={{ gap: '24px' }}>
      <div className="page-header">
        <div className="stack" style={{ gap: '8px' }}>
          <div style={{ display: 'flex', gap: '8px', fontSize: '14px', color: 'var(--text-tertiary)' }}>
            <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Home</Link>
            <span>/</span>
            <Link href="/human-resources/employees" style={{ color: 'inherit', textDecoration: 'none' }}>Employees</Link>
            <span>/</span>
            <Link href="/human-resources/employees/departments" style={{ color: 'inherit', textDecoration: 'none' }}>Departments</Link>
            <span>/</span>
            <span>Add Department</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Add Department</h1>
        </div>
      </div>

      <div className="panel" style={{ padding: '32px' }}>
        <form onSubmit={handleSubmit} className="stack" style={{ gap: '24px' }}>
          {error && (
            <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: 'var(--radius-md)', border: '1px solid #f87171' }}>
              {error}
            </div>
          )}

          <div className="form-grid">
            <div className="field">
              <label>Department Name *</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="field">
              <label>Head (User ID)</label>
              <input
                type="number"
                min={1}
                name="head"
                value={form.head}
                onChange={handleChange}
              />
              <small style={{ color: 'var(--text-tertiary)', marginTop: '4px', display: 'block', fontSize: '13px' }}>
                Optional. Enter auth user ID for department head.
              </small>
            </div>

            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label>Description</label>
              <textarea
                name="description"
                rows={3}
                value={form.description}
                onChange={handleChange}
              />
            </div>

            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'normal' }}>
                <input
                  type="checkbox"
                  name="is_active"
                  checked={form.is_active}
                  onChange={handleChange}
                  style={{ width: 'auto' }}
                />
                Active
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
            <Link href="/human-resources/employees/departments" className="button secondary">
              Cancel
            </Link>
            <button type="submit" className="button primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Department'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddDepartmentPage;
