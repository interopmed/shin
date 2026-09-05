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
    <div className="stack" style={{ gap: '24px' }}>
      <div className="page-header">
        <div className="stack" style={{ gap: '8px' }}>
          <div style={{ display: 'flex', gap: '8px', fontSize: '14px', color: 'var(--text-tertiary)' }}>
            <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Home</Link>
            <span>/</span>
            <Link href="/patient" style={{ color: 'inherit', textDecoration: 'none' }}>Patients</Link>
            <span>/</span>
            <span>Add New</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Add New Patient</h1>
        </div>
      </div>

      <div className="panel" style={{ padding: '32px' }}>
        <form onSubmit={handleSubmit} className="stack" style={{ gap: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Patient Information</h3>
            <button type="submit" disabled={loading} className="button primary">
              {loading ? 'Saving...' : 'Submit'}
            </button>
          </div>
          
          <div className="form-grid">
            <div className="field">
              <label htmlFor="name">Name *</label>
              <input
                type="text"
                name="name"
                id="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                name="email"
                id="email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div className="field">
              <label htmlFor="password">Password *</label>
              <input
                type="password"
                name="password"
                id="password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="phone">Phone *</label>
              <input
                type="text"
                name="phone"
                id="phone"
                value={formData.phone}
                onChange={handleChange}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="address">Address</label>
              <input
                type="text"
                name="address"
                id="address"
                value={formData.address}
                onChange={handleChange}
              />
            </div>

            <div className="field">
              <label htmlFor="birthdate">Birth Date</label>
              <input
                type="date"
                name="birthdate"
                id="birthdate"
                value={formData.birthdate}
                onChange={handleChange}
              />
            </div>

            <div className="field">
              <label htmlFor="sex">Sex</label>
              <select
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

            <div className="field">
              <label htmlFor="bloodgroup">Blood Group</label>
              <select
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

            <div className="field" style={{ position: 'relative' }}>
              <label htmlFor="doctor">Doctor</label>
              <input
                type="text"
                id="doctor"
                placeholder="Type doctor name or specialty"
                value={doctorSearch}
                onChange={(e) => handleDoctorSearchChange(e.target.value)}
                onFocus={() => setShowDoctorSuggestions(true)}
                onBlur={() => setTimeout(() => setShowDoctorSuggestions(false), 150)}
              />

              {showDoctorSuggestions && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 20,
                    maxHeight: '220px',
                    overflowY: 'auto',
                    marginTop: '4px',
                    backgroundColor: 'var(--bg-panel)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-md)',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {doctorSearch.trim().length < 2 ? (
                      <div style={{ padding: '10px 16px', color: 'var(--text-tertiary)' }}>Type at least 2 letters to search.</div>
                    ) : doctorSearching ? (
                      <div style={{ padding: '10px 16px', color: 'var(--text-tertiary)' }}>Searching...</div>
                    ) : doctorSuggestions.length > 0 ? (
                      doctorSuggestions.map((doc) => (
                        <button
                          key={doc.id}
                          type="button"
                          style={{ padding: '10px 16px', textAlign: 'left', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}
                          onMouseDown={() => handleDoctorSelect(doc)}
                        >
                          {getDoctorLabel(doc)}
                        </button>
                      ))
                    ) : (
                      <div style={{ padding: '10px 16px', color: 'var(--text-tertiary)' }}>No matching doctor found.</div>
                    )}
                  </div>
                </div>
              )}
              {formData.doctor && selectedDoctorLabel ? (
                <small style={{ color: 'var(--success-color)', marginTop: '4px', display: 'block', fontSize: '13px' }}>Selected: {selectedDoctorLabel}</small>
              ) : (
                <small style={{ color: 'var(--text-tertiary)', marginTop: '4px', display: 'block', fontSize: '13px' }}>Select a doctor from suggestions.</small>
              )}
            </div>

            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="note">Note</label>
              <textarea
                name="note"
                id="note"
                rows={3}
                value={formData.note}
                onChange={handleChange}
              />
            </div>

            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label>Image Upload</label>
              <div className="stack" style={{ gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ width: '200px', height: '150px', backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={imagePreview} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'cover' }} />
                </div>
                <input
                  type="file"
                  name="img_url"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ border: 'none', padding: 0, height: 'auto', backgroundColor: 'transparent' }}
                />
              </div>
            </div>

            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'normal' }}>
                <input
                  type="checkbox"
                  name="sms"
                  id="sms"
                  checked={formData.sms}
                  onChange={handleChange}
                  style={{ width: 'auto' }}
                />
                Send SMS
              </label>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPatientPage;
