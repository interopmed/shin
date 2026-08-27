'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

interface Doctor {
  id: number;
  name: string;
  department: string;
  img_url?: string;
  speciality?: string;
}

interface PaginatedResponse {
  loading: boolean;
  count: number;
  next?: string | null;
  previous?: string | null;
  results: Doctor[];
}

type PageItem = number | 'ellipsis-left' | 'ellipsis-right';

const TimeSchedulePage = () => {
  const PAGE_SIZE = 25;
  const { user } = useAuth();
  // router removed
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayName, setHolidayName] = useState('');
  const [holidayDesc, setHolidayDesc] = useState('');

  const fetchDoctors = React.useCallback(async () => {
    if (user?.token) {
      setLoading(true);
      try {
        const response = await api.getDoctorsPaginated(user.token, {
          page,
          page_size: PAGE_SIZE,
          search: submittedSearch,
        });
        
        if (response && 'results' in (response as PaginatedResponse)) {
            const paginated = response as PaginatedResponse;
            setDoctors(paginated.results);
            setTotalPages(Math.ceil(paginated.count / PAGE_SIZE) || 1);
            setHasNext(Boolean(paginated.next));
            setHasPrevious(Boolean(paginated.previous));
        } else if (Array.isArray(response)) {
             setDoctors(response as Doctor[]);
             setTotalPages(1);
             setHasNext(false);
             setHasPrevious(page > 1);
        }
      } catch (error) {
        console.error('Failed to fetch doctors:', error);
      } finally {
        setLoading(false);
      }
    }
  }, [user, page, submittedSearch]);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]); 

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSubmittedSearch(searchTerm);
  };

  const openAddHolidayModal = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setHolidayDate('');
    setHolidayName('');
    setHolidayDesc('');
    setShowModal(true);
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor || !user?.token) return;
    setSubmitting(true);

    try {
      await api.createHoliday(user.token, {
        doctor: selectedDoctor.id,
        date: holidayDate,
        name: holidayName,
        description: holidayDesc,
        is_active: true
      });
      // alert('Holiday added successfully!');
      setShowModal(false);
    } catch (error) {
      console.error('Failed to add holiday:', error);
      alert('Failed to add holiday.');
    } finally {
        setSubmitting(false);
    }
  };

  const getAvatarUrl = (doc: Doctor) => {
      if (doc.img_url) return doc.img_url;
      return "/assets/images/user.png";
  };

  const getVisiblePageItems = (): PageItem[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: PageItem[] = [1];
    const startPage = Math.max(2, page - 1);
    const endPage = Math.min(totalPages - 1, page + 1);

    if (startPage > 2) {
      pages.push('ellipsis-left');
    }

    for (let currentPage = startPage; currentPage <= endPage; currentPage += 1) {
      pages.push(currentPage);
    }

    if (endPage < totalPages - 1) {
      pages.push('ellipsis-right');
    }

    pages.push(totalPages);
    return pages;
  };

  return (
    <>
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0 text-dark">Schedule Management</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><Link href="/">Home</Link></li>
                <li className="breadcrumb-item"><Link href="/schedule">Schedule</Link></li>
                <li className="breadcrumb-item active">Doctors List</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          
          {/* Search Card */}
          <div className="card shadow-sm mb-4">
            <div className="card-body">
                <form onSubmit={handleSearch} className="row">
                    <div className="col-md-10">
                        <div className="input-group">
                            <input
                                type="text"
                                className="form-control form-control-lg"
                                placeholder="Search doctor by name or department..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <div className="input-group-append">
                                <button type="submit" className="btn btn-lg btn-default">
                                    <i className="fa fa-search"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    {/* Placeholder for future filters if needed */}
                </form>
            </div>
          </div>

          {/* Doctors List */}
          <div className="card shadow-sm">
            <div className="card-body p-0">
               {loading ? (
                  <div className="text-center p-5">
                      <i className="fas fa-spinner fa-spin fa-3x text-primary"></i>
                  </div>
               ) : doctors.length === 0 ? (
                  <div className="alert alert-info m-3 text-center">
                      <i className="fas fa-info-circle mr-2"></i> No doctors found fitting the criteria.
                  </div>
               ) : (
                  <div className="table-responsive">
                    <table className="table table-striped table-hover mb-0 projects">
                        <thead>
                            <tr>
                                <th style={{ width: '5%' }}>#</th>
                                <th style={{ width: '25%' }}>Doctor Name</th>
                                <th style={{ width: '20%' }}>Department</th>
                                <th style={{ width: '20%' }}>Speciality</th>
                                <th className="text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {doctors.map((doctor, index) => (
                                <tr key={doctor.id}>
                                <td>{(page - 1) * PAGE_SIZE + index + 1}</td>
                                    <td>
                                        <Link href={`/schedule/timeSchedule/${doctor.id}`} className="font-weight-bold text-dark" style={{ textDecoration: 'none' }}>
                                            {doctor.name}
                                        </Link>
                                    </td>
                                    <td>{doctor.department || '-'}</td>
                                    <td>{doctor.speciality || '-'}</td>
                                    <td className="project-actions text-center">
                                        <button 
                                            onClick={() => openAddHolidayModal(doctor)}
                                            className="btn btn-warning btn-sm mr-2"
                                            title="Add Holiday"
                                        >
                                            <i className="fas fa-umbrella-beach"></i>
                                        </button>
                                        <Link href={`/schedule/timeSchedule/${doctor.id}`} className="btn btn-primary btn-sm">
                                            <i className="fas fa-calendar-alt mr-1"></i>
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                  </div>
               )}
            </div>
          </div>

          {/* Pagination */}
          <div className="row mt-3 mb-5">
             <div className="col-12 d-flex justify-content-between align-items-center">
                 <div className="text-muted">
                  Showing {(page - 1) * PAGE_SIZE + (doctors.length > 0 ? 1 : 0)} to {(page - 1) * PAGE_SIZE + doctors.length} entries
                 </div>
                 <nav aria-label="Page navigation">
                    <ul className="pagination m-0">
                    <li className={`page-item ${!hasPrevious ? 'disabled' : ''}`}>
                            <button className="page-link" onClick={() => setPage(1)}>First</button>
                        </li>
                    <li className={`page-item ${!hasPrevious ? 'disabled' : ''}`}>
                            <button className="page-link" onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</button>
                        </li>
                        {getVisiblePageItems().map((item) => {
                          if (typeof item !== 'number') {
                            return (
                              <li key={item} className="page-item disabled">
                                <span className="page-link">...</span>
                              </li>
                            );
                          }

                          return (
                            <li key={item} className={`page-item ${page === item ? 'active' : ''}`}>
                              <button className="page-link" onClick={() => setPage(item)}>{item}</button>
                            </li>
                          );
                        })}
                        <li className={`page-item ${!hasNext ? 'disabled' : ''}`}>
                            <button className="page-link" onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</button>
                        </li>
                        <li className={`page-item ${!hasNext ? 'disabled' : ''}`}>
                            <button className="page-link" onClick={() => setPage(totalPages)}>Last</button>
                        </li>
                    </ul>
                 </nav>
             </div>
          </div>
        </div>
      </section>

      {/* Add Holiday Modal */}
      {showModal && (
        <>
            <div className="modal-backdrop fade show"></div>
            <div className="modal fade show" style={{ display: 'block' }}>
            <div className="modal-dialog">
                <div className="modal-content">
                <div className="modal-header bg-warning">
                    <h4 className="modal-title text-white">
                        <i className="fas fa-umbrella-beach mr-2"></i>
                        Add Holiday for {selectedDoctor?.name}
                    </h4>
                    <button type="button" className="close text-white" onClick={() => setShowModal(false)}>
                    <span aria-hidden="true">&times;</span>
                    </button>
                </div>
                <form onSubmit={handleAddHoliday}>
                    <div className="modal-body">
                    <div className="form-group">
                        <label>Date <span className="text-danger">*</span></label>
                        <input 
                            type="date" 
                            className="form-control" 
                            required 
                            value={holidayDate}
                            onChange={(e) => setHolidayDate(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label>Title/Name <span className="text-danger">*</span></label>
                        <input 
                            type="text" 
                            className="form-control" 
                            placeholder="e.g. Annual Leave, Conference" 
                            required 
                            value={holidayName}
                            onChange={(e) => setHolidayName(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label>Description</label>
                        <textarea 
                            className="form-control" 
                            rows={3}
                            value={holidayDesc}
                            onChange={(e) => setHolidayDesc(e.target.value)}
                        ></textarea>
                    </div>
                    </div>
                    <div className="modal-footer justify-content-between">
                    <button type="button" className="btn btn-default" onClick={() => setShowModal(false)}>Close</button>
                    <button type="submit" className="btn btn-primary" disabled={submitting}>
                        {submitting ? 'Saving...' : 'Save Holiday'}
                    </button>
                    </div>
                </form>
                </div>
            </div>
            </div>
        </>
      )}
    </>
  );
};

export default TimeSchedulePage;
