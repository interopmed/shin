'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

interface Appointment {
  id: number;
  patient: number;
  patient_name: string;
  doctor: number;
  doctor_name: string;
  date: string;
  slot_time?: string;
  status: string;
  remarks?: string;
}

const formatDate = (dateTime: string) => {
  const date = new Date(dateTime);
  if (Number.isNaN(date.getTime())) {
    return dateTime;
  }
  return date.toLocaleDateString();
};

const formatTime = (dateTime: string, slotTime?: string) => {
  if (slotTime) {
    return slotTime.slice(0, 5);
  }

  const date = new Date(dateTime);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const statusBadge = (status: string) => {
  switch (status) {
    case 'confirmed':
      return 'success';
    case 'pending_confirmation':
    case 'pending':
      return 'warning';
    case 'treated':
      return 'info';
    case 'cancelled':
      return 'danger';
    default:
      return 'secondary';
  }
};

const UpcomingAppointmentsPage = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUpcomingAppointments = async () => {
      if (user?.token) {
        try {
          const data = await api.getUpcomingAppointments(user.token);
          setAppointments(Array.isArray(data) ? (data as Appointment[]) : []);
        } catch (error) {
          console.error('Failed to fetch upcoming appointments:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchUpcomingAppointments();
  }, [user]);

  return (
    <>
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Upcoming Appointments</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><Link href="/">Home</Link></li>
                <li className="breadcrumb-item"><Link href="/appointment">Appointments</Link></li>
                <li className="breadcrumb-item active">Upcoming</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Upcoming Appointment List</h3>
              <div className="card-tools">
                <Link href="/appointment/addNewView" className="btn btn-primary btn-sm">
                  <i className="fa fa-plus"></i> Add New Appointment
                </Link>
                <Link href="/appointment/calendar" className="btn btn-info btn-sm ml-2">
                  <i className="fa fa-calendar"></i> Calendar View
                </Link>
              </div>
            </div>
            <div className="card-body">
              <ul className="nav nav-tabs mb-3">
                <li className="nav-item">
                  <Link href="/appointment" className="nav-link">All Appointments</Link>
                </li>
                <li className="nav-item">
                  <Link href="/appointment/todays" className="nav-link">Today's</Link>
                </li>
                <li className="nav-item">
                  <Link href="/appointment/upcoming" className="nav-link active">Upcoming</Link>
                </li>
              </ul>

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
                      <th>Date</th>
                      <th>Time</th>
                      <th>Patient</th>
                      <th>Doctor</th>
                      <th>Status</th>
                      <th>Remarks</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center">No upcoming appointments found</td>
                      </tr>
                    ) : (
                      appointments.map((appointment) => (
                        <tr key={appointment.id}>
                          <td>{formatDate(appointment.date)}</td>
                          <td>{formatTime(appointment.date, appointment.slot_time)}</td>
                          <td>{appointment.patient_name}</td>
                          <td>{appointment.doctor_name}</td>
                          <td>
                            <span className={`badge badge-${statusBadge(appointment.status)}`}>
                              {appointment.status}
                            </span>
                          </td>
                          <td>{appointment.remarks || '-'}</td>
                          <td>
                            <Link href={`/appointment/edit/${appointment.id}`} className="btn btn-primary btn-sm" title="Edit">
                              <i className="fa fa-edit"></i>
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

export default UpcomingAppointmentsPage;
