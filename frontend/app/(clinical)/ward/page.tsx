'use client';

import React, { useState } from 'react';
import Link from 'next/link';

// Mock data for ward patients
export const WARD_PATIENTS = [
  { id: 1, name: 'John Doe', room: '201', status: 'pending_vitals', lastVitals: '08:00 AM', alerts: 1 },
  { id: 2, name: 'Jane Smith', room: '203', status: 'stable', lastVitals: '10:00 AM', alerts: 0 },
  { id: 3, name: 'Robert Johnson', room: '204', status: 'discharge_ready', lastVitals: '07:30 AM', alerts: 0 },
  { id: 4, name: 'Emily Davis', room: '205', status: 'abnormal_vitals', lastVitals: '11:15 AM', alerts: 2 },
  { id: 5, name: 'Michael Brown', room: '206', status: 'stable', lastVitals: '10:30 AM', alerts: 0 },
  { id: 6, name: 'Sarah Wilson', room: '207', status: 'pending_vitals', lastVitals: '07:45 AM', alerts: 1 },
  { id: 7, name: 'David Lee', room: '208', status: 'stable', lastVitals: '09:15 AM', alerts: 0 },
  { id: 8, name: 'Laura Garcia', room: '209', status: 'abnormal_vitals', lastVitals: '11:00 AM', alerts: 1 },
  { id: 9, name: 'James Martinez', room: '210', status: 'discharge_ready', lastVitals: '08:30 AM', alerts: 0 },
  { id: 10, name: 'Linda Taylor', room: '211', status: 'stable', lastVitals: '10:45 AM', alerts: 0 },
  { id: 11, name: 'William Thomas', room: '212', status: 'pending_vitals', lastVitals: '07:15 AM', alerts: 0 },
  { id: 12, name: 'Elizabeth Moore', room: '213', status: 'stable', lastVitals: '09:00 AM', alerts: 0 },
];

export default function WardDashboard() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const itemsPerPage = 10;

  React.useEffect(() => {
    fetch('http://localhost:8000/api/admissions/')
      .then(res => res.json())
      .then(data => {
        const results = Array.isArray(data) ? data : (data.results || []);
        // Map backend Admission data to dashboard format
        const mapped = results.map((adm: any) => ({
          id: adm.patient, // using patient ID for routing
          admission_id: adm.id,
          name: adm.patient_name || 'Unknown',
          room: adm.bed || 'Unassigned',
          status: adm.status === 'admitted' ? 'stable' : adm.status,
          lastVitals: 'N/A', // Vitals not in Admission API currently
          alerts: 0,
        }));
        // If API fails or is empty, use mock data
        setAdmissions(mapped.length > 0 ? mapped : WARD_PATIENTS);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching admissions:', err);
        setAdmissions(WARD_PATIENTS);
        setLoading(false);
      });
  }, []);

  const filteredPatients = admissions.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.room && p.room.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
  const currentPatients = filteredPatients.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading ward dashboard...</div>;
  }

  return (
    <section className="mpi-page">
      <div className="mpi-card">
        <header className="mpi-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1>Ward Dashboard</h1>
            <p className="patient-db-status">
              Active Shift: Morning • {admissions.length} Patients Assigned
            </p>
          </div>
          <div>
            <input
              type="text"
              placeholder="Search patients or rooms..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                padding: '10px 16px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                width: '300px',
                outline: 'none',
                fontSize: '14px'
              }}
            />
          </div>
        </header>

        <div className="mpi-table-wrap" style={{ marginTop: '20px' }}>
          <table className="mpi-table">
            <thead>
              <tr>
                <th>Room</th>
                <th>Patient Name</th>
                <th>Status</th>
                <th>Last Vitals</th>
                <th>Alerts</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentPatients.map((patient) => (
                <tr key={patient.id}>
                  <td><strong>{patient.room}</strong></td>
                  <td><strong><Link href={`/patients/${patient.id}`} style={{ color: '#2563eb', textDecoration: 'none' }}>{patient.name}</Link></strong></td>
                  <td>
                    {patient.status === 'abnormal_vitals' && <span style={{ color: '#be123c', fontWeight: 600 }}>Abnormal Vitals</span>}
                    {patient.status === 'pending_vitals' && <span style={{ color: '#d97706', fontWeight: 600 }}>Pending Vitals</span>}
                    {patient.status === 'stable' && <span style={{ color: '#059669', fontWeight: 600 }}>Stable</span>}
                    {patient.status === 'discharge_ready' && <span style={{ color: '#2563eb', fontWeight: 600 }}>Ready for Discharge</span>}
                  </td>
                  <td>{patient.lastVitals}</td>
                  <td>
                    {patient.alerts > 0 ? (
                      <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 700 }}>
                        {patient.alerts}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ display: 'flex', gap: '8px' }}>
                    <Link className="mpi-action-pill low" href={`/ward/${patient.id}/vitals`}>
                      Record Vitals
                    </Link>
                    {patient.admission_id && (
                      <button
                        className="mpi-action-pill"
                        style={{ background: '#dbeafe', color: '#1e40af', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                        onClick={async () => {
                          if (window.confirm(`Are you sure you want to discharge ${patient.name}?`)) {
                            try {
                              const res = await fetch(`http://localhost:8000/api/admissions/${patient.admission_id}/discharge/`, {
                                method: 'POST'
                              });
                              if (res.ok) {
                                alert('Patient discharged successfully!');
                                window.location.reload();
                              } else {
                                alert('Failed to discharge patient');
                              }
                            } catch (e) {
                              console.error(e);
                              alert('Error discharging patient');
                            }
                          }
                        }}
                      >
                        Discharge
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderTop: '1px solid #f1f5f9', flexWrap: 'wrap', gap: '12px' }}>
          <span style={{ fontSize: '14px', color: '#64748b' }}>
            Showing {filteredPatients.length === 0 ? 0 : ((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredPatients.length)} of {filteredPatients.length} results
          </span>
          {totalPages > 0 && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="button secondary compact"
                style={{ padding: '6px 12px', fontSize: '13px', opacity: currentPage === 1 ? 0.5 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
              >
                Previous
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    style={{
                      width: '32px', height: '32px', borderRadius: '4px', border: '1px solid',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                      borderColor: currentPage === i + 1 ? '#2563eb' : '#e2e8f0',
                      backgroundColor: currentPage === i + 1 ? '#eff6ff' : 'white',
                      color: currentPage === i + 1 ? '#1d4ed8' : '#475569'
                    }}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="button secondary compact"
                style={{ padding: '6px 12px', fontSize: '13px', opacity: currentPage === totalPages ? 0.5 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
              >
                Next
              </button>
            </div>
          )}
        </div>

      </div>
    </section>
  );
}
