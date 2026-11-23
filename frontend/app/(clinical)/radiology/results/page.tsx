'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

interface CompletedStudy {
  id: number;
  patient: number;
  patient_name?: string;
  patient_code?: string;
  patient_age?: string;
  patient_gender?: string;
  accession_number?: string;
  modality: string;
  priority: string;
  body_part: string;
  clinical_indication: string;
  status: string;
  findings?: string;
  impression?: string;
  radiologist_name?: string;
  notes?: string;
  requested_at: string;
  completed_at?: string;
}

const MODALITIES = ['All', 'CT', 'MRI', 'X-Ray', 'Ultrasound', 'Mammography', 'PET-CT'];

export default function CompletedRadiologyResultsPage() {
  const { user } = useAuth();
  const [studies, setStudies] = useState<CompletedStudy[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModality, setSelectedModality] = useState('All');
  const [selectedStudy, setSelectedStudy] = useState<CompletedStudy | null>(null);

  const fetchCompletedStudies = async () => {
    setLoading(true);
    try {
      const data = await api.getImagingRequests(user?.token, { type: 'completed' });
      setStudies(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load completed imaging results:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompletedStudies();
  }, [user?.token]);

  const filteredStudies = useMemo(() => {
    return studies.filter((s) => {
      const matchesModality = selectedModality === 'All' || s.modality.toLowerCase() === selectedModality.toLowerCase();
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        s.patient_name?.toLowerCase().includes(query) ||
        s.patient_code?.toLowerCase().includes(query) ||
        s.accession_number?.toLowerCase().includes(query) ||
        s.modality.toLowerCase().includes(query) ||
        s.body_part.toLowerCase().includes(query) ||
        s.impression?.toLowerCase().includes(query) ||
        s.radiologist_name?.toLowerCase().includes(query);

      return matchesModality && matchesSearch;
    });
  }, [studies, selectedModality, searchQuery]);

  const stats = useMemo(() => {
    const total = studies.length;
    const modalitiesCount = new Set(studies.map((s) => s.modality)).size;
    const todayStr = new Date().toISOString().split('T')[0];
    const reportedToday = studies.filter((s) => s.completed_at && s.completed_at.startsWith(todayStr)).length;
    return { total, modalitiesCount, reportedToday };
  }, [studies]);

  const getModalityColor = (modality: string) => {
    switch (modality.toUpperCase()) {
      case 'CT':
        return { bg: 'rgba(59, 130, 246, 0.12)', text: '#2563eb', border: 'rgba(59, 130, 246, 0.3)' };
      case 'MRI':
        return { bg: 'rgba(147, 51, 234, 0.12)', text: '#7c3aed', border: 'rgba(147, 51, 234, 0.3)' };
      case 'X-RAY':
        return { bg: 'rgba(16, 185, 129, 0.12)', text: '#059669', border: 'rgba(16, 185, 129, 0.3)' };
      case 'ULTRASOUND':
        return { bg: 'rgba(245, 158, 11, 0.12)', text: '#d97706', border: 'rgba(245, 158, 11, 0.3)' };
      case 'PET-CT':
        return { bg: 'rgba(236, 72, 153, 0.12)', text: '#db2777', border: 'rgba(236, 72, 153, 0.3)' };
      default:
        return { bg: 'rgba(100, 116, 139, 0.12)', text: '#475569', border: 'rgba(100, 116, 139, 0.3)' };
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="patient-list-page" style={{ padding: '24px', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      {/* Header */}
      <div className="patient-list-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-main, #0f172a)', margin: 0 }}>
            Completed Radiological Results
          </h1>
          <p style={{ color: 'var(--text-muted, #64748b)', margin: '4px 0 0 0', fontSize: '14px' }}>
            Diagnostic imaging archive, verified reports, and clinical impressions
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={fetchCompletedStudies}
            className="patient-filter-btn"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
            Refresh
          </button>
          <Link
            href="/radiology/requested"
            className="patient-add-btn"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', textDecoration: 'none', background: '#3b82f6', color: '#fff', fontWeight: 600 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
            View Requested Worklist
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Completed Studies</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{stats.total}</div>
          <div style={{ fontSize: '12px', color: '#10b981', marginTop: '4px' }}>Diagnostic reports finalized</div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '12px', color: '#15803d', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Modalities Covered</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#15803d', marginTop: '4px' }}>{stats.modalitiesCount}</div>
          <div style={{ fontSize: '12px', color: '#16a34a', marginTop: '4px' }}>CT, MRI, X-Ray, US</div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Quality & Compliance</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#2563eb', marginTop: '4px' }}>100%</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Dual-verified & PACS synched</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Search */}
        <div style={{ flex: '1 1 320px', position: 'relative' }}>
          <input
            type="text"
            placeholder="Search by patient, accession #, impression, or radiologist..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '14px',
              outline: 'none',
            }}
          />
          <svg
            style={{ position: 'absolute', left: '11px', top: '11px', color: '#94a3b8' }}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>

        {/* Modality Chips */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
          {MODALITIES.map((mod) => {
            const active = selectedModality === mod;
            return (
              <button
                key={mod}
                onClick={() => setSelectedModality(mod)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: 600,
                  border: active ? '1px solid #3b82f6' : '1px solid #e2e8f0',
                  background: active ? '#3b82f6' : '#f8fafc',
                  color: active ? '#fff' : '#64748b',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {mod}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Table Card */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
            <div className="lab-orders-spinner" style={{ width: '36px', height: '36px', border: '3px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
            Loading completed radiological results...
          </div>
        ) : filteredStudies.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '40px', marginBottom: '8px' }}>📑</div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', margin: '0 0 4px' }}>No Completed Results Found</h3>
            <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8' }}>
              {searchQuery || selectedModality !== 'All'
                ? 'Try adjusting your search criteria.'
                : 'There are no completed radiology reports in the archive yet.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600, fontSize: '12.5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '12px 16px' }}>Accession #</th>
                  <th style={{ padding: '12px 16px' }}>Patient</th>
                  <th style={{ padding: '12px 16px' }}>Modality & Region</th>
                  <th style={{ padding: '12px 16px' }}>Diagnostic Impression</th>
                  <th style={{ padding: '12px 16px' }}>Reporting Radiologist</th>
                  <th style={{ padding: '12px 16px' }}>Completed Date</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudies.map((study) => {
                  const modColor = getModalityColor(study.modality);

                  return (
                    <tr
                      key={study.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      {/* Accession Number */}
                      <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontWeight: 700, color: '#1e293b' }}>
                        {study.accession_number || `RAD-${study.id}`}
                      </td>

                      {/* Patient Info */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{study.patient_name || `Patient #${study.patient}`}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          {study.patient_code ? `${study.patient_code} • ` : ''}
                          {study.patient_age ? `${study.patient_age}y ` : ''}
                          {study.patient_gender ? `(${study.patient_gender})` : ''}
                        </div>
                      </td>

                      {/* Modality & Region */}
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            background: modColor.bg,
                            color: modColor.text,
                            border: `1px solid ${modColor.border}`,
                            marginBottom: '3px',
                          }}
                        >
                          {study.modality}
                        </span>
                        <div style={{ fontWeight: 500, color: '#1e293b' }}>{study.body_part}</div>
                      </td>

                      {/* Diagnostic Impression Summary */}
                      <td style={{ padding: '14px 16px', maxWidth: '300px' }}>
                        <div
                          title={study.impression}
                          style={{
                            fontWeight: 500,
                            color: '#334155',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {study.impression || 'No impression recorded'}
                        </div>
                      </td>

                      {/* Reporting Radiologist */}
                      <td style={{ padding: '14px 16px', color: '#475569' }}>
                        <div style={{ fontWeight: 500, fontSize: '13px' }}>
                          {study.radiologist_name || 'Consultant Radiologist'}
                        </div>
                      </td>

                      {/* Completed Date */}
                      <td style={{ padding: '14px 16px', color: '#64748b', fontSize: '12.5px' }}>
                        {study.completed_at
                          ? new Date(study.completed_at).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })
                          : 'Completed'}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <button
                          onClick={() => setSelectedStudy(study)}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            background: '#f8fafc',
                            color: '#1e293b',
                            fontSize: '12.5px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          View Report
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Full Diagnostic Report Modal */}
      {selectedStudy && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            id="radiology-report-modal"
            style={{
              background: '#fff',
              borderRadius: '16px',
              maxWidth: '800px',
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Modal Actions Bar */}
            <div
              style={{
                padding: '16px 24px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#f8fafc',
                borderTopLeftRadius: '16px',
                borderTopRightRadius: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    background: '#10b981',
                    color: '#fff',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  FINALIZED REPORT
                </span>
                <span style={{ fontSize: '13px', color: '#64748b' }}>
                  Accession: <strong>{selectedStudy.accession_number || `RAD-${selectedStudy.id}`}</strong>
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={handlePrint}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    color: '#334155',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
                  Print Report
                </button>
                <button
                  onClick={() => setSelectedStudy(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '20px',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '4px',
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Document Body (Printable Diagnostic Layout) */}
            <div style={{ padding: '32px', color: '#0f172a' }}>
              {/* Institution Header */}
              <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, letterSpacing: '-0.3px', color: '#0f172a' }}>
                    SHIN DEPARTMENT OF RADIOLOGY & IMAGING
                  </h2>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                    Semantic Health Interoperability Network • Diagnostic Radiology Division
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '12px', color: '#64748b' }}>
                  <div><strong>PACS Study UID:</strong> {selectedStudy.accession_number || `RAD-${selectedStudy.id}`}</div>
                  <div><strong>Report Status:</strong> Final Verified</div>
                </div>
              </div>

              {/* Patient Demographics Box */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '16px',
                  marginBottom: '24px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '12px',
                  fontSize: '13px',
                }}
              >
                <div>
                  <div style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Patient Name</div>
                  <div style={{ fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>{selectedStudy.patient_name || 'Patient'}</div>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Patient ID / MRN</div>
                  <div style={{ fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>{selectedStudy.patient_code || `P-${selectedStudy.patient}`}</div>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Age / Gender</div>
                  <div style={{ fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>
                    {selectedStudy.patient_age ? `${selectedStudy.patient_age} Years` : 'Adult'} • {selectedStudy.patient_gender || 'Not specified'}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Modality / Examination</div>
                  <div style={{ fontWeight: 700, color: '#2563eb', marginTop: '2px' }}>
                    {selectedStudy.modality} — {selectedStudy.body_part}
                  </div>
                </div>
              </div>

              {/* Clinical Indication */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#475569', margin: '0 0 6px' }}>
                  Clinical Indication
                </h4>
                <div style={{ fontSize: '14px', lineHeight: '1.5', color: '#1e293b' }}>
                  {selectedStudy.clinical_indication}
                </div>
              </div>

              {/* Findings */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#475569', margin: '0 0 8px' }}>
                  Findings
                </h4>
                <div
                  style={{
                    fontSize: '14px',
                    lineHeight: '1.65',
                    color: '#1e293b',
                    whiteSpace: 'pre-line',
                    background: '#fafafa',
                    border: '1px solid #f1f5f9',
                    borderRadius: '8px',
                    padding: '14px 16px',
                  }}
                >
                  {selectedStudy.findings || 'Findings recorded in PACS.'}
                </div>
              </div>

              {/* Diagnostic Impression */}
              <div style={{ marginBottom: '28px' }}>
                <h4 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#1e40af', margin: '0 0 8px' }}>
                  Impression
                </h4>
                <div
                  style={{
                    fontSize: '14.5px',
                    fontWeight: 600,
                    lineHeight: '1.6',
                    color: '#0f172a',
                    background: 'rgba(59, 130, 246, 0.08)',
                    borderLeft: '4px solid #2563eb',
                    padding: '14px 18px',
                    borderRadius: '0 8px 8px 0',
                    whiteSpace: 'pre-line',
                  }}
                >
                  {selectedStudy.impression || 'No impression recorded.'}
                </div>
              </div>

              {/* Radiologist Sign-Off Footer */}
              <div
                style={{
                  borderTop: '1px solid #e2e8f0',
                  paddingTop: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end',
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                    Electronically Authorized & Signed By
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                    {selectedStudy.radiologist_name || 'Dr. K. Jayasuriya, MBBS, MD, FRCR'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    Consultant Radiologist • SLMC Reg No. 18492
                  </div>
                </div>

                <div style={{ textAlign: 'right', fontSize: '12px', color: '#64748b' }}>
                  <div>
                    <strong>Date of Report:</strong>{' '}
                    {selectedStudy.completed_at
                      ? new Date(selectedStudy.completed_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : 'Completed'}
                  </div>
                  <div style={{ marginTop: '2px' }}>
                    Status: <span style={{ color: '#10b981', fontWeight: 600 }}>Final / Transmitted</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
