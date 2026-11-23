'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { canAccess, createActiveUserFromToken } from '@/lib/permissions';

type StockItem = {
  id: number;
  name: string;
  category_name?: string;
  manufacturer?: string;
  quantity: number;
  unit?: string;
  selling_price?: number | string;
  reorder_level?: number;
};

const StocksPage = () => {
  const { user } = useAuth();
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);

  const activeUser = createActiveUserFromToken(user || undefined);
  const hasAccess = canAccess(activeUser, ['pharmacy.read']);

  useEffect(() => {
    const fetchStocks = async () => {
      if (!user?.token || !hasAccess) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await api.getStocksPage(user.token, { page: String(page), page_size: '10' });
        
        if (response && response.results) {
          setStocks(response.results);
          setTotalCount(response.count || 0);
          setHasNext(Boolean(response.next));
          setHasPrevious(Boolean(response.previous));
        } else {
          const arr = Array.isArray(response) ? response : [];
          setStocks(arr);
          setTotalCount(arr.length);
          setHasNext(false);
          setHasPrevious(page > 1);
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to fetch stocks');
      } finally {
        setLoading(false);
      }
    };

    fetchStocks();
  }, [user?.token, page, hasAccess]);

  if (!hasAccess) {
    return (
      <section className="mpi-page">
        <div className="mpi-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
            Access Restricted
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            Your role does not have permission to view pharmacy inventory.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mpi-page">
      <div className="mpi-card">
        <header className="mpi-header">
          <div>
            <h1>Stock List</h1>
            <p className="patient-db-status">Manage available inventory and monitor stock levels.</p>
          </div>
          <Link href="/stocks/add_stocks" className="mpi-primary-button">
            + Add Stock
          </Link>
        </header>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>
        ) : error ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#be123c' }}>
            {error}
          </div>
        ) : (
          <div className="mpi-table-wrap">
            <table className="mpi-table">
              <thead>
                <tr>
                  <th><input aria-label="Select all" type="checkbox" /></th>
                  <th>Item Info</th>
                  <th>Category & Manufacturer</th>
                  <th>Quantity & Pricing</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {stocks.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                      No stock items found.
                    </td>
                  </tr>
                ) : (
                  stocks.map((item) => {
                    const isLowStock = typeof item.reorder_level === 'number' && item.quantity <= item.reorder_level;

                    return (
                      <tr key={item.id}>
                        <td><input type="checkbox" aria-label={`Select ${item.name}`} /></td>
                        <td>
                          <strong>{item.name}</strong>
                          <span>Item #{item.id}</span>
                        </td>
                        <td>
                          <strong style={{ color: '#0f172a' }}>{item.category_name || 'Uncategorized'}</strong>
                          <span>{item.manufacturer || 'Unknown Manufacturer'}</span>
                        </td>
                        <td>
                          <strong>{item.quantity} <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 400 }}>{item.unit || 'pcs'}</span></strong>
                          <span>${item.selling_price !== undefined && item.selling_price !== null ? Number(item.selling_price).toFixed(2) : '0.00'} / unit</span>
                        </td>
                        <td>
                          <div className="mpi-confidence">
                            <strong style={{ color: isLowStock ? '#be123c' : '#059669' }}>
                              {isLowStock ? 'Low Stock' : 'In Stock'}
                            </strong>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
        
        {!loading && stocks.length > 0 && (
          <div className="mpi-pagination-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: '14px 24px', borderTop: '1px solid #e3e9f1' }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#667085', fontWeight: 600 }}>
              Showing <strong>{(page - 1) * 10 + 1}-{Math.min(page * 10, totalCount)}</strong> of <strong>{totalCount}</strong> items
            </p>

            <div className="mpi-pagination-controls" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <button
                type="button"
                disabled={!hasPrevious && page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                className="mpi-filter-button"
                style={{
                  display: 'inline-flex', alignItems: 'center', minHeight: '34px', lineHeight: '34px',
                  background: !hasPrevious && page <= 1 ? '#f8fafc' : '#fff',
                  color: !hasPrevious && page <= 1 ? '#94a3b8' : '#0f172a',
                  border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0 12px', fontSize: '13px', fontWeight: 800,
                  cursor: !hasPrevious && page <= 1 ? 'not-allowed' : 'pointer'
                }}
              >
                Previous
              </button>

              <div className="mpi-page-numbers" style={{ display: 'flex', gap: '4px' }}>
                {(() => {
                  const totalPages = Math.max(1, Math.ceil(totalCount / 10));
                  const items: (number | string)[] = [];
                  if (totalPages <= 7) {
                    for (let i = 1; i <= totalPages; i++) items.push(i);
                  } else {
                    if (page <= 3) {
                      items.push(1, 2, 3, 4, '...', totalPages);
                    } else if (page >= totalPages - 2) {
                      items.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
                    } else {
                      items.push(1, '...', page - 1, page, page + 1, '...', totalPages);
                    }
                  }
                  
                  return items.map((p, idx) => (
                    <button
                      key={`${p}-${idx}`}
                      type="button"
                      disabled={p === '...'}
                      onClick={() => typeof p === 'number' && setPage(p)}
                      style={{
                        minWidth: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: p === page ? '#f1f5f9' : 'transparent',
                        color: p === page ? '#0f172a' : (p === '...' ? '#94a3b8' : '#64748b'),
                        border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 800,
                        cursor: p === '...' ? 'default' : 'pointer'
                      }}
                    >
                      {p}
                    </button>
                  ));
                })()}
              </div>

              <button
                type="button"
                disabled={!hasNext}
                onClick={() => setPage((prev) => prev + 1)}
                className="mpi-filter-button"
                style={{
                  display: 'inline-flex', alignItems: 'center', minHeight: '34px', lineHeight: '34px',
                  background: !hasNext ? '#f8fafc' : '#fff',
                  color: !hasNext ? '#94a3b8' : '#0f172a',
                  border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0 12px', fontSize: '13px', fontWeight: 800,
                  cursor: !hasNext ? 'not-allowed' : 'pointer'
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default StocksPage;
