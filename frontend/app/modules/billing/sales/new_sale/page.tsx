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
    <>
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">New Sale</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item">
                  <Link href="/">Home</Link>
                </li>
                <li className="breadcrumb-item">
                  <Link href="/sales">Sales</Link>
                </li>
                <li className="breadcrumb-item active">New Sale</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          <form onSubmit={handleSubmit}>
            <div className="row">
              <div className="col-md-9">
                <div className="card mb-4">
                  <div className="card-header">
                    <h2 className="m-0 font-weight-bold text-primary">Cart</h2>
                  </div>
                  <div className="card-body">
                    {error && <div className="alert alert-danger">{error}</div>}
                    {success && <div className="alert alert-success">{success}</div>}

                    <div className="row">
                      <div className="col-md-4">
                        <div className="form-group">
                          <label htmlFor="mode">Register Mode:</label>
                          <select
                            id="mode"
                            className="form-control"
                            value={mode}
                            onChange={(event) => setMode(event.target.value)}
                          >
                            <option value="sale">Sale</option>
                            <option value="return">Return</option>
                          </select>
                        </div>
                      </div>

                      <div className="col-md-8">
                        <div className="form-group">
                          <label htmlFor="item">Search or Scan Item:</label>
                          <div className="input-group mb-2">
                            <input
                              id="item"
                              className="form-control"
                              value={itemSearchTerm}
                              onChange={(event) => setItemSearchTerm(event.target.value)}
                            />
                            <div className="input-group-append">
                              <Link className="btn btn-outline-secondary add_new_item" href="/stocks">
                                <i className="fa fa-plus"></i>
                              </Link>
                            </div>
                          </div>

                        {itemSearchTerm && (
                            <div className="list-group" style={{ maxHeight: 220, overflowY: 'auto' }}>
                              {filteredStocks.length === 0 ? (
                                <div className="list-group-item">No items found.</div>
                              ) : (
                                filteredStocks.map((stock) => (
                                  <button
                                    key={stock.id}
                                    type="button"
                                    className="list-group-item list-group-item-action d-flex justify-content-between"
                                    onClick={() => handleAddItem(stock.id)}
                                  >
                                    <span>{stock.name}</span>
                                    <span>{stock.quantity} in stock</span>
                                  </button>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <table className="table">
                      <thead>
                        <tr>
                          <th scope="col" style={{ width: '5%' }}>Delete</th>
                          <th scope="col" style={{ width: '40%' }}>Name</th>
                          <th scope="col" style={{ width: '15%' }}>Price</th>
                          <th scope="col" style={{ width: '10%' }}>Quantity</th>
                          <th scope="col" style={{ width: '10%' }}>Discount</th>
                          <th scope="col" style={{ width: '15%' }}>Total</th>
                          <th scope="col" style={{ width: '5%' }}>Edit</th>
                        </tr>
                      </thead>
                      <tbody id="cart_contents">
                        {formData.items.length === 0 ? (
                          <tr>
                            <td className="px-0" colSpan={7}>
                              <div className="border border-primary rounded p-3 text-center" role="alert">
                                No items in cart.
                              </div>
                            </td>
                          </tr>
                        ) : (
                          formData.items.map((item, index) => {
                            // Find details in cartDetails first, then search results
                            const stock = cartDetails[item.stock_item] || searchResults.find((s) => s.id === item.stock_item);

                            return (
                              <tr key={`${item.stock_item}-${index}`}>
                                <td>
                                  <button
                                    type="button"
                                    className="btn btn-link text-danger p-0"
                                    title="Delete"
                                    onClick={() => handleRemoveItem(index)}
                                  >
                                    <i className="fas fa-trash-alt"></i>
                                  </button>
                                </td>
                                <td>{stock?.name || 'Unknown Item'}</td>
                                <td>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className="form-control"
                                    value={item.unit_price}
                                    onChange={(event) => handleUpdateItem(index, 'unit_price', Number(event.target.value))}
                                  />
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    min="1"
                                    className="form-control text-center"
                                    value={item.quantity}
                                    onChange={(event) => handleUpdateItem(index, 'quantity', Number(event.target.value))}
                                  />
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    className="form-control text-center"
                                    value={item.discount}
                                    onChange={(event) => handleUpdateItem(index, 'discount', Number(event.target.value))}
                                  />
                                </td>
                                <td>{item.sub_total.toFixed(2)}</td>
                                <td>
                                  <button type="button" className="btn btn-success btn-xs" title="Updated">
                                    <i className="fas fa-spell-check"></i>
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="col-md-3">
                <div className="card mb-4">
                  <div className="card-header">
                    <div className="d-flex justify-content-between">
                      <div className="d-flex align-items-center">
                        <h2 className="m-0 font-weight-bold text-primary">Bill</h2>
                      </div>
                      <div className="ml-4">
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          id="cancel_sale_button"
                          title="Cancel"
                          onClick={cancelSale}
                        >
                          <i className="fas fa-trash-alt"></i>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="card-body">
                    <div className="form-group">
                      <label htmlFor="customer">Select Customer</label>
                      <div className="input-group mb-2">
                        <input
                          id="customer"
                          className="form-control"
                          placeholder="Type customer name"
                          value={patientSearchTerm}
                          onChange={(event) => setPatientSearchTerm(event.target.value)}
                        />
                        <div className="input-group-append">
                            <button className="btn btn-outline-secondary" type="button" onClick={() => setShowAddPatientModal(true)} title="Add New Customer">
                              <i className="fas fa-user-plus"></i>
                            </button>
                        </div>
                      </div>
                      
                      {patientSearchTerm && (
                        <div className="list-group mb-2" style={{ maxHeight: 200, overflowY: 'auto', position: 'absolute', zIndex: 1000, width: '90%' }}>
                          {filteredPatients.length === 0 ? (
                            <div className="list-group-item">No customers found.</div>
                          ) : (
                            filteredPatients.map((patient) => (
                              <button
                                key={patient.id}
                                type="button"
                                className="list-group-item list-group-item-action"
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
                      )}

                        {selectedPatient && (
                        <div className="card border-primary mb-3 shadow-sm position-relative">
                          <div className="card-body p-3 d-flex align-items-center">
                            <div className="d-flex align-items-center">
                              <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center mr-3" style={{ width: 40, height: 40 }}>
                                <i className="fas fa-user"></i>
                              </div>
                              <div>
                                <h6 className="mb-0 font-weight-bold text-primary">{selectedPatient.name}</h6>
                                <small className="text-muted">Customer ID: {selectedPatient.id}</small>
                              </div>
                            </div>
                            <button 
                              type="button" 
                              className="btn btn-outline-danger btn-xs rounded-circle d-flex align-items-center justify-content-center"
                              style={{ width: 24, height: 24, padding: 0, position: 'absolute', top: '50%', right: '10px', transform: 'translateY(-50%)' }}
                              onClick={() => {
                                setSelectedPatient(null);
                                setFormData((prev) => ({ ...prev, patient: '' }));
                              }}
                              title="Remove Customer"
                            >
                              <i className="fas fa-times" style={{ fontSize: '10px' }}></i>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <ul className="list-group list-group-flush">
                      <li className="d-flex justify-content-between px-4 list-group-item">
                        <div className="d-flex align-items-center">
                          <i className="fas fa-plus"></i>
                          <div className="ml-4">
                            <div>Sub Total</div>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div>{subtotal.toFixed(2)}</div>
                        </div>
                      </li>

                      {taxes.map((tax) => (
                        <li key={tax.name} className="d-flex justify-content-between px-4 list-group-item">
                          <div className="d-flex align-items-center">
                            <i className="fas fa-plus"></i>
                            <div className="ml-4">
                              <div>{tax.name}</div>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div>{tax.value.toFixed(2)}</div>
                          </div>
                        </li>
                      ))}

                      <li className="d-flex justify-content-between px-4 list-group-item">
                        <div className="d-flex align-items-center">
                          <i className="fas fa-plus"></i>
                          <div className="ml-4">
                            <div>Total</div>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div>{total.toFixed(2)}</div>
                        </div>
                      </li>
                    </ul>

                    {formData.items.length > 0 && (
                      <div className="col-12 mt-3 px-0">
                        <div className="form-group">
                          <label htmlFor="comment">Comments</label>
                          <textarea
                            id="comment"
                            rows={3}
                            className="form-control"
                            value={formData.remarks}
                            onChange={(event) =>
                              setFormData((prev) => ({
                                ...prev,
                                remarks: event.target.value,
                              }))
                            }
                          ></textarea>
                        </div>

                        <div className="form-group row">
                          <label htmlFor="payment_type" className="col-sm-6 col-form-label">
                            Payment
                          </label>
                          <div className="col-sm-6">
                            <select
                              id="payment_type"
                              className="form-control"
                              value={formData.payment_type}
                              onChange={(event) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  payment_type: event.target.value,
                                }))
                              }
                            >
                              <option value="cash">Cash</option>
                              <option value="card">Card</option>
                              <option value="bank">Bank</option>
                            </select>
                          </div>
                        </div>

                        <div className="form-group row">
                          <label htmlFor="tendered_amount" className="col-sm-6 col-form-label">
                            Tendered Amount
                          </label>
                          <div className="col-sm-6">
                            <input
                              id="tendered_amount"
                              className="form-control"
                              value={formData.tendered_amount}
                              onChange={(event) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  tendered_amount: event.target.value,
                                }))
                              }
                            />
                          </div>
                        </div>

                        <button type="submit" className="btn btn-primary float-right" id="finish_sale_button" disabled={loading}>
                          {loading ? 'Submitting...' : 'Proceed'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </section>

      {/* Add New Patient Modal */}
      {showAddPatientModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} role="dialog">
          <div className="modal-dialog" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Add New Customer</h5>
                <button type="button" className="close" onClick={handleCloseAddPatientModal}>
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Name <span className="text-danger">*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    value={newPatientData.name}
                    onChange={(e) => setNewPatientData({ ...newPatientData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newPatientData.phone}
                    onChange={(e) => setNewPatientData({ ...newPatientData, phone: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Address</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newPatientData.address}
                    onChange={(e) => setNewPatientData({ ...newPatientData, address: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseAddPatientModal}>Close</button>
                <button type="button" className="btn btn-primary" onClick={handleCreatePatient}>Save Customer</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default NewSalePage;
