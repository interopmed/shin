'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DischargeChecklist() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.patientId;
  const [loading, setLoading] = useState(false);
  
  const [checks, setChecks] = useState({
    instructions: false,
    prescriptions: false,
    billing: false,
    transport: false,
  });

  const allChecked = Object.values(checks).every(Boolean);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Mock save
    setTimeout(() => {
      setLoading(false);
      router.push('/ward');
    }, 1000);
  };

  return (
    <section className="mpi-page">
      <div className="mpi-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <header className="mpi-header">
          <div>
            <h1>Discharge Checklist</h1>
            <p className="patient-db-status">Patient ID: {patientId}</p>
          </div>
          <Link href="/ward" className="mpi-filter-button" style={{ display: 'inline-flex', alignItems: 'center', height: '34px', padding: '0 12px', borderRadius: '8px', border: '1px solid #ccd6e2', background: '#fff', fontSize: '13px', fontWeight: 800 }}>
            Cancel
          </Link>
        </header>

        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', fontWeight: 500, cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={checks.instructions} 
                onChange={(e) => setChecks({...checks, instructions: e.target.checked})}
                style={{ width: '18px', height: '18px' }}
              />
              Post-discharge instructions printed and reviewed with patient
            </label>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', fontWeight: 500, cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={checks.prescriptions} 
                onChange={(e) => setChecks({...checks, prescriptions: e.target.checked})}
                style={{ width: '18px', height: '18px' }}
              />
              Take-home prescriptions sent to pharmacy
            </label>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', fontWeight: 500, cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={checks.billing} 
                onChange={(e) => setChecks({...checks, billing: e.target.checked})}
                style={{ width: '18px', height: '18px' }}
              />
              Billing department notified of impending discharge
            </label>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', fontWeight: 500, cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={checks.transport} 
                onChange={(e) => setChecks({...checks, transport: e.target.checked})}
                style={{ width: '18px', height: '18px' }}
              />
              Transport arranged / Family member confirmed
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
            <button 
              type="submit" 
              disabled={loading || !allChecked} 
              className="mpi-primary-button" 
              style={{ border: 'none', cursor: (loading || !allChecked) ? 'not-allowed' : 'pointer', opacity: (!allChecked) ? 0.5 : 1 }}
            >
              {loading ? 'Processing...' : 'Finalize Discharge & Clear Bed'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
