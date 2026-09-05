'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AddCareTeamPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    risk: 'Low',
    status: 'Active',
    leadName: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      console.log('Created Care Team:', formData);
      setLoading(false);
      router.push('/care-teams');
    }, 1000);
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
            <h1>New Care Team</h1>
            <p className="patient-db-status">Enter details for a new multidisciplinary care team.</p>
          </div>
          <button type="submit" disabled={loading} className="mpi-primary-button">
            {loading ? 'Saving...' : 'Submit Team'}
          </button>
        </header>

        <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div>
            <label htmlFor="name" style={labelStyle}>Team Name *</label>
            <input
              type="text"
              style={inputStyle}
              name="name"
              id="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="e.g. Oncology Group A"
            />
          </div>

          <div>
            <label htmlFor="leadName" style={labelStyle}>Team Lead</label>
            <input
              type="text"
              style={inputStyle}
              name="leadName"
              id="leadName"
              value={formData.leadName}
              onChange={handleChange}
              placeholder="e.g. Dr. Smith"
            />
          </div>

          <div>
            <label htmlFor="risk" style={labelStyle}>Risk Level *</label>
            <select
              style={inputStyle}
              name="risk"
              id="risk"
              value={formData.risk}
              onChange={handleChange}
              required
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>

          <div>
            <label htmlFor="status" style={labelStyle}>Status *</label>
            <select
              style={inputStyle}
              name="status"
              id="status"
              value={formData.status}
              onChange={handleChange}
              required
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
      </form>
    </section>
  );
}
