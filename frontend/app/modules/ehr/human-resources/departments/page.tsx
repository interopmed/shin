'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

interface Department {
  id: number;
  name?: string;
  description?: string;
  head_name?: string;
  is_active?: boolean;
}

interface DepartmentPageResponse {
  count: number;
  next?: string | null;
  previous?: string | null;
  results: Department[];
}

const DepartmentsPage = () => {
  const { user } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);

  const pageSize = 25;

  const query = useMemo(() => {
    const params: Record<string, string> = {
      page: String(page),
      page_size: String(pageSize),
      ordering: 'name',
    };

    const term = search.trim();
    if (term) {
      params.search = term;
    }

    return params;
  }, [page, search]);

  useEffect(() => {
    const fetchDepartments = async () => {
      if (!user?.token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const response = await api.getEmployeeDepartments(user.token, query);

        if (response && 'results' in (response as DepartmentPageResponse)) {
          const paginated = response as DepartmentPageResponse;
          setDepartments(paginated.results || []);
          setTotalCount(paginated.count || 0);
          setHasNext(Boolean(paginated.next));
          setHasPrevious(Boolean(paginated.previous));
        } else {
          const rows = Array.isArray(response) ? (response as Department[]) : [];
          setDepartments(rows);
          setTotalCount(rows.length);
          setHasNext(false);
          setHasPrevious(page > 1);
        }
      } catch (err) {
        console.error('Failed to load departments:', err);
        setError('Failed to load departments.');
      } finally {
        setLoading(false);
      }
    };

    fetchDepartments();
  }, [user, query, page]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <>
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Departments</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><Link href="/">Home</Link></li>
                <li className="breadcrumb-item active">Departments</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center flex-wrap" style={{ gap: '0.5rem' }}>
              <h3 className="card-title mb-0">Department Details</h3>
              <div className="d-flex align-items-center justify-content-end flex-nowrap ml-auto" style={{ gap: '0.5rem' }}>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Name, Description"
                  style={{ minWidth: 260 }}
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                />
                <Link href="/modules/ehr/human-resources/departments/add" className="btn btn-primary btn-sm text-nowrap">
                  Add Department
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
                        <th style={{ width: 90 }}>ID</th>
                        <th>Name</th>
                        <th>Description</th>
                        <th>Department Head</th>
                        <th style={{ width: 120 }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {departments.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center">No departments found</td>
                        </tr>
                      ) : (
                        departments.map((department) => (
                          <tr key={department.id}>
                            <td>{department.id}</td>
                            <td>{department.name || '-'}</td>
                            <td>{department.description || '-'}</td>
                            <td>{department.head_name || '-'}</td>
                            <td>
                              <span className={`badge badge-${department.is_active ? 'success' : 'secondary'}`}>
                                {department.is_active ? 'Active' : 'Inactive'}
                              </span>
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

export default DepartmentsPage;
