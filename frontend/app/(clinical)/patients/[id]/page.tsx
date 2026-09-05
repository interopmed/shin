'use client';

import React, { useEffect, useState } from 'react';
import PatientDetailScreen from '../../ward/[patientId]/page';
import PatientProfilePage from '../profile/[id]/page';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

import { ASSIGNED_PATIENTS } from '../../unit/page';

export default function UnifiedPatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const { user } = useAuth();
  const [isAdmitted, setIsAdmitted] = useState<boolean | null>(null);
  
  useEffect(() => {
    const checkStatus = async () => {
      try {
        if (user?.token) {
          const data = await api.getPatient(user.token, id) as any;
          if (data && data.status === 'admitted') {
             setIsAdmitted(true);
             return;
          }
        }
      } catch (e) {
        console.warn('Patient not found in DB, using mock data.');
      }
      
      // Fallback mock logic to align with ward page
      const mockPatient = ASSIGNED_PATIENTS.find(p => p.id.toString() === id);
      if (mockPatient && mockPatient.type === 'Clinic') {
        setIsAdmitted(false);
      } else if (id === '3') { // Fallback for ID 3 if not in the list for any reason
        setIsAdmitted(false);
      } else {
        setIsAdmitted(true);
      }
    };
    
    checkStatus();
  }, [id, user]);

  // Memoize the promise to prevent React.use() from suspending infinitely on a new promise each render
  const [patientIdPromise] = useState(() => Promise.resolve({ patientId: id }));

  if (isAdmitted === null) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    );
  }

  // Always render the Ward management optimized page (which dynamically handles admitted vs clinic internally)
  return <PatientDetailScreen params={patientIdPromise} />;
}
