'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

type TreatmentReportItem = {
  id: number;
  patient_name?: string;
  doctor_name?: string;
  date: string;
  duration?: number;
  status?: string;
  problem?: string | null;
  remarks?: string | null;
};

const TreatmentReportPage = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<TreatmentReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
      if (!user?.token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await api.getAppointments(user.token, { status: 'treated' });
        setReports(Array.isArray(data) ? data : []);
      } catch (err: any) {
        setError(err?.message || 'Failed to fetch treatment reports');
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [user?.token]);

  return (
    <>
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Treatment Report</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><Link href="/">Home</Link></li>
                <li className="breadcrumb-item"><Link href="/appointment">Appointment</Link></li>
                <li className="breadcrumb-item active">Treatment Report</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Treated Appointments</h3>
            </div>
            <div className="card-body">
              {error && <div className="alert alert-danger">{error}</div>}

              {loading ? (
                <div className="text-center">Loading treatment reports...</div>
              ) : (
                <table className="table table-bordered table-striped">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Patient</th>
                      <th>Doctor</th>
                      <th>Duration</th>
                      <th>Problem</th>
                      <th>Remarks</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center">No treatment reports found</td>
                      </tr>
                    ) : (
                      reports.map((item) => (
                        <tr key={item.id}>
                          <td>{new Date(item.date).toLocaleString()}</td>
                          <td>{item.patient_name || 'N/A'}</td>
                          <td>{item.doctor_name || 'N/A'}</td>
                          <td>{item.duration ? `${item.duration} min` : '-'}</td>
                          <td>{item.problem || '-'}</td>
                          <td>{item.remarks || '-'}</td>
                          <td>
                            <span className="badge badge-success">{item.status || 'treated'}</span>
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

export default TreatmentReportPage;
