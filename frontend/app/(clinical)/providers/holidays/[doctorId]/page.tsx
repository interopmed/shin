'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

interface Doctor {
  id: number;
  name: string;
  department: string;
  email: string;
  phone?: string;
  address?: string;
  img_url?: string;
}

interface Holiday {
  id: number;
  doctor: number;
  date: string;
  name: string;
  description: string;
  is_active: boolean;
}

const DoctorSchedulePage = () => {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const doctorId = params?.doctorId as string;

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayName, setHolidayName] = useState('');
  const [holidayDesc, setHolidayDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    if (user?.token && doctorId) {
      setLoading(true);
      try {
        const [doctorResponse, holidaysResponse] = await Promise.all([
          api.getDoctor(user.token, doctorId),
          api.getHolidays(user.token, { doctor: doctorId }),
        ]);
        if (doctorResponse && 'id' in (doctorResponse as Doctor)) {
             setDoctor(doctorResponse as Doctor);
        } else if (doctorResponse && 'results' in (doctorResponse as any)) {
             setDoctor((doctorResponse as any).results[0] as Doctor);
        }

        // Sort holidays by date descending
        const hList = Array.isArray(holidaysResponse) ? holidaysResponse : holidaysResponse.results || [];
        hList.sort((a: Holiday, b: Holiday) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setHolidays(hList);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, doctorId]);

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctor || !user?.token) return;
    setSubmitting(true);

    try {
      await api.createHoliday(user.token, {
        doctor: doctor.id,
        date: holidayDate,
        name: holidayName,
        description: holidayDesc,
        is_active: true
      });
      // Reset form
      setHolidayDate('');
      setHolidayName('');
      setHolidayDesc('');
      setShowModal(false);
      
      // Refresh list
      const holidaysResponse = await api.getHolidays(user.token, { doctor: doctorId });
      const hList = Array.isArray(holidaysResponse) ? holidaysResponse : holidaysResponse.results || [];
      hList.sort((a: Holiday, b: Holiday) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setHolidays(hList);
      
      // Show success feedback if possible, or just modal close is fine
    } catch (error) {
      console.error('Failed to add holiday:', error);
      alert('Failed to add holiday.');
    } finally {
      setSubmitting(false);
    }
  };

  const getUpcomingHolidays = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return holidays.filter(h => new Date(h.date) >= today).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const getPastHolidays = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return holidays.filter(h => new Date(h.date) < today);
  };

  const handleDeleteHoliday = async (id: number) => {
    if (!confirm('Are you sure you want to delete this holiday?')) return;
    if (!user?.token) return;
    
    try {
      await api.deleteHoliday(user.token, id);
      setHolidays(prev => prev.filter(h => h.id !== id));
    } catch (error) {
        console.error('Failed to delete holiday:', error);
        alert('Failed to delete holiday');
    }
  };

  // Helper to get day name
  const getDayName = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('default', { weekday: 'long' });
  };
  
  // Helper to get formatted date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('default', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const getAvatarUrl = (doc: Doctor) => {
      if (doc.img_url) return doc.img_url;
      return "/assets/images/user.png"; // Default
  };

  return (
    <>
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0 text-dark">Manage Schedule</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><Link href="/">Home</Link></li>
                <li className="breadcrumb-item"><Link href="/schedule">Schedule</Link></li>
                <li className="breadcrumb-item"><Link href="/schedule/timeSchedule">Doctors List</Link></li>
                <li className="breadcrumb-item active">Profile</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-3">
              {/* Profile Image */}
              <div className="card card-primary card-outline shadow-sm">
                <div className="card-body box-profile">
                  <div className="text-center">
                    <img
                      className="profile-user-img img-fluid img-circle"
                      src={doctor ? getAvatarUrl(doctor) : "/assets/images/user.png"}
                      alt="User profile picture"
                      style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                    />
                  </div>

                  <h3 className="profile-username text-center mb-0 mt-3">{doctor?.name}</h3>
                  <p className="text-muted text-center mb-3">{doctor?.department}</p>

                  <ul className="list-group list-group-unbordered mb-3">
                    <li className="list-group-item">
                      <b>Holidays (Total)</b> <span className="float-right badge badge-info">{holidays.length}</span>
                    </li>
                    <li className="list-group-item">
                      <b>Upcoming</b> <span className="float-right badge badge-warning">{getUpcomingHolidays().length}</span>
                    </li>
                  </ul>

                  <button className="btn btn-primary btn-block" onClick={() => setShowModal(true)}>
                    <i className="fas fa-plus mr-2"></i><b>Add Holiday</b>
                  </button>
                  <Link href="/schedule/timeSchedule" className="btn btn-default btn-block mt-2">
                    <i className="fas fa-arrow-left mr-2"></i>Back to List
                  </Link>
                </div>
              </div>

               {/* About Me Box */}
              <div className="card card-primary">
                <div className="card-header">
                  <h3 className="card-title">About Doctor</h3>
                </div>
                <div className="card-body">
                  <strong><i className="fas fa-envelope mr-1"></i> Email</strong>
                  <p className="text-muted">{doctor?.email || 'N/A'}</p>
                  <hr />
                  <strong><i className="fas fa-map-marker-alt mr-1"></i> Location</strong>
                  <p className="text-muted">{doctor?.address || 'Main Hospital Branch'}</p>
                  <hr />
                  <strong><i className="fas fa-phone mr-1"></i> Contact</strong>
                  <p className="text-muted">{doctor?.phone || 'N/A'}</p>
                </div>
              </div>
            </div>

            <div className="col-md-9">
              <div className="card card-outline card-tabs shadow-sm" style={{ borderTop: '3px solid #007bff' }}>
                <div className="card-header p-0 pt-1 border-bottom-0">
                  <ul className="nav nav-tabs" id="custom-tabs-three-tab" role="tablist">
                    <li className="nav-item">
                      <a 
                        className={`nav-link ${activeTab === 'upcoming' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('upcoming')}
                        href="#"
                        role="tab"
                      >
                       <i className="fas fa-calendar-check mr-2"></i> Upcoming
                      </a>
                    </li>
                    <li className="nav-item">
                      <a 
                        className={`nav-link ${activeTab === 'past' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('past')}
                        href="#"
                        role="tab"
                      >
                        <i className="fas fa-history mr-2"></i> Past History
                      </a>
                    </li>
                  </ul>
                </div>
                <div className="card-body">
                  <div className="tab-content">
                    {loading ? (
                         <div className="text-center p-5">
                            <i className="fas fa-spinner fa-spin fa-2x text-primary"></i>
                         </div>
                    ) : (
                        <>
                            {activeTab === 'upcoming' && (
                                <div className="tab-pane fade show active">
                                    {getUpcomingHolidays().length === 0 ? (
                                        <div className="text-center py-5 text-muted">
                                            <i className="far fa-calendar-times fa-3x mb-3"></i>
                                            <p>No upcoming holidays scheduled.</p>
                                            <button className="btn btn-outline-primary btn-sm" onClick={() => setShowModal(true)}>
                                                Schedule One Now
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="timeline timeline-inverse">
                                            {getUpcomingHolidays().map((holiday) => (
                                                <div key={holiday.id}>
                                                    <i className="fas fa-plane bg-primary"></i>
                                                    <div className="timeline-item">
                                                        <span className="time"><i className="far fa-clock"></i> {getDayName(holiday.date)}</span>
                                                        <h3 className="timeline-header"><span className="text-primary font-weight-bold">{formatDate(holiday.date)}</span> - {holiday.name}</h3>
                                                        <div className="timeline-body">
                                                            {holiday.description || 'No additional details provided.'}
                                                        </div>
                                                        <div className="timeline-footer">
                                                            <button 
                                                                onClick={() => handleDeleteHoliday(holiday.id)}
                                                                className="btn btn-danger btn-xs"
                                                            >
                                                                <i className="fas fa-trash mr-1"></i> Delete
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            <div>
                                                <i className="far fa-clock bg-gray"></i>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'past' && (
                                <div className="tab-pane fade show active">
                                     {getPastHolidays().length === 0 ? (
                                        <div className="alert alert-light text-center">No past holiday history found.</div>
                                     ) : (
                                        <div className="table-responsive">
                                            <table className="table table-hover table-striped">
                                                <thead>
                                                    <tr>
                                                        <th>Date</th>
                                                        <th>Day</th>
                                                        <th>Name</th>
                                                        <th>Description</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {getPastHolidays().map((holiday) => (
                                                        <tr key={holiday.id}>
                                                            <td className="text-muted">{formatDate(holiday.date)}</td>
                                                            <td><small className="badge badge-secondary">{getDayName(holiday.date)}</small></td>
                                                            <td className="font-weight-bold">{holiday.name}</td>
                                                            <td>{holiday.description}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                     )}
                                </div>
                            )}
                        </>
                    )}
                  </div>
                </div>
              </div>
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
                <div className="modal-header bg-primary text-white">
                    <h4 className="modal-title">
                        <i className="fas fa-umbrella-beach mr-2"></i>
                        Add Holiday
                    </h4>
                    <button type="button" className="close text-white" onClick={() => setShowModal(false)}>
                    <span aria-hidden="true">&times;</span>
                    </button>
                </div>
                <form onSubmit={handleAddHoliday}>
                    <div className="modal-body">
                    <div className="form-group">
                        <label>Date <span className="text-danger">*</span></label>
                        <div className="input-group">
                            <div className="input-group-prepend">
                                <span className="input-group-text"><i className="far fa-calendar-alt"></i></span>
                            </div>
                            <input 
                                type="date" 
                                className="form-control" 
                                required 
                                value={holidayDate}
                                onChange={(e) => setHolidayDate(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Reason / Title <span className="text-danger">*</span></label>
                        <input 
                            type="text" 
                            className="form-control" 
                            placeholder="e.g. Annual Leave, Medical Conf..." 
                            required 
                            value={holidayName}
                            onChange={(e) => setHolidayName(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label>Description (Optional)</label>
                        <textarea 
                            className="form-control" 
                            rows={3}
                            placeholder="Additional details..."
                            value={holidayDesc}
                            onChange={(e) => setHolidayDesc(e.target.value)}
                        ></textarea>
                    </div>
                    </div>
                    <div className="modal-footer justify-content-between">
                    <button type="button" className="btn btn-default" onClick={() => setShowModal(false)}>Cancel</button>
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

export default DoctorSchedulePage;

