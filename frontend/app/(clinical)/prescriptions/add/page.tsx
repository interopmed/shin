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

interface Medicine {
  medicine_name: string;
  dosage: string;
  duration: string;
  frequency: string;
}

const COMMON_MEDICINES = [
  "Amoxicillin",
  "Amlodipine",
  "Atorvastatin",
  "Azithromycin",
  "Ciprofloxacin",
  "Ibuprofen",
  "Levothyroxine",
  "Lisinopril",
  "Losartan",
  "Metformin",
  "Omeprazole",
  "Paracetamol",
  "Other"
];

const AddPrescriptionPage = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([{
    medicine_name: '',
    dosage: '',
    duration: '',
    frequency: 'Once daily',
  }]);
  
  const [formData, setFormData] = useState({
    patient_id: '',
    doctor_id: '',
    date: new Date().toISOString().split('T')[0],
    diagnosis: '',
    advice: '',
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
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleMedicineChange = (index: number, field: keyof Medicine, value: string) => {
    const updatedMedicines = [...medicines];
    updatedMedicines[index][field] = value;
    setMedicines(updatedMedicines);
  };

  const addMedicine = () => {
    setMedicines([...medicines, {
      medicine_name: '',
      dosage: '',
      duration: '',
      frequency: 'Once daily',
    }]);
  };

  const removeMedicine = (index: number) => {
    setMedicines(medicines.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (user?.token) {
        const submitData = {
          ...formData,
          medicines,
        };
        console.log('Prescription data:', submitData);
        // TODO: Implement API call
        // await api.createPrescription(user.token, submitData);
        router.push('/prescription');
      }
    } catch (error) {
      console.error('Failed to create prescription:', error);
      alert('Failed to create prescription. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <h1>Add Prescription</h1>
          <p className="muted">Create a new prescription record.</p>
        </div>
        <div className="action-row">
          <Link href="/prescription" className="button secondary">
            Cancel
          </Link>
        </div>
      </header>

      <section className="panel">
        <form onSubmit={handleSubmit} className="stack">
          <div className="page-header" style={{ marginBottom: 0 }}>
            <h2 style={{ marginBottom: 0 }}>Prescription Details</h2>
            <div className="action-row">
              <button type="submit" disabled={loading} className="button">
                {loading ? 'Saving...' : 'Submit'}
              </button>
            </div>
          </div>

          <div className="form-grid">
            <div className="field">
              <label htmlFor="patient_id">Patient *</label>
              <select
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

            <div className="field">
              <label htmlFor="doctor_id">Doctor *</label>
              <select
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

            <div className="field">
              <label htmlFor="date">Date *</label>
              <input
                type="date"
                name="date"
                id="date"
                value={formData.date}
                onChange={handleChange}
                required
              />
            </div>

            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="diagnosis">Diagnosis</label>
              <textarea
                name="diagnosis"
                id="diagnosis"
                rows={2}
                value={formData.diagnosis}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="stack" style={{ marginTop: '16px' }}>
            <div className="page-header" style={{ marginBottom: 0 }}>
              <h3 style={{ marginBottom: 0 }}>Medicines</h3>
              <button type="button" className="button secondary compact" onClick={addMedicine}>
                Add Medicine
              </button>
            </div>

            <ul className="list">
              {medicines.map((medicine, index) => (
                <li key={index}>
                  <div className="grid cols-4" style={{ gap: '16px' }}>
                    <div className="field">
                      <label>Medicine Name *</label>
                      <input
                        type="text"
                        list="medicine-suggestions"
                        value={medicine.medicine_name}
                        onChange={(e) => handleMedicineChange(index, 'medicine_name', e.target.value)}
                        placeholder="Type to search medicine..."
                        required
                      />
                      <datalist id="medicine-suggestions">
                        {COMMON_MEDICINES.map(med => (
                          <option key={med} value={med} />
                        ))}
                      </datalist>
                    </div>
                    <div className="field">
                      <label>Dosage *</label>
                      <input
                        type="text"
                        value={medicine.dosage}
                        onChange={(e) => handleMedicineChange(index, 'dosage', e.target.value)}
                        placeholder="e.g., 500mg"
                        required
                      />
                    </div>
                    <div className="field">
                      <label>Frequency *</label>
                      <select
                        value={medicine.frequency}
                        onChange={(e) => handleMedicineChange(index, 'frequency', e.target.value)}
                        required
                      >
                        <option value="Once daily">Once daily</option>
                        <option value="Twice daily">Twice daily</option>
                        <option value="Three times daily">Three times daily</option>
                        <option value="Four times daily">Four times daily</option>
                        <option value="Every 4 hours">Every 4 hours</option>
                        <option value="Every 6 hours">Every 6 hours</option>
                        <option value="As needed">As needed</option>
                      </select>
                    </div>
                    <div className="field" style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                      <div className="field" style={{ flex: 1 }}>
                        <label>Duration *</label>
                        <input
                          type="text"
                          value={medicine.duration}
                          onChange={(e) => handleMedicineChange(index, 'duration', e.target.value)}
                          placeholder="e.g., 7 days"
                          required
                        />
                      </div>
                      <button
                        type="button"
                        className="button danger"
                        style={{ height: '39px', padding: '0 12px' }}
                        onClick={() => removeMedicine(index)}
                        disabled={medicines.length === 1}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="field" style={{ marginTop: '16px' }}>
            <label htmlFor="advice">Doctor's Advice</label>
            <textarea
              name="advice"
              id="advice"
              rows={3}
              value={formData.advice}
              onChange={handleChange}
            />
          </div>
        </form>
      </section>
    </div>
  );
};

export default AddPrescriptionPage;
