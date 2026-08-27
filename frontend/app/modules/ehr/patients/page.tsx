'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

interface Patient {
  id: number;
  patient_id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  sex: string;
  birthdate: string;
  bloodgroup: string;
  img_url: string;
  doctor_id: number;
}

const PatientListPage = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    const fetchPatients = async () => {
      if (user?.token) {
        try {
          const data = await api.getPatients(user.token) as Patient[];
          setPatients(data);
        } catch (error: any) {
          console.error('Failed to fetch patients:', error);
          if (error.message?.includes('401') || error.message?.includes('token')) {
            router.push('/login');
          }
        } finally {
          setLoading(false);
        }
      } else if (!authLoading) {
        setLoading(false);
      }
    };

    fetchPatients();
  }, [user, isAuthenticated, authLoading, router]);

  return (
    <>
      {/* Content Header */}
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Patients</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><Link href="/">Home</Link></li>
                <li className="breadcrumb-item active">Patients</li>
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
              <h3 className="card-title">Patient List</h3>
              <div className="card-tools">
                <Link href="/patient/add" className="btn btn-primary btn-sm">
                  <i className="fa fa-plus"></i> Add New Patient
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
                <table id="patientsTable" className="table table-bordered table-striped">
                  <thead>
                    <tr>
                      <th>Patient ID</th>
                      <th>Name</th>
                      <th>Phone</th>
                      <th>Email</th>
                      <th>Sex</th>
                      <th>Blood Group</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patients.map((patient) => (
                      <tr key={patient.id}>
                        <td>{patient.patient_id}</td>
                        <td>
                          <Link href={`/patient/profile/${patient.id}`}>
                            {patient.name}
                          </Link>
                        </td>
                        <td>{patient.phone}</td>
                        <td>{patient.email}</td>
                        <td>{patient.sex}</td>
                        <td>{patient.bloodgroup}</td>
                        <td>
                          <Link href={`/patient/profile/${patient.id}`} className="btn btn-info btn-sm" title="View">
                            <i className="fa fa-eye"></i>
                          </Link>
                          {' '}
                          <Link href={`/patient/edit/${patient.id}`} className="btn btn-primary btn-sm" title="Edit">
                            <i className="fa fa-edit"></i>
                          </Link>
                        </td>
                      </tr>
                    ))}
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

export default PatientListPage;
