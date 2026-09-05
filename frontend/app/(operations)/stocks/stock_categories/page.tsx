'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

type StockCategory = {
  id: number;
  name: string;
  description?: string | null;
  is_active?: boolean;
};

const StockCategoriesPage = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<StockCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true,
  });

  const fetchCategories = async () => {
    if (!user?.token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await api.getStockCategories(user.token);
      setCategories(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch stock categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [user?.token]);

  const resetForm = () => {
    setFormData({ name: '', description: '', is_active: true });
    setEditingId(null);
    setShowModal(false);
  };

  const handleAdd = () => {
    setEditingId(null);
    setFormData({ name: '', description: '', is_active: true });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.token) return;

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        is_active: formData.is_active,
      };

      if (editingId) {
        await api.updateStockCategory(user.token, editingId, payload);
      } else {
        await api.createStockCategory(user.token, payload);
      }

      resetForm();
      await fetchCategories();
    } catch (err: any) {
      setError(err?.message || 'Failed to save stock category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (category: StockCategory) => {
    setEditingId(category.id);
    setFormData({
      name: category.name,
      description: category.description || '',
      is_active: category.is_active !== false,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!user?.token) return;
    if (!window.confirm('Delete this stock category?')) return;

    setError(null);
    try {
      await api.deleteStockCategory(user.token, id);
      await fetchCategories();
      if (editingId === id) {
        resetForm();
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to delete stock category');
    }
  };

  return (
    <>
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Stock Categories</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item">
                  <Link href="/">Home</Link>
                </li>
                <li className="breadcrumb-item">
                  <Link href="/stocks">Stocks</Link>
                </li>
                <li className="breadcrumb-item active">Stock Categories</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          <div className="card">
            <div className="card-header d-flex align-items-center">
              <h3 className="card-title mb-0">Category List</h3>
              <Link href="/stocks/add_stock_category" className="btn btn-primary btn-sm ml-auto">
                <i className="fa fa-plus" /> Add Category
              </Link>
            </div>
            <div className="card-body">
              {error && <div className="alert alert-danger">{error}</div>}

              {loading ? (
                <div className="text-center">Loading categories...</div>
              ) : (
                <table className="table table-bordered table-striped">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Description</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center">
                          No stock categories found
                        </td>
                      </tr>
                    ) : (
                      categories.map((category) => (
                        <tr key={category.id}>
                          <td>{category.name}</td>
                          <td>{category.description || 'N/A'}</td>
                          <td>
                            <span className={`badge ${category.is_active ? 'badge-success' : 'badge-secondary'}`}>
                              {category.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-info btn-sm mr-2"
                              onClick={() => handleEdit(category)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDelete(category.id)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {showModal && (
            <div className="modal d-block" tabIndex={-1} role="dialog" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <div className="modal-dialog" role="document">
                <div className="modal-content">
                  <form onSubmit={handleSubmit}>
                    <div className="modal-header">
                      <h5 className="modal-title">{editingId ? 'Update Category' : 'Add Category'}</h5>
                      <button type="button" className="close" aria-label="Close" onClick={resetForm}>
                        <span aria-hidden="true">&times;</span>
                      </button>
                    </div>
                    <div className="modal-body">
                      <div className="form-group">
                        <label htmlFor="name">Name *</label>
                        <input
                          id="name"
                          type="text"
                          className="form-control"
                          value={formData.name}
                          onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="description">Description</label>
                        <input
                          id="description"
                          type="text"
                          className="form-control"
                          value={formData.description}
                          onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                        />
                      </div>
                      <div className="form-group mb-0">
                        <label htmlFor="is_active">Status</label>
                        <select
                          id="is_active"
                          className="form-control"
                          value={formData.is_active ? 'true' : 'false'}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, is_active: e.target.value === 'true' }))
                          }
                        >
                          <option value="true">Active</option>
                          <option value="false">Inactive</option>
                        </select>
                      </div>
                    </div>
                    <div className="modal-footer">
                      <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
                        {submitting ? 'Saving...' : editingId ? 'Update Category' : 'Add Category'}
                      </button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={resetForm}>
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default StockCategoriesPage;
