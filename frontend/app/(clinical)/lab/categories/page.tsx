'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import api from '@/lib/api';

interface LabCategory {
  id: number;
  category: string;
  name: string;
  description: string;
  ref_val_lower?: number | string;
  ref_val_upper?: number | string;
  unit?: string;
}

const LabCategoryPage = () => {
  const { user } = useAuth();
  const { isAdmin, isAccountant } = usePermissions();
  const [categories, setCategories] = useState<LabCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      if (user?.token) {
        try {
          const data = await api.getLabCategories(user.token) as any;
          setCategories(Array.isArray(data) ? data : (data?.results || []));
        } catch (error) {
          console.error('Failed to fetch categories:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [user]);

  const handleDelete = async (id: number) => {
    if (!user?.token) return;
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      await api.deleteLabCategory(user.token, id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (error) {
      console.error('Failed to delete category:', error);
    }
  };

  const canManage = isAdmin || isAccountant;

  return (
    <>
      {/* Content Header */}
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Lab Categories</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><Link href="/">Home</Link></li>
                <li className="breadcrumb-item"><Link href="/lab">Laboratory</Link></li>
                <li className="breadcrumb-item active">Categories</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <section className="content">
        <div className="container-fluid">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Lab Tests</h3>
              {canManage && (
                <div className="card-tools">
                  <Link href="\/modules/lab/category/add" className="btn btn-success btn-sm">
                    <i className="fa fa-plus-circle"></i> Add Lab Test
                  </Link>
                </div>
              )}
            </div>
            <div className="card-body">
              {loading ? (
                <div className="text-center">
                  <div className="spinner-border" role="status">
                    <span className="sr-only">Loading...</span>
                  </div>
                </div>
              ) : (
                <table className="table table-striped table-hover table-bordered">
                  <thead>
                    <tr>
                      <th>Category Name</th>
                      <th>Description</th>
                      <th>Reference Value</th>
                      {canManage && <th className="no-print">Options</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {categories.length === 0 ? (
                      <tr>
                        <td colSpan={canManage ? 4 : 3} className="text-center">No categories found</td>
                      </tr>
                    ) : (
                      categories.map((category) => (
                        <tr key={category.id}>
                          <td>{category.category}</td>
                          <td>{category.description}</td>
                          <td>
                            {category.ref_val_lower || category.ref_val_upper ? (
                              <span>
                                {category.ref_val_lower || ''}{category.ref_val_lower && category.ref_val_upper ? ' - ' : ''}{category.ref_val_upper || ''}
                                {category.unit ? ` ${category.unit}` : ''}
                              </span>
                            ) : (
                              ''
                            )}
                          </td>
                          {canManage && (
                            <td className="no-print">
                              <Link className="btn btn-info btn-xs" title="Edit" href={`\/modules/lab/category/${category.id}/edit`}>
                                <i className="fa fa-edit"> </i>
                              </Link>
                              {' '}
                              <button
                                className="btn btn-info btn-xs delete_button"
                                title="Delete"
                                onClick={() => handleDelete(category.id)}
                              >
                                <i className="fa fa-trash-o"></i>
                              </button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default LabCategoryPage;
