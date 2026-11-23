'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { canAccess, createActiveUserFromToken } from '@/lib/permissions';

const AppointmentCalendarPage = () => {
  const { user, loading: authLoading } = useAuth();
  const activeUser = createActiveUserFromToken(user || undefined);
  const hasAccess = canAccess(activeUser, ['scheduling.read']);
  const isDoctor = activeUser.role === 'doctor';

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
        <div className="patient-list-header" style={{ flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1>{isDoctor ? "My Channeling Calendar" : "Appointment Calendar"}</h1>
            <p className="patient-subtext" style={{ marginTop: '4px' }}>
              {isDoctor
                ? "Visual schedule and timeline for your patient channeling slots"
                : "Visual schedule and timeline for patient appointments"}
            </p>
          </div>
          <div className="patient-header-actions">
            <Link href="/scheduling/appointment" className="patient-ghost-button" style={{ textDecoration: 'none' }}>
              List View
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

        {/* Toolbar */}
        <div
          className="patient-list-toolbar"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 24px',
          }}
        >
          <div className="patient-tabs">
            <Link href="/scheduling/appointment" style={{ textDecoration: 'none' }}>
              <button type="button">All Appointments</button>
            </Link>
            <Link href="/scheduling/appointment/todays" style={{ textDecoration: 'none' }}>
              <button type="button">Today's</button>
            </Link>
            <Link href="/scheduling/appointment/upcoming" style={{ textDecoration: 'none' }}>
              <button type="button">Upcoming</button>
            </Link>
          </div>
        </div>

        {/* Calendar Container Area */}
        <div style={{ padding: '32px 24px', minHeight: '520px', background: '#f8fafc' }}>
          <div
            style={{
              background: '#ffffff',
              border: '1px dashed #cbd5e1',
              borderRadius: '12px',
              padding: '60px 24px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: '#eff6ff',
                color: '#2563eb',
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
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
              {isDoctor ? "My Clinic Schedule & Channeling Slots" : "Interactive Calendar Schedule"}
            </h3>
            <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '480px', margin: '0 auto 20px' }}>
              {isDoctor
                ? "Manage your channeling slots, availability times, and view appointments booked for your clinic."
                : "Filter by doctor or department, drag-and-drop slots, and view daily/weekly provider availability."}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <Link href="/scheduling/appointment/todays" className="patient-ghost-button" style={{ textDecoration: 'none' }}>
                View Today's List
              </Link>
              <Link href="/scheduling/appointment/addNewView" className="patient-primary-button">
                Book Appointment
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentCalendarPage;
