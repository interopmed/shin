'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

interface Patient {
  id: number;
  name: string;
  email?: string;
  phone?: string;
}

interface Doctor {
  id: number;
  name: string;
}

interface Schedule {
  id: number;
  doctor: number;
  day: string;
  start_time: string;
  end_time: string;
  duration: number;
  is_active: boolean;
}

interface Holiday {
  id: number;
  doctor: number;
  date: string;
  is_active: boolean;
}

interface Appointment {
  id: number;
  date: string;
  slot_time?: string | null;
}

interface PatientPaginatedResponse {
  count: number;
  next?: string | null;
  previous?: string | null;
  results: Patient[];
}

const STATUS_OPTIONS = [
  { value: 'pending_confirmation', label: 'Pending Confirmation' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'treated', label: 'Treated' },
  { value: 'cancelled', label: 'Cancelled' },
];

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const toMinutes = (timeValue: string) => {
  const [hour, minute] = timeValue.split(':').map((value) => parseInt(value, 10));
  return (Number.isNaN(hour) ? 0 : hour) * 60 + (Number.isNaN(minute) ? 0 : minute);
};

const toHHMM = (totalMinutes: number) => {
  const hour = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const minute = String(totalMinutes % 60).padStart(2, '0');
  return `${hour}:${minute}`;
};

const normalizeDate = (value: string) => value.slice(0, 10);

const AddNewAppointmentViewPage = () => {
  const PATIENT_PAGE_SIZE = 25;
  const { user } = useAuth();
  const router = useRouter();

  const [loadingInit, setLoadingInit] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [slotLoading, setSlotLoading] = useState(false);
  const [patientLoading, setPatientLoading] = useState(false);
  const [patientSubmitting, setPatientSubmitting] = useState(false);
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [patientPage, setPatientPage] = useState(1);
  const [hasMorePatients, setHasMorePatients] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  const [formData, setFormData] = useState({
    patientId: '',
    doctorId: '',
    date: '',
    timeSlot: '',
    manualTime: '',
    remarks: '',
    status: 'pending_confirmation',
    sms: false,
  });

  const [newPatient, setNewPatient] = useState({
    name: '',
    email: '',
    phone: '',
    age: '',
    gender: 'Male',
  });

  const mergePatients = (existing: Patient[], incoming: Patient[]) => {
    const map = new Map<number, Patient>();
    existing.forEach((patient) => map.set(patient.id, patient));
    incoming.forEach((patient) => map.set(patient.id, patient));
    return Array.from(map.values());
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!user?.token) {
        return;
      }

      setLoadingInit(true);
      try {
        const doctorsData = await api.getDoctors(user.token, { page_size: '500' });
        setDoctors(Array.isArray(doctorsData) ? (doctorsData as Doctor[]) : []);
      } catch (error) {
        console.error('Failed to load appointment dependencies:', error);
      } finally {
        setLoadingInit(false);
      }
    };

    fetchInitialData();
  }, [user]);

  useEffect(() => {
    const fetchPatients = async () => {
      if (!user?.token) {
        return;
      }

      setPatientLoading(true);
      try {
        if (patientSearch.trim().length >= 2) {
          const searched = await api.searchPatients(user.token, patientSearch.trim(), 25);
          const searchedList = Array.isArray(searched) ? (searched as Patient[]) : [];
          setPatients(searchedList);
          setHasMorePatients(false);
          setPatientPage(1);
          return;
        }

        const patientResponse = await api.getPatientsPaginated(user.token, {
          page: String(patientPage),
          page_size: String(PATIENT_PAGE_SIZE),
        });

        if (patientResponse && 'results' in (patientResponse as PatientPaginatedResponse)) {
          const paginated = patientResponse as PatientPaginatedResponse;
          setPatients((prev) => (patientPage === 1 ? paginated.results : mergePatients(prev, paginated.results)));
          setHasMorePatients(Boolean(paginated.next));
        } else {
          const fallback = Array.isArray(patientResponse) ? (patientResponse as Patient[]) : [];
          setPatients((prev) => (patientPage === 1 ? fallback : mergePatients(prev, fallback)));
          setHasMorePatients(fallback.length === PATIENT_PAGE_SIZE);
        }
      } catch (error) {
        console.error('Failed to load patients:', error);
      } finally {
        setPatientLoading(false);
      }
    };

    const timer = setTimeout(() => {
      fetchPatients();
    }, 300);

    return () => clearTimeout(timer);
  }, [user, patientPage, patientSearch]);

  useEffect(() => {
    const fetchSlots = async () => {
      if (!user?.token || !formData.doctorId || !formData.date) {
        setAvailableSlots([]);
        setFormData((prev) => ({ ...prev, timeSlot: '' }));
        return;
      }

      setSlotLoading(true);
      try {
        const selectedDate = new Date(`${formData.date}T00:00:00`);
        const selectedDay = DAY_NAMES[selectedDate.getDay()];

        const [schedules, holidays, bookedAppointments] = await Promise.all([
          api.getSchedules(user.token, {
            doctor: formData.doctorId,
            day: selectedDay,
            is_active: 'true',
          }),
          api.getHolidays(user.token, {
            doctor: formData.doctorId,
            date: formData.date,
            is_active: 'true',
          }),
          api.getAppointments(user.token, {
            doctor: formData.doctorId,
          }),
        ]);

        const holidaysList = (Array.isArray(holidays) ? holidays : []) as Holiday[];
        const isHoliday = holidaysList.some((holiday) => normalizeDate(holiday.date) === formData.date);

        if (isHoliday) {
          setAvailableSlots([]);
          setFormData((prev) => ({ ...prev, timeSlot: '' }));
          return;
        }

        const scheduleList = (Array.isArray(schedules) ? schedules : []) as Schedule[];
        const appointmentList = (Array.isArray(bookedAppointments) ? bookedAppointments : []) as Appointment[];

        const sameDayAppointments = appointmentList.filter((appointment) => normalizeDate(appointment.date) === formData.date);
        const bookedTimes = new Set(
          sameDayAppointments
            .map((appointment) => appointment.slot_time?.slice(0, 5) || appointment.date.slice(11, 16))
            .filter(Boolean)
        );

        const generatedSlots = scheduleList
          .filter((schedule) => schedule.is_active)
          .flatMap((schedule) => {
            const duration = schedule.duration || 30;
            const start = toMinutes(schedule.start_time);
            const end = toMinutes(schedule.end_time);
            const slots: string[] = [];

            for (let current = start; current + duration <= end; current += duration) {
              slots.push(toHHMM(current));
            }

            return slots;
          })
          .filter((timeValue) => !bookedTimes.has(timeValue));

        const uniqueSortedSlots = [...new Set(generatedSlots)].sort((a, b) => toMinutes(a) - toMinutes(b));

        setAvailableSlots(uniqueSortedSlots);
        setFormData((prev) => ({
          ...prev,
          timeSlot: uniqueSortedSlots.includes(prev.timeSlot) ? prev.timeSlot : '',
        }));
      } catch (error) {
        console.error('Failed to fetch available slots:', error);
        setAvailableSlots([]);
        setFormData((prev) => ({ ...prev, timeSlot: '' }));
      } finally {
        setSlotLoading(false);
      }
    };

    fetchSlots();
  }, [user, formData.doctorId, formData.date]);

  const slotHelpText = useMemo(() => {
    if (!formData.doctorId || !formData.date) {
      return 'Select doctor and date to load slots.';
    }

    if (slotLoading) {
      return 'Loading available slots...';
    }

    if (availableSlots.length === 0) {
      return 'No further time slots available for selected date. You can still enter manual time below.';
    }

    return `${availableSlots.length} slot(s) available.`;
  }, [formData.doctorId, formData.date, slotLoading, availableSlots.length]);

  const onFieldChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, type, value } = event.target;
    if (type === 'checkbox') {
      const checked = (event.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const onNewPatientChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setNewPatient((prev) => ({ ...prev, [name]: value }));
  };

  const selectPatient = (value: string, label?: string) => {
    setFormData((prev) => ({ ...prev, patientId: value }));
    setPatientSearch(label || '');
    setShowPatientDropdown(false);
  };

  const openAddPatientModal = () => {
    setShowPatientDropdown(false);
    setShowAddPatientModal(true);
  };

  const closeAddPatientModal = () => {
    setShowAddPatientModal(false);
    setNewPatient({
      name: '',
      email: '',
      phone: '',
      age: '',
      gender: 'Male',
    });
  };

  const handleCreatePatient = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!user?.token) {
      return;
    }

    if (!newPatient.name.trim()) {
      alert('Patient name is required.');
      return;
    }

    setPatientSubmitting(true);
    try {
      const createdPatient = await api.createPatient(user.token, {
        name: newPatient.name,
        email: newPatient.email || null,
        phone: newPatient.phone,
        age: newPatient.age,
        sex: newPatient.gender,
      });

      const patient = createdPatient as Patient;
      setPatients((prev) => mergePatients([patient], prev));
      setFormData((prev) => ({ ...prev, patientId: String(patient.id) }));
      setPatientSearch(patient.name);
      closeAddPatientModal();
    } catch (error) {
      console.error('Failed to create patient:', error);
      alert('Failed to add patient. Please try again.');
    } finally {
      setPatientSubmitting(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!user?.token) {
      return;
    }

    const selectedTime = formData.timeSlot || formData.manualTime;

    if (!formData.doctorId || !formData.date || !selectedTime) {
      alert('Please select doctor, date, and either an available slot or manual time.');
      return;
    }

    if (!formData.patientId) {
      alert('Please select a patient.');
      return;
    }

    setSubmitting(true);
    try {
      const appointmentDateTime = `${formData.date}T${selectedTime}:00`;

      await api.createAppointment(user.token, {
        patient: Number(formData.patientId),
        doctor: Number(formData.doctorId),
        date: appointmentDateTime,
        slot_time: `${selectedTime}:00`,
        remarks: formData.remarks,
        status: formData.status,
      });

      router.push('/scheduling/appointment');
    } catch (error) {
      console.error('Failed to create appointment:', error);
      alert('Failed to create appointment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="stack" style={{ gap: '24px' }}>
      <div className="panel" style={{ padding: '32px' }}>
        <form onSubmit={handleSubmit} className="stack" style={{ gap: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Appointment Form</h3>
            <div style={{ display: 'flex', gap: '12px' }}>
              <Link href="/scheduling/appointment" className="button secondary">
                Back
              </Link>
              <button type="submit" className="button primary" disabled={loadingInit || submitting}>
                {submitting ? 'Saving...' : 'Submit'}
              </button>
            </div>
          </div>

          {loadingInit ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              Loading...
            </div>
          ) : (
            <div className="form-grid">
              <div className="field" style={{ position: 'relative' }}>
                <label htmlFor="patientSearch">Patient</label>
                <input
                  id="patientSearch"
                  placeholder="Type patient name and choose from dropdown..."
                  value={patientSearch}
                  onChange={(event) => {
                    setPatientSearch(event.target.value);
                    setFormData((prev) => ({ ...prev, patientId: '' }));
                    setPatientPage(1);
                    setShowPatientDropdown(true);
                  }}
                  onFocus={() => setShowPatientDropdown(true)}
                  onBlur={() => {
                    setTimeout(() => setShowPatientDropdown(false), 150);
                  }}
                />
                <small style={{ color: 'var(--text-tertiary)', marginTop: '4px', display: 'block', fontSize: '13px' }}>
                  {patientLoading ? 'Searching patients...' : 'Search as you type or browse in pages of 25.'}
                </small>

                {showPatientDropdown && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 20,
                      maxHeight: '260px',
                      overflowY: 'auto',
                      marginTop: '4px',
                      backgroundColor: 'var(--bg-panel)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: 'var(--shadow-md)',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <button
                        type="button"
                        style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-hover)', color: 'var(--primary-color)', fontWeight: 500, border: 'none', cursor: 'pointer' }}
                        onMouseDown={openAddPatientModal}
                      >
                        + Add New Patient
                      </button>

                      {patients.map((patient) => (
                        <button
                          key={patient.id}
                          type="button"
                          style={{ padding: '10px 16px', textAlign: 'left', background: String(patient.id) === formData.patientId ? 'var(--bg-hover)' : 'transparent', border: 'none', borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}
                          onMouseDown={() => selectPatient(String(patient.id), patient.name)}
                        >
                          {patient.name}{patient.phone ? ` (${patient.phone})` : ''}
                        </button>
                      ))}

                      {!patientSearch.trim() && hasMorePatients && (
                        <button
                          type="button"
                          style={{ padding: '10px 16px', textAlign: 'center', background: 'transparent', border: 'none', color: 'var(--primary-color)', cursor: 'pointer' }}
                          onMouseDown={() => setPatientPage((prev) => prev + 1)}
                          disabled={patientLoading}
                        >
                          {patientLoading ? 'Loading...' : 'Load 25 more patients'}
                        </button>
                      )}

                      {!patientLoading && patients.length === 0 && (
                        <div style={{ padding: '10px 16px', color: 'var(--text-tertiary)' }}>No patient found</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="field">
                <label htmlFor="doctorId">Doctor</label>
                <select
                  id="doctorId"
                  name="doctorId"
                  value={formData.doctorId}
                  onChange={onFieldChange}
                  required
                >
                  <option value="">Select</option>
                  {doctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="date">Date</label>
                <input
                  id="date"
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={onFieldChange}
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="timeSlot">Available Slots</label>
                <select
                  id="timeSlot"
                  name="timeSlot"
                  value={formData.timeSlot}
                  onChange={(event) => {
                    onFieldChange(event);
                    if (event.target.value) {
                      setFormData((prev) => ({ ...prev, manualTime: event.target.value }));
                    }
                  }}
                  disabled={slotLoading || availableSlots.length === 0}
                >
                  <option value="">Select</option>
                  {availableSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
                <small style={{ color: 'var(--text-tertiary)', marginTop: '4px', display: 'block', fontSize: '13px' }}>{slotHelpText}</small>
              </div>

              <div className="field">
                <label htmlFor="manualTime">Manual Time (fallback)</label>
                <input
                  id="manualTime"
                  name="manualTime"
                  type="time"
                  value={formData.manualTime}
                  onChange={(event) => {
                    onFieldChange(event);
                    if (event.target.value) {
                      setFormData((prev) => ({ ...prev, timeSlot: '' }));
                    }
                  }}
                />
              </div>

              <div className="field">
                <label htmlFor="status">Appointment Status</label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={onFieldChange}
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="remarks">Remarks</label>
                <textarea
                  id="remarks"
                  name="remarks"
                  rows={3}
                  value={formData.remarks}
                  onChange={onFieldChange}
                />
              </div>

              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'normal' }}>
                  <input
                    type="checkbox"
                    id="sms"
                    name="sms"
                    checked={formData.sms}
                    onChange={onFieldChange}
                    style={{ width: 'auto' }}
                  />
                  Send SMS
                </label>
              </div>
            </div>
          )}
        </form>
      </div>

      {showAddPatientModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="panel" style={{ width: '100%', maxWidth: '500px', padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', backgroundColor: 'var(--bg-hover)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Add New Patient</h4>
              <button onClick={closeAddPatientModal} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '20px', color: 'var(--text-secondary)' }}>&times;</button>
            </div>

            <form onSubmit={handleCreatePatient} className="stack" style={{ padding: '24px', gap: '20px' }}>
              <div className="field">
                <label htmlFor="modal_name">Patient Name</label>
                <input
                  id="modal_name"
                  name="name"
                  value={newPatient.name}
                  onChange={onNewPatientChange}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="modal_email">Patient Email</label>
                <input
                  id="modal_email"
                  name="email"
                  type="email"
                  value={newPatient.email}
                  onChange={onNewPatientChange}
                />
              </div>
              <div className="field">
                <label htmlFor="modal_phone">Patient Phone</label>
                <input
                  id="modal_phone"
                  name="phone"
                  value={newPatient.phone}
                  onChange={onNewPatientChange}
                />
              </div>
              <div className="field">
                <label htmlFor="modal_age">Patient Age</label>
                <input
                  id="modal_age"
                  name="age"
                  value={newPatient.age}
                  onChange={onNewPatientChange}
                />
              </div>
              <div className="field">
                <label htmlFor="modal_gender">Patient Gender</label>
                <select
                  id="modal_gender"
                  name="gender"
                  value={newPatient.gender}
                  onChange={onNewPatientChange}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Others">Others</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button type="button" className="button secondary" onClick={closeAddPatientModal}>
                  Cancel
                </button>
                <button type="submit" className="button primary" disabled={patientSubmitting}>
                  {patientSubmitting ? 'Saving...' : 'Save Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddNewAppointmentViewPage;
