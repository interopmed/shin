'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

const formatEmploymentType = (value?: string) => {
  if (!value) return '-';
  return value.replace('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());
};

export default function EmployeeDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const id = String(params?.id || '');

  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteName, setDeleteName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!user?.token || !id || isDeleting) return;
    setIsDeleting(true);
    try {
      await api.deleteEmployee(user.token, id);
      router.push('/human-resources/employees');
    } catch (err: any) {
      console.error('Failed to delete employee:', err);
      setError(err?.message || 'Failed to delete employee.');
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    const loadEmployee = async () => {
      if (!user?.token || !id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const data = await api.getEmployee(user.token, id);
        setEmployee(data);
      } catch (err: any) {
        setError(err?.message || 'Failed to load employee.');
      } finally {
        setLoading(false);
      }
    };

    loadEmployee();
  }, [user, id]);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Employee Details</h1>
          <p className="muted">Viewing record for {employee?.user_name || 'Employee'}</p>
        </div>
        <div className="action-row">
          <Link href="/human-resources/employees" className="button secondary">
            Back to Directory
          </Link>
          <Link href={`/human-resources/employees/edit/${id}`} className="button">
            Edit Employee
          </Link>
        </div>
      </header>

      {loading ? (
        <div className="panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
          Loading employee data...
        </div>
      ) : error ? (
        <div className="panel" style={{ padding: '16px', background: 'var(--warning-bg)', color: 'var(--warning)', borderRadius: '10px' }}>
          {error}
        </div>
      ) : !employee ? (
        <div className="panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
          Employee not found.
        </div>
      ) : (
        <section className="panel">
          <h2 style={{ marginBottom: '16px', borderBottom: '1px solid var(--line)', paddingBottom: '12px' }}>
            {employee.user_name || 'No Name Provided'}
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div>
              <p style={{ margin: '0 0 4px 0', fontSize: '0.875rem', color: 'var(--muted)' }}>Employee ID</p>
              <strong style={{ display: 'block', marginBottom: '16px' }}>{employee.employee_id || '-'}</strong>

              <p style={{ margin: '0 0 4px 0', fontSize: '0.875rem', color: 'var(--muted)' }}>Department</p>
              <strong style={{ display: 'block', marginBottom: '16px' }}>{employee.department_name || '-'}</strong>

              <p style={{ margin: '0 0 4px 0', fontSize: '0.875rem', color: 'var(--muted)' }}>Designation</p>
              <strong style={{ display: 'block', marginBottom: '16px' }}>{employee.designation || '-'}</strong>

              <p style={{ margin: '0 0 4px 0', fontSize: '0.875rem', color: 'var(--muted)' }}>Employment Type</p>
              <strong style={{ display: 'block', marginBottom: '16px' }}>{formatEmploymentType(employee.employment_type)}</strong>
            </div>
            <div>
              <p style={{ margin: '0 0 4px 0', fontSize: '0.875rem', color: 'var(--muted)' }}>Status</p>
              <strong style={{ display: 'block', marginBottom: '16px' }}>
                <span className={`status ${employee.is_active ? 'success' : 'warning'}`}>
                  {employee.is_active ? 'Active' : 'Inactive'}
                </span>
              </strong>

              <p style={{ margin: '0 0 4px 0', fontSize: '0.875rem', color: 'var(--muted)' }}>Date of Joining</p>
              <strong style={{ display: 'block', marginBottom: '16px' }}>{employee.date_of_joining || '-'}</strong>

              <p style={{ margin: '0 0 4px 0', fontSize: '0.875rem', color: 'var(--muted)' }}>Emergency Contact</p>
              <strong style={{ display: 'block', marginBottom: '16px' }}>{employee.emergency_contact || '-'}</strong>
              
              <p style={{ margin: '0 0 4px 0', fontSize: '0.875rem', color: 'var(--muted)' }}>Address</p>
              <strong style={{ display: 'block', marginBottom: '16px' }}>{employee.address || '-'}</strong>
            </div>
          </div>
          
          <h3 style={{ marginTop: '32px', marginBottom: '16px', borderBottom: '1px solid var(--line)', paddingBottom: '12px' }}>
            Facility Assignments
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div>
              <p style={{ margin: '0 0 4px 0', fontSize: '0.875rem', color: 'var(--muted)' }}>Facilities</p>
              <strong style={{ display: 'block', marginBottom: '16px' }}>{employee.facilities || '-'}</strong>
            </div>
            <div>
              <p style={{ margin: '0 0 4px 0', fontSize: '0.875rem', color: 'var(--muted)' }}>Service Units</p>
              <strong style={{ display: 'block', marginBottom: '16px' }}>{employee.service_units || '-'}</strong>
            </div>
          </div>
          
          <div style={{ marginTop: '48px', borderTop: '1px solid #fecaca', backgroundColor: '#fff5f5', padding: '24px', borderRadius: '8px' }}>
            <h3 style={{ color: '#dc2626', marginBottom: '8px', fontSize: '18px' }}>Danger Zone</h3>
            <p style={{ fontSize: '0.875rem', marginBottom: '16px', color: '#991b1b' }}>
              To delete this employee, type their name (<strong>{employee.user_name}</strong>) to confirm. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Type employee name"
                value={deleteName}
                onChange={(e) => setDeleteName(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #fca5a5', borderRadius: '6px', maxWidth: '300px', flex: 1, backgroundColor: '#fff' }}
              />
              <button
                type="button"
                className="button danger"
                disabled={deleteName !== employee.user_name || isDeleting}
                onClick={handleDelete}
              >
                {isDeleting ? 'Deleting...' : 'Delete Employee'}
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
