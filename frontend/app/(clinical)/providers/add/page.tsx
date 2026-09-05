'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

const AddDoctorPage = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    designation: '',
    specialist: '',
    facebook: '',
    twitter: '',
    linkedin: '',
    google_plus: '',
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('//www.placehold.it/200x150/EFEFEF/AAAAAA&text=no+image');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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

        await api.createDoctor(user.token, submitData);
        router.push('/doctor');
      }
    } catch (error) {
      console.error('Failed to create doctor:', error);
      alert('Failed to create doctor. Please try again.');
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
              <h1 className="m-0">Add New Doctor</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><Link href="/">Home</Link></li>
                <li className="breadcrumb-item"><Link href="/doctor">Doctors</Link></li>
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
                <h3 className="card-title">Doctor Information</h3>
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
                    <label htmlFor="email">Email *</label>
                    <input
                      type="email"
                      className="form-control"
                      name="email"
                      id="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
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
                    <label htmlFor="designation">Designation</label>
                    <input
                      type="text"
                      className="form-control"
                      name="designation"
                      id="designation"
                      value={formData.designation}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-group col-md-6">
                    <label htmlFor="specialist">Specialist</label>
                    <input
                      type="text"
                      className="form-control"
                      name="specialist"
                      id="specialist"
                      value={formData.specialist}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-group col-md-12">
                    <label htmlFor="address">Address</label>
                    <textarea
                      className="form-control"
                      name="address"
                      id="address"
                      rows={2}
                      value={formData.address}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-group col-md-12">
                    <h5>Social Media Links</h5>
                  </div>

                  <div className="form-group col-md-6">
                    <label htmlFor="facebook">Facebook</label>
                    <input
                      type="text"
                      className="form-control"
                      name="facebook"
                      id="facebook"
                      value={formData.facebook}
                      onChange={handleChange}
                      placeholder="https://facebook.com/..."
                    />
                  </div>

                  <div className="form-group col-md-6">
                    <label htmlFor="twitter">Twitter</label>
                    <input
                      type="text"
                      className="form-control"
                      name="twitter"
                      id="twitter"
                      value={formData.twitter}
                      onChange={handleChange}
                      placeholder="https://twitter.com/..."
                    />
                  </div>

                  <div className="form-group col-md-6">
                    <label htmlFor="linkedin">LinkedIn</label>
                    <input
                      type="text"
                      className="form-control"
                      name="linkedin"
                      id="linkedin"
                      value={formData.linkedin}
                      onChange={handleChange}
                      placeholder="https://linkedin.com/in/..."
                    />
                  </div>

                  <div className="form-group col-md-6">
                    <label htmlFor="google_plus">Google Plus</label>
                    <input
                      type="text"
                      className="form-control"
                      name="google_plus"
                      id="google_plus"
                      value={formData.google_plus}
                      onChange={handleChange}
                      placeholder="https://plus.google.com/..."
                    />
                  </div>

                  <div className="form-group col-md-12">
                    <label className="control-label">Profile Image</label>
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
                </div>
              </div>
            </form>
          </div>
        </div>
      </section>
    </>
  );
};

export default AddDoctorPage;
