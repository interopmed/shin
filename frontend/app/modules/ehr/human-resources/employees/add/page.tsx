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
  salary: '',
  address: '',
  emergency_contact: '',
  is_active: true,
};

const AddEmployeePage = () => {
  const { user } = useAuth();
  const router = useRouter();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
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

    loadDepartments();
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
        designation: form.designation.trim(),
        employment_type: form.employment_type,
        date_of_joining: form.date_of_joining || null,
        salary: form.salary || '0',
        address: form.address.trim(),
        emergency_contact: form.emergency_contact.trim(),
        is_active: form.is_active,
      });

      router.push('/modules/ehr/human-resources/employees');
    } catch (submitError: any) {
      setError(submitError?.message || 'Failed to create employee.');
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
              <h1 className="m-0">Add Employee</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><Link href="/">Home</Link></li>
                <li className="breadcrumb-item"><Link href="/modules/ehr/human-resources/employees">Employees</Link></li>
                <li className="breadcrumb-item active">Add</li>
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
                  <label>User ID *</label>
                  <input
                    type="number"
                    min={1}
                    name="user"
                    className="form-control"
                    value={form.user}
                    onChange={handleChange}
                    required
                  />
                  <small className="form-text text-muted">Enter existing auth user ID.</small>
                </div>

                <div className="form-group">
                  <label>Search User (Optional)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search by name, username or email"
                    value={userSearch}
                    onChange={(event) => setUserSearch(event.target.value)}
                  />
                  <small className="form-text text-muted">You can search and select a user to auto-fill User ID.</small>
                </div>

                <div className="form-group">
                  <label>Select User (Optional)</label>
                  <select
                    className="form-control"
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

                <div className="form-group">
                  <label>Employee ID *</label>
                  <input
                    type="text"
                    name="employee_id"
                    className="form-control"
                    value={form.employee_id}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Department</label>
                  <select
                    name="department"
                    className="form-control"
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

                <div className="form-group">
                  <label>Designation *</label>
                  <input
                    type="text"
                    name="designation"
                    className="form-control"
                    value={form.designation}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Employment Type *</label>
                  <select
                    name="employment_type"
                    className="form-control"
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

                <div className="form-group">
                  <label>Date of Joining</label>
                  <input
                    type="date"
                    name="date_of_joining"
                    className="form-control"
                    value={form.date_of_joining}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Salary</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    name="salary"
                    className="form-control"
                    value={form.salary}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Address</label>
                  <textarea
                    name="address"
                    className="form-control"
                    rows={3}
                    value={form.address}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Emergency Contact</label>
                  <input
                    type="text"
                    name="emergency_contact"
                    className="form-control"
                    value={form.emergency_contact}
                    onChange={handleChange}
                  />
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
                <Link href="/modules/ehr/human-resources/employees" className="btn btn-secondary">Cancel</Link>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </>
  );
};

export default AddEmployeePage;
