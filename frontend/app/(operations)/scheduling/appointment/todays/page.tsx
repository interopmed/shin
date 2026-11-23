'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { canAccess, createActiveUserFromToken } from '@/lib/permissions';
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
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
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

const getStatusBadgeStyle = (status: string) => {
  const norm = status?.toLowerCase() || '';
  switch (norm) {
    case 'confirmed':
      return {
        bg: '#ecfdf5',
        color: '#059669',
        border: '1px solid #a7f3d0',
      };
    case 'pending_confirmation':
    case 'pending':
      return {
        bg: '#fffbeb',
        color: '#d97706',
        border: '1px solid #fde68a',
      };
    case 'treated':
    case 'completed':
      return {
        bg: '#eff6ff',
        color: '#2563eb',
        border: '1px solid #bfdbfe',
      };
    case 'cancelled':
      return {
        bg: '#fef2f2',
        color: '#dc2626',
        border: '1px solid #fecaca',
      };
    default:
      return {
        bg: '#f3f4f6',
        color: '#4b5563',
        border: '1px solid #e5e7eb',
      };
  }
};

const TodaysAppointmentsPage = () => {
  const { user, loading: authLoading } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const activeUser = createActiveUserFromToken(user || undefined);
  const hasAccess = canAccess(activeUser, ['scheduling.read']);
  const isDoctor = activeUser.role === 'doctor';

  useEffect(() => {
    if (authLoading) return;

    // If nurse or user without scheduling.read, don't fetch
    if (user && !hasAccess) {
      setLoading(false);
      return;
    }

    const fetchTodayAppointments = async () => {
      if (user?.token) {
        try {
          const data = await api.getTodayAppointments(user.token);
          setAppointments(Array.isArray(data) ? (data as Appointment[]) : []);
        } catch (error) {
          console.error("Failed to fetch today's appointments:", error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    fetchTodayAppointments();
  }, [user, authLoading, hasAccess]);

  const todayStr = useMemo(() => {
    return new Date().toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  // Stats calculation
  const stats = useMemo(() => {
    const total = appointments.length;
    const confirmed = appointments.filter((a) => a.status?.toLowerCase() === 'confirmed').length;
    const pending = appointments.filter((a) =>
      ['pending', 'pending_confirmation'].includes(a.status?.toLowerCase())
    ).length;
    const treated = appointments.filter((a) =>
      ['treated', 'completed'].includes(a.status?.toLowerCase())
    ).length;

    return { total, confirmed, pending, treated };
  }, [appointments]);

  // Filtered appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        apt.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        apt.doctor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        apt.remarks?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'pending'
          ? ['pending', 'pending_confirmation'].includes(apt.status?.toLowerCase())
          : apt.status?.toLowerCase() === statusFilter);

      return matchesSearch && matchesStatus;
    });
  }, [appointments, searchQuery, statusFilter]);

  // Access restricted view for nurses and unauthorized roles
  if (!authLoading && user && !hasAccess) {
    return (
      <div className="patient-list-page">
        <div className="patient-list-card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#fef2f2',
              color: '#dc2626',
              marginBottom: '16px',
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
            Access Restricted
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.95rem', maxWidth: '440px', margin: '0 auto 24px' }}>
            Your role (<strong>{activeUser.displayName}</strong>) does not have permission to view or manage patient appointments.
          </p>
          <Link
            href="/"
            className="patient-primary-button"
            style={{ textDecoration: 'none', display: 'inline-flex' }}
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="patient-list-page">
      <div className="patient-list-card">
        {/* Header */}
        <div className="patient-list-header" style={{ flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '18px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1>{isDoctor ? "My Channeling Appointments (Today)" : "Today's Appointments"}</h1>
              <span
                style={{
                  background: '#f1f5f9',
                  color: '#475569',
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '3px 10px',
                  borderRadius: '9999px',
                  border: '1px solid #cbd5e1',
                }}
              >
                {todayStr}
              </span>
            </div>
            <p className="patient-subtext" style={{ marginTop: '4px' }}>
              {loading
                ? 'Loading appointments...'
                : isDoctor
                ? `${appointments.length} patient appointment${appointments.length !== 1 ? 's' : ''} booked for your clinic today`
                : `${appointments.length} appointment${appointments.length !== 1 ? 's' : ''} scheduled for today`}
            </p>
          </div>
          <div className="patient-header-actions">
            <Link
              href="/scheduling/appointment/calendar"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                textDecoration: 'none',
                color: '#475569',
                fontWeight: 600,
                fontSize: '0.875rem',
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                background: '#ffffff',
                transition: 'all 0.15s ease',
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Calendar View
            </Link>
            <Link href="/scheduling/appointment/addNewView" className="patient-primary-button">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New Appointment
            </Link>
          </div>
        </div>

        {/* Overview Stat Widgets */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            padding: '16px 24px',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              padding: '12px 16px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              Total Today
            </span>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
              {loading ? '-' : stats.total}
            </div>
          </div>
          <div
            style={{
              background: '#ffffff',
              padding: '12px 16px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#059669', textTransform: 'uppercase' }}>
              Confirmed
            </span>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
              {loading ? '-' : stats.confirmed}
            </div>
          </div>
          <div
            style={{
              background: '#ffffff',
              padding: '12px 16px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#d97706', textTransform: 'uppercase' }}>
              Pending
            </span>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#d97706', marginTop: '2px' }}>
              {loading ? '-' : stats.pending}
            </div>
          </div>
          <div
            style={{
              background: '#ffffff',
              padding: '12px 16px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#2563eb', textTransform: 'uppercase' }}>
              Treated / Done
            </span>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#2563eb', marginTop: '2px' }}>
              {loading ? '-' : stats.treated}
            </div>
          </div>
        </div>

        {/* Toolbar with Tabs & Search */}
        <div
          className="patient-list-toolbar"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px',
            padding: '14px 24px',
          }}
        >
          <div className="patient-tabs">
            <Link href="/scheduling/appointment" style={{ textDecoration: 'none' }}>
              <button type="button">All Appointments</button>
            </Link>
            <Link href="/scheduling/appointment/todays" className="active" style={{ textDecoration: 'none' }}>
              <button type="button" className="active">
                Today's
              </button>
            </Link>
            <Link href="/scheduling/appointment/upcoming" style={{ textDecoration: 'none' }}>
              <button type="button">Upcoming</button>
            </Link>
          </div>

          {/* Filters & Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#94a3b8"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patient, notes..."
                style={{
                  height: '34px',
                  paddingLeft: '32px',
                  paddingRight: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '7px',
                  fontSize: '13px',
                  outline: 'none',
                  minWidth: '200px',
                  color: '#111827',
                }}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                height: '34px',
                padding: '0 10px',
                border: '1px solid #d1d5db',
                borderRadius: '7px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#374151',
                background: '#ffffff',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
              <option value="treated">Treated</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="patient-list-footer" style={{ justifyContent: 'center', padding: '4rem' }}>
            <div
              className="lab-orders-spinner"
              style={{
                width: '40px',
                height: '40px',
                border: '3px solid rgba(102, 126, 234, 0.2)',
                borderRadius: '50%',
                borderTopColor: '#667eea',
                animation: 'spin 1s ease-in-out infinite',
              }}
            />
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: '#f1f5f9',
                marginBottom: '16px',
                color: '#64748b',
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <strong style={{ display: 'block', fontSize: '16px', color: '#1e293b', marginBottom: '4px' }}>
              {searchQuery || statusFilter !== 'all'
                ? 'No matching appointments found'
                : isDoctor
                ? 'No channeling appointments scheduled for you today'
                : 'No appointments scheduled for today'}
            </strong>
            <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search criteria or clear your filter.'
                : 'New appointments booked for today will appear here.'}
            </p>
          </div>
        ) : (
          <div className="patient-table-wrap">
            <table className="patient-table">
              <thead>
                <tr>
                  <th>Time / Schedule</th>
                  <th>Patient</th>
                  {!isDoctor && <th>Assigned Doctor</th>}
                  <th>Status</th>
                  <th>Remarks / Notes</th>
                  <th style={{ textAlign: 'right', paddingRight: '20px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.map((appointment) => {
                  const badgeStyle = getStatusBadgeStyle(appointment.status);
                  return (
                    <tr key={appointment.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '4px 8px',
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              borderRadius: '6px',
                              fontWeight: 700,
                              fontSize: '12px',
                              letterSpacing: '0.02em',
                            }}
                          >
                            {formatTime(appointment.date, appointment.slot_time)}
                          </span>
                          <span className="patient-subtext" style={{ fontSize: '12px' }}>
                            {formatDate(appointment.date)}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="patient-name-cell" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: '#f1f5f9',
                              color: '#475569',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '12px',
                            }}
                          >
                            {appointment.patient_name ? appointment.patient_name.charAt(0).toUpperCase() : 'P'}
                          </div>
                          <div>
                            <strong style={{ color: '#0f172a', fontWeight: 600 }}>
                              {appointment.patient_name || `Patient #${appointment.patient}`}
                            </strong>
                            <span className="patient-subtext" style={{ display: 'block', fontSize: '11px' }}>
                              ID: #{appointment.patient}
                            </span>
                          </div>
                        </div>
                      </td>
                      {!isDoctor && (
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#64748b"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                              <circle cx="12" cy="7" r="4" />
                            </svg>
                            <span style={{ fontWeight: 600, color: '#334155' }}>
                              {appointment.doctor_name || `Doctor #${appointment.doctor}`}
                            </span>
                          </div>
                        </td>
                      )}
                      <td>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 10px',
                            borderRadius: '9999px',
                            fontSize: '12px',
                            fontWeight: 700,
                            textTransform: 'capitalize',
                            backgroundColor: badgeStyle.bg,
                            color: badgeStyle.color,
                            border: badgeStyle.border,
                          }}
                        >
                          {appointment.status ? appointment.status.replace('_', ' ') : 'Unknown'}
                        </span>
                      </td>
                      <td>
                        <span className="patient-subtext" style={{ fontSize: '13px', color: '#475569' }}>
                          {appointment.remarks || '—'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', paddingRight: '20px' }}>
                        <div className="patient-row-actions" style={{ justifyContent: 'flex-end' }}>
                          <Link
                            href={`/scheduling/appointment/edit/${appointment.id}`}
                            className="patient-row-menu"
                            style={{
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '32px',
                              height: '32px',
                              borderRadius: '6px',
                              border: '1px solid #e2e8f0',
                              background: '#ffffff',
                              color: '#475569',
                              transition: 'all 0.15s ease',
                            }}
                            title="Edit Appointment"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TodaysAppointmentsPage;
