'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

const AddLabCategoryPage = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    category: '',
    name: '',
    description: '',
    ref_val_lower: '',
    ref_val_upper: '',
    unit: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.token) return;
    setLoading(true);

    try {
      await api.createLabCategory(user.token, {
        ...formData,
        ref_val_lower: formData.ref_val_lower || null,
        ref_val_upper: formData.ref_val_upper || null,
      });
      router.push('\/modules/lab/category');
    } catch (error) {
      console.error('Failed to create category:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Add Lab Test</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><Link href="/">Home</Link></li>
                <li className="breadcrumb-item"><Link href="\/modules/lab/category">Lab Categories</Link></li>
                <li className="breadcrumb-item active">Add</li>
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
                <h3 className="card-title">Lab Test</h3>
              </div>
              <div className="card-body">
                <div className="form-group">
                  <label>Category Code</label>
                  <input
                    type="text"
                    className="form-control"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    className="form-control"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    className="form-control"
                    name="description"
                    rows={3}
                    value={formData.description}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group col-md-6">
                    <label>Reference Lower</label>
                    <input
                      type="text"
                      className="form-control"
                      name="ref_val_lower"
                      value={formData.ref_val_lower}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group col-md-6">
                    <label>Reference Upper</label>
                    <input
                      type="text"
                      className="form-control"
                      name="ref_val_upper"
                      value={formData.ref_val_upper}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Unit</label>
                  <input
                    type="text"
                    className="form-control"
                    name="unit"
                    value={formData.unit}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div className="card-footer">
                <button type="submit" className="btn btn-success" disabled={loading}>
                  {loading ? 'Saving...' : 'Submit'}
                </button>
                <Link href="\/modules/lab/category" className="btn btn-secondary ml-2">Cancel</Link>
              </div>
            </form>
          </div>
        </div>
      </section>
    </>
  );
};

export default AddLabCategoryPage;
