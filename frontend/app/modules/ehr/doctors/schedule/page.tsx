'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

interface Doctor {
  id: number;
  name: string;
}

interface TimeSlot {
  id: number;
  doctor_id: number;
  doctor_name: string;
  day: string;
  start_time: string;
  end_time: string;
  duration: number;
}

const SchedulePage = () => {
  const { user } = useAuth();
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    doctor_id: '',
    day: 'Monday',
    start_time: '',
    end_time: '',
    duration: '30',
  });

  useEffect(() => {
    const fetchData = async () => {
      if (user?.token) {
        try {
          const doctorsData = await api.getDoctors(user.token);
          setDoctors(doctorsData as Doctor[]);
          // TODO: Fetch time slots from API
          setTimeSlots([]);
        } catch (error) {
          console.error('Failed to fetch data:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchData();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement API call
    console.log('Time slot data:', formData);
    setShowAddForm(false);
    setFormData({
      doctor_id: '',
      day: 'Monday',
      start_time: '',
      end_time: '',
      duration: '30',
    });
  };

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <>
      {/* Content Header */}
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Doctor Schedule</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><Link href="/">Home</Link></li>
                <li className="breadcrumb-item active">Schedule</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <section className="content">
        <div className="container-fluid">
          <div className="row">
            {/* Add Time Slot Form */}
            {showAddForm && (
              <div className="col-md-4">
                <div className="card card-primary">
                  <div className="card-header">
                    <h3 className="card-title">Add Time Slot</h3>
                    <div className="card-tools">
                      <button className="btn btn-sm btn-tool" onClick={() => setShowAddForm(false)}>
                        <i className="fa fa-times"></i>
                      </button>
                    </div>
                  </div>
                  <form onSubmit={handleSubmit}>
                    <div className="card-body">
                      <div className="form-group">
                        <label htmlFor="doctor_id">Doctor *</label>
                        <select
                          className="form-control"
                          name="doctor_id"
                          id="doctor_id"
                          value={formData.doctor_id}
                          onChange={(e) => setFormData(prev => ({ ...prev, doctor_id: e.target.value }))}
                          required
                        >
                          <option value="">Select Doctor</option>
                          {doctors.map((doctor) => (
                            <option key={doctor.id} value={doctor.id}>
                              {doctor.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label htmlFor="day">Day *</label>
                        <select
                          className="form-control"
                          name="day"
                          id="day"
                          value={formData.day}
                          onChange={(e) => setFormData(prev => ({ ...prev, day: e.target.value }))}
                          required
                        >
                          {days.map((day) => (
                            <option key={day} value={day}>{day}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label htmlFor="start_time">Start Time *</label>
                        <input
                          type="time"
                          className="form-control"
                          name="start_time"
                          id="start_time"
                          value={formData.start_time}
                          onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="end_time">End Time *</label>
                        <input
                          type="time"
                          className="form-control"
                          name="end_time"
                          id="end_time"
                          value={formData.end_time}
                          onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="duration">Appointment Duration (minutes) *</label>
                        <input
                          type="number"
                          className="form-control"
                          name="duration"
                          id="duration"
                          value={formData.duration}
                          onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                          required
                        />
                      </div>
                    </div>
                    <div className="card-footer">
                      <button type="submit" className="btn btn-primary">Submit</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Time Slots List */}
            <div className={showAddForm ? 'col-md-8' : 'col-md-12'}>
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Time Slots</h3>
                  <div className="card-tools">
                    <button className="btn btn-primary btn-sm" onClick={() => setShowAddForm(!showAddForm)}>
                      <i className="fa fa-plus"></i> Add Time Slot
                    </button>
                  </div>
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
                          <th>Doctor</th>
                          <th>Day</th>
                          <th>Start Time</th>
                          <th>End Time</th>
                          <th>Duration (min)</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {timeSlots.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center">No time slots found</td>
                          </tr>
                        ) : (
                          timeSlots.map((slot) => (
                            <tr key={slot.id}>
                              <td>{slot.doctor_name}</td>
                              <td>{slot.day}</td>
                              <td>{slot.start_time}</td>
                              <td>{slot.end_time}</td>
                              <td>{slot.duration}</td>
                              <td>
                                <button className="btn btn-primary btn-sm" title="Edit">
                                  <i className="fa fa-edit"></i>
                                </button>
                                {' '}
                                <button className="btn btn-danger btn-sm" title="Delete">
                                  <i className="fa fa-trash"></i>
                                </button>
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
          </div>
        </div>
      </section>
    </>
  );
};

export default SchedulePage;
