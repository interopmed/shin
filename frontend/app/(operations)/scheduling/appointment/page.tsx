'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

interface Appointment {
  id: number;
  patient: number;
  patient_name: string;
  doctor: number;
  doctor_name: string;
  date: string;
  slot_time?: string;
  status: string;
  remarks?: string;
}

const formatDate = (dateTime: string) => {
  const date = new Date(dateTime);
  if (Number.isNaN(date.getTime())) {
    return dateTime;
  }
  return date.toLocaleDateString();
};

const formatTime = (dateTime: string, slotTime?: string) => {
  if (slotTime) {
    return slotTime.slice(0, 5);
  }

  const date = new Date(dateTime);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const statusBadge = (status: string) => {
  switch (status) {
    case 'confirmed':
      return 'success';
    case 'pending_confirmation':
    case 'pending':
      return 'warning';
    case 'treated':
      return 'info';
    case 'cancelled':
      return 'danger';
    default:
      return 'secondary';
  }
};

const AppointmentListPage = () => {
  const { user, loading: authLoading } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait until auth has finished rehydrating before attempting the fetch
    if (authLoading) return;

    const fetchAppointments = async () => {
      if (user?.token) {
        try {
          const data = await api.getAppointments(user.token);
          setAppointments(Array.isArray(data) ? (data as Appointment[]) : []);
        } catch (error) {
          console.error('Failed to fetch appointments:', error);
        } finally {
          setLoading(false);
        }
      } else {
        // No token available after auth finished — stop the spinner
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [user, authLoading]);

  return (
    <div className="patient-list-page">
      <div className="patient-list-card">
        {/* Header */}
        <div className="patient-list-header">
          <div>
            <h1>Appointments</h1>
            <p className="patient-subtext" style={{ marginTop: '4px' }}>
              {loading ? 'Loading…' : `${appointments.length} appointment${appointments.length !== 1 ? 's' : ''} found`}
            </p>
          </div>
          <div className="patient-header-actions">
            <Link href="/scheduling/appointment/calendar" style={{ marginRight: '1rem', textDecoration: 'none', color: '#64748b', fontWeight: 500, fontSize: '0.875rem' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginRight: '6px', verticalAlign: 'text-bottom' }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              Calendar View
            </Link>
            <Link href="/scheduling/appointment/addNewView" className="patient-primary-button">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New Appointment
            </Link>
          </div>
        </div>

        {/* Toolbar */}
        <div className="patient-list-toolbar">
          <div className="patient-tabs">
            <Link href="/scheduling/appointment" className="active" style={{ textDecoration: 'none' }}>
              <button type="button" className="active">All Appointments</button>
            </Link>
            <Link href="/scheduling/appointment/todays" style={{ textDecoration: 'none' }}>
              <button type="button">Today's</button>
            </Link>
            <Link href="/scheduling/appointment/upcoming" style={{ textDecoration: 'none' }}>
              <button type="button">Upcoming</button>
            </Link>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="patient-list-footer" style={{ justifyContent: 'center', padding: '4rem' }}>
            <div className="lab-orders-spinner" style={{ width: '40px', height: '40px', border: '3px solid rgba(102, 126, 234, 0.2)', borderRadius: '50%', borderTopColor: '#667eea', animation: 'spin 1s ease-in-out infinite' }} />
          </div>
        ) : appointments.length === 0 ? (
          <div style={{ padding: '24px' }}>
            <div className="patient-empty-state">
              <strong>No appointments found</strong>
              <p>There are no appointments scheduled.</p>
            </div>
          </div>
        ) : (
          <div className="patient-table-wrap">
            <table className="patient-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Status</th>
                  <th>Remarks</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appointment) => (
                  <tr key={appointment.id}>
                    <td>
                      <div className="patient-name-cell">
                        <div>
                          <strong className="patient-name-cell">{formatDate(appointment.date)}</strong>
                          <span className="patient-subtext">{formatTime(appointment.date, appointment.slot_time)}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <strong className="patient-name-cell">{appointment.patient_name}</strong>
                    </td>
                    <td>
                      <span className="patient-phone">{appointment.doctor_name}</span>
                    </td>
                    <td>
                      <span className={`patient-status ${statusBadge(appointment.status) === 'success' || statusBadge(appointment.status) === 'info' ? 'active' : ''}`} style={{ textTransform: 'capitalize', color: statusBadge(appointment.status) === 'danger' ? '#dc2626' : undefined, background: statusBadge(appointment.status) === 'danger' ? 'rgba(239, 68, 68, 0.1)' : undefined }}>
                        {appointment.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <span className="patient-subtext">{appointment.remarks || '—'}</span>
                    </td>
                    <td>
                      <div className="patient-row-actions">
                        <Link href={`/scheduling/appointment/edit/${appointment.id}`} className="patient-row-menu" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} title="Edit">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppointmentListPage;
