'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

const AddStocksPage = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    generic_name: '',
    manufacturer: '',
    quantity: '',
    unit: 'pcs',
    reorder_level: '10',
    cost_price: '',
    selling_price: '',
    batch_number: '',
    expiry_date: '',
    description: '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.token) return;

    setLoading(true);
    setError(null);

    try {
      await api.createStock(user.token, {
        name: formData.name,
        generic_name: formData.generic_name || null,
        manufacturer: formData.manufacturer || null,
        quantity: Number(formData.quantity || 0),
        unit: formData.unit || 'pcs',
        reorder_level: Number(formData.reorder_level || 10),
        cost_price: Number(formData.cost_price || 0),
        selling_price: Number(formData.selling_price || 0),
        batch_number: formData.batch_number || null,
        expiry_date: formData.expiry_date || null,
        description: formData.description || null,
      });

      router.push('/stocks');
    } catch (err: any) {
      setError(err?.message || 'Failed to add stock');
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
            <h1>Add Stock</h1>
            <p className="patient-db-status">Enter details for a new item in your inventory.</p>
          </div>
          <button type="submit" disabled={loading} className="mpi-primary-button">
            {loading ? 'Saving...' : 'Submit'}
          </button>
        </header>

        <div style={{ padding: '24px' }}>
          {error && (
            <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: '8px', border: '1px solid #f87171', marginBottom: '24px' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            <div>
              <label htmlFor="name" style={labelStyle}>Name *</label>
              <input
                id="name"
                name="name"
                type="text"
                style={inputStyle}
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label htmlFor="generic_name" style={labelStyle}>Generic Name</label>
              <input
                id="generic_name"
                name="generic_name"
                type="text"
                style={inputStyle}
                value={formData.generic_name}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="manufacturer" style={labelStyle}>Manufacturer</label>
              <input
                id="manufacturer"
                name="manufacturer"
                type="text"
                style={inputStyle}
                value={formData.manufacturer}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="quantity" style={labelStyle}>Quantity *</label>
              <input
                id="quantity"
                name="quantity"
                type="number"
                min="0"
                style={inputStyle}
                value={formData.quantity}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label htmlFor="unit" style={labelStyle}>Unit</label>
              <input
                id="unit"
                name="unit"
                type="text"
                style={inputStyle}
                value={formData.unit}
                onChange={handleChange}
                placeholder="e.g., pcs, boxes"
              />
            </div>

            <div>
              <label htmlFor="reorder_level" style={labelStyle}>Reorder Level</label>
              <input
                id="reorder_level"
                name="reorder_level"
                type="number"
                min="0"
                style={inputStyle}
                value={formData.reorder_level}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="cost_price" style={labelStyle}>Cost Price</label>
              <input
                id="cost_price"
                name="cost_price"
                type="number"
                step="0.01"
                min="0"
                style={inputStyle}
                value={formData.cost_price}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="selling_price" style={labelStyle}>Selling Price</label>
              <input
                id="selling_price"
                name="selling_price"
                type="number"
                step="0.01"
                min="0"
                style={inputStyle}
                value={formData.selling_price}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="batch_number" style={labelStyle}>Batch Number</label>
              <input
                id="batch_number"
                name="batch_number"
                type="text"
                style={inputStyle}
                value={formData.batch_number}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="expiry_date" style={labelStyle}>Expiry Date</label>
              <input
                id="expiry_date"
                name="expiry_date"
                type="date"
                style={inputStyle}
                value={formData.expiry_date}
                onChange={handleChange}
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="description" style={labelStyle}>Description</label>
              <textarea
                id="description"
                name="description"
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
                value={formData.description}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>
      </form>
    </section>
  );
};

export default AddStocksPage;
