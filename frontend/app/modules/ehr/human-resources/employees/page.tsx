'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
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
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const pageSize = 25;

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

    return params;
  }, [page, search]);

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

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

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
    <>
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Employees</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><Link href="/">Home</Link></li>
                <li className="breadcrumb-item active">Employees</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center flex-wrap" style={{ gap: '0.5rem' }}>
              <h3 className="card-title mb-0">Employee Details</h3>
              <div className="d-flex align-items-center justify-content-end flex-nowrap ml-auto" style={{ gap: '0.5rem' }}>

                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Name, Employee ID, Designation"
                  style={{ minWidth: 260 }}
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                />                
                <Link href="/modules/ehr/human-resources/departments" className="btn btn-secondary btn-sm text-nowrap">
                  Add Department
                </Link>
                <Link href="/modules/ehr/human-resources/employees/add" className="btn btn-primary btn-sm text-nowrap">
                  Add New
                </Link>
              </div>
            </div>

            <div className="card-body p-0">
              {loading ? (
                <div className="text-center p-4">
                  <div className="spinner-border" role="status"></div>
                </div>
              ) : error ? (
                <div className="alert alert-warning m-3">{error}</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-bordered table-striped mb-0">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Department</th>
                        <th>Designation</th>
                        <th>Employment Type</th>
                        <th>Address</th>
                        <th>Contact</th>
                        <th>Status</th>
                        <th style={{ width: 140 }}>Options</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="text-center">No employees found</td>
                        </tr>
                      ) : (
                        employees.map((employee) => (
                          <tr key={employee.id}>
                            <td>{formatEmployeeCode(employee)}</td>
                            <td>{employee.user_name || '-'}</td>
                            <td>{employee.department_name || '-'}</td>
                            <td>{employee.designation || '-'}</td>
                            <td>{formatEmploymentType(employee.employment_type)}</td>
                            <td>{employee.address || '-'}</td>
                            <td>{employee.emergency_contact || '-'}</td>
                            <td>
                              <span className={`badge badge-${employee.is_active ? 'success' : 'secondary'}`}>
                                {employee.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td>
                              <Link href={`/modules/ehr/human-resources/employees/edit/${employee.id}`} className="btn btn-info btn-xs mr-2">
                                Edit
                              </Link>
                              <button
                                type="button"
                                className="btn btn-danger btn-xs"
                                onClick={() => handleDelete(employee.id)}
                                disabled={deletingId === employee.id}
                              >
                                {deletingId === employee.id ? 'Deleting...' : 'Delete'}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="card-footer d-flex justify-content-between align-items-center">
              <div>Page {page} of {totalPages}</div>
              <div>
                <button
                  className="btn btn-secondary btn-sm mr-2"
                  disabled={!hasPrevious && page <= 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  Previous
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={!hasNext && page >= totalPages}
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default EmployeesPage;
