'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

interface Doctor {
  id: number;
  name?: string;
  speciality?: string;
}

interface BloodGroup {
  group: string;
}

const AddPatientPage = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [doctorSearch, setDoctorSearch] = useState('');
  const [doctorSuggestions, setDoctorSuggestions] = useState<Doctor[]>([]);
  const [showDoctorSuggestions, setShowDoctorSuggestions] = useState(false);
  const [doctorSearching, setDoctorSearching] = useState(false);
  const [selectedDoctorLabel, setSelectedDoctorLabel] = useState('');
  const [bloodGroups] = useState<BloodGroup[]>([
    { group: 'A+' }, { group: 'A-' }, { group: 'B+' }, { group: 'B-' },
    { group: 'AB+' }, { group: 'AB-' }, { group: 'O+' }, { group: 'O-' }
  ]);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    sex: 'Male',
    birthdate: '',
    bloodgroup: '',
    doctor: '',
    note: '',
    sms: false,
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('//www.placehold.it/200x150/EFEFEF/AAAAAA&text=no+image');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

  }, [user, isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (!user?.token) return;

    const query = doctorSearch.trim();
    if (!showDoctorSuggestions || query.length < 2) {
      setDoctorSuggestions([]);
      setDoctorSearching(false);
      return;
    }

    let active = true;
    setDoctorSearching(true);

    const timer = setTimeout(async () => {
      try {
        const results = await api.searchDoctors(user.token, query, 20) as Doctor[];
        if (active) {
          setDoctorSuggestions(Array.isArray(results) ? results : []);
        }
      } catch {
        if (active) {
          setDoctorSuggestions([]);
        }
      } finally {
        if (active) {
          setDoctorSearching(false);
        }
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [doctorSearch, showDoctorSuggestions, user]);

  const getDoctorLabel = (doctor: Doctor) => {
    const name = doctor.name || `Doctor #${doctor.id}`;
    return `${name}${doctor.speciality ? ` - ${doctor.speciality}` : ''}`;
  };

  const handleDoctorSearchChange = (value: string) => {
    setDoctorSearch(value);
    setShowDoctorSuggestions(true);
    setSelectedDoctorLabel('');
    if (formData.doctor) {
      setFormData((prev) => ({ ...prev, doctor: '' }));
    }
  };

  const handleDoctorSelect = (doctor: Doctor) => {
    const label = getDoctorLabel(doctor);
    setFormData((prev) => ({ ...prev, doctor: String(doctor.id) }));
    setDoctorSearch(label);
    setSelectedDoctorLabel(label);
    setShowDoctorSuggestions(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (user?.token) {
        const submitData = new FormData();
        Object.entries(formData).forEach(([key, value]) => {
          submitData.append(key, String(value));
        });
        
        if (imageFile) {
          submitData.append('img_url', imageFile);
        }

        await api.createPatient(user.token, submitData);
        router.push('/patient');
      }
    } catch (error) {
      console.error('Failed to create patient:', error);
      alert('Failed to create patient. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Content Header */}
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Add New Patient</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><Link href="/">Home</Link></li>
                <li className="breadcrumb-item"><Link href="/patient">Patients</Link></li>
                <li className="breadcrumb-item active">Add New</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <section className="content">
        <div className="container-fluid">
          <div className="card">
            <form onSubmit={handleSubmit}>
              <div className="card-header">
                <h3 className="card-title">Patient Information</h3>
                <div className="card-tools">
                  <button type="submit" disabled={loading} className="btn btn-success">
                    {loading ? 'Saving...' : 'Submit'}
                  </button>
                </div>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="form-group col-md-6">
                    <label htmlFor="name">Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      name="name"
                      id="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group col-md-6">
                    <label htmlFor="email">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      name="email"
                      id="email"
                      value={formData.email}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-group col-md-6">
                    <label htmlFor="password">Password *</label>
                    <input
                      type="password"
                      className="form-control"
                      name="password"
                      id="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group col-md-6">
                    <label htmlFor="phone">Phone *</label>
                    <input
                      type="text"
                      className="form-control"
                      name="phone"
                      id="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group col-md-6">
                    <label htmlFor="address">Address</label>
                    <input
                      type="text"
                      className="form-control"
                      name="address"
                      id="address"
                      value={formData.address}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-group col-md-6">
                    <label htmlFor="birthdate">Birth Date</label>
                    <input
                      type="date"
                      className="form-control"
                      name="birthdate"
                      id="birthdate"
                      value={formData.birthdate}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-group col-md-6">
                    <label htmlFor="sex">Sex</label>
                    <select
                      className="form-control"
                      name="sex"
                      id="sex"
                      value={formData.sex}
                      onChange={handleChange}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Others">Others</option>
                    </select>
                  </div>

                  <div className="form-group col-md-6">
                    <label htmlFor="bloodgroup">Blood Group</label>
                    <select
                      className="form-control"
                      name="bloodgroup"
                      id="bloodgroup"
                      value={formData.bloodgroup}
                      onChange={handleChange}
                    >
                      <option value="">Select Blood Group</option>
                      {bloodGroups.map((bg) => (
                        <option key={bg.group} value={bg.group}>
                          {bg.group}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group col-md-6">
                    <label htmlFor="doctor">Doctor</label>
                    <div className="position-relative">
                      <input
                        type="text"
                        className="form-control"
                        id="doctor"
                        placeholder="Type doctor name or specialty"
                        value={doctorSearch}
                        onChange={(e) => handleDoctorSearchChange(e.target.value)}
                        onFocus={() => setShowDoctorSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowDoctorSuggestions(false), 150)}
                      />

                      {showDoctorSuggestions && (
                        <div className="list-group position-absolute w-100" style={{ zIndex: 1060, maxHeight: 220, overflowY: 'auto' }}>
                          {doctorSearch.trim().length < 2 ? (
                            <div className="list-group-item text-muted">Type at least 2 letters to search.</div>
                          ) : doctorSearching ? (
                            <div className="list-group-item text-muted">Searching...</div>
                          ) : doctorSuggestions.length > 0 ? (
                            doctorSuggestions.map((doc) => (
                              <button
                                key={doc.id}
                                type="button"
                                className="list-group-item list-group-item-action"
                                onClick={() => handleDoctorSelect(doc)}
                              >
                                {getDoctorLabel(doc)}
                              </button>
                            ))
                          ) : (
                            <div className="list-group-item text-muted">No matching doctor found.</div>
                          )}
                        </div>
                      )}
                    </div>
                    {formData.doctor && selectedDoctorLabel ? (
                      <small className="text-success d-block mt-1">Selected: {selectedDoctorLabel}</small>
                    ) : (
                      <small className="text-muted d-block mt-1">Select a doctor from suggestions.</small>
                    )}
                  </div>

                  <div className="form-group col-md-12">
                    <label htmlFor="note">Note</label>
                    <textarea
                      className="form-control"
                      name="note"
                      id="note"
                      rows={3}
                      value={formData.note}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-group col-md-12">
                    <label className="control-label">Image Upload</label>
                    <div className="fileupload fileupload-new">
                      <div className="fileupload-new thumbnail mb-2">
                        <img src={imagePreview} alt="Preview" style={{ maxWidth: '200px' }} />
                      </div>
                      <div>
                        <input
                          type="file"
                          className="form-control-file"
                          name="img_url"
                          accept="image/*"
                          onChange={handleImageChange}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-group col-md-6">
                    <div className="form-check">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        name="sms"
                        id="sms"
                        checked={formData.sms}
                        onChange={handleChange}
                      />
                      <label className="form-check-label" htmlFor="sms">
                        Send SMS
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </section>
    </>
  );
};

export default AddPatientPage;
