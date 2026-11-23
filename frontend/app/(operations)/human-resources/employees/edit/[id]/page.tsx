'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { SearchableSelect } from '@/components/SearchableSelect';

interface Department {
  id: number;
  name: string;
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

const EditEmployeePage = () => {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = String(params?.id || '');

  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [form, setForm] = useState(defaultForm);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!user?.token || !id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const [departmentsResponse, employee, designationsResponse] = await Promise.all([
          api.getEmployeeDepartments(user.token, { ordering: 'name' }),
          api.getEmployee(user.token, id),
          api.getDesignations(user.token, { ordering: 'name' }).catch(() => []),
        ]);

        setDepartments(Array.isArray(departmentsResponse) ? departmentsResponse : []);
        setDesignations(Array.isArray(designationsResponse) ? designationsResponse : []);

        setForm({
          user: employee?.user ? String(employee.user) : '',
          employee_id: employee?.employee_id || '',
          department: employee?.department ? String(employee.department) : '',
          designation: employee?.designation ? String(employee.designation) : '',
          employment_type: employee?.employment_type || 'full_time',
          date_of_joining: employee?.date_of_joining || '',
          address: employee?.address || '',
          emergency_contact: employee?.emergency_contact || '',
          is_active: Boolean(employee?.is_active),
        });
      } catch (loadError: any) {
        setError(loadError?.message || 'Failed to load employee.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, id]);

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

    if (!user?.token || !id) {
      setError('You are not authenticated.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await api.updateEmployee(user.token, id, {
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

      setShowSuccessModal(true);
    } catch (submitError: any) {
      setError(submitError?.message || 'Failed to update employee.');
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
            <span>Edit</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Edit Employee</h1>
        </div>
      </div>

      <div className="panel" style={{ padding: '32px' }}>
        {loading ? (
           <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
             Loading employee data...
           </div>
        ) : (
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
              <label>Designation *</label>
              <SearchableSelect
                options={designations}
                value={form.designation}
                onChange={(val) => setForm((prev) => ({ ...prev, designation: String(val) }))}
                placeholder="Select Designation"
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

            <div className="field" style={{ gridColumn: '1 / -1', marginTop: '16px' }}>
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
                Active Employee
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
            <Link href="/human-resources/employees" className="button secondary">
              Cancel
            </Link>
            <button type="submit" className="button primary" disabled={saving}>
              {saving ? 'Saving...' : 'Update Employee'}
            </button>
          </div>
        </form>
        )}
      </div>

      {showSuccessModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: 'white', padding: '24px', borderRadius: '8px',
            maxWidth: '400px', width: '100%', textAlign: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}>
            <h2 style={{ margin: '0 0 16px 0', color: '#16a34a' }}>Success!</h2>
            <p style={{ marginBottom: '24px', color: 'var(--text-secondary)' }}>
              Employee updated successfully.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                onClick={() => setShowSuccessModal(false)}
                className="button secondary"
              >
                Continue Editing
              </button>
              <button 
                onClick={() => router.push('/human-resources/employees')}
                className="button primary"
              >
                Go to Directory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditEmployeePage;
