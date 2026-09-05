'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

type StockAlertItem = {
  id: number;
  name: string;
  category_name?: string;
  quantity: number;
  reorder_level?: number;
  unit?: string;
  manufacturer?: string;
};

const StockAlertsPage = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<StockAlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAlerts = async () => {
      if (!user?.token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await api.getStockAlerts(user.token);
        setAlerts(Array.isArray(data) ? data : []);
      } catch (err: any) {
        setError(err?.message || 'Failed to fetch stock alerts');
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, [user?.token]);

  return (
    <>
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Stock Alerts</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item">
                  <Link href="/">Home</Link>
                </li>
                <li className="breadcrumb-item">
                  <Link href="/stocks">Stocks</Link>
                </li>
                <li className="breadcrumb-item active">Stock Alerts</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Low Stock Items</h3>
            </div>
            <div className="card-body">
              {error && <div className="alert alert-danger">{error}</div>}

              {loading ? (
                <div className="text-center">Loading stock alerts...</div>
              ) : (
                <table className="table table-bordered table-striped">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Category</th>
                      <th>Manufacturer</th>
                      <th>Current Qty</th>
                      <th>Reorder Level</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center">
                          No low stock alerts found
                        </td>
                      </tr>
                    ) : (
                      alerts.map((item) => (
                        <tr key={item.id}>
                          <td>{item.name}</td>
                          <td>{item.category_name || 'N/A'}</td>
                          <td>{item.manufacturer || 'N/A'}</td>
                          <td>
                            {item.quantity} {item.unit || 'pcs'}
                          </td>
                          <td>{item.reorder_level ?? '-'}</td>
                          <td>
                            <span className="badge badge-danger">Low Stock</span>
                          </td>
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

export default StockAlertsPage;
