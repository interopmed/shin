'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

const AddStockCategoryPage = () => {
  const { user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    category: '',
    description: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.token) return;

    const category = formData.category.trim();
    const description = formData.description.trim();

    if (category.length < 2) {
      setError('Category name must be at least 2 characters.');
      return;
    }

    if (description.length < 5) {
      setError('Description must be at least 5 characters.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.createStockCategory(user.token, {
        name: category,
        description,
        is_active: true,
      });
      router.push('/stocks/stock_categories');
    } catch (err: any) {
      setError(err?.message || 'Failed to add stock category');
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
              <h1 className="m-0">Add Stock Category</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item">
                  <Link href="/">Home</Link>
                </li>
                <li className="breadcrumb-item">
                  <Link href="/stocks">Stocks</Link>
                </li>
                <li className="breadcrumb-item">
                  <Link href="/stocks/stock_categories">Stock Categories</Link>
                </li>
                <li className="breadcrumb-item active">Add Category</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          <div className="card card-outline card-success">
            <form onSubmit={handleSubmit}>
              <div className="card-header d-flex align-items-center">
                <h3 className="card-title mb-0">Category Details</h3>
                <button type="submit" className="btn btn-success btn-sm ml-auto" disabled={loading}>
                  {loading ? 'Saving...' : 'Submit'}
                </button>
              </div>

              <div className="card-body">
                {error && <div className="alert alert-danger">{error}</div>}

                <div className="row">
                  <div className="form-group col-12">
                    <label htmlFor="category">Category Name *</label>
                    <input
                      id="category"
                      name="category"
                      type="text"
                      className="form-control"
                      value={formData.category}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group col-12 mb-0">
                    <label htmlFor="description">Description *</label>
                    <textarea
                      id="description"
                      name="description"
                      rows={4}
                      className="form-control"
                      value={formData.description}
                      onChange={handleChange}
                      required
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

export default AddStockCategoryPage;
