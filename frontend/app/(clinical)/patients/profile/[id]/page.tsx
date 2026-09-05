'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import PatientLabHistory from '@/components/lab/PatientLabHistory';

interface Patient {
  id: number;
  patient_id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  sex: string;
  birthdate: string;
  bloodgroup: string;
  img_url: string;
  note: string;
  ion_user_id: number;
}

const PatientProfilePage = () => {
  const { user } = useAuth();
  const params = useParams();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    test_count: 0,
    document_count: 0,
    appointment_count: 0,
  });

  useEffect(() => {
    const fetchPatientData = async () => {
      if (user?.token && params?.id) {
        try {
          const data = await api.getPatient(user.token, String(params?.id)) as Patient;
          setPatient(data);
          // TODO: Fetch stats from API
          setStats({
            test_count: 0,
            document_count: 0,
            appointment_count: 0,
          });
        } catch (error) {
          console.warn('Patient not found in DB, using mock data:', error);
          // Fallback mock patient for clinic view
          setPatient({
            id: Number(params?.id),
            patient_id: `PHN-98765432${params?.id}`,
            name: 'Clinic Patient (Mock)',
            email: 'patient@example.com',
            phone: '555-0199',
            address: '123 Mock Street',
            sex: 'Female',
            birthdate: '1981-01-12',
            bloodgroup: 'O+',
            img_url: '',
            note: 'Mock clinic data.',
            ion_user_id: 1,
          } as Patient);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchPatientData();
  }, [user, params?.id]);

  const calculateAge = (birthdate: string) => {
    if (!birthdate) return 'N/A';
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age + ' years';
  };

  if (loading) {
    return (
      <div className="content">
        <div className="container-fluid">
          <div className="text-center">
            <div className="spinner-border" role="status">
              <span className="sr-only">Loading...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="content">
        <div className="container-fluid">
          <div className="alert alert-danger">Patient not found</div>
        </div>
      </div>
    );
  }

  const getImageUrl = () => {
    if (patient.img_url) return patient.img_url;
    const sex = patient.sex?.toLowerCase() || 'male';
    return `/images/profile/user_${sex}.png`;
  };

  return (
    <section className="mpi-page" style={{ overflowX: 'hidden' }}>
      {/* Banner / Header Card */}
      <div className="mpi-card" style={{ marginBottom: "32px", position: 'relative', overflow: 'hidden' }}>
        <header className="mpi-header" style={{ alignItems: 'flex-start', padding: '32px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '32px' }}>
          <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
            <div className="user-profile-img text-center">
              <img
                src={getImageUrl()}
                alt="User profile picture"
                style={{ width: '84px', height: '84px', borderRadius: '50%', objectFit: 'cover', border: '4px solid #e0e7ff' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div className="eyebrow" style={{ color: "var(--accent)", textTransform: "uppercase", fontSize: "0.85rem", fontWeight: "bold", letterSpacing: '0.5px' }}>Clinic Patient</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <h1 style={{ margin: 0, fontSize: '32px', color: '#0f172a', fontWeight: 800, letterSpacing: '-0.5px' }}>{patient.name}</h1>
                <span style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '6px 16px', borderRadius: '24px', fontSize: '14px', fontWeight: 600, textTransform: 'capitalize' }}>
                  Clinic
                </span>
              </div>
              <p className="patient-db-status" style={{ margin: 0, fontSize: '16px', color: '#475569', lineHeight: '1.5' }}>
                {calculateAge(patient.birthdate)} • {patient.sex} • PHN/MRN: <strong style={{color: '#0f172a'}}>{patient.patient_id || 'N/A'}</strong>
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Link href={`/patient/edit/${patient.id}`} className="button secondary" style={{ padding: '8px 20px', fontWeight: 600, textDecoration: 'none' }}>
              Edit Profile
            </Link>
          </div>
        </header>

        {/* Quick Stats Bar */}
        <div style={{ padding: '24px 32px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '32px', flexWrap: 'wrap', backgroundColor: '#f8fafc' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Tests</span>
            <span style={{ fontSize: '20px', color: '#0f172a', fontWeight: 700 }}>{stats.test_count}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Documents</span>
            <span style={{ fontSize: '20px', color: '#0f172a', fontWeight: 700 }}>{stats.document_count}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Appointments</span>
            <span style={{ fontSize: '20px', color: '#0f172a', fontWeight: 700 }}>{stats.appointment_count}</span>
          </div>
        </div>
      </div>

      <style>{`
        .dashboard-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
          align-items: start;
        }
        @media (min-width: 1024px) {
          .dashboard-grid {
            grid-template-columns: 350px 1fr;
          }
        }
      `}</style>
      
      <div className="dashboard-grid">
        {/* Left Column: Demographics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="mpi-card">
            <div style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '18px', margin: '0 0 24px 0', color: '#0f172a' }}>About Patient</h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Age</div>
                  <div style={{ color: '#0f172a', fontWeight: 500 }}>{calculateAge(patient.birthdate)}</div>
                </div>
                <div style={{ borderTop: '1px solid #f1f5f9' }}></div>
                
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Gender</div>
                  <div style={{ color: '#0f172a', fontWeight: 500 }}>{patient.sex}</div>
                </div>
                <div style={{ borderTop: '1px solid #f1f5f9' }}></div>

                <div>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Phone</div>
                  <div style={{ color: '#0f172a', fontWeight: 500 }}>{patient.phone || 'N/A'}</div>
                </div>
                <div style={{ borderTop: '1px solid #f1f5f9' }}></div>

                <div>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Address</div>
                  <div style={{ color: '#0f172a', fontWeight: 500 }}>{patient.address || 'N/A'}</div>
                </div>

                {patient.email && patient.email !== patient.phone && (
                  <>
                    <div style={{ borderTop: '1px solid #f1f5f9' }}></div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Email</div>
                      <div style={{ color: '#0f172a', fontWeight: 500 }}>{patient.email}</div>
                    </div>
                  </>
                )}

                {patient.birthdate && (
                  <>
                    <div style={{ borderTop: '1px solid #f1f5f9' }}></div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Birthday</div>
                      <div style={{ color: '#0f172a', fontWeight: 500 }}>{patient.birthdate}</div>
                    </div>
                  </>
                )}

                {patient.bloodgroup && (
                  <>
                    <div style={{ borderTop: '1px solid #f1f5f9' }}></div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Blood Group</div>
                      <div style={{ color: '#0f172a', fontWeight: 500 }}>{patient.bloodgroup}</div>
                    </div>
                  </>
                )}

                {patient.note && (
                  <>
                    <div style={{ borderTop: '1px solid #f1f5f9' }}></div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Notes</div>
                      <div style={{ color: '#0f172a', fontWeight: 500 }}>{patient.note}</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Labs, Appointments, etc */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="mpi-card">
            <div style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '18px', margin: '0 0 24px 0', color: '#0f172a' }}>Lab Tests</h2>
              <div style={{ margin: '-24px', marginTop: '0' }}>
                <PatientLabHistory patientId={String(params?.id)} />
              </div>
            </div>
          </div>

          <div className="mpi-card">
            <div style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '18px', margin: '0 0 16px 0', color: '#0f172a' }}>Appointments</h2>
              <p style={{ color: '#64748b', margin: 0 }}>Appointments will be displayed here.</p>
            </div>
          </div>

          <div className="mpi-card">
            <div style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '18px', margin: '0 0 16px 0', color: '#0f172a' }}>Documents & History</h2>
              <p style={{ color: '#64748b', margin: 0 }}>Documents and payment history will be displayed here.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PatientProfilePage;
