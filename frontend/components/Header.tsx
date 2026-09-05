'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface HeaderProps {
  toggleSidebar?: () => void;
}

const Header = ({ toggleSidebar }: HeaderProps) => {
  const { user, logout } = useAuth();
  const [testCount, setTestCount] = useState(0);
  const [paymentNumber, setPaymentNumber] = useState(0);
  const [patientNumber, setPatientNumber] = useState(0);
  const [medicineNumber, setMedicineNumber] = useState(0);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (user?.token) {
        try {
          const today = new Date().toISOString().split('T')[0];
          const [payments, patients, medicines] = await Promise.all([
            api.getPaymentCount(user.token, today),
            api.getPatientCount(user.token, today),
            api.getMedicineCount(user.token, today),
          ]) as any[];
          setTestCount((payments as any).count || 0);
          setPaymentNumber((payments as any).count || 0);
          setPatientNumber((patients as any).count || 0);
          setMedicineNumber((medicines as any).count || 0);
        } catch (error) {
          console.error('Failed to fetch notifications:', error);
        }
      }
    };

    fetchNotifications();
  }, [user]);

  const userHasRole = (roles: string[]) => {
    return user && roles.includes(user.role);
  };

  return (
    <nav className="main-header navbar navbar-expand navbar-white navbar-light">
      {/* Left navbar links */}
      <ul className="navbar-nav navbar-left">
        <li className="nav-item">
          <a className="nav-link" data-widget="pushmenu" href="#" role="button" onClick={(e) => { e.preventDefault(); toggleSidebar?.(); }}>
            <i className="fas fa-bars"></i>
          </a>
        </li>

        {/* Payment notification for Admin, Laboratorist */}
        {userHasRole(['Admin', 'Laboratorist']) && (
          <li id="header_inbox_bar" className="nav-item dropdown">
            <a data-toggle="dropdown" className="nav-link" href="#">
              <i className="fa fa-file-invoice-dollar"></i>
              <span className="badge badge-primary navbar-badge">{testCount}</span>
            </a>
            <ul className="dropdown-menu">
              <p className="dropdown-item text-primary text-sm">
                {testCount} {testCount < 2 ? 'payment' : 'payments'} today
              </p>
              <div className="dropdown-divider"></div>
              <Link className="dropdown-item" href="/billing/finance/payment">See all payments</Link>
            </ul>
          </li>
        )}

        {/* Payment notification for Admin, Accountant */}
        {userHasRole(['Admin', 'Accountant']) && (
          <li id="header_inbox_bar_2" className="nav-item dropdown">
            <a data-toggle="dropdown" className="nav-link" href="#">
              <i className="fa fa-flask"></i>
              <span className="badge badge-success navbar-badge">{paymentNumber}</span>
            </a>
            <ul className="dropdown-menu extended inbox">
              <div className="notify-arrow notify-arrow-red"></div>
              <li>
                <p className="red">{paymentNumber} {paymentNumber <= 1 ? 'payment today' : 'payments today'}</p>
              </li>
              <li>
                <Link href="/billing/finance/payment"><p className="green">See all payments</p></Link>
              </li>
            </ul>
          </li>
        )}

        {/* Patient notification */}
        {userHasRole(['Admin', 'Accountant', 'Doctor', 'Nurse', 'Laboratorist']) && (
          <li id="header_notification_bar" className="nav-item dropdown">
            <a data-toggle="dropdown" className="nav-link" href="#">
              <i className="fa fa-wheelchair"></i>
              <span className="badge badge-warning navbar-badge">{patientNumber}</span>
            </a>
            <ul className="dropdown-menu">
              <p className="dropdown-item text-primary text-sm">
                {patientNumber} {patientNumber < 2 ? 'patient' : 'patients'} registered today
              </p>
              <div className="dropdown-divider"></div>
              <Link className="dropdown-item" href="/patient">See all patients</Link>
            </ul>
          </li>
        )}

        {/* Medicine notification */}
        {userHasRole(['Admin', 'Pharmacist', 'Doctor']) && (
          <li id="header_notification_bar_medicine" className="nav-item dropdown">
            <a data-toggle="dropdown" className="nav-link" href="#">
              <i className="fas fa-medkit"></i>
              <span className="badge badge-danger navbar-badge">{medicineNumber}</span>
            </a>
            <ul className="dropdown-menu extended notification">
              <div className="notify-arrow notify-arrow-yellow"></div>
              <li>
                <p className="yellow">
                  {medicineNumber} {medicineNumber <= 1 ? 'medicine registered today' : 'medicines registered today'}
                </p>
              </li>
              <li>
                <Link href="/medicine"><p className="green">See all medicines</p></Link>
              </li>
            </ul>
          </li>
        )}
      </ul>

      {/* Right navbar links */}
      <ul className="navbar-nav ml-auto">
        {/* Navbar Search */}
        <li className="nav-item">
          <a className="nav-link" data-widget="navbar-search" href="#" role="button">
            <i className="fas fa-search"></i>
          </a>
          <div className="navbar-search-block">
            <form className="form-inline">
              <div className="input-group input-group-sm">
                <input
                  className="form-control form-control-navbar"
                  type="search"
                  placeholder="Search"
                  aria-label="Search"
                />
                <div className="input-group-append">
                  <button className="btn btn-navbar" type="submit">
                    <i className="fas fa-search"></i>
                  </button>
                  <button className="btn btn-navbar" type="button" data-widget="navbar-search">
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </li>

        <li className="nav-item">
          <a className="nav-link" data-widget="fullscreen" role="button">
            <i className="fas fa-expand-arrows-alt"></i>
          </a>
        </li>

        <li className="nav-item">
          <a className="nav-link" data-widget="control-sidebar" data-controlsidebar-slide="true" href="#" role="button">
            <i className="fas fa-th-large"></i>
          </a>
        </li>

        {/* User login dropdown */}
        <li className="nav-item dropdown">
          <a className="nav-link" data-toggle="dropdown" href="#">
            <i className="far fa-user"></i>
          </a>

          <div className="dropdown-menu dropdown-menu-right">
            <Link href="/profile" className="dropdown-item">
              <i className="fas fa-id-card-alt text-success mr-2"></i>Profile
            </Link>
            <div className="dropdown-divider"></div>
            <Link href="/settings" className="dropdown-item">
              <i className="fas fa-cogs text-info mr-2"></i> Settings
            </Link>
            <div className="dropdown-divider"></div>
            <a href="#" onClick={(e) => { e.preventDefault(); logout(); }} className="dropdown-item">
              <i className="fas fa-sign-out-alt text-danger mr-2"></i>Log Out
            </a>
          </div>
        </li>
      </ul>
    </nav>
  );
};

export default Header;
