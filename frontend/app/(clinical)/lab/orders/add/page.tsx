'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

interface Patient {
  id: number;
  name: string;
}

interface LabCategory {
  id: number;
  name: string;
  tests: LabTestType[];
}

interface LabTestType {
  id: number;
  name: string;
  price: number;
}

const OrderLabTestPage = () => {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientIdQuery = searchParams?.get('patientId');
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [categories, setCategories] = useState<LabCategory[]>([]);
  const [selectedTests, setSelectedTests] = useState<number[]>([]);
  
  const [formData, setFormData] = useState({
    patient_id: patientIdQuery || '',
    date: new Date().toISOString().split('T')[0],
    remarks: '',
    priority: 'Routine',
  });

  useEffect(() => {
    const fetchData = async () => {
      if (user?.token) {
        try {
          const patientsData = await api.getPatients(user.token) as Patient[];
          setPatients(patientsData);
          // TODO: Fetch lab categories
          setCategories([]);
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

  const handleTestSelection = (testId: number) => {
    setSelectedTests(prev => {
      if (prev.includes(testId)) {
        return prev.filter(id => id !== testId);
      } else {
        return [...prev, testId];
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (user?.token) {
        const submitData = {
          ...formData,
          tests: selectedTests,
        };
        console.log('Order data:', submitData);
        // TODO: Implement API call
        // await api.createLabOrder(user.token, submitData);
        router.push('/lab');
      }
    } catch (error) {
      console.error('Failed to order lab test:', error);
      alert('Failed to order lab test. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    fontSize: '14px',
    color: '#0f172a',
    backgroundColor: '#fff',
    outline: 'none',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
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
      <form onSubmit={handleSubmit} className="mpi-card">
        <header className="mpi-header">
          <div>
            <h1>Order Lab Test</h1>
            <p className="patient-db-status">Create a new laboratory order and assign tests to a patient.</p>
          </div>
          <button type="submit" disabled={loading} className="mpi-primary-button">
            {loading ? 'Submitting...' : 'Submit Order'}
          </button>
        </header>

        <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div>
            <label htmlFor="patient_id" style={labelStyle}>Patient *</label>
            <select
              style={inputStyle}
              name="patient_id"
              id="patient_id"
              value={formData.patient_id}
              onChange={handleChange}
              required
              disabled={!!patientIdQuery}
            >
              <option value="">Select Patient</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="date" style={labelStyle}>Test Date *</label>
            <input
              type="date"
              style={inputStyle}
              name="date"
              id="date"
              value={formData.date}
              onChange={handleChange}
              required
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="priority" style={labelStyle}>Order Priority *</label>
            <select
              style={{ ...inputStyle, maxWidth: '50%' }}
              name="priority"
              id="priority"
              value={formData.priority}
              onChange={handleChange}
              required
            >
              <option value="Routine">Routine</option>
              <option value="Urgent">Urgent</option>
              <option value="STAT">STAT (Immediate)</option>
            </select>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Select Tests *</label>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', maxHeight: '300px', overflowY: 'auto', backgroundColor: '#f8fafc' }}>
              {categories.length === 0 ? (
                <p style={{ margin: 0, color: '#64748b', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>No lab test categories available</p>
              ) : (
                categories.map((category) => (
                  <div key={category.id} style={{ marginBottom: '20px' }}>
                    <h5 style={{ margin: '0 0 12px 0', color: '#0f172a', fontSize: '15px', fontWeight: 600 }}>{category.name}</h5>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px', paddingLeft: '12px' }}>
                      {category.tests.map((test) => (
                        <label key={test.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#334155', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={selectedTests.includes(test.id)}
                            onChange={() => handleTestSelection(test.id)}
                            style={{ width: '16px', height: '16px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                          />
                          <span>{test.name} - <strong style={{ color: '#059669' }}>${test.price}</strong></span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="remarks" style={labelStyle}>Remarks</label>
            <textarea
              style={{ ...inputStyle, resize: 'vertical' }}
              name="remarks"
              id="remarks"
              rows={3}
              value={formData.remarks}
              onChange={handleChange}
              placeholder="Add any specific instructions or clinical notes here..."
            />
          </div>
        </div>
      </form>
    </section>
  );
};

export default OrderLabTestPage;
