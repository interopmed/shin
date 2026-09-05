'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { UserRole } from '@/lib/roles';
import api from '@/lib/api';

interface StatBox {
  name: string;
  color: string;
  icon: string;
  link: string;
  db: string;
  group?: UserRole[];
}

const DashboardPage = () => {
  const { user } = useAuth();
  const { hasAnyRole } = usePermissions();
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);

  const statBoxes: StatBox[] = [
    { name: 'patients', color: 'info', icon: 'wheelchair', link: '/patient', db: 'patient' },
    { name: 'doctors', color: 'success', icon: 'user-md', link: '/doctor', db: 'doctor', group: [UserRole.ADMIN, UserRole.ACCOUNTANT] },
    { name: 'appointments', color: 'warning', icon: 'calendar-check', link: '/appointment', db: 'appointment' },
    { name: 'lab_tests', color: 'danger', icon: 'flask', link: '/lab', db: 'lab', group: [UserRole.ADMIN, UserRole.LAB_TECHNICIAN, UserRole.DOCTOR] },
    { name: 'payments', color: 'primary', icon: 'dollar-sign', link: '/modules/billing/finance/payment', db: 'payment', group: [UserRole.ADMIN, UserRole.ACCOUNTANT] },
    { name: 'medicines', color: 'secondary', icon: 'pills', link: '/stocks/medicine', db: 'stocks', group: [UserRole.ADMIN, UserRole.PHARMACIST] },
  ];

  useEffect(() => {
    const fetchDashboardStats = async () => {
      if (user?.token) {
        try {
          const data = await api.getDashboardStats(user.token);
          setStats(data);
        } catch (error) {
          console.error('Failed to fetch dashboard stats:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, [user]);

  const userHasRole = (roles?: UserRole[]) => {
    if (!roles) return true;
    return hasAnyRole(roles);
  };

  return (
    <>
      {/* Content Header (Page header) */}
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Dashboard</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><Link href="/">Home</Link></li>
                <li className="breadcrumb-item active">Dashboard</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <section className="content">
        <div className="container-fluid">
          {/* Stat Boxes */}
          <div className="row">
            {statBoxes.map((box) => {
              if (!userHasRole(box.group)) return null;

              return (
                <div key={box.name} className="col-lg-3 col-6">
                  <div className={`small-box bg-${box.color}`}>
                    <div className="inner">
                      <h3>{stats[box.db] || 0}</h3>
                      <p>{box.name.replace(/_/g, ' ').toUpperCase()}</p>
                    </div>
                    <div className="icon">
                      <i className={`fa fa-${box.icon}`}></i>
                    </div>
                    <Link href={box.link} className="small-box-footer">
                      More info <i className="fas fa-arrow-circle-right"></i>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Charts and Recent Data */}
          {userHasRole([UserRole.ADMIN, UserRole.DOCTOR, UserRole.LAB_TECHNICIAN]) && (
            <div className="row">
              {/* Sales Chart */}
              <section className="col-lg-7 connectedSortable">
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">
                      <i className="fas fa-chart-pie text-primary mr-1"></i>
                      Sales
                    </h3>
                    <div className="card-tools">
                      <ul className="nav nav-pills ml-auto">
                        <li className="nav-item">
                          <a className="nav-link active" href="#fin_year" data-toggle="tab">Year</a>
                        </li>
                        <li className="nav-item">
                          <a className="nav-link" href="#fin_month" data-toggle="tab">Month</a>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="card-body">
                    <div className="tab-content">
                      <div className="active tab-pane" id="fin_year">
                        <div className="d-flex">
                          <p className="d-flex flex-column">
                            <span className="text-bold text-lg">${stats.yearlyRevenue || 0}</span>
                            <span>Sales Over Time</span>
                          </p>
                          <p className="ml-auto d-flex flex-column text-right">
                            <span className="text-success">
                              <i className="fas fa-arrow-up"></i> 33.1%
                            </span>
                            <span className="text-muted">Since last month</span>
                          </p>
                        </div>

                        <div className="position-relative mb-4">
                          <div id="chart_div" style={{ height: '300px', background: '#f4f6f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            Chart placeholder
                          </div>
                        </div>

                        <div className="d-flex flex-row justify-content-end">
                          <span className="mr-2">
                            <i className="fas fa-square text-primary"></i> Income
                          </span>
                          <span>
                            <i className="fas fa-square text-danger"></i> Expenses
                          </span>
                        </div>
                      </div>

                      <div className="tab-pane" id="fin_month">
                        <div className="d-flex">
                          <p className="d-flex flex-column">
                            <span className="text-bold text-lg">${stats.monthlyRevenue || 0}</span>
                            <span>Sales This Month</span>
                          </p>
                        </div>
                        <div className="position-relative mb-4">
                          <div id="piechart_3d" style={{ height: '300px', background: '#f4f6f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            Pie chart placeholder
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Investigations */}
                {userHasRole([UserRole.ADMIN, UserRole.LAB_TECHNICIAN, UserRole.DOCTOR]) && (
                  <div className="card">
                    <div className="card-header">
                      <h3 className="card-title">
                        <i className="fa fa-flask text-danger mr-1"></i>
                        Recent Investigations
                      </h3>
                      <div className="card-tools">
                        <button type="button" className="btn btn-tool" data-card-widget="collapse">
                          <i className="fa fa-minus"></i>
                        </button>
                      </div>
                    </div>

                    <div className="card-body">
                      <div className="table-responsive">
                        <table className="table table-striped">
                          <thead>
                            <tr>
                              <th>ID</th>
                              <th>Patient</th>
                              <th>Test</th>
                              <th>Date</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td colSpan={5} className="text-center">No recent data</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* Right Column */}
              <section className="col-lg-5 connectedSortable">
                <div className="card bg-gradient-primary">
                  <div className="card-header border-0">
                    <h3 className="card-title">
                      <i className="far fa-calendar-alt"></i>
                      Calendar
                    </h3>
                  </div>
                  <div className="card-body pt-0">
                    <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                      Calendar Widget
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">Quick Actions</h3>
                  </div>
                  <div className="card-body">
                    <Link href="/patient/add" className="btn btn-app">
                      <i className="fas fa-user-plus"></i> New Patient
                    </Link>
                    <Link href="/appointment/add" className="btn btn-app">
                      <i className="fas fa-calendar-plus"></i> New Appointment
                    </Link>
                    <Link href="/lab/orders/add" className="btn btn-app">
                      <i className="fas fa-flask"></i> New Lab Test
                    </Link>
                    <Link href="/modules/billing/finance/payment/add" className="btn btn-app">
                      <i className="fas fa-dollar-sign"></i> Add Payment
                    </Link>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default DashboardPage;
