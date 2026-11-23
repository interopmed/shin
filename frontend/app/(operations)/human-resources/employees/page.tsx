'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

interface Employee {
  id: number;
  employee_id?: string;
  user_name?: string;
  department_name?: string;
  designation?: string;
  employment_type?: string;
  date_of_joining?: string;
  address?: string;
  emergency_contact?: string;
  is_active?: boolean;
  facilities?: string;
  service_units?: string;
}

interface EmployeePageResponse {
  count: number;
  next?: string | null;
  previous?: string | null;
  results: Employee[];
}

const formatEmployeeCode = (employee: Employee) => {
  if (employee.employee_id) return employee.employee_id;
  return `EN.${String(employee.id).padStart(9, '0')}`;
};

const formatEmploymentType = (value?: string) => {
  if (!value) return '-';
  return value.replace('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());
};

const EmployeesPage = () => {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const facilityParam = searchParams?.get('facility');
  const unitParam = searchParams?.get('unit');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const pageSize = 10;

  const getPaginationRange = (current: number, total: number) => {
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 3) return [1, 2, 3, 4, '...', total];
    if (current >= total - 2) return [1, '...', total - 3, total - 2, total - 1, total];
    return [1, '...', current - 1, current, current + 1, '...', total];
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const startRecord = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRecord = Math.min(page * pageSize, totalCount);

  const query = useMemo(() => {
    const params: Record<string, string> = {
      page: String(page),
      page_size: String(pageSize),
      ordering: '-created_at',
    };

    const term = search.trim();
    if (term) {
      params.search = term;
    }
    
    if (facilityParam) {
      params.facility = facilityParam;
    }
    if (unitParam) {
      params.unit = unitParam;
    }

    return params;
  }, [page, search, facilityParam, unitParam]);

  useEffect(() => {
    const fetchEmployees = async () => {
      if (!user?.token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const response = await api.getEmployeesPage(user.token, query);

        if (response && 'results' in (response as EmployeePageResponse)) {
          const paginated = response as EmployeePageResponse;
          setEmployees(paginated.results || []);
          setTotalCount(paginated.count || 0);
          setHasNext(Boolean(paginated.next));
          setHasPrevious(Boolean(paginated.previous));
        } else {
          const rows = Array.isArray(response) ? (response as Employee[]) : [];
          setEmployees(rows);
          setTotalCount(rows.length);
          setHasNext(false);
          setHasPrevious(page > 1);
        }
      } catch (err) {
        console.error('Failed to load employees:', err);
        setError('Failed to load employees.');
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, [user, query, page]);


  const handleDelete = async (id: number) => {
    if (!user?.token || deletingId !== null) return;

    const confirmed = window.confirm('Delete this employee?');
    if (!confirmed) return;

    setDeletingId(id);

    try {
      await api.deleteEmployee(user.token, id);

      if (employees.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      } else {
        setEmployees((prev) => prev.filter((employee) => employee.id !== id));
        setTotalCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Failed to delete employee:', err);
      setError('Failed to delete employee.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Employees</h1>
          <p className="muted">Manage employee records, departments, and details.</p>
        </div>
        <div className="action-row" style={{ justifyContent: 'flex-end' }}>
          <Link href="/human-resources/employees/add" className="button">
            Add New
          </Link>
        </div>
      </header>

      <section className="panel">
        <div className="page-header" style={{ marginBottom: 16 }}>
          <h2 style={{ marginBottom: 0 }}>Employee Directory</h2>
          <div className="action-row" style={{ justifyContent: 'flex-end', flex: 1 }}>
            <input
              type="search"
              placeholder="Name, Employee ID, Designation"
              style={{ padding: '8px 12px', border: '1px solid var(--line)', borderRadius: '10px', minWidth: '260px' }}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
            Loading employees...
          </div>
        ) : error ? (
          <div style={{ padding: '16px', background: 'var(--warning-bg)', color: 'var(--warning)', borderRadius: '10px', marginBottom: '16px' }}>
            {error}
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>

                  <th>Designation</th>
                  <th>Employment Type</th>
                  <th>Address</th>
                  <th>Contact</th>
                  <th>Facilities</th>
                  <th>Service Units</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', color: 'var(--muted)', padding: '24px' }}>
                      No employees found
                    </td>
                  </tr>
                ) : (
                  employees.map((employee) => (
                    <tr key={employee.id}>
                      <td><strong>{formatEmployeeCode(employee)}</strong></td>
                      <td>
                        <Link href={`/human-resources/employees/${employee.id}`} style={{ fontWeight: '500', color: 'var(--primary)', textDecoration: 'none' }}>
                          {employee.user_name || '-'}
                        </Link>
                      </td>

                      <td>{employee.designation || '-'}</td>
                      <td>{formatEmploymentType(employee.employment_type)}</td>
                      <td>{employee.address || '-'}</td>
                      <td>{employee.emergency_contact || '-'}</td>
                      <td>{employee.facilities || '-'}</td>
                      <td>{employee.service_units || '-'}</td>
                      <td>
                        <span className={`status ${employee.is_active ? 'success' : 'warning'}`}>
                          {employee.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="mpi-pagination-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: '14px 24px', borderTop: '1px solid #e3e9f1' }}>
          <p style={{ margin: 0, fontSize: '13px', color: '#667085', fontWeight: 600 }}>
            Showing <strong>{startRecord}-{endRecord}</strong> of <strong>{totalCount}</strong> employee{totalCount === 1 ? "" : "s"}
          </p>

          <div className="mpi-pagination-controls" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button
              className="button secondary compact"
              disabled={!hasPrevious && page <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              style={{ minHeight: '34px' }}
            >
              Previous
            </button>

            {getPaginationRange(page, totalPages).map((pageNum, index) => {
              if (pageNum === "...") {
                return (
                  <span
                    key={`ellipsis-${index}`}
                    style={{
                      padding: '0 8px',
                      fontSize: '13px',
                      fontWeight: 800,
                      color: '#98a2b3',
                      display: 'inline-flex',
                      alignItems: 'center',
                      minHeight: '34px'
                    }}
                  >
                    ...
                  </span>
                );
              }

              const pageNumber = pageNum as number;
              const isActive = pageNumber === page;
              return (
                <button
                  key={index}
                  onClick={() => setPage(pageNumber)}
                  style={{
                    padding: '0 12px',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: isActive ? '#fff' : '#475467',
                    background: isActive ? '#0f172a' : '#fff',
                    border: `1px solid ${isActive ? '#0f172a' : '#d5dde8'}`,
                    borderRadius: '8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '34px',
                    minHeight: '34px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {pageNumber}
                </button>
              );
            })}

            <button
              className="button secondary compact"
              disabled={!hasNext && page >= totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              style={{ minHeight: '34px' }}
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default EmployeesPage;

