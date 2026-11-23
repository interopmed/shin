'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

interface ImagingStudy {
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
const PRIORITIES = ['All', 'STAT', 'Urgent', 'Routine'];

export default function RequestedRadiologyPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [studies, setStudies] = useState<ImagingStudy[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModality, setSelectedModality] = useState('All');
  const [selectedPriority, setSelectedPriority] = useState('All');
  
  // Reporting Modal state
  const [reportingStudy, setReportingStudy] = useState<ImagingStudy | null>(null);
  const [findings, setFindings] = useState('');
  const [impression, setImpression] = useState('');
  const [radiologistName, setRadiologistName] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchStudies = async () => {
    setLoading(true);
    try {
      const data = await api.getImagingRequests(user?.token, { type: 'requested' });
      setStudies(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load requested imaging studies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudies();
  }, [user?.token]);

  const handleStartScan = async (study: ImagingStudy) => {
    try {
      await api.startImagingScan(study.id, user?.token);
      setNotification({ type: 'success', message: `Study ${study.accession_number || study.id} marked as In-Progress.` });
      fetchStudies();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to update scan status.' });
    }
  };

  const openReportModal = (study: ImagingStudy) => {
    setReportingStudy(study);
    setFindings(study.findings || '');
    setImpression(study.impression || '');
    setRadiologistName(
      study.radiologist_name || 
      (user?.display_name ? `Dr. ${user.display_name}` : user?.username ? `Dr. ${user.username}` : 'Dr. S. Jayasuriya (Consultant Radiologist)')
    );
    setNotes(study.notes || '');
  };

  const closeReportModal = () => {
    setReportingStudy(null);
    setFindings('');
    setImpression('');
    setRadiologistName('');
    setNotes('');
  };

  const handleCompleteStudy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingStudy) return;
    if (!findings.trim() || !impression.trim()) {
      setNotification({ type: 'error', message: 'Please provide both Findings and Diagnostic Impression.' });
      return;
    }

    setIsSubmitting(true);
    try {
      await api.completeImagingStudy(
        reportingStudy.id,
        {
          findings: findings.trim(),
          impression: impression.trim(),
          radiologist_name: radiologistName.trim(),
          notes: notes.trim(),
        },
        user?.token
      );

      setNotification({
        type: 'success',
        message: `Diagnostic report finalized for ${reportingStudy.accession_number || reportingStudy.id}. Study moved to Completed Results.`,
      });
      closeReportModal();
      fetchStudies();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to finalize diagnostic report.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredStudies = useMemo(() => {
    return studies.filter((s) => {
      const matchesModality = selectedModality === 'All' || s.modality.toLowerCase() === selectedModality.toLowerCase();
      const matchesPriority = selectedPriority === 'All' || s.priority.toLowerCase() === selectedPriority.toLowerCase();
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        s.patient_name?.toLowerCase().includes(query) ||
        s.patient_code?.toLowerCase().includes(query) ||
        s.accession_number?.toLowerCase().includes(query) ||
        s.modality.toLowerCase().includes(query) ||
        s.body_part.toLowerCase().includes(query) ||
        s.clinical_indication.toLowerCase().includes(query);

      return matchesModality && matchesPriority && matchesSearch;
    });
  }, [studies, selectedModality, selectedPriority, searchQuery]);

  const stats = useMemo(() => {
    const total = studies.length;
    const statCount = studies.filter((s) => s.priority.toLowerCase() === 'stat').length;
    const urgentCount = studies.filter((s) => s.priority.toLowerCase() === 'urgent').length;
    const inProgressCount = studies.filter((s) => s.status.toLowerCase() === 'in-progress').length;
    const pendingCount = studies.filter((s) => s.status.toLowerCase() === 'pending').length;
    return { total, statCount, urgentCount, inProgressCount, pendingCount };
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

  const getPriorityBadge = (priority: string) => {
    const p = priority.toLowerCase();
    if (p === 'stat') {
      return <span style={{ background: '#ef4444', color: '#fff', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px' }}>STAT</span>;
    }
    if (p === 'urgent') {
      return <span style={{ background: '#f97316', color: '#fff', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>URGENT</span>;
    }
    return <span style={{ background: '#e2e8f0', color: '#475569', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 500 }}>Routine</span>;
  };

  return (
    <div className="patient-list-page" style={{ padding: '24px', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      {/* Toast Notification */}
      {notification && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px 16px',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: notification.type === 'success' ? '#ecfdf5' : '#fef2f2',
            border: `1px solid ${notification.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            color: notification.type === 'success' ? '#065f46' : '#991b1b',
            fontWeight: 500,
          }}
        >
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: 'inherit' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="patient-list-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-main, #0f172a)', margin: 0 }}>
            Requested Radiological Studies
          </h1>
          <p style={{ color: 'var(--text-muted, #64748b)', margin: '4px 0 0 0', fontSize: '14px' }}>
            Worklist queue for pending & in-progress medical imaging scans
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={fetchStudies}
            className="patient-filter-btn"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
            Refresh Worklist
          </button>
          <Link
            href="/radiology/results"
            className="patient-add-btn"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', textDecoration: 'none', background: '#3b82f6', color: '#fff', fontWeight: 600 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            View Completed Results
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total In Queue</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{stats.total}</div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Awaiting interpretation</div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #fed7aa', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '12px', color: '#ea580c', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>STAT / Urgent</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#ea580c', marginTop: '4px' }}>{stats.statCount + stats.urgentCount}</div>
          <div style={{ fontSize: '12px', color: '#c2410c', marginTop: '4px' }}>{stats.statCount} STAT • {stats.urgentCount} Urgent</div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '12px', color: '#2563eb', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>In-Progress Scans</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#2563eb', marginTop: '4px' }}>{stats.inProgressCount}</div>
          <div style={{ fontSize: '12px', color: '#3b82f6', marginTop: '4px' }}>Under examination</div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pending Acquisition</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#475569', marginTop: '4px' }}>{stats.pendingCount}</div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Ready for scanning</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Search */}
        <div style={{ flex: '1 1 300px', position: 'relative' }}>
          <input
            type="text"
            placeholder="Search patient, accession #, indication, or body part..."
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

        {/* Priority Filter */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Priority:</span>
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              fontWeight: 500,
              background: '#fff',
              outline: 'none',
            }}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Studies Table Card */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
            <div className="lab-orders-spinner" style={{ width: '36px', height: '36px', border: '3px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
            Loading requested imaging studies...
          </div>
        ) : filteredStudies.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '40px', marginBottom: '8px' }}>📋</div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', margin: '0 0 4px' }}>No Requested Studies Found</h3>
            <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8' }}>
              {searchQuery || selectedModality !== 'All' || selectedPriority !== 'All'
                ? 'Try clearing or modifying your filter criteria.'
                : 'There are no pending imaging requests in the queue.'}
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
                  <th style={{ padding: '12px 16px' }}>Priority</th>
                  <th style={{ padding: '12px 16px' }}>Clinical Indication</th>
                  <th style={{ padding: '12px 16px' }}>Requested</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudies.map((study) => {
                  const modColor = getModalityColor(study.modality);
                  const isStat = study.priority.toLowerCase() === 'stat';
                  const isInProgress = study.status.toLowerCase() === 'in-progress';

                  return (
                    <tr
                      key={study.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: isStat ? 'rgba(254, 242, 242, 0.4)' : '#fff',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      {/* Accession Number */}
                      <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontWeight: 700, color: '#334155' }}>
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

                      {/* Priority */}
                      <td style={{ padding: '14px 16px' }}>
                        {getPriorityBadge(study.priority)}
                      </td>

                      {/* Indication */}
                      <td style={{ padding: '14px 16px', maxWidth: '280px' }}>
                        <div
                          title={study.clinical_indication}
                          style={{
                            color: '#475569',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {study.clinical_indication}
                        </div>
                        {study.notes && (
                          <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', marginTop: '2px' }}>
                            Note: {study.notes}
                          </div>
                        )}
                      </td>

                      {/* Requested At */}
                      <td style={{ padding: '14px 16px', color: '#64748b', fontSize: '12.5px' }}>
                        {new Date(study.requested_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 9px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            background: isInProgress ? '#eff6ff' : '#f8fafc',
                            color: isInProgress ? '#2563eb' : '#64748b',
                            border: isInProgress ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                          }}
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: isInProgress ? '#2563eb' : '#94a3b8',
                            }}
                          />
                          {isInProgress ? 'In Progress' : 'Pending'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                          {!isInProgress && (
                            <button
                              onClick={() => handleStartScan(study)}
                              title="Mark scan as in progress"
                              style={{
                                padding: '6px 10px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                background: '#fff',
                                color: '#475569',
                                fontSize: '12px',
                                fontWeight: 500,
                                cursor: 'pointer',
                              }}
                            >
                              Start Scan
                            </button>
                          )}
                          <button
                            onClick={() => openReportModal(study)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: 'none',
                              background: '#2563eb',
                              color: '#fff',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              boxShadow: '0 1px 2px rgba(37,99,235,0.2)',
                            }}
                          >
                            Report Findings
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Diagnostic Reporting Modal */}
      {reportingStudy && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '16px',
              maxWidth: '750px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              border: '1px solid #e2e8f0',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#f8fafc',
                borderTopLeftRadius: '16px',
                borderTopRightRadius: '16px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      background: '#2563eb',
                      color: '#fff',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  >
                    {reportingStudy.modality}
                  </span>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                    Diagnostic Radiology Report
                  </h2>
                </div>
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                  Accession: <strong>{reportingStudy.accession_number || `RAD-${reportingStudy.id}`}</strong> • Region: <strong>{reportingStudy.body_part}</strong>
                </div>
              </div>
              <button
                onClick={closeReportModal}
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

            {/* Patient Context Banner */}
            <div
              style={{
                padding: '12px 24px',
                background: '#eff6ff',
                borderBottom: '1px solid #dbeafe',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '13px',
                color: '#1e40af',
              }}
            >
              <div>
                <strong>Patient:</strong> {reportingStudy.patient_name || `ID #${reportingStudy.patient}`} ({reportingStudy.patient_code || 'N/A'})
              </div>
              <div>
                <strong>Priority:</strong> {reportingStudy.priority.toUpperCase()}
              </div>
            </div>

            {/* Clinical Indication */}
            <div style={{ padding: '16px 24px 8px', fontSize: '13.5px', color: '#334155' }}>
              <strong>Clinical Indication:</strong>
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  marginTop: '6px',
                  color: '#475569',
                }}
              >
                {reportingStudy.clinical_indication}
              </div>
            </div>

            {/* Report Form */}
            <form onSubmit={handleCompleteStudy} style={{ padding: '16px 24px 24px' }}>
              {/* Findings */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                  Radiological Findings <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  rows={5}
                  required
                  placeholder="Detailed anatomical observations, lesions, bone integrity, soft tissues, contrast enhancement pattern..."
                  value={findings}
                  onChange={(e) => setFindings(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13.5px',
                    fontFamily: 'inherit',
                    lineHeight: '1.5',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Impression */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                  Diagnostic Impression / Conclusion <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Definitive diagnostic impression, staging, differential diagnosis, acute surgical emergencies..."
                  value={impression}
                  onChange={(e) => setImpression(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13.5px',
                    fontFamily: 'inherit',
                    lineHeight: '1.5',
                    outline: 'none',
                    fontWeight: 500,
                  }}
                />
              </div>

              {/* Radiologist Name & Notes */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Signing Radiologist
                  </label>
                  <input
                    type="text"
                    value={radiologistName}
                    onChange={(e) => setRadiologistName(e.target.value)}
                    placeholder="e.g. Dr. K. Jayasuriya, FRCR"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Follow-up / Recommendation Notes
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Repeat in 3 months / urgent clinical correlation"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={closeReportModal}
                  disabled={isSubmitting}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    color: '#475569',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: '9px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#2563eb',
                    color: '#fff',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(37,99,235,0.25)',
                  }}
                >
                  {isSubmitting ? 'Signing & Finalizing...' : 'Authorize & Complete Study'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
