'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { DutyPathologist, getDutyPathologist, setDutyPathologist } from '@/lib/lab-session';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (pathologist: DutyPathologist) => void;
}

export default function DutyPathologistSelectorModal({ isOpen, onClose, onSaved }: Props) {
  const { user } = useAuth();
  const [current, setCurrent] = useState<DutyPathologist>(getDutyPathologist());
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  // Form states
  const [name, setName] = useState(current.name);
  const [qualifications, setQualifications] = useState(current.qualifications);
  const [designation, setDesignation] = useState(current.designation);
  const [slmcRegNo, setSlmcRegNo] = useState(current.slmcRegNo);

  useEffect(() => {
    if (isOpen) {
      const active = getDutyPathologist();
      setCurrent(active);
      setName(active.name);
      setQualifications(active.qualifications);
      setDesignation(active.designation);
      setSlmcRegNo(active.slmcRegNo);

      // Fetch registered doctors to populate quick selector
      if (user?.token) {
        setLoadingDoctors(true);
        api
          .getDoctors(user.token)
          .then((res: any) => {
            const list = Array.isArray(res) ? res : res?.results || [];
            setDoctors(list);
          })
          .catch((err) => console.warn('Could not load doctors list:', err))
          .finally(() => setLoadingDoctors(false));
      }
    }
  }, [isOpen, user]);

  const handleSelectDoctor = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const docId = e.target.value;
    setSelectedDoctorId(docId);
    if (!docId) return;

    const matched = doctors.find((d) => String(d.id) === String(docId));
    if (matched) {
      setName(matched.name?.startsWith('Dr') ? matched.name : `Dr. ${matched.name}`);
      if (matched.qualifications) {
        setQualifications(matched.qualifications);
      }
      if (matched.speciality) {
        setDesignation(
          matched.speciality.toLowerCase().includes('patholog')
            ? matched.speciality
            : `Consultant ${matched.speciality}`
        );
      }
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: DutyPathologist = {
      id: selectedDoctorId || current.id,
      name: name.trim() || 'Dr. Consultant Pathologist',
      qualifications: qualifications.trim() || 'MBBS, MD, FRCPath',
      designation: designation.trim() || 'Consultant Clinical Pathologist',
      slmcRegNo: slmcRegNo.trim() || 'SLMC Reg No —',
    };

    setDutyPathologist(updated);
    if (onSaved) {
      onSaved(updated);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '14px',
          width: '100%',
          maxWidth: '520px',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.2)',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
        }}
      >
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#f8fafc',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
              Assign Duty Pathologist
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748b' }}>
              Select or configure the pathologist for this laboratory session
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              fontSize: '20px',
              lineHeight: 1,
              padding: '4px',
            }}
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSave} style={{ padding: '24px' }}>
          {/* Quick Doctor Picker */}
          {doctors.length > 0 && (
            <div style={{ marginBottom: '18px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#334155',
                  marginBottom: '6px',
                }}
              >
                Quick Select from Registered Doctors:
              </label>
              <select
                value={selectedDoctorId}
                onChange={handleSelectDoctor}
                style={{
                  width: '100%',
                  height: '38px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  padding: '0 12px',
                  fontSize: '13px',
                  background: '#ffffff',
                  outline: 'none',
                }}
              >
                <option value="">-- Select Doctor / Pathologist --</option>
                {doctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.name} {doc.speciality ? `(${doc.speciality})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Pathologist Name */}
          <div style={{ marginBottom: '14px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: '#334155',
                marginBottom: '6px',
              }}
            >
              Pathologist Full Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dr. C. S. Fernando"
              required
              style={{
                width: '100%',
                height: '38px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                padding: '0 12px',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>

          {/* Qualifications */}
          <div style={{ marginBottom: '14px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: '#334155',
                marginBottom: '6px',
              }}
            >
              Academic Qualifications
            </label>
            <input
              type="text"
              value={qualifications}
              onChange={(e) => setQualifications(e.target.value)}
              placeholder="e.g. MBBS, MD (Pathology), FRCPath"
              style={{
                width: '100%',
                height: '38px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                padding: '0 12px',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>

          {/* Designation */}
          <div style={{ marginBottom: '14px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: '#334155',
                marginBottom: '6px',
              }}
            >
              Clinical Designation
            </label>
            <input
              type="text"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              placeholder="e.g. Consultant Clinical Pathologist"
              style={{
                width: '100%',
                height: '38px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                padding: '0 12px',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>

          {/* SLMC Registration No */}
          <div style={{ marginBottom: '22px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: '#334155',
                marginBottom: '6px',
              }}
            >
              SLMC / Medical Registration Number
            </label>
            <input
              type="text"
              value={slmcRegNo}
              onChange={(e) => setSlmcRegNo(e.target.value)}
              placeholder="e.g. SLMC Reg No 19284"
              style={{
                width: '100%',
                height: '38px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                padding: '0 12px',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                border: 'none',
                background: '#2563eb',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Save for this Session
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
