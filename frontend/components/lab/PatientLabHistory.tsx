'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

interface LabTest {
  id: number; // lab_order_id
  test_date?: string;
  status?: string;
  processing_status?: number;
  processing_status_label?: string;
  priority?: 'Routine' | 'Urgent' | 'STAT';
  specimen_status?: string;
  tests?: Array<{ name: string; lab_id: number }>;
}

export default function PatientLabHistory({ patientId }: { patientId: string }) {
  const { user } = useAuth();
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPatientLabs = async () => {
      if (user?.token && patientId) {
        setLoading(true);
        try {
          // Fetch lab tests specifically for this patient
          const data = await api.getLabTests(user.token, {
            search: patientId, // Simple workaround if exact patient_id filter isn't supported
            patient_id: patientId
          }) as any;
          
          if (Array.isArray(data)) {
            setLabTests(data);
          } else {
            setLabTests(data?.results || []);
          }
        } catch (error) {
          console.error('Failed to fetch patient lab history:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchPatientLabs();
  }, [user, patientId]);

  const formatDateTime = (value?: string) => {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString();
  };

  const getProcessingStatusClass = (status: number) => {
    if (status === 2) return 'badge-success';
    if (status === 1) return 'badge-warning';
    if (status === 3) return 'badge-danger';
    return 'badge-secondary';
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="m-0">Lab Orders & Results</h4>
        <Link href={`/lab/orders/add?patientId=${patientId}`} className="btn btn-primary btn-sm">
          <i className="fa fa-plus-circle mr-1"></i> New Lab Order
        </Link>
      </div>

      {loading ? (
        <div className="text-center p-4">
          <div className="spinner-border text-primary" role="status">
            <span className="sr-only">Loading...</span>
          </div>
        </div>
      ) : labTests.length === 0 ? (
        <div className="alert alert-info text-center">
          No lab tests found for this patient.
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-bordered table-striped">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Date</th>
                <th>Tests Requested</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {labTests.map((test) => (
                <tr key={test.id}>
                  <td>
                    <strong>LCDB.{String(test.id).padStart(7, '0')}</strong>
                    {test.priority === 'STAT' && (
                      <span className="badge badge-danger ml-2"><i className="fa fa-exclamation-triangle mr-1"></i>STAT</span>
                    )}
                  </td>
                  <td>{formatDateTime(test.test_date)}</td>
                  <td>
                    {test.tests?.map((item, idx) => (
                      <span key={idx} className="badge badge-info mr-1 mb-1">
                        {item.name}
                      </span>
                    )) || 'No tests specified'}
                  </td>
                  <td>
                    <span className={`badge ${getProcessingStatusClass(test.processing_status ?? 0)}`}>
                      {test.processing_status_label || 'Not processing'}
                    </span>
                    {test.specimen_status && (
                      <span className="badge badge-secondary ml-1">{test.specimen_status}</span>
                    )}
                  </td>
                  <td>
                    <Link href={`/lab/order/${test.id}`} className="btn btn-sm btn-outline-primary" title="View Details">
                      <i className="fa fa-eye"></i> View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
