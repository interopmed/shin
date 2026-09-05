'use client';

import React from 'react';
import Link from 'next/link';

const AppointmentCalendarPage = () => {
  return (
    <>
      {/* Content Header */}
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Appointment Calendar</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><Link href="/">Home</Link></li>
                <li className="breadcrumb-item"><Link href="/appointment">Appointments</Link></li>
                <li className="breadcrumb-item active">Calendar</li>
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
              <h3 className="card-title">Calendar View</h3>
              <div className="card-tools">
                <Link href="/appointment/addNewView" className="btn btn-primary btn-sm">
                  <i className="fa fa-plus"></i> Add Appointment
                </Link>
              </div>
            </div>
            <div className="card-body">
              <div id="calendar" style={{ minHeight: '600px' }}>
                {/* Calendar will be rendered here using FullCalendar */}
                <p className="text-center text-muted">Calendar widget will be integrated here</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default AppointmentCalendarPage;
