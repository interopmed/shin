'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

interface Patient {
  id: number;
  name: string;
  phone?: string;
  sex?: string;
  age?: string;
}

interface Doctor {
  id: number;
  name: string;
  phone?: string;
  institute?: number;
}

interface PaymentCategory {
  id: number;
  name: string;
  display_name?: string;
  price: number;
  category_type?: string;
  d_commission?: number;
}

interface PaymentItem {
  id: number;
  payment_category?: number | null;
  description?: string;
  quantity?: number;
  rate?: number;
  amount?: number;
}

interface PaymentRecord {
  id: number;
  invoice_id?: string;
  reference_number?: string;
  patient?: number;
  doctor?: number | null;
  gross_total?: number;
  discount?: number;
  discount_percentage?: number;
  tax?: number;
  amount?: number;
  paid_amount?: number;
  balance?: number;
  payment_method?: string;
  status?: string;
  remarks?: string;
  section?: string;
  clinical_history?: string;
  collected_time_string?: string | null;
  received_time_string?: string | null;
  processing_status?: number;
  items?: PaymentItem[];
}

type ReferringMethod = 'self_request' | 'doctor' | 'institute';

const requestTypes = [
  { id: '1', label: 'Direct Request' },
  { id: '2', label: 'Collection Center' },
];

const commissionTypes = [
  { id: '1', label: 'Full Commision' },
  { id: '2', label: 'No Commision' },
  { id: '3', label: 'Percentage' },
];

const AddPaymentPage = () => {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [showNewDoctor, setShowNewDoctor] = useState(false);
  const [showNewInstitute, setShowNewInstitute] = useState(false);
  const [existingItems, setExistingItems] = useState<PaymentItem[]>([]);
  const [loadError, setLoadError] = useState<string>('');
  const [paymentLoaded, setPaymentLoaded] = useState(false);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [categories, setCategories] = useState<PaymentCategory[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [selectableSearch, setSelectableSearch] = useState('');
  const [selectedSearch, setSelectedSearch] = useState('');
  const [pendingCharges, setPendingCharges] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    billing_number: '',
    collected_time: '',
    received_time: '',
    clinical_history: '',
    patient: '',
    p_name: '',
    p_phone: '',
    p_age: '',
    p_gender: 'Male',
    referring_method: 'self_request' as ReferringMethod,
    doctor: '',
    d_name: '',
    d_phone: '',
    institute: '',
    new_institute: '',
    request_type: requestTypes[0].id,
    commission_type: commissionTypes[0].id,
    commission_percentage: '',
    discount: '',
    remarks: '',
    amount_received: '',
    deposit_type: 'Cash',
    card_type: 'Mastercard',
    card_number: '',
    expire_date: '',
    cvv_number: '',
  });

  const rawId = searchParams?.get('id');
  const sectionParam = searchParams?.get('section') || '';
  const labOrderIdParam = searchParams?.get('lab_order_id');
  const paymentId = rawId || '';

  const ensurePatientInList = async (patientId?: string | number | null) => {
    if (!patientId || !user?.token) return;
    const exists = patients.some((patient) => String(patient.id) === String(patientId));
    if (exists) return;
    try {
      const patient = await api.getPatient(user.token, String(patientId)) as Patient;
      if (patient?.id) {
        setPatients((prev) => [...prev, patient]);
      }
    } catch (err: any) {
      const msg = String(err?.message || '').toLowerCase();
      if (msg.includes('404')) return; // suppress missing patient noise
      console.warn('Failed to fetch patient for selection:', err);
    }
  };

  const ensureDoctorInList = async (doctorId?: string | number | null) => {
    if (!doctorId || !user?.token) return;
    const exists = doctors.some((doctor) => String(doctor.id) === String(doctorId));
    if (exists) return;
    try {
      const doctor = await api.getDoctor(user.token, String(doctorId)) as Doctor;
      if (doctor?.id) {
        setDoctors((prev) => [...prev, doctor]);
      }
    } catch (err: any) {
      const msg = String(err?.message || '').toLowerCase();
      if (msg.includes('404')) return; // suppress missing doctor noise
      console.warn('Failed to fetch doctor for selection:', err);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.token) return;
      try {
        const [patientsData, doctorsData, labCategoriesData, paymentCategoriesData] = await Promise.all([
          api.getPatients(user.token),
          api.getDoctors(user.token),
          api.getAllLabCategories(user.token),
          api.getAllPaymentCategories(user.token),
        ]);

        setPatients(patientsData as Patient[]);
        setDoctors(doctorsData as Doctor[]);
        const normalizePayment = (items: Array<Record<string, any>>) =>
          items.map((item) => {
            const displayName = String(item.name ?? item.category ?? '').trim();
            return {
              id: Number(item.id),
              name: displayName,
              display_name: displayName || `Category ${item.id}`,
              price: Number(item.price ?? item.c_price ?? 0),
              category_type: item.category_type ?? 'lab',
              d_commission: Number(item.d_commission ?? item.commission ?? 0),
            } as PaymentCategory;
          });

        const paymentNormalized = normalizePayment(paymentCategoriesData as Array<Record<string, any>>);
        if (paymentNormalized.length > 0) {
          setCategories(paymentNormalized);
        } else {
          const labNormalized = normalizePayment(labCategoriesData as Array<Record<string, any>>);
          setCategories(labNormalized);
        }
      } catch (error) {
        console.error('Failed to load payment form data:', error);
      }
    };

    fetchData();
  }, [user]);

  useEffect(() => {
    const fetchPayment = async () => {
      if (!user?.token || !paymentId) return;

      try {
        const payment = await api.getPayment(user.token, paymentId) as PaymentRecord;
        if (!payment?.id) {
          throw new Error('Payment not found');
        }

        const invoiceNumber = payment.invoice_id || payment.reference_number || '';
        const referringDoctorId = payment.doctor ? String(payment.doctor) : '';
        const doctorEntry = doctors.find((doc) => String(doc.id) === referringDoctorId);
        const isInstitute = doctorEntry ? Number(doctorEntry.institute) === 1 : false;
        const referringMethod: ReferringMethod = referringDoctorId
          ? (isInstitute ? 'institute' : 'doctor')
          : 'self_request';

        setFormData((prev) => ({
          ...prev,
          billing_number: invoiceNumber,
          collected_time: toDateTimeLocal(payment.collected_time_string),
          received_time: toDateTimeLocal(payment.received_time_string),
          clinical_history: payment.clinical_history || '',
          patient: payment.patient ? String(payment.patient) : '',
          referring_method: referringMethod,
          doctor: referringMethod === 'doctor' ? referringDoctorId : '',
          institute: referringMethod === 'institute' ? referringDoctorId : '',
          discount: payment.discount !== undefined ? String(payment.discount) : '',
          remarks: payment.remarks || '',
          amount_received: payment.paid_amount !== undefined ? String(payment.paid_amount) : '',
          deposit_type: payment.payment_method === 'card' ? 'Card' : 'Cash',
        }));

        await ensurePatientInList(payment.patient);
        await ensureDoctorInList(payment.doctor);

        const paymentItems = Array.isArray(payment.items) ? payment.items : [];
        setExistingItems(paymentItems);
        const itemCategoryIds = paymentItems
          .map((item) => Number(item.payment_category))
          .filter((value) => Number.isFinite(value));
        if (itemCategoryIds.length) {
          setSelectedCategoryIds(itemCategoryIds);
        }
        setPaymentLoaded(true);
        return;
      } catch (error) {
        const isNotFound = String(error?.toString() || '').toLowerCase().includes('404');
        try {
          const searchResults = await api.getPayments(user?.token || '', { search: paymentId });
          const candidates = Array.isArray(searchResults) ? searchResults : (searchResults?.results || []);
          const matched = candidates.find((item: PaymentRecord) => String(item.id) === String(paymentId));
          if (!matched) {
            throw new Error('Payment not found');
          }

          const invoiceNumber = matched.invoice_id || matched.reference_number || '';
          const referringDoctorId = matched.doctor ? String(matched.doctor) : '';
          const doctorEntry = doctors.find((doc) => String(doc.id) === String(referringDoctorId));
          const isInstitute = doctorEntry ? Number(doctorEntry.institute) === 1 : false;
          const referringMethod: ReferringMethod = referringDoctorId
            ? (isInstitute ? 'institute' : 'doctor')
            : 'self_request';

          setFormData((prev) => ({
            ...prev,
            billing_number: invoiceNumber,
            collected_time: toDateTimeLocal(matched.collected_time_string),
            received_time: toDateTimeLocal(matched.received_time_string),
            clinical_history: matched.clinical_history || '',
            patient: matched.patient ? String(matched.patient) : '',
            referring_method: referringMethod,
            doctor: referringMethod === 'doctor' ? referringDoctorId : '',
            institute: referringMethod === 'institute' ? referringDoctorId : '',
            discount: matched.discount !== undefined ? String(matched.discount) : '',
            remarks: matched.remarks || '',
            amount_received: matched.paid_amount !== undefined ? String(matched.paid_amount) : '',
            deposit_type: matched.payment_method === 'card' ? 'Card' : 'Cash',
          }));

          await ensurePatientInList(matched.patient);
          await ensureDoctorInList(matched.doctor);

          const paymentItems = Array.isArray(matched.items) ? (matched.items as PaymentItem[]) : [];
          setExistingItems(paymentItems);
          const itemCategoryIds = paymentItems
            .map((item: PaymentItem) => Number(item.payment_category))
            .filter((value: number) => Number.isFinite(value));
          if (itemCategoryIds.length) {
            setSelectedCategoryIds(itemCategoryIds);
          }
          setPaymentLoaded(true);
          return;
        } catch (fallbackError) {
          console.error('Failed to load payment data:', error);
          console.error('Fallback search failed:', fallbackError);
          if (sectionParam !== 'lab' || !isNotFound) {
            setLoadError('Saved payment not found for this ID.');
          }
          setPaymentLoaded(false);
        }
      }
    };

    fetchPayment();
  }, [user, paymentId, doctors]);

  useEffect(() => {
    const hydrateFromLabOrder = async () => {
      if (!user?.token || paymentLoaded || sectionParam !== 'lab' || !rawId) return;

      try {
        const orderId = labOrderIdParam || rawId;
        const order = await api.getLabTest(user.token, orderId);
        const patientId = order?.patient || order?.patient_id || '';
        const doctorId = order?.doctor || order?.doctor_id || '';
        const referringMethod: ReferringMethod = doctorId ? 'doctor' : 'self_request';

        setFormData((prev) => ({
          ...prev,
          patient: patientId ? String(patientId) : prev.patient,
          referring_method: referringMethod,
          doctor: referringMethod === 'doctor' ? String(doctorId) : '',
        }));

        await ensurePatientInList(patientId);
        await ensureDoctorInList(doctorId);
      } catch (err) {
        console.error('Failed to hydrate payment form from lab order:', err);
      }
    };

    hydrateFromLabOrder();
  }, [user, rawId, sectionParam, paymentLoaded]);

  useEffect(() => {
    const fetchPendingCharges = async () => {
      if (!user?.token || !formData.patient) {
        setPendingCharges([]);
        return;
      }
      try {
        const charges = await api.getChargeItems(user.token, { patient: formData.patient, status: 'billable' });
        setPendingCharges(Array.isArray(charges) ? charges : []);
      } catch (err) {
        console.error('Failed to fetch pending charges:', err);
      }
    };
    fetchPendingCharges();
  }, [user, formData.patient]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedIds = Array.from(e.target.selectedOptions).map((option) => Number(option.value));
    setSelectedCategoryIds(selectedIds);
  };

  const toDateTimeLocal = (value?: string | null) => {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    const pad = (num: number) => String(num).padStart(2, '0');
    return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
  };

  const toggleCategory = (id: number) => {
    setSelectedCategoryIds((prev) => (
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    ));
  };

  const parseNumber = (value: string) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const selectedItems = useMemo(() => {
    return categories
      .filter((category) => selectedCategoryIds.includes(category.id))
      .map((category) => {
        const quantity = 1;
        const amount = Number(category.price);
        return {
          id: category.id,
          name: category.name,
          price: Number(category.price),
          quantity,
          amount,
        };
      });
  }, [categories, selectedCategoryIds]);

  const subtotal = selectedItems.reduce((sum, item) => sum + item.amount, 0) + pendingCharges.reduce((sum, charge) => sum + Number(charge.amount), 0);
  const discountValue = parseNumber(formData.discount);
  const grossTotal = Math.max(subtotal - discountValue, 0);
  const amountReceived = parseNumber(formData.amount_received);
  const change = amountReceived - grossTotal;

  const handleClear = () => {
    setFormData((prev) => ({
      ...prev,
      billing_number: '',
      collected_time: '',
      received_time: '',
      clinical_history: '',
      patient: '',
      p_name: '',
      p_phone: '',
      p_age: '',
      p_gender: 'Male',
      referring_method: 'self_request',
      doctor: '',
      d_name: '',
      d_phone: '',
      institute: '',
      new_institute: '',
      request_type: requestTypes[0].id,
      commission_type: commissionTypes[0].id,
      commission_percentage: '',
      discount: '',
      remarks: '',
      amount_received: '',
      deposit_type: 'Cash',
      card_type: 'Mastercard',
      card_number: '',
      expire_date: '',
      cvv_number: '',
    }));
    setSelectedCategoryIds([]);
    setShowNewPatient(false);
    setShowNewDoctor(false);
    setShowNewInstitute(false);
    setSelectableSearch('');
    setSelectedSearch('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.token) return;
    if (selectedItems.length === 0 && pendingCharges.length === 0) {
      alert('Please select at least one investigation or charge.');
      return;
    }

    setLoading(true);
    try {
      let patientId = formData.patient;
      if (showNewPatient) {
        const newPatient = await api.createPatient(user.token, {
          name: formData.p_name,
          phone: formData.p_phone,
          age: formData.p_age,
          sex: formData.p_gender,
        }) as Patient;
        patientId = String(newPatient.id);
      }

      let doctorId: string | null = null;
      if (formData.referring_method === 'doctor') {
        if (showNewDoctor) {
          const newDoctor = await api.createDoctor(user.token, {
            name: formData.d_name,
            phone: formData.d_phone,
          }) as Doctor;
          doctorId = String(newDoctor.id);
        } else if (formData.doctor) {
          doctorId = formData.doctor;
        }
      }

      if (formData.referring_method === 'institute') {
        if (showNewInstitute) {
          const newInstitute = await api.createDoctor(user.token, {
            name: formData.new_institute,
            institute: 1,
          }) as Doctor;
          doctorId = String(newInstitute.id);
        } else if (formData.institute) {
          doctorId = formData.institute;
        }
      }

      const rawDiscountPercentage = subtotal > 0 ? (discountValue / subtotal) * 100 : 0;
      const discountPercentage = Math.min(999.99, Number(rawDiscountPercentage.toFixed(2)));
      const paymentMethod = formData.deposit_type === 'Card' ? 'card' : 'cash';
      const amount = grossTotal;
      const balance = amount - amountReceived;
      const status = balance <= 0 ? 'paid' : 'pending';

      const paymentPayload: Record<string, any> = {
        invoice_id: formData.billing_number,
        patient: Number(patientId),
        gross_total: grossTotal,
        discount: discountValue,
        discount_percentage: discountPercentage,
        tax: 0,
        amount,
        paid_amount: amountReceived,
        balance,
        payment_method: paymentMethod,
        status,
        remarks: formData.remarks || '',
        reference_number: formData.billing_number,
        section: searchParams?.get('section') || '',
        clinical_history: formData.clinical_history || '',
        collected_time_string: formData.collected_time || null,
        received_time_string: formData.received_time || null,
      };

      if (doctorId) {
        paymentPayload.doctor = Number(doctorId);
      }

      let targetPaymentId = paymentId ? Number(paymentId) : 0;

      if (targetPaymentId) {
        await api.updatePayment(user.token, targetPaymentId, paymentPayload);
      } else {
        const payment = await api.createPayment(user.token, paymentPayload) as { id: number };
        targetPaymentId = payment.id;
      }

      if (targetPaymentId) {
        const existingByCategory = new Map<number, PaymentItem>();
        existingItems.forEach((item) => {
          if (item.payment_category) {
            existingByCategory.set(Number(item.payment_category), item);
          }
        });

        const selectedCategorySet = new Set(selectedItems.map((item) => item.id));
        const updates: Promise<any>[] = [];

        selectedItems.forEach((item) => {
          const existing = existingByCategory.get(item.id);
          const payload = {
            payment: targetPaymentId,
            payment_category: item.id,
            description: item.name,
            quantity: item.quantity,
            rate: item.price,
            amount: item.amount,
          };

          if (existing?.id) {
            updates.push(api.updatePaymentItem(user.token, existing.id, payload));
          } else {
            updates.push(api.createPaymentItem(user.token, payload));
          }
        });

        // Add pending charges as payment items and mark them as billed
        pendingCharges.forEach((charge) => {
          const payload = {
            payment: targetPaymentId,
            payment_category: null,
            description: `Clinical Charge: ${charge.description} (${charge.code || 'N/A'})`,
            quantity: 1,
            rate: charge.amount,
            amount: charge.amount,
          };
          updates.push(api.createPaymentItem(user.token, payload));
          updates.push(api.updateChargeItem(user.token, charge.id, { status: 'billed' }));
        });

        existingItems.forEach((item) => {
          if (!item.payment_category) return;
          if (!selectedCategorySet.has(Number(item.payment_category))) {
            updates.push(api.deletePaymentItem(user.token, item.id));
          }
        });

        await Promise.all(updates);
      }

      router.push('/finance/payment');
    } catch (error) {
      console.error('Failed to create payment:', error);
      alert('Failed to create payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const instituteOptions = doctors.filter((doctor) => Number(doctor.institute) === 1);
  const doctorOptions = doctors.filter((doctor) => Number(doctor.institute) !== 1);

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    fontSize: '13px',
    color: '#0f172a',
    backgroundColor: '#fff',
    outline: 'none',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: '#334155',
    marginBottom: '6px',
  };

  return (
    <section className="mpi-page">
      <form id="editPaymentForm" onSubmit={handleSubmit}>
        <header className="mpi-header">
          <div>
            <h1>Add Payment</h1>
            <p className="patient-db-status">Process patient billing, lab requests, and create invoices.</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleClear}
              disabled={loading}
              style={{
                background: '#fff', color: '#64748b', border: '1px solid #cbd5e1',
                padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer'
              }}
            >
              Clear
            </button>
            <button type="submit" disabled={loading} className="mpi-primary-button">
              {loading ? 'Saving...' : 'Submit Payment'}
            </button>
          </div>
        </header>

        {loadError ? (
          <div style={{ padding: '16px', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: '8px', marginBottom: '24px', fontSize: '14px', fontWeight: 500 }}>
            <i className="fa fa-exclamation-triangle" style={{ marginRight: '8px' }}></i>
            {loadError}
          </div>
        ) : null}

        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr 280px', gap: '24px', alignItems: 'start' }}>
          
          {/* Left Column: Details */}
          <div className="mpi-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', margin: '0' }}>Billing Information</h2>
            
            <div>
              <label htmlFor="billing_number" style={labelStyle}>Billing Number *</label>
              <input type="text" id="billing_number" name="billing_number" style={inputStyle} value={formData.billing_number} onChange={handleChange} required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label htmlFor="collected_time" style={labelStyle}>Collected Time</label>
                <input type="datetime-local" id="collected_time" name="collected_time" style={inputStyle} value={formData.collected_time} onChange={handleChange} />
              </div>
              <div>
                <label htmlFor="received_time" style={labelStyle}>Received Time</label>
                <input type="datetime-local" id="received_time" name="received_time" style={inputStyle} value={formData.received_time} onChange={handleChange} />
              </div>
            </div>

            <div>
              <label htmlFor="clinical_history" style={labelStyle}>Clinical History</label>
              <input type="text" id="clinical_history" name="clinical_history" style={inputStyle} value={formData.clinical_history} onChange={handleChange} />
            </div>

            <div>
              <label htmlFor="patient" style={labelStyle}>
                Patient * 
                <i className="fa fa-plus-circle" style={{ marginLeft: '8px', color: '#059669', cursor: 'pointer' }} onClick={() => setShowNewPatient((prev) => !prev)}></i>
              </label>
              <select id="patient" name="patient" style={inputStyle} value={formData.patient} onChange={handleChange} required>
                <option value="">Select Patient</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>{patient.name}</option>
                ))}
              </select>
            </div>

            {showNewPatient && (
              <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '12px', border: '1px dashed #cbd5e1' }}>
                <h3 style={{ margin: 0, fontSize: '13px', color: '#0f172a' }}>New Patient Details</h3>
                <div>
                  <label htmlFor="p_name" style={labelStyle}>Patient Name *</label>
                  <input type="text" id="p_name" name="p_name" style={inputStyle} value={formData.p_name} onChange={handleChange} required={showNewPatient} />
                </div>
                <div>
                  <label htmlFor="p_phone" style={labelStyle}>Patient Phone *</label>
                  <input type="text" id="p_phone" name="p_phone" style={inputStyle} value={formData.p_phone} onChange={handleChange} required={showNewPatient} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label htmlFor="p_age" style={labelStyle}>Age</label>
                    <input type="text" id="p_age" name="p_age" style={inputStyle} value={formData.p_age} onChange={handleChange} />
                  </div>
                  <div>
                    <label htmlFor="p_gender" style={labelStyle}>Gender</label>
                    <select id="p_gender" name="p_gender" style={inputStyle} value={formData.p_gender} onChange={handleChange}>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Others">Others</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label style={labelStyle}>Referring Method</label>
              <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#334155' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input type="radio" name="referring_method" value="self_request" checked={formData.referring_method === 'self_request'} onChange={handleChange} /> Self Request
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input type="radio" name="referring_method" value="doctor" checked={formData.referring_method === 'doctor'} onChange={handleChange} /> Doctor
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input type="radio" name="referring_method" value="institute" checked={formData.referring_method === 'institute'} onChange={handleChange} /> Institute
                </label>
              </div>
            </div>

            {formData.referring_method === 'doctor' && (
              <>
                <div>
                  <label htmlFor="doctor" style={labelStyle}>
                    Doctor
                    <i className="fa fa-plus-circle" style={{ marginLeft: '8px', color: '#059669', cursor: 'pointer' }} onClick={() => setShowNewDoctor((prev) => !prev)}></i>
                  </label>
                  <select id="doctor" name="doctor" style={inputStyle} value={formData.doctor} onChange={handleChange} required>
                    <option value="">Select Doctor</option>
                    {doctorOptions.map((doctor) => (
                      <option key={doctor.id} value={doctor.id}>{doctor.name}</option>
                    ))}
                  </select>
                </div>
                {showNewDoctor && (
                  <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '12px', border: '1px dashed #cbd5e1' }}>
                    <h3 style={{ margin: 0, fontSize: '13px', color: '#0f172a' }}>New Doctor Details</h3>
                    <div>
                      <label htmlFor="d_name" style={labelStyle}>Doctor Name *</label>
                      <input type="text" id="d_name" name="d_name" style={inputStyle} value={formData.d_name} onChange={handleChange} required={showNewDoctor} />
                    </div>
                    <div>
                      <label htmlFor="d_phone" style={labelStyle}>Doctor Phone *</label>
                      <input type="text" id="d_phone" name="d_phone" style={inputStyle} value={formData.d_phone} onChange={handleChange} required={showNewDoctor} />
                    </div>
                  </div>
                )}
              </>
            )}

            {formData.referring_method === 'institute' && (
              <>
                <div>
                  <label htmlFor="institute" style={labelStyle}>
                    Institute
                    <i className="fa fa-plus-circle" style={{ marginLeft: '8px', color: '#059669', cursor: 'pointer' }} onClick={() => setShowNewInstitute((prev) => !prev)}></i>
                  </label>
                  <select id="institute" name="institute" style={inputStyle} value={formData.institute} onChange={handleChange} required>
                    <option value="">Select Institute</option>
                    {instituteOptions.map((doctor) => (
                      <option key={doctor.id} value={doctor.id}>{doctor.name}</option>
                    ))}
                  </select>
                </div>
                {showNewInstitute && (
                  <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '12px', border: '1px dashed #cbd5e1' }}>
                    <h3 style={{ margin: 0, fontSize: '13px', color: '#0f172a' }}>New Institute Details</h3>
                    <div>
                      <label htmlFor="new_institute" style={labelStyle}>Institute Name *</label>
                      <input type="text" id="new_institute" name="new_institute" style={inputStyle} value={formData.new_institute} onChange={handleChange} required={showNewInstitute} />
                    </div>
                  </div>
                )}
              </>
            )}

            {formData.referring_method !== 'self_request' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label htmlFor="request_type" style={labelStyle}>Request Type</label>
                  <select id="request_type" name="request_type" style={inputStyle} value={formData.request_type} onChange={handleChange}>
                    {requestTypes.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="commission_type" style={labelStyle}>Commission</label>
                  <select id="commission_type" name="commission_type" style={inputStyle} value={formData.commission_type} onChange={handleChange}>
                    {commissionTypes.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}
                  </select>
                </div>
                {formData.commission_type === '3' && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <label htmlFor="commission_percentage" style={labelStyle}>Commission %</label>
                    <input type="text" id="commission_percentage" name="commission_percentage" style={inputStyle} value={formData.commission_percentage} onChange={handleChange} />
                  </div>
                )}
              </div>
            )}
            
            <div style={{ marginTop: '16px' }}>
              <label style={labelStyle}>Select Investigation/s</label>
              <select
                id="multi_select"
                className="multi-select"
                multiple
                value={selectedCategoryIds.map(String)}
                onChange={handleCategoryChange}
                required={selectedItems.length === 0}
                name="category_name[]"
                style={{ position: 'absolute', left: '-9999px', opacity: 0 }}
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.display_name ?? category.name}</option>
                ))}
              </select>
              <div className="ms-container" id="ms-multi_select" style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                <div className="ms-selectable" style={{ border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff' }}>
                  <input
                    type="text"
                    style={{ width: '100%', padding: '8px 12px', border: 'none', borderBottom: '1px solid #e2e8f0', borderRadius: '6px 6px 0 0', outline: 'none', fontSize: '13px' }}
                    autoComplete="off"
                    placeholder="Search investigations..."
                    value={selectableSearch}
                    onChange={(event) => setSelectableSearch(event.target.value)}
                  />
                  <ul className="ms-list" tabIndex={-1} style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: '200px', overflowY: 'auto' }}>
                    {categories
                      .filter((category) => !selectedCategoryIds.includes(category.id))
                      .filter((category) => category.name.toLowerCase().includes(selectableSearch.toLowerCase()))
                      .map((category) => (
                        <li
                          key={`selectable-${category.id}`}
                          className="ms-option ms-elem-selectable"
                          role="button"
                          tabIndex={0}
                          onClick={() => toggleCategory(category.id)}
                          style={{ padding: '8px 12px', fontSize: '13px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                        >
                          {category.display_name ?? category.name}
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Middle Column: Selected Items List */}
          <div className="mpi-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '24px 24px 0 24px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0' }}>Selected Items</h2>
            </div>
            
            <div className="mpi-table-wrap" style={{ border: 'none' }}>
              <table className="mpi-table" style={{ borderTop: '1px solid #e2e8f0' }}>
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>#</th>
                    <th>Item</th>
                    <th style={{ textAlign: 'right' }}>Price</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedItems.length === 0 && pendingCharges.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                        No items selected. Use the search to add investigations.
                      </td>
                    </tr>
                  ) : (
                    <>
                      {selectedItems.map((item, index) => (
                        <tr key={item.id}>
                          <td>{index + 1}</td>
                          <td style={{ fontWeight: 500 }}>
                            {item.name}
                            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                              <span style={{ fontSize: '11px', color: '#be123c', cursor: 'pointer', fontWeight: 600 }} onClick={() => toggleCategory(item.id)}>Remove</span>
                            </div>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{item.amount.toFixed(2)}</td>
                        </tr>
                      ))}
                      {pendingCharges.map((charge, index) => (
                        <tr key={`charge-${charge.id}`} style={{ backgroundColor: '#fffbeb' }}>
                          <td>{selectedItems.length + index + 1}</td>
                          <td style={{ fontWeight: 500 }}>
                            {charge.description}
                            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                              <span className="badge badge-warning" style={{ fontSize: '10px' }}>Clinical Charge</span>
                            </div>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{Number(charge.amount).toFixed(2)}</td>
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Column: Payment & Summary */}
          <div className="mpi-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', margin: '0' }}>Payment Summary</h2>

            <div>
              <label htmlFor="subtotal" style={labelStyle}>Sub Total</label>
              <input type="text" id="subtotal" style={{ ...inputStyle, backgroundColor: '#f8fafc', fontWeight: 600 }} value={subtotal.toFixed(2)} disabled />
            </div>

            <div>
              <label htmlFor="discount" style={labelStyle}>Discount</label>
              <input type="text" id="discount" name="discount" style={inputStyle} value={formData.discount} onChange={handleChange} />
            </div>

            <div>
              <label htmlFor="gross" style={labelStyle}>Gross Total</label>
              <input type="text" id="gross" style={{ ...inputStyle, backgroundColor: '#f0fdf4', color: '#166534', fontWeight: 700, fontSize: '16px', borderColor: '#bbf7d0' }} value={grossTotal.toFixed(2)} disabled />
            </div>
            
            <div>
              <label htmlFor="remarks" style={labelStyle}>Note / Remarks</label>
              <input type="text" id="remarks" name="remarks" style={inputStyle} value={formData.remarks} onChange={handleChange} />
            </div>

            <div style={{ borderTop: '1px solid #e2e8f0', margin: '8px 0' }}></div>

            <div>
              <label htmlFor="deposit_type" style={labelStyle}>Payment Method</label>
              <select id="deposit_type" name="deposit_type" style={inputStyle} value={formData.deposit_type} onChange={handleChange}>
                <option value="Cash">Cash</option>
                <option value="Card">Card / Online</option>
              </select>
            </div>

            {formData.deposit_type === 'Card' && (
              <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid #cbd5e1' }}>
                <h3 style={{ margin: 0, fontSize: '13px', color: '#0f172a' }}>Card Details</h3>
                <div>
                  <label htmlFor="card_type" style={labelStyle}>Card Type</label>
                  <select id="card_type" name="card_type" style={inputStyle} value={formData.card_type} onChange={handleChange}>
                    <option value="Mastercard">Mastercard</option>
                    <option value="Visa">Visa</option>
                    <option value="American Express">American Express</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="card_number" style={labelStyle}>Card Number</label>
                  <input type="text" id="card_number" name="card_number" style={inputStyle} value={formData.card_number} onChange={handleChange} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                  <div>
                    <label htmlFor="expire_date" style={labelStyle}>Expiry</label>
                    <input type="text" id="expire_date" name="expire_date" placeholder="MM/YY" maxLength={7} style={inputStyle} value={formData.expire_date} onChange={handleChange} />
                  </div>
                  <div>
                    <label htmlFor="cvv_number" style={labelStyle}>CVV</label>
                    <input type="text" id="cvv_number" name="cvv_number" maxLength={3} style={inputStyle} value={formData.cvv_number} onChange={handleChange} />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="amount_received" style={labelStyle}>Amount Received *</label>
              <input type="text" id="amount_received" name="amount_received" style={{ ...inputStyle, fontWeight: 600 }} value={formData.amount_received} onChange={handleChange} required />
            </div>

            <div>
              <label htmlFor="change" style={labelStyle}>Change to Return</label>
              <input type="text" id="change" style={{ ...inputStyle, backgroundColor: change > 0 ? '#f0fdf4' : '#f8fafc', color: change > 0 ? '#166534' : '#64748b', fontWeight: 700 }} value={change.toFixed(2)} disabled />
            </div>

          </div>
        </div>

      </form>
    </section>
  );
};

export default AddPaymentPage;
