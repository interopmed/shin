'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

interface Patient {
  id: number;
  name: string;
}

interface Doctor {
  id: number;
  name: string;
}

const statusToBackend = (status: string) => {
  switch (status) {
    case 'Pending':
      return 'pending_confirmation';
    case 'Confirmed':
      return 'confirmed';
    case 'Cancelled':
      return 'cancelled';
    case 'Completed':
      return 'treated';
    default:
      return 'pending_confirmation';
  }
};

const AddAppointmentPage = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  
  const [formData, setFormData] = useState({
    patient_id: '',
    doctor_id: '',
    date: '',
    time: '',
    remarks: '',
    status: 'Pending',
    sms: false,
  });

  useEffect(() => {
    const fetchData = async () => {
      if (user?.token) {
        try {
          const [patientsData, doctorsData] = await Promise.all([
            api.getPatients(user.token),
            api.getDoctors(user.token),
          ]);
          setPatients(patientsData as Patient[]);
          setDoctors(doctorsData as Doctor[]);
        } catch (error) {
          console.error('Failed to fetch data:', error);
        }
      }
    };

    fetchData();
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (user?.token) {
        const appointmentDateTime = `${formData.date}T${formData.time}:00`;

        await api.createAppointment(user.token, {
          patient: Number(formData.patient_id),
          doctor: Number(formData.doctor_id),
          date: appointmentDateTime,
          slot_time: `${formData.time}:00`,
          status: statusToBackend(formData.status),
          remarks: formData.remarks,
        });

        router.push('/appointment');
      }
    } catch (error) {
      console.error('Failed to create appointment:', error);
      alert('Failed to create appointment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Content Header */}
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Add New Appointment</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><Link href="/">Home</Link></li>
                <li className="breadcrumb-item"><Link href="/appointment">Appointments</Link></li>
                <li className="breadcrumb-item active">Add New</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <section className="content">
        <div className="container-fluid">
          <div className="card">
            <form onSubmit={handleSubmit}>
              <div className="card-header">
                <h3 className="card-title">Appointment Details</h3>
                <div className="card-tools">
                  <button type="submit" disabled={loading} className="btn btn-success">
                    {loading ? 'Saving...' : 'Submit'}
                  </button>
                </div>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="form-group col-md-6">
                    <label htmlFor="patient_id">Patient *</label>
                    <select
                      className="form-control"
                      name="patient_id"
                      id="patient_id"
                      value={formData.patient_id}
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
                    <label htmlFor="doctor_id">Doctor *</label>
                    <select
                      className="form-control"
                      name="doctor_id"
                      id="doctor_id"
                      value={formData.doctor_id}
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
                      <option value="Pending">Pending</option>
                      <option value="Confirmed">Confirmed</option>
                      <option value="Cancelled">Cancelled</option>
                      <option value="Completed">Completed</option>
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
              </div>
            </form>
          </div>
        </div>
      </section>
    </>
  );
};

export default AddAppointmentPage;
