'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';

interface ChargeItem {
  id: number;
  appointment: number;
  performer: number | null;
  patient: number;
  code: string;
  description: string;
  amount: string;
  status: string;
  entered_at: string;
}

interface ChargeCapturePanelProps {
  token: string;
  appointmentId: string | number;
  patientId: string | number;
  doctorId: string | number;
}

export const ChargeCapturePanel: React.FC<ChargeCapturePanelProps> = ({
  token,
  appointmentId,
  patientId,
  doctorId,
}) => {
  const [charges, setCharges] = useState<ChargeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  
  const [newCharge, setNewCharge] = useState({
    code: '',
    description: '',
    amount: '',
  });

  const fetchCharges = async () => {
    try {
      setLoading(true);
      const data = await api.getChargeItems(token, { appointment: String(appointmentId) });
      setCharges(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch charges:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && appointmentId) {
      fetchCharges();
    }
  }, [token, appointmentId]);

  const handleAddCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCharge.description || !newCharge.amount) return;
    
    setAdding(true);
    try {
      await api.createChargeItem(token, {
        appointment: appointmentId,
        patient: patientId,
        performer: doctorId || null,
        code: newCharge.code,
        description: newCharge.description,
        amount: newCharge.amount,
        status: 'billable',
      });
      setNewCharge({ code: '', description: '', amount: '' });
      await fetchCharges();
    } catch (error) {
      console.error('Failed to add charge:', error);
      alert('Failed to add charge item.');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="card mt-4 border-info">
      <div className="card-header bg-info text-white">
        <h3 className="card-title"><i className="fas fa-file-invoice-dollar mr-2"></i> Point-of-Care Charges</h3>
      </div>
      <div className="card-body">
        {loading ? (
          <div className="text-center"><i className="fas fa-spinner fa-spin"></i></div>
        ) : (
          <>
            {charges.length > 0 ? (
              <table className="table table-sm table-bordered">
                <thead className="bg-light">
                  <tr>
                    <th>Description</th>
                    <th>Code</th>
                    <th>Amount (Rs.)</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {charges.map((charge) => (
                    <tr key={charge.id}>
                      <td>{charge.description}</td>
                      <td>{charge.code || '-'}</td>
                      <td>{charge.amount}</td>
                      <td>
                        <span className={`badge ${charge.status === 'billable' ? 'badge-warning' : 'badge-success'}`}>
                          {charge.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-muted">No additional charges recorded for this encounter.</p>
            )}

            <hr />
            
            <form onSubmit={handleAddCharge} className="bg-light p-3 rounded">
              <h5>Add New Procedure / Fee</h5>
              <div className="row">
                <div className="col-md-5 mb-2">
                  <input 
                    type="text" 
                    className="form-control form-control-sm" 
                    placeholder="Description (e.g. Joint Aspiration)" 
                    value={newCharge.description}
                    onChange={(e) => setNewCharge({...newCharge, description: e.target.value})}
                    required
                  />
                </div>
                <div className="col-md-3 mb-2">
                  <input 
                    type="text" 
                    className="form-control form-control-sm" 
                    placeholder="Code (Optional)" 
                    value={newCharge.code}
                    onChange={(e) => setNewCharge({...newCharge, code: e.target.value})}
                  />
                </div>
                <div className="col-md-3 mb-2">
                  <input 
                    type="number" 
                    step="0.01"
                    className="form-control form-control-sm" 
                    placeholder="Amount" 
                    value={newCharge.amount}
                    onChange={(e) => setNewCharge({...newCharge, amount: e.target.value})}
                    required
                  />
                </div>
                <div className="col-md-1 mb-2">
                  <button type="submit" className="btn btn-primary btn-sm w-100" disabled={adding}>
                    {adding ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-plus"></i>}
                  </button>
                </div>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
