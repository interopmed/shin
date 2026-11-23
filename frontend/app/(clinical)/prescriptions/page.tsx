'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { canAccess, createActiveUserFromToken } from '@/lib/permissions';

interface Prescription {
  id: number;
  patient_id: number;
  patient_name: string;
  doctor_id: number;
  doctor_name: string;
  date: string;
  status: string;
}

const PrescriptionListPage = () => {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);

  const activeUser = createActiveUserFromToken(user || undefined);
  const hasAccess = canAccess(activeUser, ['pharmacy.read']);

  useEffect(() => {
    const fetchPrescriptions = async () => {
      if (user?.token && hasAccess) {
        try {
          // TODO: Fetch from API
          setPrescriptions([]);
        } catch (error) {
          console.error('Failed to fetch prescriptions:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    fetchPrescriptions();
  }, [user, hasAccess]);

  let content;
  if (!hasAccess) {
    return (
      <div className="patient-list-page">
        <div className="patient-list-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
            Access Restricted
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            Your role does not have permission to view or manage prescriptions.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    content = (
      <div className="patient-list-footer" style={{ justifyContent: 'center', padding: '4rem' }}>
        <div className="lab-orders-spinner" style={{ width: '40px', height: '40px', border: '3px solid rgba(102, 126, 234, 0.2)', borderRadius: '50%', borderTopColor: '#667eea', animation: 'spin 1s ease-in-out infinite' }} />
      </div>
    );
  } else if (prescriptions.length === 0) {
    content = (
      <div style={{ padding: '24px' }}>
        <div className="patient-empty-state">
          <strong>No prescriptions found</strong>
          <p>There are no prescriptions on record.</p>
        </div>
      </div>
    );
  } else {
    content = (
      <div className="patient-table-wrap">
        <table className="patient-table">
          <thead>
            <tr>
              <th>ID / Date</th>
              <th>Patient</th>
              <th>Doctor</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {prescriptions.map((prescription) => (
              <tr key={prescription.id}>
                <td>
                  <div className="patient-name-cell">
                    <div>
                      <strong className="patient-name-cell">#{prescription.id}</strong>
                      <span className="patient-subtext">{prescription.date}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <strong className="patient-name-cell">{prescription.patient_name}</strong>
                </td>
                <td>
                  <span className="patient-phone">{prescription.doctor_name}</span>
                </td>
                <td>
                  <span className={`patient-status ${prescription.status === 'Active' ? 'active' : ''}`} style={{ textTransform: 'capitalize' }}>
                    {prescription.status}
                  </span>
                </td>
                <td>
                  <div className="patient-row-actions">
                    <Link href={`/prescription/view/${prescription.id}`} className="patient-row-menu" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginRight: '8px' }} title="View">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    </Link>
                    <Link href={`/prescription/edit/${prescription.id}`} className="patient-row-menu" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} title="Edit">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="patient-list-page">
      <div className="patient-list-card">
        {/* Header */}
        <div className="patient-list-header">
          <div>
            <h1>Prescriptions</h1>
            <p className="patient-subtext" style={{ marginTop: '4px' }}>
              {loading ? 'Loading…' : `${prescriptions.length} prescription${prescriptions.length !== 1 ? 's' : ''} found`}
            </p>
          </div>
          <div className="patient-header-actions">
            <Link href="/prescriptions/add" className="patient-primary-button">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              New Prescription
            </Link>
          </div>
        </div>

        {/* Toolbar */}
        <div className="patient-list-toolbar">
          <div className="patient-tabs">
            <button type="button" className="active">All Prescriptions</button>
            <button type="button">Active</button>
            <button type="button">Past</button>
          </div>
          <div className="patient-tools">
            <div className="patient-search">
              <span aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              </span>
              <input type="search" placeholder="Search prescriptions…" />
            </div>
          </div>
        </div>

        {/* Table */}
        {content}
      </div>
    </div>
  );
};

export default PrescriptionListPage;
