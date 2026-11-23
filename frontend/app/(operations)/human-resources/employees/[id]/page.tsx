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
    <section className="mpi-page">
      <div className="mpi-card">
        <header className="mpi-header">
          <div>
            <h1>Employee Details</h1>
            <p style={{ color: '#667085', fontSize: '13px', fontWeight: 700, margin: '5px 0 0' }}>
              Viewing record for {employee?.user_name || 'Employee'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Link href="/human-resources/employees" className="facility-secondary-button" style={{ textDecoration: 'none' }}>
              Back to Directory
            </Link>
            <Link href={`/human-resources/employees/edit/${id}`} className="facility-primary-button" style={{ textDecoration: 'none' }}>
              Edit Employee
            </Link>
          </div>
        </header>

        <div style={{ padding: '24px' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              Loading employee data...
            </div>
          ) : error ? (
            <div className="patient-form-error">
              {error}
            </div>
          ) : !employee ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              Employee not found.
            </div>
          ) : (
            <div>
              <h2 style={{ marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', fontSize: '20px', color: '#0f172a' }}>
                {employee.user_name || 'No Name Provided'}
              </h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div>
                  <p style={{ margin: '0 0 4px 0', fontSize: '0.875rem', color: '#64748b' }}>Employee ID</p>
                  <strong style={{ display: 'block', marginBottom: '16px', color: '#0f172a' }}>{employee.employee_id || '-'}</strong>

                  <p style={{ margin: '0 0 4px 0', fontSize: '0.875rem', color: '#64748b' }}>Department</p>
                  <strong style={{ display: 'block', marginBottom: '16px', color: '#0f172a' }}>{employee.department_name || '-'}</strong>

                  <p style={{ margin: '0 0 4px 0', fontSize: '0.875rem', color: '#64748b' }}>Designation</p>
                  <strong style={{ display: 'block', marginBottom: '16px', color: '#0f172a' }}>{employee.designation_name || employee.designation || '-'}</strong>

                  <p style={{ margin: '0 0 4px 0', fontSize: '0.875rem', color: '#64748b' }}>Employment Type</p>
                  <strong style={{ display: 'block', marginBottom: '16px', color: '#0f172a' }}>{formatEmploymentType(employee.employment_type)}</strong>
                </div>
                <div>
                  <p style={{ margin: '0 0 4px 0', fontSize: '0.875rem', color: '#64748b' }}>Status</p>
                  <strong style={{ display: 'block', marginBottom: '16px' }}>
                    <span style={{ 
                      padding: '4px 8px', 
                      borderRadius: '4px', 
                      fontSize: '12px', 
                      fontWeight: 600,
                      backgroundColor: employee.is_active ? '#dcfce7' : '#fee2e2',
                      color: employee.is_active ? '#166534' : '#991b1b'
                    }}>
                      {employee.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </strong>

                  <p style={{ margin: '0 0 4px 0', fontSize: '0.875rem', color: '#64748b' }}>Date of Joining</p>
                  <strong style={{ display: 'block', marginBottom: '16px', color: '#0f172a' }}>{employee.date_of_joining || '-'}</strong>

                  <p style={{ margin: '0 0 4px 0', fontSize: '0.875rem', color: '#64748b' }}>Emergency Contact</p>
                  <strong style={{ display: 'block', marginBottom: '16px', color: '#0f172a' }}>{employee.emergency_contact || '-'}</strong>
                  
                  <p style={{ margin: '0 0 4px 0', fontSize: '0.875rem', color: '#64748b' }}>Address</p>
                  <strong style={{ display: 'block', marginBottom: '16px', color: '#0f172a' }}>{employee.address || '-'}</strong>
                </div>
              </div>
              
              <h3 style={{ marginTop: '32px', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', fontSize: '18px', color: '#0f172a' }}>
                Facility Assignments
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div>
                  <p style={{ margin: '0 0 4px 0', fontSize: '0.875rem', color: '#64748b' }}>Facilities</p>
                  <strong style={{ display: 'block', marginBottom: '16px', color: '#0f172a' }}>{employee.facilities || '-'}</strong>
                </div>
                <div>
                  <p style={{ margin: '0 0 4px 0', fontSize: '0.875rem', color: '#64748b' }}>Service Units</p>
                  <strong style={{ display: 'block', marginBottom: '16px', color: '#0f172a' }}>{employee.service_units || '-'}</strong>
                </div>
              </div>
              
              <div style={{ marginTop: '48px', borderTop: '1px solid #fecaca', backgroundColor: '#fef2f2', padding: '24px', borderRadius: '8px' }}>
                <h3 style={{ color: '#dc2626', marginBottom: '8px', fontSize: '18px', fontWeight: 600 }}>Danger Zone</h3>
                <p style={{ fontSize: '0.875rem', marginBottom: '16px', color: '#991b1b' }}>
                  To delete this employee, type their name (<strong>{employee.user_name}</strong>) to confirm. This action cannot be undone.
                </p>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Type employee name"
                    value={deleteName}
                    onChange={(e) => setDeleteName(e.target.value)}
                    style={{ 
                      padding: '8px 12px', 
                      border: '1px solid #fca5a5', 
                      borderRadius: '6px', 
                      maxWidth: '300px', 
                      flex: 1, 
                      backgroundColor: '#fff',
                      color: '#0f172a',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="button"
                    style={{
                      padding: '8px 16px',
                      backgroundColor: deleteName !== employee.user_name || isDeleting ? '#f87171' : '#dc2626',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: 600,
                      cursor: deleteName !== employee.user_name || isDeleting ? 'not-allowed' : 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    disabled={deleteName !== employee.user_name || isDeleting}
                    onClick={handleDelete}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete Employee'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
