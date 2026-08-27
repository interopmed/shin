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

  const rawId = searchParams.get('id');
  const sectionParam = searchParams.get('section') || '';
  const labOrderIdParam = searchParams.get('lab_order_id');
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

          const paymentItems = Array.isArray(matched.items) ? matched.items : [];
          setExistingItems(paymentItems);
          const itemCategoryIds = paymentItems
            .map((item) => Number(item.payment_category))
            .filter((value) => Number.isFinite(value));
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

  const subtotal = selectedItems.reduce((sum, item) => sum + item.amount, 0);
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
    if (selectedItems.length === 0) {
      alert('Please select at least one investigation.');
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
        section: searchParams.get('section') || '',
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

  return (
    <>
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Add Payment</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><Link href="/">Home</Link></li>
                <li className="breadcrumb-item">Finance</li>
                <li className="breadcrumb-item"><Link href="/finance/payment">Payments</Link></li>
                <li className="breadcrumb-item active">Add</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          {loadError ? (
            <div className="alert alert-warning" role="alert">
              {loadError}
            </div>
          ) : null}
          <div className="row no-print mb-3">
            <div className="col-12">
              <button
                type="submit"
                form="editPaymentForm"
                id="submit_btn"
                className="btn btn-success btn-xs float-right"
                disabled={loading}
              >
                <i className="fa fa-plus-circle-circle"></i> {loading ? 'Saving...' : 'Submit'}
              </button>
              <button
                type="button"
                id="clear_btn"
                className="btn btn-warning btn-xs float-right"
                onClick={handleClear}
                disabled={loading}
              >
                <i className="fa fa-plus-circle-circle"></i> Clear
              </button>
            </div>
          </div>

          <form id="editPaymentForm" className="clearfix" onSubmit={handleSubmit}>
            <div className="row">
              <div className="col-md-4">
                <div className="card card-primary card-outline">
                  <div className="card-body">
                    <div className="form-group">
                      <label htmlFor="billing_number">Billing Number</label>
                      <input
                        type="text"
                        className="form-control"
                        id="billing_number"
                        name="billing_number"
                        value={formData.billing_number}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="collected_time">Collected Time</label>
                      <input
                        type="datetime-local"
                        className="form-control pay_in"
                        id="collected_time"
                        name="collected_time"
                        value={formData.collected_time}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="received_time">Received Time</label>
                      <input
                        type="datetime-local"
                        className="form-control pay_in"
                        id="received_time"
                        name="received_time"
                        value={formData.received_time}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="clinical_history">Clinical History</label>
                      <input
                        type="text"
                        className="form-control"
                        id="clinical_history"
                        name="clinical_history"
                        value={formData.clinical_history}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="patient">Patient</label>
                      <i
                        id="add-patient-btn"
                        className="fa fa-plus-circle text-success ml-1"
                        role="button"
                        tabIndex={0}
                        onClick={() => setShowNewPatient((prev) => !prev)}
                      ></i>
                      <select
                        className="form-control patient"
                        id="patient"
                        name="patient"
                        value={formData.patient}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Select Patient</option>
                        {patients.map((patient) => (
                          <option key={patient.id} value={patient.id}>
                            {patient.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {showNewPatient && (
                      <div className="add_patient px-2 mb-3">
                        <div className="form-group">
                          <label htmlFor="p_name">Patient Name</label>
                          <input
                            type="text"
                            className="form-control pay_in"
                            id="p_name"
                            name="p_name"
                            value={formData.p_name}
                            onChange={handleChange}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="p_phone">Patient Phone</label>
                          <input
                            type="text"
                            className="form-control pay_in"
                            id="p_phone"
                            name="p_phone"
                            value={formData.p_phone}
                            onChange={handleChange}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="p_age">Patient Age</label>
                          <input
                            type="text"
                            className="form-control pay_in"
                            id="p_age"
                            name="p_age"
                            value={formData.p_age}
                            onChange={handleChange}
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="p_gender">Patient Gender</label>
                          <select
                            className="form-control"
                            id="p_gender"
                            name="p_gender"
                            value={formData.p_gender}
                            onChange={handleChange}
                          >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Others">Others</option>
                          </select>
                        </div>
                      </div>
                    )}

                    <div className="form-group">
                      <label className="d-block">Referring Method</label>
                      <div className="form-check form-check-inline">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="referring_method"
                          id="referringSelf"
                          value="self_request"
                          checked={formData.referring_method === 'self_request'}
                          onChange={handleChange}
                        />
                        <label className="form-check-label" htmlFor="referringSelf">Self Request</label>
                      </div>
                      <div className="form-check form-check-inline">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="referring_method"
                          id="referringDoctor"
                          value="doctor"
                          checked={formData.referring_method === 'doctor'}
                          onChange={handleChange}
                        />
                        <label className="form-check-label" htmlFor="referringDoctor">By Doctor</label>
                      </div>
                      <div className="form-check form-check-inline">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="referring_method"
                          id="referringInstitute"
                          value="institute"
                          checked={formData.referring_method === 'institute'}
                          onChange={handleChange}
                        />
                        <label className="form-check-label" htmlFor="referringInstitute">By Institute</label>
                      </div>
                    </div>

                    {formData.referring_method === 'doctor' && (
                      <>
                        <div className="form-group select-doctor">
                          <label htmlFor="doctor">Doctor</label>
                          <i
                            id="add-doctor-btn"
                            className="fa fa-plus-circle text-success ml-1"
                            role="button"
                            tabIndex={0}
                            onClick={() => setShowNewDoctor((prev) => !prev)}
                          ></i>
                          <select
                            className="form-control doctor"
                            id="doctor"
                            name="doctor"
                            value={formData.doctor}
                            onChange={handleChange}
                            required
                          >
                            <option value="">Select Doctor</option>
                            {doctorOptions.map((doctor) => (
                              <option key={doctor.id} value={doctor.id}>
                                {doctor.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {showNewDoctor && (
                          <div className="add_doctor px-2 mb-3">
                            <div className="form-group">
                              <label htmlFor="d_name">Doctor Name</label>
                              <input
                                type="text"
                                className="form-control pay_in"
                                id="d_name"
                                name="d_name"
                                value={formData.d_name}
                                onChange={handleChange}
                                required
                              />
                            </div>
                            <div className="form-group">
                              <label htmlFor="d_phone">Doctor Phone</label>
                              <input
                                type="text"
                                className="form-control pay_in"
                                id="d_phone"
                                name="d_phone"
                                value={formData.d_phone}
                                onChange={handleChange}
                                required
                              />
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {formData.referring_method === 'institute' && (
                      <>
                        <div className="form-group select-institute">
                          <label htmlFor="institute">Institute</label>
                          <i
                            id="add-institute-btn"
                            className="fa fa-plus-circle text-success ml-1"
                            role="button"
                            tabIndex={0}
                            onClick={() => setShowNewInstitute((prev) => !prev)}
                          ></i>
                          <select
                            className="form-control institute"
                            id="institute"
                            name="institute"
                            value={formData.institute}
                            onChange={handleChange}
                            required
                          >
                            <option value="">Select Institute</option>
                            {instituteOptions.map((doctor) => (
                              <option key={doctor.id} value={doctor.id}>
                                {doctor.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {showNewInstitute && (
                          <div className="add_institute px-2 mb-3">
                            <div className="form-group">
                              <label htmlFor="new_institute">Institute Name</label>
                              <input
                                type="text"
                                className="form-control pay_in"
                                id="new_institute"
                                name="new_institute"
                                value={formData.new_institute}
                                onChange={handleChange}
                                required
                              />
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {formData.referring_method !== 'self_request' && (
                      <>
                        <div className="form-group">
                          <label htmlFor="request_type">Request Type</label>
                          <select
                            className="form-control"
                            id="request_type"
                            name="request_type"
                            value={formData.request_type}
                            onChange={handleChange}
                          >
                            {requestTypes.map((type) => (
                              <option key={type.id} value={type.id}>{type.label}</option>
                            ))}
                          </select>
                        </div>

                        <div className="form-group">
                          <label htmlFor="commission_type">Commission</label>
                          <select
                            className="form-control"
                            id="commission_type"
                            name="commission_type"
                            value={formData.commission_type}
                            onChange={handleChange}
                          >
                            {commissionTypes.map((type) => (
                              <option key={type.id} value={type.id}>{type.label}</option>
                            ))}
                          </select>
                        </div>

                        {formData.commission_type === '3' && (
                          <div className="form-group">
                            <label htmlFor="commission_percentage">Commission Percentage</label>
                            <div className="input-group">
                              <input
                                type="text"
                                className="form-control"
                                id="commission_percentage"
                                name="commission_percentage"
                                value={formData.commission_percentage}
                                onChange={handleChange}
                              />
                              <div className="input-group-append">
                                <span className="input-group-text">%</span>
                              </div>
                            </div>
                            <small className="form-text text-muted">The percentage of commission to claim.</small>
                          </div>
                        )}
                      </>
                    )}

                    <div className="form-group">
                      <div className="form-group last">
                        <label htmlFor="multi_select">Select Investigation/s</label>
                        <select
                          id="multi_select"
                          className="multi-select"
                          multiple
                          value={selectedCategoryIds.map(String)}
                          onChange={handleCategoryChange}
                          required
                          name="category_name[]"
                          style={{ position: 'absolute', left: '-9999px' }}
                        >
                          {categories.map((category) => (
                            <option
                              key={category.id}
                              className="ms-option"
                              data-price={category.price}
                              data-commission={category.d_commission ?? 0}
                              data-id={category.id}
                              data-cat_name={category.display_name ?? category.name}
                              value={category.id}
                            >
                              {category.display_name ?? category.name}
                            </option>
                          ))}
                        </select>
                        <div className="ms-container" id="ms-multi_select">
                          <div className="ms-selectable">
                            <input
                              type="text"
                              className="search-input"
                              autoComplete="off"
                              placeholder=" search..."
                              value={selectableSearch}
                              onChange={(event) => setSelectableSearch(event.target.value)}
                            />
                            <ul className="ms-list" tabIndex={-1}>
                              {categories
                                .filter((category) => !selectedCategoryIds.includes(category.id))
                                .filter((category) =>
                                  category.name.toLowerCase().includes(selectableSearch.toLowerCase())
                                )
                                .map((category) => (
                                  <li
                                    key={`selectable-${category.id}`}
                                    className="ms-option ms-elem-selectable"
                                    data-price={category.price}
                                    data-commission={category.d_commission ?? 0}
                                    data-id={category.id}
                                    data-cat_name={category.display_name ?? category.name}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => toggleCategory(category.id)}
                                  >
                                    <span>{category.display_name ?? category.name}</span>
                                  </li>
                                ))}
                            </ul>
                          </div>
                          <div className="ms-selection">
                            <input
                              type="text"
                              className="search-input"
                              autoComplete="off"
                              placeholder=""
                              value={selectedSearch}
                              onChange={(event) => setSelectedSearch(event.target.value)}
                            />
                            <ul className="ms-list" tabIndex={-1}>
                              {categories
                                .filter((category) => selectedCategoryIds.includes(category.id))
                                .filter((category) =>
                                  category.name.toLowerCase().includes(selectedSearch.toLowerCase())
                                )
                                .map((category) => (
                                  <li
                                    key={`selected-${category.id}`}
                                    className="ms-option ms-elem-selection ms-selected"
                                    data-price={category.price}
                                    data-commission={category.d_commission ?? 0}
                                    data-id={category.id}
                                    data-cat_name={category.display_name ?? category.name}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => toggleCategory(category.id)}
                                  >
                                    <span>{category.display_name ?? category.name}</span>
                                  </li>
                                ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-md-5 paymentList">
                <div className="card card-danger card-outline">
                  <div className="card-body p-0">
                    <table className="table table-striped table-borderless mb-0">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Items</th>
                          <th>Price</th>
                          <th>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedItems.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="text-center text-muted">No items selected</td>
                          </tr>
                        ) : (
                          selectedItems.map((item, index) => (
                            <tr key={item.id}>
                              <td>{index + 1}</td>
                              <td>{item.name}</td>
                              <td>{item.price.toFixed(2)}</td>
                              <td>{item.amount.toFixed(2)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="col-md-3">
                <div className="card card-warning card-outline">
                  <div className="card-body">
                    <div className="form-group">
                      <label htmlFor="subtotal">Sub Total</label>
                      <input
                        type="text"
                        className="form-control pay_in"
                        id="subtotal"
                        value={subtotal.toFixed(2)}
                        disabled
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="discount">Discount</label>
                      <input
                        type="text"
                        className="form-control pay_in"
                        id="discount"
                        name="discount"
                        value={formData.discount}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="gross">Gross Total</label>
                      <input
                        type="text"
                        className="form-control pay_in"
                        id="gross"
                        value={grossTotal.toFixed(2)}
                        disabled
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="remarks">Note</label>
                      <input
                        type="text"
                        className="form-control pay_in"
                        id="remarks"
                        name="remarks"
                        value={formData.remarks}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="amount_received">Deposited Amount</label>
                      <input
                        type="text"
                        className="form-control pay_in"
                        id="amount_received"
                        name="amount_received"
                        value={formData.amount_received}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="change">Change</label>
                      <input
                        type="text"
                        className="form-control pay_in"
                        id="change"
                        value={change.toFixed(2)}
                        disabled
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="deposit_type">Deposit Type</label>
                      <select
                        className="form-control js-example-basic-single deposit_type"
                        id="deposit_type"
                        name="deposit_type"
                        value={formData.deposit_type}
                        onChange={handleChange}
                      >
                        <option value="Cash">Cash</option>
                        <option value="Card">Card</option>
                      </select>
                    </div>

                    {formData.deposit_type === 'Card' && (
                      <div className="credit-card">
                        <div className="col-md-12">
                          <label>Accepted Cards</label>
                          <div className="payment pad_bot">
                            <img src="/uploads/card.png" width="100%" alt="Accepted cards" />
                          </div>
                        </div>

                        <div className="col-md-12">
                          <label htmlFor="card_type">Card Type</label>
                          <select
                            className="form-control"
                            name="card_type"
                            id="card_type"
                            value={formData.card_type}
                            onChange={handleChange}
                          >
                            <option value="Mastercard">Mastercard</option>
                            <option value="Visa">Visa</option>
                            <option value="American Express">American Express</option>
                          </select>
                        </div>

                        <div className="col-md-12">
                          <label htmlFor="card_number">Card Number</label>
                          <input
                            type="text"
                            className="form-control pay_in"
                            name="card_number"
                            id="card_number"
                            value={formData.card_number}
                            onChange={handleChange}
                          />
                        </div>

                        <div className="col-md-8">
                          <label htmlFor="expire_date">Expire Date</label>
                          <input
                            type="text"
                            className="form-control pay_in"
                            id="expire_date"
                            name="expire_date"
                            placeholder="Expiry (MM/YY)"
                            maxLength={7}
                            value={formData.expire_date}
                            onChange={handleChange}
                          />
                        </div>
                        <div className="col-md-4">
                          <label htmlFor="cvv_number">CVV</label>
                          <input
                            type="text"
                            className="form-control pay_in"
                            id="cvv_number"
                            name="cvv_number"
                            maxLength={3}
                            value={formData.cvv_number}
                            onChange={handleChange}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <input type="hidden" name="id" value="" />
            <input type="hidden" name="section" value="lab" />
            <button type="submit" name="submit" className="btn btn-info pull-right" style={{ display: 'none' }}></button>
          </form>
        </div>
      </section>
    </>
  );
};

export default AddPaymentPage;
