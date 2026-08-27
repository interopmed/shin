'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

interface Prescription {
  id: number;
  patient_id: number;
  patient_name: string;
  doctor_id: number;
  doctor_name: string;
  date: string;
  status: string;
}

const PrescriptionListPage = () => {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrescriptions = async () => {
      if (user?.token) {
        try {
          // TODO: Fetch from API
          setPrescriptions([]);
        } catch (error) {
          console.error('Failed to fetch prescriptions:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchPrescriptions();
  }, [user]);

  return (
    <>
      {/* Content Header */}
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Prescriptions</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><Link href="/">Home</Link></li>
                <li className="breadcrumb-item active">Prescriptions</li>
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
              <h3 className="card-title">Prescription List</h3>
              <div className="card-tools">
                <Link href="/prescription/add" className="btn btn-primary btn-sm">
                  <i className="fa fa-plus"></i> Add Prescription
                </Link>
              </div>
            </div>
            <div className="card-body">
              {loading ? (
                <div className="text-center">
                  <div className="spinner-border" role="status">
                    <span className="sr-only">Loading...</span>
                  </div>
                </div>
              ) : (
                <table id="prescriptionsTable" className="table table-bordered table-striped">
                  <thead>
                    <tr>
                      <th>Prescription ID</th>
                      <th>Patient</th>
                      <th>Doctor</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prescriptions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center">No prescriptions found</td>
                      </tr>
                    ) : (
                      prescriptions.map((prescription) => (
                        <tr key={prescription.id}>
                          <td>{prescription.id}</td>
                          <td>{prescription.patient_name}</td>
                          <td>{prescription.doctor_name}</td>
                          <td>{prescription.date}</td>
                          <td>
                            <span className={`badge badge-${prescription.status === 'Active' ? 'success' : 'secondary'}`}>
                              {prescription.status}
                            </span>
                          </td>
                          <td>
                            <Link href={`/prescription/view/${prescription.id}`} className="btn btn-info btn-sm" title="View">
                              <i className="fa fa-eye"></i>
                            </Link>
                            {' '}
                            <Link href={`/prescription/edit/${prescription.id}`} className="btn btn-primary btn-sm" title="Edit">
                              <i className="fa fa-edit"></i>
                            </Link>
                            {' '}
                            <button className="btn btn-success btn-sm" title="Print">
                              <i className="fa fa-print"></i>
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
        </div>
      </section>
    </>
  );
};

export default PrescriptionListPage;
