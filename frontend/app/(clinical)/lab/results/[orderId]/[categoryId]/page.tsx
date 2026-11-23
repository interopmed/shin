'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
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
  loinc_code?: string;
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

interface LabOrderCategoryItem {
  lab_id: number;
  category_id: number | string;
}

const LabEnterReportPage = () => {
  const params = useParams();
  const orderId = params?.orderId as string;
  const categoryId = params?.categoryId as string;
  const router = useRouter();
  const { user } = useAuth();
  const { hasAnyRole, canEdit } = usePermissions();
  const [labReport, setLabReport] = useState<LabReport | null>(null);
  const [labCategory, setLabCategory] = useState<LabCategory | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [payment, setPayment] = useState<PaymentInfo | null>(null);
  const [doctor, setDoctor] = useState<string>('');
  const [sections, setSections] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [testValues, setTestValues] = useState<Record<string, any>>({});
  const [specialNotes, setSpecialNotes] = useState('');
  const [labId, setLabId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const canEditReport = useMemo(() => {
    return hasAnyRole([UserRole.ADMIN, UserRole.ACCOUNTANT]) && canEdit('lab');
  }, [hasAnyRole, canEdit]);

  useEffect(() => {
    const fetchReportData = async () => {
      if (!user?.token || !orderId || !categoryId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setLoadError(null);

      try {
        const orderData = await api.getLabOrderCategories(user.token, orderId as string) as any;
        const testItems: LabOrderCategoryItem[] = Array.isArray(orderData?.tests) ? orderData.tests : [];
        const matchedTest = testItems.find(
          (test) => String(test.category_id) === String(categoryId)
        );

        if (!matchedTest?.lab_id) {
          setLoadError('Unable to locate the lab test for this category.');
          setLoading(false);
          return;
        }

        setLabId(matchedTest.lab_id);

        const reportData = await api.getLabTest(user.token, String(matchedTest.lab_id)) as LabReport;
        setLabReport(reportData);
        setSpecialNotes(reportData.special_notes || '');

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

        const categoryData = await api.getLabCategory(user.token, categoryId as string) as LabCategory;
        setLabCategory((prev) => ({
          ...(prev || {}),
          ...categoryData
        }));

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

        const resultsData = await api.getLabResults(user.token, { order: reportData.lab_order_id });
        const resultsList = Array.isArray(resultsData) ? resultsData : (resultsData?.results || []);
        if (resultsList.length) {
          const testValuesMap: Record<string, any> = {};
          resultsList
            .filter((result: any) => String(result.category) === String(categoryId))
            .forEach((result: any) => {
              const key = (result.subcategory_name || result.subcategory || '').toString().toUpperCase();
              if (key) {
                testValuesMap[key] = {
                  id: result.id,
                  value: result.value
                };
              }
            });

          if (categoryData?.name) {
            const categoryNameKey = categoryData.name.toUpperCase();
            if (!testValuesMap[categoryNameKey]) {
              const singleResult = resultsList.find(
                (result: any) => String(result.category) === String(categoryId)
              );
              if (singleResult) {
                testValuesMap[categoryNameKey] = {
                  id: singleResult.id,
                  value: singleResult.value
                };
              }
            }
          }

          if (categoryData?.category) {
            const categoryCodeKey = categoryData.category.toUpperCase();
            if (!testValuesMap[categoryCodeKey]) {
              const singleResult = resultsList.find(
                (result: any) => String(result.category) === String(categoryId)
              );
              if (singleResult) {
                testValuesMap[categoryCodeKey] = {
                  id: singleResult.id,
                  value: singleResult.value
                };
              }
            }
          }

          setTestValues(testValuesMap);
        }

        const defsData = await api.getLabTestDefinitions(user.token, { category: categoryId });
        const defsList = Array.isArray(defsData) ? defsData : (defsData?.results || []);
        if (defsList.length) {
          setSubcategories(defsList);
        }

        const sectionsData = await api.getLabSections(user.token, categoryId as string);
        if (sectionsData && Array.isArray(sectionsData)) {
          setSections(sectionsData);
        }
      } catch (error) {
        console.error('Failed to fetch lab report:', error);
        setLoadError('Failed to load report details.');
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [user, orderId, categoryId]);

  const handleValueChange = (name: string, value: string, testId?: number) => {
    setTestValues(prev => ({
      ...prev,
      [name.toUpperCase()]: { id: testId, value }
    }));
  };

  const handleFileUpload = async (file: File) => {
    console.log('Uploading file:', file.name);
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

  const handleSave = async () => {
    if (!user?.token || !labCategory || !labReport || !labId || saving) return;

    setSaving(true);

    try {
      const categoryValue = labCategory.id || categoryId;
      const updates: Promise<any>[] = [];

      if (subcategories.length > 0) {
        subcategories.forEach((sub) => {
          const key = (sub.name || '').toString().toUpperCase();
          const entry = testValues[key];
          const rawValue = entry?.value;
          if (rawValue === undefined || rawValue === null || String(rawValue).trim() === '') {
            return;
          }

          const payload = {
            lab_order_id: labReport.lab_order_id,
            category: categoryValue,
            subcategory: sub.id,
            value: rawValue
          };

          if (entry?.id) {
            updates.push(api.updateLabResult(user.token, entry.id, payload));
          } else {
            updates.push(api.createLabResult(user.token, payload));
          }
        });
      } else {
        const keyCandidates = [labCategory.name, labCategory.category].filter(Boolean);
        const entry = keyCandidates
          .map((key) => testValues[key.toUpperCase()])
          .find(Boolean);
        const rawValue = entry?.value;

        if (rawValue !== undefined && rawValue !== null && String(rawValue).trim() !== '') {
          const payload = {
            lab_order_id: labReport.lab_order_id,
            category: categoryValue,
            subcategory: labCategory.category || labCategory.name,
            value: rawValue
          };

          if (entry?.id) {
            updates.push(api.updateLabResult(user.token, entry.id, payload));
          } else {
            updates.push(api.createLabResult(user.token, payload));
          }
        }
      }

      if (specialNotes !== (labReport.special_notes || '')) {
        updates.push(api.updateLabTest(user.token, String(labId), { special_notes: specialNotes }));
      }

      await Promise.all(updates);
      router.refresh();
    } catch (error) {
      console.error('Failed to save lab report:', error);
    } finally {
      setSaving(false);
    }
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

  if (loadError) {
    return (
      <div className="alert alert-warning">{loadError}</div>
    );
  }

  if (!labReport || !labCategory) {
    return (
      <div className="alert alert-warning">Lab report not found</div>
    );
  }

  return (
    <>
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Enter Lab Report</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><Link href="/dashboard">Home</Link></li>
                <li className="breadcrumb-item"><Link href="/lab">Laboratory</Link></li>
                <li className="breadcrumb-item active">Enter Report</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          <div className="card shadow-sm">
            <div className="card-header">
              <div className="d-flex justify-content-between align-items-center flex-wrap">
                <div>
                  <h3 className="card-title mb-0">
                    {labCategory.name} {labCategory.loinc_code && <span className="badge badge-info ml-2">LOINC: {labCategory.loinc_code}</span>} - Order #{labReport.lab_order_id}
                  </h3>
                  <div className="text-muted text-sm">{labReport.department}</div>
                </div>
                <div className="mt-2 mt-sm-0">
                  <button
                    className="btn btn-success btn-sm"
                    onClick={handleSave}
                    disabled={!canEditReport || saving}
                  >
                    {saving ? 'Saving...' : 'Save Report'}
                  </button>
                </div>
              </div>
            </div>

            <div className="card-body">
              <div className="report-summary mb-3">
                <div className="row">
                  <div className="col-md-6">
                    <div className="summary-item">
                      <span>Patient</span>
                      <strong>{patient?.name || 'N/A'}</strong>
                    </div>
                    <div className="summary-item">
                      <span>Age</span>
                      <strong>{patient?.age || 'N/A'}</strong>
                    </div>
                    <div className="summary-item">
                      <span>Sex</span>
                      <strong>{patient?.sex || 'N/A'}</strong>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="summary-item">
                      <span>Referred By</span>
                      <strong>{doctor || 'N/A'}</strong>
                    </div>
                    <div className="summary-item">
                      <span>Billing No.</span>
                      <strong>{payment?.billing_number || labReport.lab_order_id}</strong>
                    </div>
                    <div className="summary-item">
                      <span>Collected</span>
                      <strong>{formatLabTime(payment?.collected_time_string)}</strong>
                    </div>
                    <div className="summary-item">
                      <span>Received</span>
                      <strong>{formatLabTime(payment?.received_time_string)}</strong>
                    </div>
                  </div>
                </div>
                <div className="summary-item mt-2">
                  <span>Clinical History</span>
                  <strong>{payment?.clinical_history || 'N/A'}</strong>
                </div>
              </div>

              <LabReportTable
                labCategory={labCategory}
                labOrderId={labReport.lab_order_id}
                categoryId={labCategory.id}
                isEditable={canEditReport}
                sections={sections}
                subcategories={subcategories}
                testValues={testValues}
                onValueChange={handleValueChange}
                onFileUpload={handleFileUpload}
                patientId={patient?.id}
              />

              <div className="form-group mt-4">
                <label htmlFor="special_notes">Special Notes</label>
                <textarea
                  id="special_notes"
                  className="form-control"
                  rows={3}
                  value={specialNotes}
                  onChange={(event) => setSpecialNotes(event.target.value)}
                  disabled={!canEditReport}
                />
              </div>
            </div>

            <div className="card-footer d-flex justify-content-between">
              <button className="btn btn-secondary" onClick={() => router.back()}>
                Back
              </button>
              <button
                className="btn btn-success"
                onClick={handleSave}
                disabled={!canEditReport || saving}
              >
                {saving ? 'Saving...' : 'Save Report'}
              </button>
            </div>
          </div>
        </div>
      </section>

      <style jsx>{`
        .report-summary {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px 18px;
        }

        .summary-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          font-size: 0.95rem;
        }

        .summary-item span {
          color: #64748b;
        }

        .summary-item strong {
          color: #0f172a;
          font-weight: 600;
        }
      `}</style>
    </>
  );
};

export default LabEnterReportPage;
