'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Patient, Admission, PatientMedication } from '../../../../types/patient';
import { SearchableSelect } from '../../../../components/SearchableSelect';
import { WARD_PATIENTS, ASSIGNED_PATIENTS } from '@/lib/clinical-mock-data';

// MOCK API
const mockFetchPatient = async (id: string): Promise<{ patient: Patient, admission: Admission | null }> => {
  return new Promise((resolve) => {
    setTimeout(async () => {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(`patient_mock_v3_${id}`);
        if (stored) {
          resolve(JSON.parse(stored));
          return;
        }
      }
      
      let dbPatient: any = null;
      try {
        const res = await fetch(`http://localhost:8000/api/patients/${id}/`);
        if (res.ok) {
          dbPatient = await res.json();
        }
      } catch (e) {
        console.error("Could not fetch patient from DB", e);
      }
      
      const wardPatient = WARD_PATIENTS.find(p => p.id.toString() === id) || { name: 'Unknown Patient' };
      const unitPatient = ASSIGNED_PATIENTS.find(p => p.id.toString() === id);
      const name = dbPatient ? dbPatient.name : (unitPatient ? unitPatient.name : wardPatient.name);
      const phn = dbPatient ? dbPatient.patientNumber || 'PHN-987654321' : 'PHN-987654321';
      const age = dbPatient ? (dbPatient.age || 45) : 45;
      const gender = dbPatient ? (dbPatient.sex || 'Female') : 'Female';
      
      let status = 'admitted';
      if (dbPatient) {
        status = dbPatient.status;
      } else if (unitPatient && unitPatient.type === 'Clinic') {
        status = 'clinic';
      } else if (id === '3') {
        status = 'clinic';
      }
      
      resolve({
        patient: {
          id,
          name,
          phn,
          clinic_number: 'CLN-1234',
          age,
          gender,
          status,
          diagnosis: ['Hypertension', 'Type 2 Diabetes', 'Hyperlipidemia'],
          clinical_notes: ['Patient reported mild headache.', 'Blood pressure stable after medication.', 'Awaiting lab results for comprehensive metabolic panel.'],
          routine_notes: ['Patient ate full breakfast.', 'Resting comfortably.', 'Ambulated in hallway.'],
          vitals: {
            bloodPressure: '128/82',
            heartRate: 78,
            temperature: 98.6,
            spO2: 98,
            respiratoryRate: 16,
            height: '5\'6"',
            weight: '165 lbs',
            bmi: 26.6,
          },
          medications: [
            { id: 'm1', name: 'Lisinopril', dosage: '10mg', frequency: 'Daily', route: 'Oral', status: 'active' },
            { id: 'm2', name: 'Metformin', dosage: '500mg', frequency: 'Twice Daily', route: 'Oral', status: 'active' },
            { id: 'm3', name: 'Atorvastatin', dosage: '20mg', frequency: 'Nightly', route: 'Oral', status: 'active' },
          ],
          allergies: [
            { substance: 'Penicillin', reaction: 'Hives, Anaphylaxis', severity: 'severe' },
            { substance: 'Latex', reaction: 'Contact dermatitis', severity: 'mild' }
          ],
          recent_labs: [
            { testName: 'Hemoglobin A1c', value: '7.2', unit: '%', referenceRange: '< 5.7', status: 'abnormal', date: '2026-08-30' },
            { testName: 'Creatinine', value: '0.9', unit: 'mg/dL', referenceRange: '0.6 - 1.1', status: 'normal', date: '2026-08-30' },
            { testName: 'LDL Cholesterol', value: '145', unit: 'mg/dL', referenceRange: '< 100', status: 'abnormal', date: '2026-08-30' },
          ],
          care_team: [
            { name: 'Dr. Gregory House', role: 'Attending Physician' },
            { name: 'Sarah Jenkins', role: 'Primary Nurse' },
            { name: 'Dr. James Wilson', role: 'Consulting Oncologist' }
          ]
        },
        admission: status === 'admitted' ? {
          id: 'adm-001',
          patient_id: id,
          bht: 'BHT-8832',
          bed: 'Ward A - Bed 12',
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
        } : null
      });
    }, 800);
  });
};

export default function PatientDetailScreen({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = React.use(params);
  const [patientData, setPatientData] = useState<Patient | null>(null);
  const [admission, setAdmission] = useState<Admission | null>(null);
  const [loading, setLoading] = useState(true);

  const [diagnosisList, setDiagnosisList] = useState<string[]>([]);
  const [notesList, setNotesList] = useState<string[]>([]);
  const [routineNotesList, setRoutineNotesList] = useState<string[]>([]);
  const [allergiesList, setAllergiesList] = useState<{ substance: string, reaction: string, severity: 'mild' | 'moderate' | 'severe' }[]>([]);
  const [careTeamList, setCareTeamList] = useState<{name: string, role: string}[]>([]);
  const [medicationsList, setMedicationsList] = useState<PatientMedication[]>([]);
  const [isEditingDiagnosis, setIsEditingDiagnosis] = useState(false);
  const [isEditingAllergies, setIsEditingAllergies] = useState(false);
  const [isEditingCareTeam, setIsEditingCareTeam] = useState(false);
  const [isEditingMedications, setIsEditingMedications] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [isEditingRoutineNotes, setIsEditingRoutineNotes] = useState(false);
  const [medToDeleteIndex, setMedToDeleteIndex] = useState<number | null>(null);

  const [activeModal, setActiveModal] = useState<'vitals' | 'meds' | 'labs' | 'scans' | 'admit_confirm' | 'discharge_confirm' | 'transfer_confirm' | 'refer_confirm' | null>(null);
  const [isSubmittingModal, setIsSubmittingModal] = useState(false);

  // Database Mock Options
  const [dbMedications, setDbMedications] = useState<{id: string, name: string}[]>([]);
  const [dbLabs, setDbLabs] = useState<{id: string, name: string}[]>([]);
  const [dbServiceUnits, setDbServiceUnits] = useState<{id: string, name: string}[]>([]);
  const [dbFirms, setDbFirms] = useState<any[]>([]);
  const [dbCoverages, setDbCoverages] = useState<any[]>([]);
  const [admitDept, setAdmitDept] = useState('');
  const [admitFirm, setAdmitFirm] = useState('');

  useEffect(() => {
    // Fetch Lab Categories
    fetch('http://localhost:8000/api/lab/categories/')
      .then(res => res.json())
      .then(data => {
        const items = Array.isArray(data) ? data : (data.results || []);
        setDbLabs(items.map((item: any) => ({
          id: String(item.id),
          name: item.category || item.name || `Category ${item.id}`
        })));
      })
      .catch(err => {
        console.error('Error fetching lab categories:', err);
        setDbLabs([
          { id: '1', name: 'Comprehensive Metabolic Panel (CMP)' },
          { id: '2', name: 'Complete Blood Count (CBC)' },
          { id: '3', name: 'Lipid Panel' },
          { id: '4', name: 'Hemoglobin A1c' },
        ]);
      });

    // Fetch Medications from Stocks
    fetch('http://localhost:8000/api/stocks/stocks/')
      .then(res => res.json())
      .then(data => {
        const items = Array.isArray(data) ? data : (data.results || []);
        setDbMedications(items.map((item: any) => ({
          id: String(item.id),
          name: item.name || `Medication ${item.id}`
        })));
      })
      .catch(err => {
        console.error('Error fetching medications:', err);
        setDbMedications([
          { id: '1', name: 'Amoxicillin 500mg' },
          { id: '2', name: 'Lisinopril 10mg' },
          { id: '3', name: 'Metformin 500mg' },
          { id: '4', name: 'Atorvastatin 20mg' },
        ]);
      });

    // Fetch Service Units (Wards/Departments)
    fetch('http://localhost:8000/api/service-units/')
      .then(res => res.json())
      .then(data => {
        const items = Array.isArray(data) ? data : (data.results || []);
        setDbServiceUnits(items.map((item: any) => ({
          id: String(item.id),
          name: item.name || `Unit ${item.id}`
        })));
      })
      .catch(err => {
        console.error('Error fetching service units:', err);
        setDbServiceUnits([
          { id: '1', name: 'General Medicine Ward' },
          { id: '2', name: 'Surgical ICU' },
          { id: '3', name: 'Cardiology Department' },
        ]);
      });

    // Fetch Clinical Firms and Coverages
    fetch('http://localhost:8000/api/clinical-firms/')
      .then(res => res.json())
      .then(data => setDbFirms(Array.isArray(data) ? data : (data.results || [])))
      .catch(e => console.error(e));

    fetch('http://localhost:8000/api/firm-ward-coverages/')
      .then(res => res.json())
      .then(data => setDbCoverages(Array.isArray(data) ? data : (data.results || [])))
      .catch(e => console.error(e));
  }, []);

  const dbImaging = [
    { id: 'xray_chest', name: 'X-Ray Chest PA/LAT' },
    { id: 'ct_head', name: 'CT Head w/o Contrast' },
    { id: 'ct_abdpelvis', name: 'CT Abdomen/Pelvis w/ Contrast' },
    { id: 'mri_brain', name: 'MRI Brain w/ & w/o Contrast' },
    { id: 'us_abdom', name: 'Ultrasound Abdomen Complete' },
    { id: 'mri_spine', name: 'MRI Lumbar Spine' }
  ];

  const [selectedMed, setSelectedMed] = useState<string | number>('');
  const [selectedLab, setSelectedLab] = useState<string | number>('');
  const [selectedScan, setSelectedScan] = useState<string | number>('');

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingModal(true);
    setTimeout(() => {
      if (activeModal === 'admit_confirm') {
        const generatedBht = `BHT-${Math.floor(Math.random() * 10000)}`;
        const bedInput = (document.getElementById('admit-room') as HTMLInputElement)?.value || 'Pending Assignment';
        const notesInput = (document.getElementById('admit-notes') as HTMLTextAreaElement)?.value || '';
        
        // Auto-assign firm if exclusive
        let selectedFirm = admitFirm;
        const coverage = dbCoverages.find(c => String(c.unit) === admitDept);
        if (coverage && coverage.is_exclusive && coverage.firm) {
           selectedFirm = String(coverage.firm.id);
        }

        // Save to actual database table (patients_admission)
        fetch('http://localhost:8000/api/admissions/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            patient: patientData?.id,
            bht: generatedBht,
            bed: bedInput,
            unit_id: admitDept ? parseInt(admitDept, 10) : null,
            firm: selectedFirm ? parseInt(selectedFirm, 10) : null,
            status: 'admitted',
            notes: notesInput
          })
        })
        .then(res => {
          if (!res.ok) console.warn("Failed to save admission to DB", res.status);
          else {
            // Also attempt to patch patient status
            fetch(`http://localhost:8000/api/patients/${patientData?.id}/`, {
               method: 'PATCH',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ status: 'admitted' })
            }).catch(e => console.error(e));
          }
        })
        .catch(err => console.error("Failed to save admission log", err));

        setAdmission({
          id: `adm-${Math.floor(Math.random() * 1000)}`,
          patient_id: patientData?.id.toString() || '',
          bht: generatedBht,
          bed: bedInput,
          created_at: new Date().toISOString(),
        });
        setPatientData(prev => prev ? { ...prev, status: 'admitted' } : null);
      } else if (activeModal === 'discharge_confirm') {
        setAdmission(null);
        setPatientData(prev => prev ? { ...prev, status: 'clinic' } : null);
      } else if (activeModal === 'transfer_confirm') {
        if (admission) {
          setAdmission(prev => prev ? { ...prev, bed: 'Transferred - Pending Bed' } : null);
        }
      } else if (activeModal === 'refer_confirm') {
        // Handle referral logic here
        console.log(`Referral submitted for ${patientData?.name}`);
      }
      setIsSubmittingModal(false);
      setActiveModal(null);
    }, 1200);
  };

  useEffect(() => {
    mockFetchPatient(patientId).then(({ patient, admission }) => {
      setPatientData(patient);
      setAdmission(admission);
      setDiagnosisList(Array.isArray(patient.diagnosis) ? patient.diagnosis : []);
      setNotesList(Array.isArray(patient.clinical_notes) ? patient.clinical_notes : []);
      setRoutineNotesList(Array.isArray(patient.routine_notes) ? patient.routine_notes : []);
      setAllergiesList(patient.allergies || []);
      setCareTeamList(patient.care_team || []);
      setMedicationsList(patient.medications || []);
      setLoading(false);
    });
  }, [patientId]);

  if (loading || !patientData) {
    return (
      <section className="mpi-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <span style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p style={{ color: '#64748b', fontWeight: 600 }}>Loading comprehensive record...</p>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      </section>
    );
  }

  const daysStayed = admission?.created_at
    ? Math.floor((new Date().getTime() - new Date(admission.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <section className="mpi-page" style={{ overflowX: 'hidden' }}>
      {/* Banner / Header Card */}
      <div className="mpi-card" style={{ marginBottom: "32px", position: 'relative', overflow: 'hidden' }}>
        {patientData.allergies?.some(a => a.severity === 'severe') && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: '#fef2f2', borderBottom: '1px solid #fecaca', padding: '12px 32px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ color: '#dc2626', fontWeight: 800, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>SEVERE ALLERGY ALERT</span>
            <span style={{ color: '#991b1b', fontSize: '14px', fontWeight: 500 }}>Patient has severe allergic reaction to: {patientData.allergies.filter(a => a.severity === 'severe').map(a => a.substance).join(', ')}</span>
          </div>
        )}

        <header className="mpi-header" style={{ alignItems: 'flex-start', padding: '32px', paddingTop: patientData.allergies?.some(a => a.severity === 'severe') ? '76px' : '32px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '32px' }}>
          <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
            <div style={{ width: '84px', height: '84px', borderRadius: '50%', backgroundColor: '#e0e7ff', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#4338ca', fontSize: '36px', fontWeight: 'bold' }}>
              {patientData.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div className="eyebrow" style={{ color: "var(--accent)", textTransform: "uppercase", fontSize: "0.85rem", fontWeight: "bold", letterSpacing: '0.5px' }}>EHR Record</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <h1 style={{ margin: 0, fontSize: '32px', color: '#0f172a', fontWeight: 800, letterSpacing: '-0.5px' }}>{patientData.name}</h1>
                <span style={{ backgroundColor: patientData.status === 'admitted' ? '#dcfce7' : '#f1f5f9', color: patientData.status === 'admitted' ? '#166534' : '#475569', padding: '6px 16px', borderRadius: '24px', fontSize: '14px', fontWeight: 600, textTransform: 'capitalize' }}>
                  {patientData.status}
                </span>
              </div>
              <p className="patient-db-status" style={{ margin: 0, fontSize: '16px', color: '#475569', lineHeight: '1.5' }}>
                {patientData.age} Y • {patientData.gender} • MRN/PHN: <strong style={{color: '#0f172a'}}>{patientData.phn}</strong> • DOB: Jan 12, 1981
              </p>
              {admission && (
                <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '14px', color: '#64748b' }}>
                  <div style={{ display: 'flex', gap: '4px' }}><strong>Clinic No:</strong> <span style={{ color: '#0f172a' }}>{patientData.clinic_number || 'CLN-1234'}</span></div>
                  <div style={{ borderLeft: '1px solid #cbd5e1' }}></div>
                  <div style={{ display: 'flex', gap: '4px' }}><strong>BHT:</strong> <span style={{ color: '#0f172a' }}>{admission.bht || 'BHT-8832'}</span></div>
                  <div style={{ borderLeft: '1px solid #cbd5e1' }}></div>
                  <div style={{ display: 'flex', gap: '4px' }}><strong>Bed:</strong> <span style={{ color: '#0f172a' }}>{admission.bed || 'Ward A - Bed 12'}</span></div>
                  <div style={{ borderLeft: '1px solid #cbd5e1' }}></div>
                  <div style={{ display: 'flex', gap: '4px' }}><strong>Stay Length:</strong> <span style={{ color: '#0f172a' }}>{daysStayed} day{daysStayed !== 1 ? 's' : ''}</span></div>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="button secondary" style={{ padding: '8px 20px', fontWeight: 600 }}>Print Chart</button>
            <button 
              className="button secondary" 
              style={{ padding: '8px 20px', fontWeight: 600 }}
              onClick={() => {
                if (admission) {
                  setActiveModal('transfer_confirm');
                } else {
                  setActiveModal('refer_confirm');
                }
              }}
            >
              {admission ? 'Transfer' : 'Refer'}
            </button>
            <button 
              className="mpi-primary-button" 
              style={{ minHeight: '44px', padding: '0 24px', backgroundColor: '#0f172a', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}
              onClick={() => {
                if (admission) {
                  setActiveModal('discharge_confirm');
                } else {
                  setActiveModal('admit_confirm');
                }
              }}
            >
              {admission ? 'Discharge Workflow' : 'Admit Patient'}
            </button>
          </div>
        </header>

        {/* Sub-navigation bar */}
        <div style={{ padding: '24px 32px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '20px', flexWrap: 'wrap', backgroundColor: '#f8fafc' }}>
          <button onClick={() => setActiveModal('vitals')} className="button secondary" style={{ backgroundColor: 'white', padding: '10px 24px', fontWeight: 600, fontSize: '14px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>+ Record Vitals</button>
          <button onClick={() => setActiveModal('meds')} className="button secondary" style={{ backgroundColor: 'white', padding: '10px 24px', fontWeight: 600, fontSize: '14px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>+ Prescribe</button>
          <button onClick={() => setActiveModal('labs')} className="button secondary" style={{ backgroundColor: 'white', padding: '10px 24px', fontWeight: 600, fontSize: '14px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>+ Order Labs</button>
          <button onClick={() => setActiveModal('scans')} className="button secondary" style={{ backgroundColor: 'white', padding: '10px 24px', fontWeight: 600, fontSize: '14px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>+ Request Imaging</button>
        </div>
      </div>

      <style>{`
        .mpi-card {
          border-radius: 6px !important;
        }
        .mpi-card > div {
          padding: 16px !important;
        }
        .mpi-table-wrap {
          overflow-x: auto;
        }
        .dashboard-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          align-items: start;
        }
        @media (min-width: 1024px) {
          .dashboard-grid {
            grid-template-columns: calc(50% - 8px) calc(50% - 8px);
          }
        }
      `}</style>
      <div className="dashboard-grid">

        {/* Left Column: Vitals, Allergies, Care Team */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          <div className="mpi-card">
            <div style={{ padding: '20px' }}>
              <h2 style={{ fontSize: '18px', margin: '0 0 20px 0', color: '#0f172a' }}>Vitals & Measurements</h2>
              {patientData.vitals ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Blood Pressure</div>
                    <div style={{ fontSize: '18px', color: '#0f172a', fontWeight: 700 }}>{patientData.vitals.bloodPressure}</div>
                  </div>
                  <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Heart Rate</div>
                    <div style={{ fontSize: '18px', color: '#0f172a', fontWeight: 700 }}>{patientData.vitals.heartRate} bpm</div>
                  </div>
                  <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Temp</div>
                    <div style={{ fontSize: '18px', color: '#0f172a', fontWeight: 700 }}>{patientData.vitals.temperature} °F</div>
                  </div>
                  <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>SpO2</div>
                    <div style={{ fontSize: '18px', color: '#0f172a', fontWeight: 700 }}>{patientData.vitals.spO2}%</div>
                  </div>
                </div>
              ) : <p style={{ color: '#64748b' }}>No vitals recorded.</p>}
            </div>
          </div>

          <div className="mpi-card">
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', margin: 0, color: '#0f172a' }}>Allergies</h2>
                <button
                  className="button compact secondary"
                  onClick={() => {
                    if (isEditingAllergies) {
                      if (patientData) {
                        const updatedPatient = { ...patientData, allergies: allergiesList.filter(a => a.substance.trim()) };
                        setPatientData(updatedPatient);
                        localStorage.setItem(`patient_mock_v3_${patientData.id}`, JSON.stringify({ patient: updatedPatient, admission }));
                      }
                    }
                    setIsEditingAllergies(!isEditingAllergies);
                  }}
                  style={{ color: isEditingAllergies ? '#059669' : '#2563eb', borderColor: isEditingAllergies ? '#10b981' : '#bfdbfe', backgroundColor: isEditingAllergies ? '#ecfdf5' : '#eff6ff' }}
                >
                  {isEditingAllergies ? 'Save' : 'Edit'}
                </button>
              </div>

              {isEditingAllergies ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {allergiesList.map((item, index) => (
                    <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        value={item.substance}
                        onChange={(e) => {
                          const newList = [...allergiesList];
                          newList[index].substance = e.target.value;
                          setAllergiesList(newList);
                        }}
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', flex: 1 }}
                        placeholder="Substance"
                      />
                      <input
                        value={item.reaction}
                        onChange={(e) => {
                          const newList = [...allergiesList];
                          newList[index].reaction = e.target.value;
                          setAllergiesList(newList);
                        }}
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', flex: 1 }}
                        placeholder="Reaction"
                      />
                      <select
                        value={item.severity}
                        onChange={(e) => {
                          const newList = [...allergiesList];
                          newList[index].severity = e.target.value as 'mild' | 'moderate' | 'severe';
                          setAllergiesList(newList);
                        }}
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      >
                        <option value="mild">Mild</option>
                        <option value="moderate">Moderate</option>
                        <option value="severe">Severe</option>
                      </select>
                    </div>
                  ))}
                  <button
                    onClick={() => setAllergiesList([...allergiesList, { substance: '', reaction: '', severity: 'mild' }])}
                    style={{ background: 'transparent', border: '1px dashed #cbd5e1', padding: '10px', borderRadius: '6px', color: '#64748b', cursor: 'pointer', fontWeight: 500 }}
                  >
                    + Add Allergy
                  </button>
                </div>
              ) : (
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {allergiesList.length === 0 ? <li style={{ color: '#94a3b8', fontStyle: 'italic' }}>No allergies recorded.</li> : null}
                  {allergiesList.map((allergy, i) => (
                    <li key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingBottom: '12px', borderBottom: i === allergiesList.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ color: '#0f172a' }}>{allergy.substance}</strong>
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', textTransform: 'uppercase', backgroundColor: allergy.severity === 'severe' ? '#fef2f2' : '#fffbeb', color: allergy.severity === 'severe' ? '#dc2626' : '#b45309' }}>
                          {allergy.severity}
                        </span>
                      </div>
                      <span style={{ fontSize: '13px', color: '#64748b' }}>Reaction: {allergy.reaction}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="mpi-card">
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', margin: 0, color: '#0f172a' }}>Care Team</h2>
                <button
                  className="button compact secondary"
                  onClick={() => {
                    if (isEditingCareTeam) {
                      if (patientData) {
                        const updatedPatient = { ...patientData, care_team: careTeamList.filter(c => c.name.trim()) };
                        setPatientData(updatedPatient);
                        localStorage.setItem(`patient_mock_v3_${patientData.id}`, JSON.stringify({ patient: updatedPatient, admission }));
                      }
                    }
                    setIsEditingCareTeam(!isEditingCareTeam);
                  }}
                  style={{ color: isEditingCareTeam ? '#059669' : '#2563eb', borderColor: isEditingCareTeam ? '#10b981' : '#bfdbfe', backgroundColor: isEditingCareTeam ? '#ecfdf5' : '#eff6ff' }}
                >
                  {isEditingCareTeam ? 'Save' : 'Edit'}
                </button>
              </div>

              {isEditingCareTeam ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {careTeamList.map((member, index) => (
                    <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        value={member.name}
                        onChange={(e) => {
                          const newList = [...careTeamList];
                          newList[index].name = e.target.value;
                          setCareTeamList(newList);
                        }}
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', flex: 1 }}
                        placeholder="Name (e.g. Dr. Smith)"
                      />
                      <input
                        value={member.role}
                        onChange={(e) => {
                          const newList = [...careTeamList];
                          newList[index].role = e.target.value;
                          setCareTeamList(newList);
                        }}
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', flex: 1 }}
                        placeholder="Role (e.g. Attending)"
                      />
                      <button
                        onClick={() => setCareTeamList(careTeamList.filter((_, i) => i !== index))}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          fontSize: '18px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                        }}
                        title="Remove member"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setCareTeamList([...careTeamList, { name: '', role: '' }])}
                    style={{ background: 'transparent', border: '1px dashed #cbd5e1', padding: '10px', borderRadius: '6px', color: '#64748b', cursor: 'pointer', fontWeight: 500 }}
                  >
                    + Add Member
                  </button>
                </div>
              ) : (
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {careTeamList.length === 0 ? <li style={{ color: '#94a3b8', fontStyle: 'italic' }}>No care team assigned.</li> : null}
                  {careTeamList.map((member, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '14px', fontWeight: 'bold', color: '#475569' }}>
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '14px' }}>{member.name}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>{member.role}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="mpi-card">
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', margin: 0, color: '#0f172a' }}>Active Problems & Diagnoses</h2>
                <button
                  className="button compact secondary"
                  onClick={() => {
                    if (isEditingDiagnosis) {
                      if (patientData) {
                        const updatedPatient = { ...patientData, diagnosis: diagnosisList.filter(d => d.trim()) };
                        setPatientData(updatedPatient);
                        localStorage.setItem(`patient_mock_v3_${patientData.id}`, JSON.stringify({ patient: updatedPatient, admission }));
                      }
                    }
                    setIsEditingDiagnosis(!isEditingDiagnosis);
                  }}
                  style={{ color: isEditingDiagnosis ? '#059669' : '#2563eb', borderColor: isEditingDiagnosis ? '#10b981' : '#bfdbfe', backgroundColor: isEditingDiagnosis ? '#ecfdf5' : '#eff6ff' }}
                >
                  {isEditingDiagnosis ? 'Save' : 'Edit'}
                </button>
              </div>

              {isEditingDiagnosis ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {diagnosisList.map((item, index) => (
                    <input
                      key={index}
                      value={item}
                      onChange={(e) => {
                        const newList = [...diagnosisList];
                        newList[index] = e.target.value;
                        setDiagnosisList(newList);
                      }}
                      className="identity-select"
                      style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }}
                      placeholder={`Diagnosis ${index + 1}`}
                    />
                  ))}
                  <button
                    onClick={() => setDiagnosisList([...diagnosisList, ''])}
                    style={{ background: 'transparent', border: '1px dashed #cbd5e1', padding: '10px', borderRadius: '6px', color: '#64748b', cursor: 'pointer', fontWeight: 500 }}
                  >
                    + Add Diagnosis
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {diagnosisList.length === 0 ? <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No diagnoses recorded.</span> : null}
                  {diagnosisList.map((item, index) => item.trim() && (
                    <div key={index} style={{ backgroundColor: '#eff6ff', color: '#1e40af', padding: '6px 14px', borderRadius: '16px', fontSize: '14px', fontWeight: 500, border: '1px solid #bfdbfe' }}>
                      {item}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>



          <div className="mpi-card">
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', margin: 0, color: '#0f172a' }}>Active Medications</h2>
                <button
                  className="button compact secondary"
                  onClick={() => {
                    if (isEditingMedications) {
                      if (patientData) {
                        const updatedPatient = { ...patientData, medications: medicationsList.filter(m => m.name.trim()) };
                        setPatientData(updatedPatient);
                        localStorage.setItem(`patient_mock_v3_${patientData.id}`, JSON.stringify({ patient: updatedPatient, admission }));
                      }
                    }
                    setIsEditingMedications(!isEditingMedications);
                  }}
                  style={{ color: isEditingMedications ? '#059669' : '#2563eb', borderColor: isEditingMedications ? '#10b981' : '#bfdbfe', backgroundColor: isEditingMedications ? '#ecfdf5' : '#eff6ff' }}
                >
                  {isEditingMedications ? 'Save' : 'Edit'}
                </button>
              </div>
              <div className="mpi-table-wrap" style={{ margin: '-20px', marginTop: '0', border: 'none', overflowX: 'hidden' }}>
                <table className="mpi-table" style={{ border: 'none', tableLayout: 'fixed', width: '100%' }}>
                  <thead style={{ backgroundColor: '#f8fafc' }}>
                    <tr>
                      <th style={{ borderTop: 'none', paddingLeft: '20px', width: '40%' }}>Medication</th>
                      <th style={{ borderTop: 'none', width: '20%' }}>Dose</th>
                      <th style={{ borderTop: 'none', width: '20%' }}>Frequency</th>
                      <th style={{ borderTop: 'none', width: '12%' }}>Route</th>
                      <th style={{ borderTop: 'none', width: '8%', textAlign: 'center' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {isEditingMedications ? (
                      medicationsList.map((med, index) => (
                        <tr key={med.id || index}>
                          <td style={{ paddingLeft: '20px' }}>
                            <input
                              value={med.name}
                              onChange={(e) => {
                                const newList = [...medicationsList];
                                newList[index].name = e.target.value;
                                setMedicationsList(newList);
                              }}
                              style={{ width: '100%', boxSizing: 'border-box', minWidth: 0, padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                              placeholder="Medication name"
                            />
                          </td>
                          <td>
                            <input
                              value={med.dosage}
                              onChange={(e) => {
                                const newList = [...medicationsList];
                                newList[index].dosage = e.target.value;
                                setMedicationsList(newList);
                              }}
                              style={{ width: '100%', boxSizing: 'border-box', minWidth: 0, padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                              placeholder="Dose"
                            />
                          </td>
                          <td>
                            <input
                              value={med.frequency}
                              onChange={(e) => {
                                const newList = [...medicationsList];
                                newList[index].frequency = e.target.value;
                                setMedicationsList(newList);
                              }}
                              style={{ width: '100%', boxSizing: 'border-box', minWidth: 0, padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                              placeholder="Frequency"
                            />
                          </td>
                          <td>
                            <input
                              value={med.route}
                              onChange={(e) => {
                                const newList = [...medicationsList];
                                newList[index].route = e.target.value;
                                setMedicationsList(newList);
                              }}
                              style={{ width: '100%', boxSizing: 'border-box', minWidth: 0, padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                              placeholder="Route"
                            />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button 
                              onClick={() => setMedToDeleteIndex(index)}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '18px', padding: '4px 8px', borderRadius: '4px' }}
                              title="Delete Medication"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      medicationsList.map((med, index) => (
                        <tr key={med.id || index}>
                          <td style={{ paddingLeft: '20px', wordBreak: 'break-word' }}><strong style={{ color: '#0f172a' }}>{med.name}</strong></td>
                          <td style={{ wordBreak: 'break-word' }}>{med.dosage}</td>
                          <td style={{ wordBreak: 'break-word' }}>{med.frequency}</td>
                          <td style={{ wordBreak: 'break-word' }}>{med.route}</td>
                          <td style={{ textAlign: 'center' }}>
                            {/* Hidden when not editing */}
                          </td>
                        </tr>
                      ))
                    )}

                    {(!medicationsList || medicationsList.length === 0) && (
                      <tr>
                        <td colSpan={5} style={{ paddingLeft: '20px', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center' }}>No active medications.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {isEditingMedications && (
                <div style={{ padding: '20px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                  <button
                    onClick={() => setMedicationsList([...medicationsList, { id: Date.now().toString(), name: '', dosage: '', frequency: '', route: '', status: 'active' }])}
                    style={{ background: 'transparent', border: '1px dashed #cbd5e1', padding: '10px', borderRadius: '6px', color: '#64748b', cursor: 'pointer', fontWeight: 500, width: '100%' }}
                  >
                    + Add Medication
                  </button>
                </div>
              )}
            </div>
          </div>


          <div className="mpi-card">
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', margin: 0, color: '#0f172a' }}>Recent Lab Results</h2>
                <Link href={`/ward/${patientData.id}/labs`} style={{ color: '#2563eb', fontSize: '14px', fontWeight: 500, textDecoration: 'none' }}>Lab History</Link>
              </div>
              <div className="mpi-table-wrap" style={{ margin: '-20px', marginTop: '0', border: 'none', overflowX: 'hidden' }}>
                <table className="mpi-table" style={{ border: 'none', tableLayout: 'fixed', width: '100%' }}>
                  <thead style={{ backgroundColor: '#f8fafc' }}>
                    <tr>
                      <th style={{ borderTop: 'none', paddingLeft: '20px', width: '35%' }}>Test</th>
                      <th style={{ borderTop: 'none', width: '25%' }}>Result</th>
                      <th style={{ borderTop: 'none', width: '25%' }}>Ref Range</th>
                      <th style={{ borderTop: 'none', width: '15%' }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patientData.recent_labs?.map((lab, i) => (
                      <tr key={i} style={{ backgroundColor: lab.status === 'abnormal' ? '#fff1f2' : 'transparent' }}>
                        <td style={{ paddingLeft: '20px', wordBreak: 'break-word' }}>
                          <span style={{ color: '#0f172a', fontWeight: 500 }}>{lab.testName}</span>
                        </td>
                        <td style={{ wordBreak: 'break-word' }}>
                          <span style={{ fontWeight: 700, color: lab.status === 'abnormal' ? '#be123c' : '#0f172a' }}>
                            {lab.value} {lab.unit}
                          </span>
                        </td>
                        <td style={{ color: '#64748b', wordBreak: 'break-word' }}>{lab.referenceRange}</td>
                        <td style={{ color: '#64748b', wordBreak: 'break-word' }}>{new Date(lab.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>

        {/* Center Column: Core Medical Data (Meds, Labs, Diagnosis) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Center & Right Column Combined */}

          <div className="mpi-card">
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', margin: 0, color: '#0f172a' }}>Clinical Notes</h2>
                {!isEditingNotes && (
                  <button
                    className="button compact secondary"
                    onClick={() => setIsEditingNotes(true)}
                    style={{ color: '#2563eb', borderColor: '#bfdbfe', backgroundColor: '#eff6ff' }}
                  >
                    + Add Note
                  </button>
                )}
              </div>

              {isEditingNotes && (
                <div style={{ marginBottom: '24px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                  <textarea
                    id="new-note-input"
                    className="identity-select"
                    style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', minHeight: '100px', fontFamily: 'inherit', marginBottom: '12px' }}
                    placeholder="Write a new clinical note..."
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button
                      className="button compact secondary"
                      onClick={() => setIsEditingNotes(false)}
                      style={{ color: '#64748b' }}
                    >
                      Cancel
                    </button>
                    <button
                      className="mpi-primary-button"
                      style={{ padding: '6px 16px', fontSize: '14px', borderRadius: '6px', backgroundColor: '#0f172a' }}
                      onClick={() => {
                        const input = document.getElementById('new-note-input') as HTMLTextAreaElement;
                        if (input && input.value.trim()) {
                          const updatedNotes = [input.value.trim(), ...notesList];
                          setNotesList(updatedNotes);
                          if (patientData) {
                            const updatedPatient = { ...patientData, clinical_notes: updatedNotes };
                            setPatientData(updatedPatient);
                            localStorage.setItem(`patient_mock_v3_${patientData.id}`, JSON.stringify({ patient: updatedPatient, admission }));
                          }
                          setIsEditingNotes(false);
                        }
                      }}
                    >
                      Save Note
                    </button>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {notesList.length === 0 ? <div style={{ color: '#94a3b8', fontStyle: 'italic', padding: '30px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>No clinical notes recorded yet.</div> : null}
                  {notesList.map((item, index) => item.trim() && (
                    <div key={index} style={{ 
                      backgroundColor: '#ffffff', 
                      borderRadius: '12px', 
                      padding: '20px', 
                      boxShadow: '0 4px 15px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.04)',
                      border: '1px solid #e2e8f0',
                      borderLeft: '5px solid #3b82f6',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: '700', fontSize: '14px' }}>
                            MD
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '14px' }}>Attending Physician</div>
                            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Internal Medicine</div>
                          </div>
                        </div>
                        <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
                          {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <div style={{ color: '#334155', lineHeight: '1.7', fontSize: '15px', whiteSpace: 'pre-wrap' }}>
                        {item}
                      </div>
                    </div>
                  ))}
                </div>
            </div>
          </div>



        </div>
      </div>

      {/* Modal Overlay container */}
      {activeModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="mpi-card" style={{ width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', backgroundColor: '#fff', padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#0f172a' }}>
                  {activeModal === 'vitals' && 'Record Vitals'}
                  {activeModal === 'meds' && 'Prescribe Medication'}
                  {activeModal === 'labs' && 'Order Lab Tests'}
                  {activeModal === 'scans' && 'Request Imaging'}
                  {activeModal === 'admit_confirm' && 'Confirm Admission'}
                  {activeModal === 'discharge_confirm' && 'Confirm Discharge'}
                  {activeModal === 'transfer_confirm' && 'Transfer Patient'}
                  {activeModal === 'refer_confirm' && 'Refer Patient'}
                </h2>
                <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
                  {activeModal === 'admit_confirm' || activeModal === 'discharge_confirm' || activeModal === 'transfer_confirm' || activeModal === 'refer_confirm'
                    ? 'Please review the details below before proceeding.' 
                    : 'Please fill out the form details below.'}
                </p>
              </div>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', fontSize: '24px', color: '#64748b', cursor: 'pointer' }}>&times;</button>
            </div>

            <form onSubmit={handleModalSubmit}>
              <style>{`
                .form-group { margin-bottom: 20px; display: flex; flex-direction: column; gap: 8px; }
                .form-label { font-size: 14px; font-weight: 600; color: #475569; }
                .form-input { padding: 12px 16px; border-radius: 12px; border: 1px solid #cbd5e1; font-size: 16px; outline: none; transition: border-color 0.2s; background: white; }
                .form-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
              `}</style>

              {activeModal === 'vitals' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div className="form-group"><label className="form-label">Blood Pressure</label><input required type="text" placeholder="120/80" className="form-input" /></div>
                  <div className="form-group"><label className="form-label">Heart Rate</label><input required type="number" placeholder="72" className="form-input" /></div>
                  <div className="form-group"><label className="form-label">Temperature</label><input required type="number" step="0.1" placeholder="98.6" className="form-input" /></div>
                  <div className="form-group"><label className="form-label">SpO2</label><input required type="number" placeholder="98" className="form-input" /></div>
                </div>
              )}

              {activeModal === 'meds' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-group"><label className="form-label">Search Database for Medication</label>
                    <SearchableSelect options={dbMedications} value={selectedMed} onChange={setSelectedMed} placeholder="Type to search medications..." />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group"><label className="form-label">Dosage</label><input required type="text" placeholder="e.g. 500mg" className="form-input" /></div>
                    <div className="form-group">
                      <label className="form-label">Frequency</label>
                      <select required className="form-input">
                        <option value="">Select...</option>
                        <option value="QD">QD (Once a day)</option>
                        <option value="BID">BID (Twice a day)</option>
                        <option value="TID">TID (Three times a day)</option>
                        <option value="QID">QID (Four times a day)</option>
                        <option value="PRN">PRN (As needed)</option>
                        <option value="Q4H">Q4H (Every 4 hours)</option>
                        <option value="Q6H">Q6H (Every 6 hours)</option>
                        <option value="Q8H">Q8H (Every 8 hours)</option>
                        <option value="Q12H">Q12H (Every 12 hours)</option>
                        <option value="QHS">QHS (At bedtime)</option>
                        <option value="QAM">QAM (Every morning)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {activeModal === 'labs' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Search Database for Lab Test</label>
                    <SearchableSelect options={dbLabs} value={selectedLab} onChange={setSelectedLab} placeholder="Type to search lab tests..." />
                  </div>
                  <div className="form-group"><label className="form-label">Clinical Indications</label><textarea required className="form-input" style={{ minHeight: '80px' }}></textarea></div>
                </div>
              )}

              {activeModal === 'scans' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                    <div className="form-group"><label className="form-label">Search Database for Imaging Procedure</label>
                      <SearchableSelect options={dbImaging} value={selectedScan} onChange={setSelectedScan} placeholder="Type to search imaging database..." />
                    </div>
                  </div>
                  <div className="form-group"><label className="form-label">Priority</label><select required className="form-input"><option value="routine">Routine</option><option value="stat">STAT</option></select></div>
                  <div className="form-group"><label className="form-label">Reason for Exam</label><textarea required className="form-input" style={{ minHeight: '80px' }}></textarea></div>
                </div>
              )}

              {activeModal === 'admit_confirm' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <p style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>Are you sure you want to admit <strong>{patientData.name}</strong> to the ward?</p>
                  <div className="form-group">
                    <label className="form-label">Admitting Department / Ward</label>
                    <select 
                      className="form-input" 
                      id="admit-dept" 
                      required 
                      value={admitDept}
                      onChange={(e) => {
                        setAdmitDept(e.target.value);
                        setAdmitFirm(''); // Reset firm selection when ward changes
                      }}
                    >
                      <option value="">Select a ward...</option>
                      {dbServiceUnits.map(unit => (
                        <option key={unit.id} value={unit.id}>{unit.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Dynamic Firm Selection */}
                  {admitDept && (
                    dbCoverages.find(c => String(c.unit) === admitDept && c.is_exclusive) ? (
                      <div className="form-group">
                        <label className="form-label">Clinical Firm (Auto-assigned)</label>
                        <input type="text" className="form-input" disabled value={dbCoverages.find(c => String(c.unit) === admitDept)?.firm?.name || 'Unknown'} style={{ backgroundColor: '#f8fafc', color: '#64748b' }} />
                      </div>
                    ) : (
                      <div className="form-group">
                        <label className="form-label">Clinical Firm / Consultant</label>
                        <select className="form-input" required value={admitFirm} onChange={(e) => setAdmitFirm(e.target.value)}>
                          <option value="">Select a consultant's unit...</option>
                          {dbCoverages.filter(c => String(c.unit) === admitDept).map(c => (
                            <option key={c.firm.id} value={c.firm.id}>{c.firm.name}</option>
                          ))}
                          {/* Fallback if no specific coverages are mapped, show all firms */}
                          {dbCoverages.filter(c => String(c.unit) === admitDept).length === 0 && dbFirms.map(f => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                          ))}
                        </select>
                      </div>
                    )
                  )}
                  <div className="form-group"><label className="form-label">Assign Room / Bed</label><input type="text" id="admit-room" placeholder="e.g. Ward A - Bed 12" className="form-input" required /></div>
                  <div className="form-group"><label className="form-label">Admission Notes / Reason</label><textarea id="admit-notes" className="form-input" style={{ minHeight: '80px' }} placeholder="Provide relevant clinical info for admission..." required></textarea></div>
                  <div className="form-group"><label className="form-label">Priority</label><select className="form-input"><option>Routine</option><option>Urgent</option><option>Emergency</option></select></div>
                </div>
              )}

              {activeModal === 'discharge_confirm' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <p style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>Are you sure you want to discharge <strong>{patientData.name}</strong> from the ward?</p>
                  <div className="form-group"><label className="form-label">Discharge Reason</label><select className="form-input"><option>Routine Discharge</option><option>Transfer to another facility</option><option>Against Medical Advice</option></select></div>
                  <div className="form-group"><label className="form-label">Discharge Instructions</label><textarea className="form-input" style={{ minHeight: '80px' }} placeholder="Enter instructions for the patient..."></textarea></div>
                </div>
              )}

              {activeModal === 'transfer_confirm' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <p style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>Transfer <strong>{patientData.name}</strong> to a different unit.</p>
                  <div className="form-group">
                    <label className="form-label">Destination Unit / Department</label>
                    <select className="form-input" required>
                      <option value="">Select a department...</option>
                      {dbServiceUnits.map(unit => (
                        <option key={unit.id} value={unit.id}>{unit.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Reason for Transfer</label><textarea className="form-input" required style={{ minHeight: '80px' }} placeholder="Enter the medical reason for this transfer..."></textarea></div>
                </div>
              )}

              {activeModal === 'refer_confirm' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <p style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>Refer <strong>{patientData.name}</strong> to a specialist or external facility.</p>
                  <div className="form-group">
                    <label className="form-label">Specialty / Department</label>
                    <select className="form-input" required>
                      <option value="">Select a specialty...</option>
                      <option value="cardiologist">Cardiologist</option>
                      <option value="general_surgeon">General Surgeon</option>
                      <option value="physician">Physician (Internal Medicine)</option>
                      <option value="rheumatologist">Rheumatologist</option>
                      <option value="neurologist">Neurologist</option>
                      <option value="orthopedist">Orthopedist</option>
                      <option value="pediatrician">Pediatrician</option>
                      <option value="psychiatrist">Psychiatrist</option>
                      <option value="external">External Facility</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Consultant / Specialist Name (Optional)</label>
                    <input type="text" className="form-input" placeholder="e.g. Dr. Jane Smith" />
                  </div>
                  <div className="form-group"><label className="form-label">Reason for Referral</label><textarea className="form-input" required style={{ minHeight: '80px' }} placeholder="Provide clinical context and reason for referral..."></textarea></div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #f1f5f9' }}>
                <button type="button" onClick={() => setActiveModal(null)} className="button secondary" style={{ padding: '12px 24px', borderRadius: '12px' }}>Cancel</button>
                <button disabled={isSubmittingModal} type="submit" className="mpi-primary-button" style={{ padding: '12px 24px', borderRadius: '12px', backgroundColor: '#0f172a' }}>
                  {isSubmittingModal ? 'Processing...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Medication Modal */}
      {medToDeleteIndex !== null && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', width: '90%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#0f172a' }}>Delete Medication</h2>
            <p style={{ margin: '0 0 24px 0', color: '#475569', fontSize: '15px' }}>
              Are you sure you want to remove <strong>{medicationsList[medToDeleteIndex]?.name}</strong> from Active Medications?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setMedToDeleteIndex(null)} className="button secondary" style={{ padding: '8px 16px' }}>Cancel</button>
              <button 
                onClick={() => {
                  const newList = [...medicationsList];
                  newList.splice(medToDeleteIndex, 1);
                  setMedicationsList(newList);
                  if (patientData) {
                    const updatedPatient = { ...patientData, medications: newList };
                    setPatientData(updatedPatient);
                    localStorage.setItem(`patient_mock_v3_${patientData.id}`, JSON.stringify({ patient: updatedPatient, admission }));
                  }
                  setMedToDeleteIndex(null);
                }}
                className="button primary" 
                style={{ padding: '8px 16px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </section>
  );
}
