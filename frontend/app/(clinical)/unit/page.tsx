'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { ASSIGNED_PATIENTS } from '@/lib/clinical-mock-data';

export default function MyUnitDashboard() {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const itemsPerPage = 10;
  
  useEffect(() => {
    fetch('http://localhost:8000/api/admissions/')
      .then(res => res.json())
      .then(data => {
        const results = Array.isArray(data) ? data : (data.results || []);
        
        // Map backend Admission data to dashboard format
        const mapped = results.map((adm: any) => ({
          id: adm.patient,
          admission_id: adm.id,
          firm_id: adm.firm,
          unit_id: adm.unit_id,
          name: adm.patient_name || 'Unknown Patient',
          location: adm.bed || 'Unassigned',
          type: 'Ward',
          status: adm.status === 'admitted' ? 'stable' : adm.status,
          lastSeen: new Date(adm.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          alerts: 0,
          priority: 'Normal'
        }));
        
        // Filter out discharged patients and ensure they belong to a Clinical Firm
        const activeAdmissions = mapped.filter((adm: any) => adm.status !== 'discharged' && adm.firm_id);
        
        setAdmissions(activeAdmissions);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching admissions:', err);
        setAdmissions(ASSIGNED_PATIENTS);
        setLoading(false);
      });
  }, []);
  
  const filteredPatients = admissions.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.type.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
  const currentPatients = filteredPatients.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  
  return (
    <section className="mpi-page">
      <div className="mpi-card">
        <header className="mpi-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1>My Unit</h1>
            <p className="patient-db-status">
              {user?.display_name || user?.username || 'Clinical Team'} • {admissions.length} Patients Assigned to Your Firm
            </p>
          </div>
          <div>
            <input 
              type="text" 
              placeholder="Search assigned patients..." 
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
                <th>Patient Name</th>
                <th>Unit / Location</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Last Seen</th>
                <th>Alerts</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentPatients.map((patient) => (
                <tr key={patient.id}>
                  <td><strong><Link href={`/patients/${patient.id}`} style={{ color: '#2563eb', textDecoration: 'none' }}>{patient.name}</Link></strong></td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '14px', color: '#0f172a' }}>{patient.location}</span>
                      <span style={{ 
                        fontSize: '11px', 
                        fontWeight: 600, 
                        padding: '2px 8px', 
                        borderRadius: '12px', 
                        display: 'inline-block',
                        width: 'fit-content',
                        backgroundColor: patient.type === 'Ward' ? '#e0e7ff' : '#dcfce7', 
                        color: patient.type === 'Ward' ? '#4338ca' : '#166534' 
                      }}>
                        {patient.type} Patient
                      </span>
                    </div>
                  </td>
                  <td>
                    {patient.priority === 'High' && <span style={{ color: '#be123c', fontWeight: 700 }}>High</span>}
                    {patient.priority === 'Normal' && <span style={{ color: '#0f172a' }}>Normal</span>}
                    {patient.priority === 'Low' && <span style={{ color: '#64748b' }}>Low</span>}
                  </td>
                  <td>
                    {patient.status === 'abnormal_vitals' && <span style={{ color: '#be123c', fontWeight: 600 }}>Abnormal Vitals</span>}
                    {patient.status === 'pending_vitals' && <span style={{ color: '#d97706', fontWeight: 600 }}>Pending Review</span>}
                    {patient.status === 'stable' && <span style={{ color: '#059669', fontWeight: 600 }}>Stable</span>}
                    {patient.status === 'discharge_ready' && <span style={{ color: '#2563eb', fontWeight: 600 }}>Ready for Discharge</span>}
                  </td>
                  <td>{patient.lastSeen}</td>
                  <td>
                     {patient.alerts > 0 ? (
                       <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 700 }}>
                         {patient.alerts}
                       </span>
                     ) : '—'}
                  </td>
                  <td style={{ display: 'flex', gap: '8px' }}>
                    <Link className="mpi-action-pill low" href={`/patients/${patient.id}`}>
                      Open Chart
                    </Link>
                  </td>
                </tr>
              ))}
              {currentPatients.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                    No assigned patients found.
                  </td>
                </tr>
              )}
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
