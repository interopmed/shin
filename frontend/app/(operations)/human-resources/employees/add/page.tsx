'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadNextEmployeeId = async () => {
      try {
        const res = await fetch('/api/employees/employees/', {
          headers: { "Authorization": `Bearer ${user?.token}` }
        });
        const data = await res.json();
        const count = data.count || 0;
        setForm(prev => ({ ...prev, employee_id: `EMP-${(count + 101).toString().padStart(4, '0')}` }));
      } catch (e) {
        console.error(e);
      }
    };

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

    const loadUsers = async () => {
      if (!user?.token) {
        setUsers([]);
        return;
      }
      setLoadingUsers(true);
      try {
        const response = await api.getUsers(user.token, { ordering: 'username', page_size: '50' });
        setUsers(Array.isArray(response) ? response : []);
      } catch {
        setUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    };

    if (user?.token) {
      loadDepartments();
      loadDesignations();
      loadUsers();
      loadNextEmployeeId();
    }
  }, [user]);

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
        user: form.user ? Number(form.user) : null,
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
    <section className="mpi-page">
      <div className="mpi-card">
        <header className="mpi-header">
          <div>
            <h1>Add Employee</h1>
            <p style={{ color: '#667085', fontSize: '13px', fontWeight: 700, margin: '5px 0 0' }}>
              Create a new staff profile
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Link className="mpi-select-button" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }} href="/human-resources/employees">
              Cancel
            </Link>
          </div>
        </header>

        <div style={{ padding: '24px' }}>
          <form onSubmit={handleSubmit} className="patient-create-form" style={{ border: 'none', boxShadow: 'none', padding: 0 }}>
            {error && <p className="patient-form-error" style={{ marginBottom: '16px' }}>{error}</p>}

            <div className="patient-form-grid">
              <label>
                Employee ID (Auto-Assigned)
                <input
                  type="text"
                  name="employee_id"
                  value={form.employee_id}
                  disabled
                  style={{ backgroundColor: '#f8fafc', color: '#64748b' }}
                />
              </label>

              <label>
                Link System User (Optional)
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
              </label>

              <label>
                Department
                <select
                  name="department"
                  value={form.department}
                  onChange={handleChange}
                  disabled={loadingDepartments}
                >
                  <option value="">Select Department</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Designation
                <select
                  name="designation"
                  value={form.designation}
                  onChange={handleChange}
                  disabled={loadingDesignations}
                >
                  <option value="">Select Designation</option>
                  {designations.map((designation) => (
                    <option key={designation.id} value={designation.id}>
                      {designation.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Employment Type
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
              </label>

              <label>
                Date of Joining
                <input
                  type="date"
                  name="date_of_joining"
                  value={form.date_of_joining}
                  onChange={handleChange}
                />
              </label>

              <label style={{ gridColumn: '1 / -1' }}>
                Address
                <textarea
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  rows={2}
                />
              </label>

              <label>
                Emergency Contact
                <input
                  type="text"
                  name="emergency_contact"
                  value={form.emergency_contact}
                  onChange={handleChange}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  name="is_active"
                  checked={form.is_active}
                  onChange={handleChange}
                  style={{ width: 'auto', minHeight: 'auto' }}
                />
                Active Employee
              </label>
            </div>

            <div className="patient-form-actions" style={{ marginTop: '24px' }}>
              <button
                type="button"
                className="facility-secondary-button"
                onClick={() => router.push('/human-resources/employees')}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="facility-primary-button"
                disabled={saving}
              >
                {saving ? 'Creating...' : 'Create Employee'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
};

export default AddEmployeePage;
