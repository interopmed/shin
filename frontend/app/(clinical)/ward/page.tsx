'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { WARD_PATIENTS } from '@/lib/clinical-mock-data';

export default function WardDashboard() {
  const { user } = useAuth();
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
          unit_id: adm.unit_id,
          name: adm.patient_name || 'Unknown',
          room: adm.bed || 'Unassigned',
          status: adm.status === 'admitted' ? 'stable' : adm.status,
          lastVitals: 'N/A', // Vitals not in Admission API currently
          alerts: 0,
        }));
        
        // Filter out discharged patients and always use API results even if empty
        const activeAdmissions = mapped.filter((adm: any) => adm.status !== 'discharged');
        setAdmissions(activeAdmissions);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching admissions:', err);
        // Only use mock data on complete API failure
        setAdmissions(WARD_PATIENTS);
        setLoading(false);
      });
  }, []);

  const filteredPatients = admissions.filter(p => {
    // Role-based unit filtering
    const userUnits = user?.scope?.unit_ids;
    if (userUnits && userUnits.length > 0 && p.unit_id) {
       if (!userUnits.includes(p.unit_id)) return false;
    }

    return p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.room && p.room.toLowerCase().includes(searchQuery.toLowerCase()));
  });

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
                    <Link className="mpi-action-pill" href={`/patients/${patient.id}`} style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', textDecoration: 'none' }}>
                      Admission Workflow
                    </Link>
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
