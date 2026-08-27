'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

interface PatientCase {
  id: number;
  patient_id?: string;
  name: string;
  phone?: string;
  email?: string;
  sex?: string;
  bloodgroup?: string;
  doctor_name?: string;
}

const PatientCaseListPage = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [cases, setCases] = useState<PatientCase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    const fetchCases = async () => {
      if (user?.token) {
        try {
          const data = await api.getPatients(user.token) as PatientCase[];
          setCases(Array.isArray(data) ? data : []);
        } catch (error: any) {
          console.error('Failed to fetch case list:', error);
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

    fetchCases();
  }, [user, isAuthenticated, authLoading, router]);

  return (
    <>
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Case List</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><Link href="/">Home</Link></li>
                <li className="breadcrumb-item"><Link href="/patient">Patient</Link></li>
                <li className="breadcrumb-item active">Case List</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Patient Cases</h3>
            </div>
            <div className="card-body">
              {loading ? (
                <div className="text-center">
                  <div className="spinner-border" role="status">
                    <span className="sr-only">Loading...</span>
                  </div>
                </div>
              ) : (
                <table className="table table-bordered table-striped">
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
                    {cases.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center">No cases found</td>
                      </tr>
                    ) : (
                      cases.map((item) => (
                        <tr key={item.id}>
                          <td>{item.patient_id || '-'}</td>
                          <td>{item.name}</td>
                          <td>{item.phone || '-'}</td>
                          <td>{item.email || '-'}</td>
                          <td>{item.sex || '-'}</td>
                          <td>{item.bloodgroup || '-'}</td>
                          <td>
                            <Link href={`/patient/profile/${item.id}`} className="btn btn-info btn-sm" title="View Case">
                              <i className="fa fa-eye"></i>
                            </Link>
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

export default PatientCaseListPage;
