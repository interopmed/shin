'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

type ProviderEditClientProps = {
  provider: any;
  providerId: string;
};

export default function ProviderEditClient({ provider, providerId }: ProviderEditClientProps) {
  const { user } = useAuth();
  const router = useRouter();

  const [facilities, setFacilities] = useState<any[]>([]);
  const [allUnits, setAllUnits] = useState<any[]>([]);
  
  const [selectedFacility, setSelectedFacility] = useState<string>('');
  const [selectedUnits, setSelectedUnits] = useState<number[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!user?.token || !providerId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const [facilitiesResponse, unitsResponse, assignedUnits] = await Promise.all([
          api.getFacilities(user.token),
          api.getServiceUnits(user.token),
          api.getEmployeeUnits(user.token, providerId).catch(() => ({ units: [], facility: null }))
        ]);

        setFacilities(Array.isArray(facilitiesResponse) ? facilitiesResponse : []);
        const loadedUnits = Array.isArray(unitsResponse) ? unitsResponse : [];
        setAllUnits(loadedUnits);
        
        const assignedData: any = assignedUnits || { units: [], facility: null };
        const unitsArray = Array.isArray(assignedData?.units) 
            ? assignedData.units 
            : (Array.isArray(assignedData) ? assignedData : []);
        setSelectedUnits(unitsArray);

        if (assignedData?.facility) {
           setSelectedFacility(String(assignedData.facility));
        } else if (unitsArray.length > 0 && loadedUnits.length > 0) {
           const firstUnit = loadedUnits.find(u => u.id === unitsArray[0]);
           if (firstUnit && firstUnit.facility_id) {
              setSelectedFacility(String(firstUnit.facility_id));
           }
        }

      } catch (loadError: any) {
        setError(loadError?.message || 'Failed to load assignment data.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, providerId]);

  const handleUnitToggle = (unitId: number) => {
    setSelectedUnits(prev => 
      prev.includes(unitId) 
        ? prev.filter(id => id !== unitId)
        : [...prev, unitId]
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!user?.token || !providerId) {
      setError('You are not authenticated.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await api.updateEmployeeUnits(user.token, providerId, { 
        units: selectedUnits,
        facility: selectedFacility ? Number(selectedFacility) : null
      });

      setShowSuccessModal(true);
    } catch (submitError: any) {
      setError(submitError?.message || 'Failed to save clinical assignments.');
    } finally {
      setSaving(false);
    }
  };
  
  const filteredUnits = selectedFacility 
    ? allUnits.filter(u => String(u.facility_id) === selectedFacility)
    : [];

  return (
    <section className="mpi-page">
      <div className="mpi-card">
        <header className="mpi-header">
          <div>
            <h1>Edit Clinical Provider</h1>
            <p style={{ color: '#667085', fontSize: '13px', fontWeight: 700, margin: '5px 0 0' }}>
              Assigning {provider?.name} to clinical units and wards
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Link className="mpi-select-button" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }} href={`/providers/${providerId}`}>
              Cancel
            </Link>
          </div>
        </header>

        <div style={{ padding: '24px' }}>
          {loading ? (
             <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
               Loading clinical data...
             </div>
          ) : (
          <form onSubmit={handleSubmit} className="patient-create-form" style={{ border: 'none', boxShadow: 'none', padding: 0 }}>
            {error && <p className="patient-form-error" style={{ marginBottom: '16px' }}>{error}</p>}

            <div className="patient-form-grid">
              
              <div style={{ gridColumn: '1 / -1', marginBottom: '8px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                  Facility & Ward Assignments
                </h3>
                <p style={{ color: '#64748b', fontSize: '13px', marginTop: '4px' }}>
                  Select the primary medical facility and map the provider to applicable service units or wards.
                </p>
              </div>
              
              <label style={{ gridColumn: '1 / -1' }}>
                Primary Clinical Facility
                <select
                  value={selectedFacility}
                  onChange={(e) => setSelectedFacility(e.target.value)}
                  style={{ maxWidth: '400px' }}
                >
                  <option value="">Select Facility...</option>
                  {facilities.map((facility) => (
                    <option key={facility.id} value={facility.id}>{facility.name}</option>
                  ))}
                </select>
              </label>
              
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ marginBottom: '12px' }}>Assigned Units & Subunits</label>
                {selectedFacility ? (
                  filteredUnits.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                      {filteredUnits.map(unit => (
                        <label key={unit.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', background: selectedUnits.includes(unit.id) ? '#f0f9ff' : '#fff', transition: 'all 0.2s', borderColor: selectedUnits.includes(unit.id) ? '#bae6fd' : '#e2e8f0' }}>
                          <input
                            type="checkbox"
                            checked={selectedUnits.includes(unit.id)}
                            onChange={() => handleUnitToggle(unit.id)}
                            style={{ width: '18px', height: '18px', margin: 0 }}
                          />
                          <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: selectedUnits.includes(unit.id) ? 600 : 400 }}>
                            {unit.name} 
                            {unit.parent && <span style={{ color: '#64748b', fontSize: '12px', marginLeft: '6px', fontWeight: 400 }}>(Subunit)</span>}
                          </span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '24px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                      <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>No service units configured for this facility.</p>
                    </div>
                  )
                ) : (
                  <div style={{ padding: '24px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                    <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Please select a facility above to view available units.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="patient-form-actions" style={{ marginTop: '32px' }}>
              <Link
                href={`/providers/${providerId}`}
                className="facility-secondary-button"
                style={{ textDecoration: 'none' }}
              >
                Cancel
              </Link>
              <button
                type="submit"
                className="facility-primary-button"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Clinical Assignments'}
              </button>
            </div>
          </form>
          )}
        </div>

        {showSuccessModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <div style={{
              background: 'white', padding: '32px', borderRadius: '12px',
              maxWidth: '420px', width: '100%', textAlign: 'center',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <h2 style={{ margin: '0 0 12px 0', color: '#0f172a', fontSize: '24px' }}>Assignments Saved</h2>
              <p style={{ marginBottom: '24px', color: '#64748b', lineHeight: '1.5' }}>
                Clinical unit and ward assignments have been successfully updated for {provider?.name}.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button 
                  onClick={() => setShowSuccessModal(false)}
                  className="facility-secondary-button"
                >
                  Continue Editing
                </button>
                <button 
                  onClick={() => router.push(`/providers/${providerId}`)}
                  className="facility-primary-button"
                >
                  View Profile
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
