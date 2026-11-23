'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { ChargeCapturePanel } from '@/components/ChargeCapturePanel';

interface Patient {
  id: number;
  name: string;
}

interface Doctor {
  id: number;
  name: string;
}

interface AppointmentDetail {
  id: number;
  patient: number;
  doctor: number;
  date: string;
  slot_time?: string | null;
  status: string;
  remarks?: string;
}

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'pending_confirmation', label: 'Pending Confirmation' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'treated', label: 'Treated' },
  { value: 'cancelled', label: 'Cancelled' },
];

const toDateInput = (isoDate: string) => {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const toTimeInput = (isoDate: string, slotTime?: string | null) => {
  if (slotTime) return slotTime.slice(0, 5);
  if (!isoDate) return '';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(11, 16);
};

const EditAppointmentPage = () => {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const appointmentId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  const [formData, setFormData] = useState({
    patientId: '',
    doctorId: '',
    date: '',
    time: '',
    remarks: '',
    status: 'pending_confirmation',
    sms: false,
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.token || !appointmentId) return;

      setLoading(true);
      try {
        const [patientsData, doctorsData, appointmentData] = await Promise.all([
          api.getPatients(user.token, { page_size: '500' }),
          api.getDoctors(user.token, { page_size: '500' }),
          api.getAppointment(user.token, appointmentId),
        ]);

        setPatients(Array.isArray(patientsData) ? (patientsData as Patient[]) : []);
        setDoctors(Array.isArray(doctorsData) ? (doctorsData as Doctor[]) : []);

        const appointment = appointmentData as AppointmentDetail;
        setFormData({
          patientId: String(appointment.patient),
          doctorId: String(appointment.doctor),
          date: toDateInput(appointment.date),
          time: toTimeInput(appointment.date, appointment.slot_time),
          remarks: appointment.remarks || '',
          status: appointment.status || 'pending_confirmation',
          sms: false,
        });
      } catch (error) {
        console.error('Failed to load appointment:', error);
        alert('Failed to load appointment details.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, appointmentId]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = event.target;

    if (type === 'checkbox') {
      const checked = (event.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!user?.token) return;

    if (!formData.patientId || !formData.doctorId || !formData.date || !formData.time) {
      alert('Please fill patient, doctor, date and time.');
      return;
    }

    setSaving(true);
    try {
      const appointmentDateTime = `${formData.date}T${formData.time}:00`;

      await api.updateAppointment(user.token, appointmentId, {
        patient: Number(formData.patientId),
        doctor: Number(formData.doctorId),
        date: appointmentDateTime,
        slot_time: `${formData.time}:00`,
        remarks: formData.remarks,
        status: formData.status,
      });

      router.push('/scheduling/appointment');
    } catch (error) {
      console.error('Failed to update appointment:', error);
      alert('Failed to update appointment. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Edit Appointment</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><Link href="/">Home</Link></li>
                <li className="breadcrumb-item"><Link href="/scheduling/appointment">Appointments</Link></li>
                <li className="breadcrumb-item active">Edit</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          <div className="card">
            <form onSubmit={handleSubmit}>
              <div className="card-header">
                <h3 className="card-title">Appointment Details</h3>
                <div className="card-tools d-flex" style={{ gap: '0.5rem' }}>
                  <Link href="/scheduling/appointment" className="btn btn-default btn-sm">Back</Link>
                  <button type="submit" disabled={loading || saving} className="btn btn-primary btn-sm">
                    {saving ? 'Saving...' : 'Update'}
                  </button>
                </div>
              </div>

              <div className="card-body">
                {loading ? (
                  <div className="text-center py-4">
                    <i className="fas fa-spinner fa-spin fa-2x text-primary"></i>
                  </div>
                ) : (
                  <div className="row">
                    <div className="form-group col-md-6">
                      <label htmlFor="patientId">Patient *</label>
                      <select
                        className="form-control"
                        name="patientId"
                        id="patientId"
                        value={formData.patientId}
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

                    <div className="form-group col-md-6">
                      <label htmlFor="doctorId">Doctor *</label>
                      <select
                        className="form-control"
                        name="doctorId"
                        id="doctorId"
                        value={formData.doctorId}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Select Doctor</option>
                        {doctors.map((doctor) => (
                          <option key={doctor.id} value={doctor.id}>
                            {doctor.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group col-md-6">
                      <label htmlFor="date">Date *</label>
                      <input
                        type="date"
                        className="form-control"
                        name="date"
                        id="date"
                        value={formData.date}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="form-group col-md-6">
                      <label htmlFor="time">Time *</label>
                      <input
                        type="time"
                        className="form-control"
                        name="time"
                        id="time"
                        value={formData.time}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="form-group col-md-6">
                      <label htmlFor="status">Status</label>
                      <select
                        className="form-control"
                        name="status"
                        id="status"
                        value={formData.status}
                        onChange={handleChange}
                      >
                        {statusOptions.map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group col-md-12">
                      <label htmlFor="remarks">Remarks</label>
                      <textarea
                        className="form-control"
                        name="remarks"
                        id="remarks"
                        rows={3}
                        value={formData.remarks}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="form-group col-md-6">
                      <div className="form-check">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          name="sms"
                          id="sms"
                          checked={formData.sms}
                          onChange={handleChange}
                        />
                        <label className="form-check-label" htmlFor="sms">
                          Send SMS Reminder
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </form>
          </div>

          {/* Add the new Point-of-Care Charge Capture Panel */}
          {user?.token && appointmentId && formData.patientId && formData.doctorId && (
            <ChargeCapturePanel 
              token={user.token} 
              appointmentId={appointmentId} 
              patientId={formData.patientId} 
              doctorId={formData.doctorId} 
            />
          )}

        </div>
      </section>
    </>
  );
};

export default EditAppointmentPage;
