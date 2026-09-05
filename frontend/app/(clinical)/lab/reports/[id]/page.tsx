'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import api from '@/lib/api';
import LabReportTable from '@/components/lab/LabReportTable';
import { UserRole } from '@/lib/roles';

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
            const categoryData = await api.getLabCategory(user.token, categoryId) as LabCategory;
            setLabCategory((prev) => ({
              ...(prev || {}),
              ...categoryData
            }));
          }

          // Fetch patient data
          if (reportData.patient_id && !(reportData as any).patient) {
            const patientData = await api.getPatient(user.token, String(reportData.patient_id)) as Patient;
            setPatient(patientData);
          }

          // Fetch doctor data
          if (reportData.doctor_id && !(reportData as any).doctor_name) {
            const doctorData = await api.getDoctor(user.token, String(reportData.doctor_id)) as Doctor;
            setDoctor(doctorData?.name || 'Unknown Doctor');
          }

          // Fetch lab results (test values) for this order
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
                  comment: result.comment
                };
              }

              if ((result.subcategory || '').toString().match(/^\d+$/) && (reportData as any).lab_category?.category) {
                const categoryKey = (reportData as any).lab_category.category.toUpperCase();
                if (categoryKey && !testValuesMap[categoryKey]) {
                  testValuesMap[categoryKey] = {
                    id: result.id,
                    value: result.value,
                    comment: result.comment
                  };
                }
              }
            });
            setTestValues(testValuesMap);
          }

          // Fetch test definitions (subcategories) for this category
          if (reportData.category) {
            const defsData = await api.getLabTestDefinitions(user.token, { category: reportData.category });
            const defsList = Array.isArray(defsData) ? defsData : (defsData?.results || []);
            if (defsList.length) {
              setSubcategories(defsList);
            }
          }

          // Fetch lab sections for this category
          if (reportData.category) {
            const sectionsData = await api.getLabSections(user.token, reportData.category);
            if (sectionsData && Array.isArray(sectionsData)) {
              setSections(sectionsData);
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

  const handleDownload = () => {
    // TODO: Implement PDF download
    console.log('Download PDF');
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
        {/* Action Buttons */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button className="button secondary compact" onClick={handlePrint}>
              Print
            </button>
            <button type="button" className="button primary compact" onClick={handleDownload}>
              Download
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
          <div className="lab-report">
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

            {/* Certification */}
            <div>
              <div>
                <div className="float-right text-center">
                  <p className="font-weight-bold">
                    Ishari Ubeysiri<br />
                    Medical Laboratory Technician<br />
                    SLMC Reg No 2312
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default LabReportPage;
