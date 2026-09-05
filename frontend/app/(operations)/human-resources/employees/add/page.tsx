'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { SearchableSelect } from '@/components/SearchableSelect';

interface Department {
  id: number;
  name: string;
}

interface UserOption {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  full_name?: string;
}

const defaultForm = {
  user: '',
  employee_id: '',
  department: '',
  designation: '',
  employment_type: 'full_time',
  date_of_joining: '',
  address: '',
  emergency_contact: '',
  is_active: true,
};

const AddEmployeePage = () => {
  const { user } = useAuth();
  const router = useRouter();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [loadingDesignations, setLoadingDesignations] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDepartments = async () => {
      if (!user?.token) {
        setLoadingDepartments(false);
        return;
      }

      try {
        const response = await api.getEmployeeDepartments(user.token, { ordering: 'name' });
        setDepartments(Array.isArray(response) ? response : []);
      } catch {
        setDepartments([]);
      } finally {
        setLoadingDepartments(false);
      }
    };
    
    const loadDesignations = async () => {
      if (!user?.token) {
        setLoadingDesignations(false);
        return;
      }
      try {
        const response = await api.getDesignations(user.token, { ordering: 'name' });
        setDesignations(Array.isArray(response) ? response : []);
      } catch {
        setDesignations([]);
      } finally {
        setLoadingDesignations(false);
      }
    };

    loadDepartments();
    loadDesignations();
  }, [user]);

  useEffect(() => {
    const loadUsers = async () => {
      if (!user?.token) {
        setUsers([]);
        return;
      }

      setLoadingUsers(true);
      try {
        const params: Record<string, string> = {
          ordering: 'username',
          page_size: '10',
        };

        const term = userSearch.trim();
        if (term) {
          params.search = term;
        }

        const response = await api.getUsers(user.token, params);
        setUsers(Array.isArray(response) ? response : []);
      } catch {
        setUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    };

    loadUsers();
  }, [user, userSearch]);

  const getUserLabel = (item: UserOption) => {
    const fullName = item.full_name || `${item.first_name || ''} ${item.last_name || ''}`.trim();
    const name = fullName || item.username || `User ${item.id}`;
    const email = item.email ? ` (${item.email})` : '';
    return `${name}${email}`;
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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
      await api.createEmployee(user.token, {
        user: Number(form.user),
        employee_id: form.employee_id.trim(),
        department: form.department ? Number(form.department) : null,
        designation: form.designation ? Number(form.designation) : null,
        employment_type: form.employment_type,
        date_of_joining: form.date_of_joining || null,
        address: form.address.trim(),
        emergency_contact: form.emergency_contact.trim(),
        is_active: form.is_active,
      });

      router.push('/human-resources/employees');
    } catch (submitError: any) {
      setError(submitError?.message || 'Failed to create employee.');
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
            <span>Add</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Add Employee</h1>
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
              <label>User ID *</label>
              <input
                type="number"
                min={1}
                name="user"
                value={form.user}
                onChange={handleChange}
                required
              />
              <small style={{ color: 'var(--text-tertiary)', marginTop: '4px', display: 'block', fontSize: '13px' }}>
                Enter existing auth user ID.
              </small>
            </div>

            <div className="field">
              <label>Search User (Optional)</label>
              <input
                type="text"
                placeholder="Search by name, username or email"
                value={userSearch}
                onChange={(event) => setUserSearch(event.target.value)}
              />
              <small style={{ color: 'var(--text-tertiary)', marginTop: '4px', display: 'block', fontSize: '13px' }}>
                You can search and select a user to auto-fill User ID.
              </small>
            </div>

            <div className="field">
              <label>Select User (Optional)</label>
              <select
                value={form.user}
                onChange={(event) => setForm((prev) => ({ ...prev, user: event.target.value }))}
                disabled={loadingUsers}
              >
                <option value="">{loadingUsers ? 'Loading users...' : 'Select a user'}</option>
                {users.map((item) => (
                  <option key={item.id} value={item.id}>
                    {getUserLabel(item)}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Employee ID *</label>
              <input
                type="text"
                name="employee_id"
                value={form.employee_id}
                onChange={handleChange}
                required
              />
            </div>

            <div className="field">
              <label>Department</label>
              <select
                name="department"
                value={form.department}
                onChange={handleChange}
                disabled={loadingDepartments}
              >
                <option value="">Select Department</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>{department.name}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Designation *</label>
              <SearchableSelect
                options={designations}
                value={form.designation}
                onChange={(val) => setForm((prev) => ({ ...prev, designation: String(val) }))}
                placeholder={loadingDesignations ? 'Loading...' : 'Select Designation'}
                disabled={loadingDesignations}
              />
            </div>

            <div className="field">
              <label>Employment Type *</label>
              <select
                name="employment_type"
                value={form.employment_type}
                onChange={handleChange}
                required
              >
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="intern">Intern</option>
              </select>
            </div>

            <div className="field">
              <label>Date of Joining</label>
              <input
                type="date"
                name="date_of_joining"
                value={form.date_of_joining}
                onChange={handleChange}
              />
            </div>

            <div className="field">
              <label>Emergency Contact</label>
              <input
                type="text"
                name="emergency_contact"
                value={form.emergency_contact}
                onChange={handleChange}
              />
            </div>

            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label>Address</label>
              <textarea
                name="address"
                rows={3}
                value={form.address}
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
            <Link href="/human-resources/employees" className="button secondary">
              Cancel
            </Link>
            <button type="submit" className="button primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEmployeePage;

