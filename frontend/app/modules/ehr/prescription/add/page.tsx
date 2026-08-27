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
    <>
      {/* Content Header */}
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Add Prescription</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><Link href="/">Home</Link></li>
                <li className="breadcrumb-item"><Link href="/prescription">Prescriptions</Link></li>
                <li className="breadcrumb-item active">Add</li>
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
                <h3 className="card-title">Prescription Details</h3>
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

                  <div className="form-group col-md-12">
                    <label htmlFor="diagnosis">Diagnosis</label>
                    <textarea
                      className="form-control"
                      name="diagnosis"
                      id="diagnosis"
                      rows={2}
                      value={formData.diagnosis}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="col-md-12">
                    <h5 className="mb-3">
                      Medicines
                      <button type="button" className="btn btn-sm btn-primary ml-2" onClick={addMedicine}>
                        <i className="fa fa-plus"></i> Add Medicine
                      </button>
                    </h5>
                    
                    {medicines.map((medicine, index) => (
                      <div key={index} className="card mb-2">
                        <div className="card-body">
                          <div className="row">
                            <div className="form-group col-md-3">
                              <label>Medicine Name *</label>
                              <input
                                type="text"
                                className="form-control"
                                value={medicine.medicine_name}
                                onChange={(e) => handleMedicineChange(index, 'medicine_name', e.target.value)}
                                required
                              />
                            </div>
                            <div className="form-group col-md-2">
                              <label>Dosage *</label>
                              <input
                                type="text"
                                className="form-control"
                                value={medicine.dosage}
                                onChange={(e) => handleMedicineChange(index, 'dosage', e.target.value)}
                                placeholder="e.g., 500mg"
                                required
                              />
                            </div>
                            <div className="form-group col-md-3">
                              <label>Frequency *</label>
                              <select
                                className="form-control"
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
                            <div className="form-group col-md-2">
                              <label>Duration *</label>
                              <input
                                type="text"
                                className="form-control"
                                value={medicine.duration}
                                onChange={(e) => handleMedicineChange(index, 'duration', e.target.value)}
                                placeholder="e.g., 7 days"
                                required
                              />
                            </div>
                            <div className="form-group col-md-2">
                              <label>&nbsp;</label>
                              <button
                                type="button"
                                className="btn btn-danger btn-block"
                                onClick={() => removeMedicine(index)}
                                disabled={medicines.length === 1}
                              >
                                <i className="fa fa-trash"></i>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="form-group col-md-12">
                    <label htmlFor="advice">Doctor's Advice</label>
                    <textarea
                      className="form-control"
                      name="advice"
                      id="advice"
                      rows={3}
                      value={formData.advice}
                      onChange={handleChange}
                    />
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

export default AddPrescriptionPage;
