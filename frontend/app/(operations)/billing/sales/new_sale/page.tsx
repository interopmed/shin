'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

interface Patient {
  id: number;
  name: string;
}

interface StockItem {
  id: number;
  name: string;
  selling_price: number;
  quantity: number;
}

interface SaleItemForm {
  stock_item: number;
  quantity: number;
  unit_price: number;
  discount: number;
  sub_total: number;
}

const NewSalePage = () => {
  const { user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [mode, setMode] = useState('sale');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
  const [newPatientData, setNewPatientData] = useState({ name: '', phone: '', address: '' });
  const [searchResults, setSearchResults] = useState<StockItem[]>([]);
  const [cartDetails, setCartDetails] = useState<Record<number, StockItem>>({});

  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [itemSearchTerm, setItemSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    patient: '' as number | '',
    sale_date: new Date().toISOString().split('T')[0],
    payment_status: 'pending',
    payment_type: 'cash',
    tendered_amount: '',
    remarks: '',
    items: [] as SaleItemForm[],
  });

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!user?.token) {
        return;
      }

      setLoading(true);
      try {
        // Initial fetch logic removed as per request to search-as-you-type
      } catch (fetchError: unknown) {
        const message = fetchError instanceof Error ? fetchError.message : 'Failed to fetch initial data';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [user?.token]);

  const filteredPatients = useMemo(() => {
    return patients;
  }, [patients]);

  const fetchPatients = async (query: string) => {
    if (!user?.token) return;
    try {
      if (!query.trim()) {
        setPatients([]);
        return;
      }
      const results = await api.searchPatients(user.token, query);
      setPatients(Array.isArray(results) ? results : []);
    } catch (err) {
      console.error('Failed to search patients', err);
      setPatients([]);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPatients(patientSearchTerm);
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientSearchTerm, user?.token]);

  const fetchStocks = async (query: string) => {
    if (!user?.token) return;
    try {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }
      const stocksData = await api.getStocks(user.token, { search: query, page_size: '20' });
      if (Array.isArray(stocksData)) {
        const stocksWithNumbers = stocksData.map((s: any) => ({
          ...s,
          selling_price: Number(s.selling_price),
          quantity: Number(s.quantity),
        }));
        setSearchResults(stocksWithNumbers);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Failed to search stocks', err);
      setSearchResults([]);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStocks(itemSearchTerm);
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemSearchTerm, user?.token]);

  const filteredStocks = useMemo(() => {
    return searchResults;
  }, [searchResults]);

const recalculateSubTotal = (quantity: number, unitPrice: number, discount: number) => {
    const base = Number(quantity) * Number(unitPrice);
    return base - (base * Number(discount)) / 100;
  };

  const handleAddItem = (stockId: number) => {
    // Look first in current search results, but fallback to cartDetails if already added
    let selectedStock = searchResults.find((stock) => stock.id === stockId);

    // If not in search results, check if we already have it in cartDetails (should generally be handled by current UI flow)
    if (!selectedStock) {
        selectedStock = cartDetails[stockId];
    }

    if (!selectedStock) {
      return;
    }

    // Add to cartDetails to keep track of it regardless of search results
    setCartDetails(prev => ({ ...prev, [stockId]: selectedStock! }));

    const existingIndex = formData.items.findIndex((item) => item.stock_item === stockId);

    if (existingIndex >= 0) {
      const updated = [...formData.items];
      const existing = updated[existingIndex];
      const nextQty = existing.quantity + 1;

      if (nextQty > selectedStock.quantity) {
        setError(`Cannot add more than ${selectedStock.quantity} of ${selectedStock.name}`);
        return;
      }

      updated[existingIndex] = {
        ...existing,
        quantity: nextQty,
        sub_total: recalculateSubTotal(nextQty, existing.unit_price, existing.discount),
      };

      setFormData((prev) => ({ ...prev, items: updated }));
    } else {
      const item: SaleItemForm = {
        stock_item: selectedStock.id,
        quantity: 1,
        unit_price: Number(selectedStock.selling_price),
        discount: 0,
        sub_total: Number(selectedStock.selling_price),
      };
      setFormData((prev) => ({ ...prev, items: [...prev.items, item] }));
    }

    setError(null);
    setItemSearchTerm('');
  };

  const handleUpdateItem = (index: number, field: 'quantity' | 'unit_price' | 'discount', value: number) => {
    const updated = [...formData.items];
    const current = updated[index];
    const selectedStock = cartDetails[current.stock_item] || searchResults.find((stock) => stock.id === current.stock_item);

    if (!selectedStock) {
      return;
    }

    const next = { ...current };

    if (field === 'quantity') {
      if (value <= 0) {
        handleRemoveItem(index);
        return;
      }
      if (value > selectedStock.quantity) {
        setError(`Cannot add more than ${selectedStock.quantity} of ${selectedStock.name}`);
        return;
      }
      next.quantity = value;
    }

    if (field === 'unit_price') {
      next.unit_price = value < 0 ? 0 : Number(value);
    }

    if (field === 'discount') {
      if (value < 0) {
        next.discount = 0;
      } else if (value > 100) {
        next.discount = 100;
      } else {
        next.discount = value;
      }
    }

    next.sub_total = recalculateSubTotal(next.quantity, next.unit_price, next.discount);
    updated[index] = next;

    setError(null);
    setFormData((prev) => ({ ...prev, items: updated }));
  };

  const handleRemoveItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const subtotal = useMemo(
    () => formData.items.reduce((sum, item) => sum + item.sub_total, 0),
    [formData.items],
  );

  const taxes = useMemo(() => [{ name: 'Tax', value: 0 }], []);
  const total = useMemo(() => subtotal + taxes.reduce((sum, tax) => sum + tax.value, 0), [subtotal, taxes]);

  const handleCloseAddPatientModal = () => {
    setShowAddPatientModal(false);
    setNewPatientData({ name: '', phone: '', address: '' });
    setError(null);
  };

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.token) return;

    if (!newPatientData.name.trim()) {
      setError('Patient name is required');
      return;
    }

    try {
      setLoading(true);
      const newPatient = (await api.createPatient(user.token, newPatientData)) as Patient;
      
      // Add and select the new patient. 
      // The API response should simulate the patient structure { id, name } at minimum.
      setPatients((prev) => [newPatient, ...prev]);
      setSelectedPatient(newPatient);
      setFormData((prev) => ({ ...prev, patient: newPatient.id }));
      setPatientSearchTerm('');
      
      handleCloseAddPatientModal();
      setSuccess('Patient created and selected successfully');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create patient';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const cancelSale = () => {
    setFormData((prev) => ({
      ...prev,
      patient: '',
      remarks: '',
      tendered_amount: '',
      items: [],
    }));
    setPatientSearchTerm('');
    setItemSearchTerm('');
    setError(null);
    setSuccess(null);
    setPatients([]);
    setCartDetails({});
    setSearchResults([]);
    setSelectedPatient(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!user?.token) {
      return;
    }

    if (!formData.patient) {
      setError('Please select a customer.');
      return;
    }

    if (formData.items.length === 0) {
      setError('No items in cart.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        patient: formData.patient,
        user: user.id,
        // sale_date: formData.sale_date, // Field ignored/auto-filled by backend
        total_amount: total,
        payment_method: formData.payment_type, // Mapped to backend 'payment_method'
        remarks: formData.remarks || "",
        items: formData.items.map((item) => ({
          stock: item.stock_item, 
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.sub_total, // Mapped to 'total_price'
          discount: item.discount, // Include item discount
        })),
        paid_amount: Number(formData.tendered_amount) || 0,
        change_amount: (Number(formData.tendered_amount) || 0) - total,
      };
      
      console.log('Submitting Payload:', payload);

      await api.createSale(user.token, payload);
      setSuccess('Sale created successfully!');
      router.push('/sales');
    } catch (submitError: unknown) {
      const message = submitError instanceof Error ? submitError.message : 'Failed to create sale';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="stack" style={{ gap: '24px' }}>

      <form onSubmit={handleSubmit} className="stack" style={{ gap: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', alignItems: 'start' }}>
          
          {/* Cart Section */}
          <div className="panel stack" style={{ padding: '24px', gap: '24px' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--primary-color)' }}>Cart</h2>
            
            {error && <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: 'var(--radius-md)', border: '1px solid #f87171' }}>{error}</div>}
            {success && <div style={{ padding: '12px 16px', backgroundColor: '#f0fdf4', color: '#16a34a', borderRadius: 'var(--radius-md)', border: '1px solid #4ade80' }}>{success}</div>}

            <div style={{ display: 'flex', gap: '16px' }}>
              <div className="field" style={{ flex: '0 0 150px' }}>
                <label htmlFor="mode">Register Mode:</label>
                <select
                  id="mode"
                  value={mode}
                  onChange={(event) => setMode(event.target.value)}
                >
                  <option value="sale">Sale</option>
                  <option value="return">Return</option>
                </select>
              </div>

              <div className="field" style={{ flex: 1, position: 'relative' }}>
                <label htmlFor="item">Search or Scan Item:</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    id="item"
                    style={{ flex: 1 }}
                    placeholder="Search items..."
                    value={itemSearchTerm}
                    onChange={(event) => setItemSearchTerm(event.target.value)}
                  />
                  <Link href="/stocks" className="button secondary" style={{ padding: '0 12px' }}>
                    +
                  </Link>
                </div>

                {itemSearchTerm && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: '48px', zIndex: 20,
                    maxHeight: '220px', overflowY: 'auto', marginTop: '4px',
                    backgroundColor: '#ffffff', border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)',
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {filteredStocks.length === 0 ? (
                        <div style={{ padding: '10px 16px', color: 'var(--text-tertiary)' }}>No items found.</div>
                      ) : (
                        filteredStocks.map((stock) => (
                          <button
                            key={stock.id}
                            type="button"
                            style={{
                              padding: '10px 16px', textAlign: 'left', background: 'transparent',
                              border: 'none', borderBottom: '1px solid var(--border-color)', cursor: 'pointer',
                              display: 'flex', justifyContent: 'space-between'
                            }}
                            onMouseDown={() => handleAddItem(stock.id)}
                          >
                            <span>{stock.name}</span>
                            <span style={{ color: 'var(--text-tertiary)' }}>{stock.quantity} in stock</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                    <th style={{ padding: '12px 8px', width: '5%' }}></th>
                    <th style={{ padding: '12px 8px', width: '40%', fontWeight: 600 }}>Name</th>
                    <th style={{ padding: '12px 8px', width: '15%', fontWeight: 600 }}>Price</th>
                    <th style={{ padding: '12px 8px', width: '10%', fontWeight: 600 }}>Qty</th>
                    <th style={{ padding: '12px 8px', width: '10%', fontWeight: 600 }}>Disc (%)</th>
                    <th style={{ padding: '12px 8px', width: '15%', fontWeight: 600 }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '32px 8px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                        No items in cart.
                      </td>
                    </tr>
                  ) : (
                    formData.items.map((item, index) => {
                      const stock = cartDetails[item.stock_item] || searchResults.find((s) => s.id === item.stock_item);
                      return (
                        <tr key={`${item.stock_item}-${index}`} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                            <button
                              type="button"
                              style={{ background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '18px' }}
                              title="Delete"
                              onClick={() => handleRemoveItem(index)}
                            >
                              &times;
                            </button>
                          </td>
                          <td style={{ padding: '12px 8px' }}>{stock?.name || 'Unknown Item'}</td>
                          <td style={{ padding: '12px 8px' }}>
                            <input
                              type="number" min="0" step="0.01"
                              style={{ width: '80px', padding: '4px 8px' }}
                              value={item.unit_price}
                              onChange={(event) => handleUpdateItem(index, 'unit_price', Number(event.target.value))}
                            />
                          </td>
                          <td style={{ padding: '12px 8px' }}>
                            <input
                              type="number" min="1"
                              style={{ width: '60px', padding: '4px 8px', textAlign: 'center' }}
                              value={item.quantity}
                              onChange={(event) => handleUpdateItem(index, 'quantity', Number(event.target.value))}
                            />
                          </td>
                          <td style={{ padding: '12px 8px' }}>
                            <input
                              type="number" min="0" max="100"
                              style={{ width: '60px', padding: '4px 8px', textAlign: 'center' }}
                              value={item.discount}
                              onChange={(event) => handleUpdateItem(index, 'discount', Number(event.target.value))}
                            />
                          </td>
                          <td style={{ padding: '12px 8px', fontWeight: 500 }}>
                            {item.sub_total.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bill Section */}
          <div className="panel stack" style={{ padding: '24px', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--primary-color)' }}>Bill</h2>
              <button
                type="button"
                className="button secondary"
                onClick={cancelSale}
                style={{ padding: '6px 12px', color: '#dc2626', borderColor: '#f87171' }}
              >
                Clear
              </button>
            </div>

            <div className="field" style={{ position: 'relative' }}>
              <label htmlFor="customer">Select Customer</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  id="customer"
                  style={{ flex: 1 }}
                  placeholder="Type customer name"
                  value={patientSearchTerm}
                  onChange={(event) => setPatientSearchTerm(event.target.value)}
                />
                <button type="button" className="button secondary" style={{ padding: '0 12px' }} onClick={() => setShowAddPatientModal(true)} title="Add New Customer">
                  +
                </button>
              </div>

              {patientSearchTerm && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: '48px', zIndex: 20,
                  maxHeight: '200px', overflowY: 'auto', marginTop: '4px',
                  backgroundColor: '#ffffff', border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)',
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {filteredPatients.length === 0 ? (
                      <div style={{ padding: '10px 16px', color: 'var(--text-tertiary)' }}>No customers found.</div>
                    ) : (
                      filteredPatients.map((patient) => (
                        <button
                          key={patient.id}
                          type="button"
                          style={{ padding: '10px 16px', textAlign: 'left', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, patient: patient.id }));
                            setSelectedPatient(patient);
                            setPatientSearchTerm('');
                          }}
                        >
                          {patient.name}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              {selectedPatient && (
                <div style={{ marginTop: '12px', padding: '12px', border: '1px solid var(--primary-color)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-hover)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--primary-color)' }}>{selectedPatient.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>ID: {selectedPatient.id}</div>
                  </div>
                  <button type="button" style={{ background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '18px' }} onClick={() => { setSelectedPatient(null); setFormData((prev) => ({ ...prev, patient: '' })); }}>&times;</button>
                </div>
              )}
            </div>

            <div className="stack" style={{ gap: '12px', backgroundColor: 'var(--bg-hover)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Sub Total</span>
                <span>{subtotal.toFixed(2)}</span>
              </div>
              {taxes.map((tax) => (
                <div key={tax.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{tax.name}</span>
                  <span>{tax.value.toFixed(2)}</span>
                </div>
              ))}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                <span>Total</span>
                <span>{total.toFixed(2)}</span>
              </div>
            </div>

            {formData.items.length > 0 && (
              <div className="stack" style={{ gap: '16px' }}>
                <div className="field">
                  <label htmlFor="comment">Comments</label>
                  <textarea
                    id="comment"
                    rows={2}
                    value={formData.remarks}
                    onChange={(event) => setFormData((prev) => ({ ...prev, remarks: event.target.value }))}
                  />
                </div>

                <div className="field">
                  <label htmlFor="payment_type">Payment Type</label>
                  <select
                    id="payment_type"
                    value={formData.payment_type}
                    onChange={(event) => setFormData((prev) => ({ ...prev, payment_type: event.target.value }))}
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="bank">Bank</option>
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="tendered_amount">Tendered Amount</label>
                  <input
                    id="tendered_amount"
                    value={formData.tendered_amount}
                    onChange={(event) => setFormData((prev) => ({ ...prev, tendered_amount: event.target.value }))}
                  />
                </div>

                <button type="submit" className="button primary" style={{ width: '100%', marginTop: '8px' }} disabled={loading}>
                  {loading ? 'Submitting...' : 'Proceed with Sale'}
                </button>
              </div>
            )}
          </div>
        </div>
      </form>

      {/* Add New Patient Modal */}
      {showAddPatientModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="panel" style={{ width: '100%', maxWidth: '400px', padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', backgroundColor: 'var(--bg-hover)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Add New Customer</h4>
              <button onClick={handleCloseAddPatientModal} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '20px', color: 'var(--text-secondary)' }}>&times;</button>
            </div>
            
            <div className="stack" style={{ padding: '24px', gap: '20px' }}>
              <div className="field">
                <label>Name <span style={{ color: '#dc2626' }}>*</span></label>
                <input
                  type="text"
                  value={newPatientData.name}
                  onChange={(e) => setNewPatientData({ ...newPatientData, name: e.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label>Phone</label>
                <input
                  type="text"
                  value={newPatientData.phone}
                  onChange={(e) => setNewPatientData({ ...newPatientData, phone: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Address</label>
                <input
                  type="text"
                  value={newPatientData.address}
                  onChange={(e) => setNewPatientData({ ...newPatientData, address: e.target.value })}
                />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button type="button" className="button secondary" onClick={handleCloseAddPatientModal}>Close</button>
                <button type="button" className="button primary" onClick={handleCreatePatient}>Save Customer</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewSalePage;
