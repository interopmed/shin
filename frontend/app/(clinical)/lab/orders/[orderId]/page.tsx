'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

interface LabOrderCategory {
  lab_id: number;
  category_id: number | string;
  category_name: string;
  status: string;
  test_date?: string;
}

interface LabOrderCategoriesResponse {
  lab_order_id: number | string;
  patient_id?: number | string | null;
  patient_name?: string;
  patient_age?: string;
  doctor_name?: string;
  billing_number?: string;
  clinical_history?: string;
  collected_time_string?: string | null;
  received_time_string?: string | null;
  tests: LabOrderCategory[];
}

const LabOrderCategoriesPage = () => {
  const params = useParams();
  const orderId = params?.orderId as string;
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState<LabOrderCategoriesResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      if (user?.token && orderId) {
        try {
          const response = await api.getLabOrderCategories(user.token, orderId as string);
          setData(response as LabOrderCategoriesResponse);
        } catch (error) {
          console.error('Failed to fetch lab order categories:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [user, orderId]);

  const formatDateTime = (value?: string | null) => {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    const pad = (num: number) => String(num).padStart(2, '0');
    return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())} ${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
  };

  return (
    <div className="lab-order-page">
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Lab Order Tests</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><Link href="/dashboard">Home</Link></li>
                <li className="breadcrumb-item"><Link href="/lab">Laboratory</Link></li>
                <li className="breadcrumb-item active">Order</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          <div className="card shadow-sm">
            <div className="card-header">
              <h3 className="card-title">
                Order #{data?.lab_order_id || orderId}
                {data?.patient_name ? ` - ${data.patient_name}` : ''}
              </h3>
            </div>

            <div className="card-body">
              {loading ? (
                <div className="text-center">
                  <div className="spinner-border" role="status">
                    <span className="sr-only">Loading...</span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="info-section col-md-12">
                    <div className="row">
                      <div className="col-md-6 details">
                        <label className="control-label">Patient </label>
                        <span className="detail-value">
                          {` : ${data?.patient_name || 'NA'}`}
                        </span>
                      </div>
                      <div className="col-md-6 details">
                        <label className="control-label">Age </label>
                        <span className="detail-value">
                          {` : ${data?.patient_age || 'NA'}`}
                        </span>
                      </div>
                      <div className="col-md-6 details">
                        <label className="control-label">Referred By </label>
                        <span className="detail-value">
                          {` : ${data?.doctor_name || 'NA'}`}
                        </span>
                      </div>
                      <div className="col-md-6 details">
                        <label className="control-label">Billing Number </label>
                        <span className="detail-value">
                          {` : ${data?.billing_number || 'NA'}`}
                        </span>
                      </div>
                      <div className="col-md-6 details">
                        <label className="control-label">Clinical History </label>
                        <span className="detail-value">
                          {` : ${data?.clinical_history || ''}`}
                        </span>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-6 details">
                        <label htmlFor="collected_time">Collected Time</label>
                        <input
                          type="text"
                          className="form-control pay_in datetimepicker"
                          name="collected_time"
                          id="collected_time"
                          value={formatDateTime(data?.collected_time_string) || ''}
                          readOnly
                        />
                      </div>
                      <div className="col-md-6 details">
                        <label htmlFor="received_time">Received Time</label>
                        <input
                          type="text"
                          className="form-control pay_in datetimepicker"
                          name="received_time"
                          id="received_time"
                          value={formatDateTime(data?.received_time_string) || ''}
                          readOnly
                        />
                      </div>
                    </div>
                  </div>

                  <table className="table table-hover table-striped">
                    <thead>
                      <tr>
                        <th>Test</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.tests?.length ? (
                        data.tests.map((test) => (
                          <tr key={test.lab_id}>
                            <td>{test.category_name || test.category_id}</td>
                            <td>
                              <span className={`badge badge-${test.status === 'Completed' ? 'success' : test.status === 'Pending' ? 'warning' : 'info'}`}>
                                {test.status}
                              </span>
                            </td>
                            <td>{test.test_date || ''}</td>
                            <td>
                              <Link
                                href={`/modules/lab/enter/${orderId}/${test.category_id}`}
                                className="btn btn-primary btn-sm"
                                title="Enter Report"
                              >
                                <i className="fa fa-edit"></i>
                              </Link>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="text-center">No tests found</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </>
              )}
            </div>

            <div className="card-footer">
              <button onClick={() => router.push('/lab')} className="btn btn-secondary">
                Back to Lab
              </button>
            </div>
          </div>
        </div>
      </section>
      <style jsx global>{`
        .lab-order-page .info-section {
          background: #f8f9fb;
          border: 1px solid #e6e9ef;
          border-radius: 6px;
          padding: 12px 16px;
          margin-bottom: 16px;
        }
        .lab-order-page .details {
          margin-bottom: 10px;
          color: #344054;
        }
        .lab-order-page .detail-value {
          text-transform: uppercase;
          font-weight: 600;
          color: #101828;
        }
        .lab-order-page .card-title {
          font-weight: 700;
        }
        .lab-order-page .table {
          margin-bottom: 0;
        }
        .lab-order-page .table thead th {
          background: #f2f4f7;
          border-bottom: 1px solid #e6e9ef;
          color: #475467;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
};

export default LabOrderCategoriesPage;
