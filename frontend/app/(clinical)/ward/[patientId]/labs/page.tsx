'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function PatientLabHistory({ params }: { params: Promise<{ patientId: string }> }) {
  const patientId = React.use(params).patientId;
  const [patientData, setPatientData] = useState<any>(null);

  // Mock comprehensive lab history
  const allLabs = [
    { id: 'ORD-10492', category: 'Chemistry', test: 'Hemoglobin A1c', result: '7.2', unit: '%', range: '< 5.7', flag: 'High', date: '2026-08-30 08:15 AM', provider: 'Dr. House' },
    { id: 'ORD-10492', category: 'Chemistry', test: 'Creatinine', result: '0.9', unit: 'mg/dL', range: '0.6 - 1.1', flag: 'Normal', date: '2026-08-30 08:15 AM', provider: 'Dr. House' },
    { id: 'ORD-10492', category: 'Lipid Panel', test: 'LDL Cholesterol', result: '145', unit: 'mg/dL', range: '< 100', flag: 'High', date: '2026-08-30 08:15 AM', provider: 'Dr. House' },
    { id: 'ORD-10491', category: 'Hematology', test: 'White Blood Cell', result: '11.5', unit: 'x10^3/uL', range: '4.5 - 11.0', flag: 'High', date: '2026-08-29 09:30 AM', provider: 'Dr. Wilson' },
    { id: 'ORD-10491', category: 'Hematology', test: 'Hemoglobin', result: '13.8', unit: 'g/dL', range: '12.0 - 15.5', flag: 'Normal', date: '2026-08-29 09:30 AM', provider: 'Dr. Wilson' },
    { id: 'ORD-10491', category: 'Hematology', test: 'Platelets', result: '250', unit: 'x10^3/uL', range: '150 - 450', flag: 'Normal', date: '2026-08-29 09:30 AM', provider: 'Dr. Wilson' },
    { id: 'ORD-10450', category: 'Chemistry', test: 'Potassium', result: '4.1', unit: 'mEq/L', range: '3.5 - 5.1', flag: 'Normal', date: '2026-07-15 10:00 AM', provider: 'Dr. House' },
    { id: 'ORD-10450', category: 'Chemistry', test: 'Sodium', result: '138', unit: 'mEq/L', range: '135 - 145', flag: 'Normal', date: '2026-07-15 10:00 AM', provider: 'Dr. House' },
  ];

  useEffect(() => {
    // Load patient basics from local mock database
    const localData = localStorage.getItem(`patient_mock_${patientId}`);
    if (localData) {
      setPatientData(JSON.parse(localData).patient);
    } else {
      // Fallback
      setPatientData({ id: patientId, name: 'Jane Smith', phn: 'PHN-987654321' });
    }
  }, [patientId]);

  const [search, setSearch] = useState('');
  
  const filteredLabs = allLabs.filter(l => l.test.toLowerCase().includes(search.toLowerCase()) || l.category.toLowerCase().includes(search.toLowerCase()));

  if (!patientData) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;

  return (
    <section className="mpi-page" style={{ overflowX: 'hidden' }}>
      <div style={{ marginBottom: '24px' }}>
        <Link href={`/ward/${patientId}`} style={{ color: '#64748b', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 500 }}>
          ← Back to Patient Record
        </Link>
      </div>

      <div className="mpi-card" style={{ marginBottom: '32px' }}>
        <header className="mpi-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 32px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', color: '#0f172a' }}>Detailed Investigations: Lab History</h1>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '15px' }}>
              Patient: <strong>{patientData.name}</strong> • MRN: {patientData.phn}
            </p>
          </div>
          <div>
            <input 
              type="text" 
              placeholder="Search tests or categories..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                padding: '10px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '300px', outline: 'none', fontSize: '14px'
              }}
            />
          </div>
        </header>

        <div className="mpi-table-wrap" style={{ borderTop: '1px solid #e2e8f0' }}>
          <table className="mpi-table" style={{ border: 'none', tableLayout: 'fixed', width: '100%' }}>
            <thead style={{ backgroundColor: '#f8fafc' }}>
              <tr>
                <th style={{ borderTop: 'none', paddingLeft: '32px', width: '15%' }}>Date & Time</th>
                <th style={{ borderTop: 'none', width: '15%' }}>Category</th>
                <th style={{ borderTop: 'none', width: '25%' }}>Test Name</th>
                <th style={{ borderTop: 'none', width: '15%' }}>Result</th>
                <th style={{ borderTop: 'none', width: '15%' }}>Ref Range</th>
                <th style={{ borderTop: 'none', width: '15%' }}>Provider</th>
              </tr>
            </thead>
            <tbody>
              {filteredLabs.map((lab, i) => (
                <tr key={i} style={{ backgroundColor: lab.flag === 'High' || lab.flag === 'Low' ? '#fff1f2' : 'transparent' }}>
                  <td style={{ paddingLeft: '32px', color: '#64748b' }}>{lab.date}</td>
                  <td>
                    <span style={{ backgroundColor: '#e2e8f0', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                      {lab.category}
                    </span>
                  </td>
                  <td style={{ fontWeight: 500, color: '#0f172a' }}>{lab.test}</td>
                  <td>
                    <span style={{ fontWeight: 700, color: lab.flag === 'High' || lab.flag === 'Low' ? '#be123c' : '#0f172a' }}>
                      {lab.result} {lab.unit}
                    </span>
                    {lab.flag !== 'Normal' && (
                      <span style={{ marginLeft: '8px', color: '#be123c', fontSize: '12px', fontWeight: 800 }}>({lab.flag})</span>
                    )}
                  </td>
                  <td style={{ color: '#64748b' }}>{lab.range}</td>
                  <td style={{ color: '#475569' }}>{lab.provider}</td>
                </tr>
              ))}
              {filteredLabs.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                    No lab results found for this search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
