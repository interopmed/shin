'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import api from '@/lib/api';
import LabReportTable from '@/components/lab/LabReportTable';
import { UserRole } from '@/lib/roles';
import { DutyPathologist, getDutyPathologist, getReportingTechnician } from '@/lib/lab-session';
import DutyPathologistSelectorModal from '@/components/lab/DutyPathologistSelectorModal';
import { downloadLabReportPdf } from '@/lib/lab-report-pdf';

interface LabReport {
  id: number;
  lab_order_id: number;
  category: number;
  category_name: string;
  department: string;
  status: string;
  date_string: string;
  patient_id?: number;
  doctor_id?: number;
  special_notes?: string;
  processing_method?: string;
  report_url?: string;
  separate_ref?: boolean;
}

interface LabCategory {
  id: number;
  category: string;
  name: string;
  department: string;
  ref_val_lower?: number | string;
  ref_val_upper?: number | string;
  ref_val_lower_f?: number | string;
  ref_val_upper_f?: number | string;
  unit?: string;
  subcategory_status?: boolean;
  processing_method?: string;
  separate_ref?: boolean;
}

interface Patient {
  id: number;
  name: string;
  sex?: string;
  birthdate?: string;
  age?: string | number;
}

interface PaymentInfo {
  billing_number: number;
  clinical_history?: string;
  collected_time_string?: string;
  received_time_string?: string;
  processing_status: number;
}

interface Doctor {
  name?: string;
}

const LabReportPage = () => {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { user } = useAuth();
  const { isAdmin, hasAnyRole, canEdit } = usePermissions();
  const [labReport, setLabReport] = useState<LabReport | null>(null);
  const [labCategory, setLabCategory] = useState<LabCategory | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [payment, setPayment] = useState<PaymentInfo | null>(null);
  const [doctor, setDoctor] = useState<string>('');
  const [sections, setSections] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [testValues, setTestValues] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [dutyPathologist, setDutyPathologistState] = useState<DutyPathologist>(getDutyPathologist());
  const [isPathologistModalOpen, setIsPathologistModalOpen] = useState(false);

  const reportingTechnician = React.useMemo(() => getReportingTechnician(user), [user]);

  useEffect(() => {
    const handlePathologistUpdate = (e: any) => {
      if (e?.detail) {
        setDutyPathologistState(e.detail);
      } else {
        setDutyPathologistState(getDutyPathologist());
      }
    };
    window.addEventListener('lab_duty_pathologist_updated', handlePathologistUpdate);
    return () => window.removeEventListener('lab_duty_pathologist_updated', handlePathologistUpdate);
  }, []);

  useEffect(() => {
    const fetchReportData = async () => {
      if (user?.token && id) {
        try {
          const reportData = await api.getLabTest(user.token, id as string) as LabReport;
          setLabReport(reportData);

          if ((reportData as any).lab_category) {
            setLabCategory((reportData as any).lab_category);
          }

          if ((reportData as any).patient) {
            setPatient((reportData as any).patient);
          }

          if ((reportData as any).payment) {
            setPayment((reportData as any).payment);
          }

          if ((reportData as any).doctor_name) {
            setDoctor((reportData as any).doctor_name);
          }

          // Fetch lab category details (reference values + unit)
          const categoryId = reportData.category || (reportData as any).lab_category?.id;
          if (categoryId) {
            try {
              const categoryData = (await api.getLabCategory(user.token, categoryId)) as LabCategory;
              setLabCategory((prev) => ({
                ...(prev || {}),
                ...categoryData,
              }));
            } catch (err) {
              console.warn('Could not load lab category details:', err);
            }
          }

          // Fetch patient data
          const rawPatientId = reportData.patient_id || (reportData as any).patient;
          if (rawPatientId && !(reportData as any).patient?.name) {
            try {
              const patientData = (await api.getPatient(user.token, String(rawPatientId))) as Patient;
              if (patientData && (patientData.name || patientData.id)) {
                setPatient(patientData);
              }
            } catch (err) {
              console.warn('Could not load patient record, using report metadata:', err);
              const anyReport = reportData as any;
              const fallbackName =
                anyReport.patient_name ||
                (typeof anyReport.patient === 'string' && !anyReport.patient.match(/^\d+$/)
                  ? anyReport.patient
                  : `Patient #${rawPatientId}`);
              setPatient((prev) => prev || ({
                id: Number(rawPatientId) || 0,
                name: fallbackName,
                sex: anyReport.patient_sex || '',
                age: anyReport.patient_age || '',
                phone: anyReport.patient_phone || '',
              } as Patient));
            }
          }

          // Fetch doctor data
          const rawDoctorId = reportData.doctor_id || (reportData as any).doctor;
          if (rawDoctorId && !(reportData as any).doctor_name) {
            try {
              const doctorData = (await api.getDoctor(user.token, String(rawDoctorId))) as Doctor;
              setDoctor(doctorData?.name || 'Unknown Doctor');
            } catch (err) {
              console.warn('Could not load doctor details:', err);
              const anyReport = reportData as any;
              if (typeof anyReport.doctor === 'string' && !anyReport.doctor.match(/^\d+$/)) {
                setDoctor(anyReport.doctor);
              } else {
                setDoctor(`Doctor #${rawDoctorId}`);
              }
            }
          }

          // Fetch lab results (test values) for this order
          try {
            const resultsData = await api.getLabResults(user.token, { order: reportData.lab_order_id });
            const resultsList = Array.isArray(resultsData) ? resultsData : (resultsData?.results || []);
            if (resultsList.length) {
              const testValuesMap: Record<string, any> = {};
              resultsList.forEach((result: any) => {
                const key = (result.subcategory_name || result.subcategory || '').toString().toUpperCase();
                if (key) {
                  testValuesMap[key] = {
                    id: result.id,
                    value: result.value,
                    comment: result.comment,
                  };
                }

                if ((result.subcategory || '').toString().match(/^\d+$/) && (reportData as any).lab_category?.category) {
                  const categoryKey = (reportData as any).lab_category.category.toUpperCase();
                  if (categoryKey && !testValuesMap[categoryKey]) {
                    testValuesMap[categoryKey] = {
                      id: result.id,
                      value: result.value,
                      comment: result.comment,
                    };
                  }
                }
              });
              setTestValues(testValuesMap);
            }
          } catch (err) {
            console.warn('Could not load lab results:', err);
          }

          // Fetch test definitions (subcategories) for this category
          if (reportData.category) {
            try {
              const defsData = await api.getLabTestDefinitions(user.token, { category: reportData.category });
              const defsList = Array.isArray(defsData) ? defsData : (defsData?.results || []);
              if (defsList.length) {
                setSubcategories(defsList);
              }
            } catch (err) {
              console.warn('Could not load test definitions:', err);
            }
          }

          // Fetch lab sections for this category
          if (reportData.category) {
            try {
              const sectionsData = await api.getLabSections(user.token, reportData.category);
              if (sectionsData && Array.isArray(sectionsData)) {
                setSections(sectionsData);
              }
            } catch (err) {
              console.warn('Could not load lab sections:', err);
            }
          }

          // TODO: Fetch payment info and sections when endpoints are available
          // Payment info: const paymentData = await api.getPayment(user.token, reportData.lab_order_id);
          // Sections: const sectionsData = await api.getLabSections(user.token, reportData.category);

        } catch (error) {
          console.error('Failed to fetch lab report:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchReportData();
  }, [user, id]);

  const handleValueChange = (name: string, value: string, testId?: number) => {
    setTestValues(prev => ({
      ...prev,
      [name.toUpperCase()]: { id: testId, value }
    }));
  };

  const handleFileUpload = async (file: File) => {
    // TODO: Implement file upload to backend
    console.log('Uploading file:', file.name);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    if (downloadingPdf || !labReport) return;
    setDownloadingPdf(true);
    try {
      const cleanPatientName = (patient?.name || 'Patient').replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `Lab_Report_${labReport.lab_order_id || id}_${cleanPatientName}.pdf`;
      await downloadLabReportPdf({
        elementId: 'lab-report-printable-area',
        filename,
      });
    } catch (err) {
      console.error('PDF download error:', err);
      window.print();
    } finally {
      setDownloadingPdf(false);
    }
  };

  const calculateAge = (birthdate?: string, age?: string | number) => {
    if (age !== undefined && age !== null && String(age).trim() !== '') {
      return age;
    }
    if (!birthdate) return 'N/A';
    const birth = new Date(birthdate);
    if (Number.isNaN(birth.getTime())) return 'N/A';
    const today = new Date();
    let years = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      years--;
    }
    return years;
  };

  const formatLabTime = (timeString?: string) => {
    if (!timeString) return 'N/A';
    return new Date(timeString).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const canEditReport = () => {
    return hasAnyRole([UserRole.ADMIN, UserRole.LAB_TECHNICIAN]) && canEdit('lab');
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    );
  }

  if (!labReport) {
    return (
      <div className="alert alert-warning">Lab report not found</div>
    );
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="section-kicker">Investigation</p>
          <h2>Report Details</h2>
        </div>
      </div>
      <div style={{ padding: '24px' }}>
        {/* Action Buttons & Session Context */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--line)', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="button secondary compact" onClick={handlePrint}>
              Print
            </button>
            <button
              type="button"
              className="button primary compact"
              onClick={handleDownload}
              disabled={downloadingPdf}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              {downloadingPdf ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm"
                    role="status"
                    aria-hidden="true"
                    style={{ width: '12px', height: '12px', borderWidth: '2px' }}
                  />
                  Downloading...
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download PDF
                </>
              )}
            </button>

            {canEditReport() && (
              <>
                <Link href={`/lab/edit/${labReport.lab_order_id}?category=${labReport.category}`} className="button secondary compact">
                  Edit
                </Link>

                <Link href="/finance/add?section=lab" className="button secondary compact">
                  Add New
                </Link>

                {payment?.processing_status === 1 && (
                  <Link href={`/lab/enter-next/${labReport.lab_order_id}`} className="button danger compact">
                    Enter Next
                  </Link>
                )}
              </>
            )}

            {/* Duty Pathologist Session Pill */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '4px 10px',
                fontSize: '12px',
                marginLeft: '8px',
              }}
            >
              <span style={{ color: '#64748b', fontWeight: 600 }}>Duty Pathologist:</span>
              <strong style={{ color: '#0f172a' }}>{dutyPathologist.name}</strong>
              <button
                type="button"
                onClick={() => setIsPathologistModalOpen(true)}
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '5px',
                  padding: '2px 8px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#2563eb',
                  cursor: 'pointer',
                }}
              >
                Change
              </button>
            </div>
          </div>

          <button onClick={() => router.push('/lab/reports')} className="button secondary compact">
            Back to List
          </button>
        </div>

        {/* Report Content */}
        {labReport.processing_method === 'outside' && labReport.report_url ? (
          <div style={{ width: '100%', height: '1750px' }}>
            <embed id="pdf_report" height="100%" width="100%" src={labReport.report_url} />
          </div>
        ) : (
          <div id="lab-report-printable-area" className="lab-report">
            {/* Basic Details */}
            <div style={{
              marginBottom: '32px',
              padding: '24px',
              backgroundColor: 'var(--panel)',
              borderRadius: '16px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
              border: '1px solid var(--line)'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
                {/* Patient Info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(var(--primary-rgb), 0.3)' }}>
                      {(patient?.name || 'N').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: '700', color: 'var(--text)' }}>
                        {(patient?.name || 'N/A').toUpperCase()}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--muted)' }}>
                        <span>{calculateAge(patient?.birthdate, patient?.age)} yrs</span>
                        <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--muted)' }} />
                        <span>{patient?.sex || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: '12px', padding: '12px 16px', backgroundColor: 'var(--panel-soft)', borderRadius: '10px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--muted)', fontWeight: 500 }}>Patient ID</span>
                      <span style={{ fontWeight: '600', color: 'var(--text)', fontFamily: 'monospace', fontSize: '14px' }}>LCD.{String(patient?.id || 0).padStart(9, '0')}</span>
                    </div>
                  </div>
                </div>

                {/* Reference Info */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '16px', backgroundColor: 'var(--panel-soft)', borderRadius: '12px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div style={{ marginBottom: '16px' }}>
                      <span style={{ display: 'block', fontSize: '11px', color: 'var(--muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Referred By</span>
                      <span style={{ display: 'block', fontSize: '15px', fontWeight: '600', color: 'var(--text)' }}>{doctor || 'N/A'}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ display: 'block', fontSize: '11px', color: 'var(--muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Billing No</span>
                        <span style={{ display: 'block', fontSize: '13px', fontWeight: '600', fontFamily: 'monospace' }}>LCDB.{String(payment?.billing_number || 0).padStart(9, '0')}</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <span style={{ display: 'block', fontSize: '11px', color: 'var(--muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Access No</span>
                        <span style={{ display: 'block', fontSize: '13px', fontWeight: '600', fontFamily: 'monospace' }}>LCDR.{String(labReport.id).padStart(9, '0')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timeline Info */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '16px', backgroundColor: 'var(--panel-soft)', borderRadius: '12px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Collected</span>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)' }}>{formatLabTime(payment?.collected_time_string)}</span>
                    </div>
                    <div style={{ height: '1px', backgroundColor: 'var(--line)', width: '100%' }}></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Received</span>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)' }}>{formatLabTime(payment?.received_time_string)}</span>
                    </div>
                    <div style={{ height: '1px', backgroundColor: 'var(--line)', width: '100%' }}></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Reported</span>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)' }}>{formatLabTime(labReport.date_string)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Clinical History */}
              {payment?.clinical_history && (
                <div style={{ marginTop: '24px', padding: '16px 20px', backgroundColor: 'var(--panel-soft)', borderLeft: '4px solid var(--primary)', borderRadius: '0 12px 12px 0' }}>
                  <span style={{ display: 'block', fontSize: '12px', color: 'var(--primary)', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Clinical History</span>
                  <p style={{ margin: 0, fontSize: '14px', color: 'var(--text)', lineHeight: '1.6' }}>
                    {payment.clinical_history}
                  </p>
                </div>
              )}
            </div>

            {/* Investigation Results */}
            <div style={{ marginBottom: '24px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', color: 'var(--primary)' }}>{labReport.department}</h3>
                <p style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 600 }}>{labReport.category_name}</p>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Test Report Status: {labReport.status}</th>
                        <th>Results</th>
                        {labReport.category !== 2 && <th>Biological Reference Interval</th>}
                        {labReport.category !== 2 && <th>Units</th>}
                      </tr>
                    </thead>
                  </table>
                </div>


                {/* Dynamic Lab Results Table */}
                {labCategory && (
                  <LabReportTable
                    labCategory={labCategory}
                    labOrderId={labReport.lab_order_id}
                    categoryId={labReport.category}
                    isEditable={false}
                    sections={sections}
                    subcategories={subcategories}
                    testValues={testValues}
                    onValueChange={handleValueChange}
                    onFileUpload={handleFileUpload}
                    patientId={patient?.id}
                  />
                )}

                {/* Separate Reference Table */}
                {labReport.separate_ref && (
                  <div id="ref_table" className="reference-table mt-3">
                    {/* TODO: Add separate reference table content */}
                  </div>
                )}

                {labReport.special_notes && (
                  <div className="alert alert-light font-weight-bold mt-3" role="alert">
                    <p>*{labReport.special_notes}</p>
                  </div>
                )}

                <div className="text-center mt-4">
                  <p className="font-weight-bold">***End Of Report***</p>
                </div>
              </div>
            </div>

            {/* Certification / Dual Sign-off */}
            <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '32px' }}>
                {/* Prepared & Reported By (Technician) */}
                <div style={{ minWidth: '240px' }}>
                  <p style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Prepared & Reported By
                  </p>
                  <p style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>
                    {reportingTechnician.name}
                  </p>
                  <p style={{ margin: '0 0 2px', fontSize: '13px', color: 'var(--muted)' }}>
                    {reportingTechnician.designation}
                  </p>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted)' }}>
                    {reportingTechnician.regNo}
                  </p>
                </div>

                {/* Checked & Authorized By (Duty Pathologist) */}
                <div style={{ minWidth: '260px', textAlign: 'right' }}>
                  <p style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Checked & Authorized By
                  </p>
                  <p style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>
                    {dutyPathologist.name}
                  </p>
                  {dutyPathologist.qualifications && (
                    <p style={{ margin: '0 0 2px', fontSize: '12px', fontWeight: 600, color: 'var(--primary)' }}>
                      {dutyPathologist.qualifications}
                    </p>
                  )}
                  <p style={{ margin: '0 0 2px', fontSize: '13px', color: 'var(--muted)' }}>
                    {dutyPathologist.designation}
                  </p>
                  {dutyPathologist.slmcRegNo && (
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted)' }}>
                      {dutyPathologist.slmcRegNo}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Duty Pathologist Assignment Modal */}
      <DutyPathologistSelectorModal
        isOpen={isPathologistModalOpen}
        onClose={() => setIsPathologistModalOpen(false)}
        onSaved={(updated) => setDutyPathologistState(updated)}
      />
    </section>
  );
};

export default LabReportPage;
