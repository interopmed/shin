'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
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
  note: string;
  ion_user_id: number;
}

const PatientProfilePage = () => {
  const { user } = useAuth();
  const params = useParams();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    test_count: 0,
    document_count: 0,
    appointment_count: 0,
  });

  useEffect(() => {
    const fetchPatientData = async () => {
      if (user?.token && params.id) {
        try {
          const data = await api.getPatient(user.token, String(params.id)) as Patient;
          setPatient(data);
          // TODO: Fetch stats from API
          setStats({
            test_count: 0,
            document_count: 0,
            appointment_count: 0,
          });
        } catch (error) {
          console.error('Failed to fetch patient:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchPatientData();
  }, [user, params.id]);

  const calculateAge = (birthdate: string) => {
    if (!birthdate) return 'N/A';
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age + ' years';
  };

  if (loading) {
    return (
      <div className="content">
        <div className="container-fluid">
          <div className="text-center">
            <div className="spinner-border" role="status">
              <span className="sr-only">Loading...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="content">
        <div className="container-fluid">
          <div className="alert alert-danger">Patient not found</div>
        </div>
      </div>
    );
  }

  const getImageUrl = () => {
    if (patient.img_url) return patient.img_url;
    const sex = patient.sex?.toLowerCase() || 'male';
    return `/images/profile/user_${sex}.png`;
  };

  return (
    <>
      {/* Content Header */}
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Patient Profile</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><Link href="/">Home</Link></li>
                <li className="breadcrumb-item"><Link href="/patient">Patients</Link></li>
                <li className="breadcrumb-item active">Profile</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <section className="content">
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-3">
              {/* Profile Image */}
              <div className="card card-primary card-outline">
                <div className="card-header">
                  <h3 className="card-title">{patient.name}</h3>
                  <div className="card-tools">
                    <Link href={`/patient/edit/${patient.id}`}>
                      <i className="fa fa-edit"></i>
                    </Link>
                  </div>
                </div>

                <div className="card-body box-profile">
                  <div className="user-profile-img text-center mb-4">
                    <img
                      className="img-fluid"
                      src={getImageUrl()}
                      alt="User profile picture"
                      style={{ maxWidth: '150px' }}
                    />
                  </div>

                  <ul className="list-group list-group-unbordered mb-3">
                    <li className="list-group-item">
                      <b>Tests</b> <a className="float-right">{stats.test_count}</a>
                    </li>
                    <li className="list-group-item">
                      <b>Documents</b> <a className="float-right">{stats.document_count}</a>
                    </li>
                    <li className="list-group-item">
                      <b>Appointments</b> <a className="float-right">{stats.appointment_count}</a>
                    </li>
                  </ul>
                </div>
              </div>

              {/* About Patient Box */}
              <div className="card card-primary">
                <div className="card-header">
                  <h3 className="card-title">About Patient</h3>
                </div>
                <div className="card-body">
                  <strong><i className="fas fa-address-card mr-1"></i> Age</strong>
                  <p className="text-muted">{calculateAge(patient.birthdate)}</p>
                  <hr />

                  <strong><i className="fas fa-male mr-1"></i> Gender</strong>
                  <p className="text-muted">{patient.sex}</p>
                  <hr />

                  <strong><i className="fas fa-phone mr-1"></i> Phone</strong>
                  <p className="text-muted">{patient.phone}</p>
                  <hr />

                  <strong><i className="fas fa-pencil-alt mr-1"></i> Address</strong>
                  <p className="text-muted">{patient.address}</p>
                  <hr />

                  {patient.email && patient.email !== patient.phone && (
                    <>
                      <strong><i className="fas fa-envelope mr-1"></i> Email</strong>
                      <p className="text-muted">{patient.email}</p>
                      <hr />
                    </>
                  )}

                  {patient.birthdate && (
                    <>
                      <strong><i className="fas fa-birthday-cake mr-1"></i> Birthday</strong>
                      <p className="text-muted">{patient.birthdate}</p>
                      <hr />
                    </>
                  )}

                  {patient.bloodgroup && (
                    <>
                      <strong><i className="fas fa-heartbeat mr-1"></i> Blood Group</strong>
                      <p className="text-muted">{patient.bloodgroup}</p>
                      <hr />
                    </>
                  )}

                  {patient.note && (
                    <>
                      <strong><i className="far fa-file-alt mr-1"></i> Notes</strong>
                      <p className="text-muted">{patient.note}</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="col-md-9">
              <div className="card">
                <div className="card-header p-2">
                  <ul className="nav nav-pills">
                    <li className="nav-item">
                      <a className="nav-link active" href="#labs" data-toggle="tab">Lab Tests</a>
                    </li>
                    <li className="nav-item">
                      <a className="nav-link" href="#appointments" data-toggle="tab">Appointments</a>
                    </li>
                    <li className="nav-item">
                      <a className="nav-link" href="#documents" data-toggle="tab">Documents</a>
                    </li>
                    <li className="nav-item">
                      <a className="nav-link" href="#payments" data-toggle="tab">Payments</a>
                    </li>
                    <li className="nav-item">
                      <a className="nav-link" href="#history" data-toggle="tab">Medical History</a>
                    </li>
                  </ul>
                </div>
                <div className="card-body">
                  <div className="tab-content">
                    <div className="active tab-pane" id="labs">
                      <p>Lab tests will be displayed here</p>
                    </div>
                    <div className="tab-pane" id="appointments">
                      <p>Appointments will be displayed here</p>
                    </div>
                    <div className="tab-pane" id="documents">
                      <p>Documents will be displayed here</p>
                    </div>
                    <div className="tab-pane" id="payments">
                      <p>Payment history will be displayed here</p>
                    </div>
                    <div className="tab-pane" id="history">
                      <p>Medical history will be displayed here</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default PatientProfilePage;
