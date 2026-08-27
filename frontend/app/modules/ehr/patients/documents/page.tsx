'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

interface PatientDocumentRow {
  id: number;
  title: string;
  patient?: number;
  patient_name?: string;
  patient_code?: string;
  document?: string;
  url?: string;
  unique_id?: string;
  date?: string;
  uploaded_at?: string;
}

interface PatientOption {
  id: number;
  name?: string;
  patient_id?: string | number;
}

interface DocumentFormState {
  patient: string;
  title: string;
  unique_id: string;
  url: string;
  date: string;
  file: File | null;
}

const emptyForm: DocumentFormState = {
  patient: '',
  title: '',
  unique_id: '',
  url: '',
  date: '',
  file: null,
};

const toDatetimeLocal = (value?: string) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  const offset = parsed.getTimezoneOffset();
  const localDate = new Date(parsed.getTime() - offset * 60000);
  return localDate.toISOString().slice(0, 16);
};

const PatientDocumentsPage = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<PatientDocumentRow[]>([]);
  const [patientSuggestions, setPatientSuggestions] = useState<PatientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [patientSearching, setPatientSearching] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingRow, setEditingRow] = useState<PatientDocumentRow | null>(null);
  const [form, setForm] = useState<DocumentFormState>(emptyForm);
  const [formError, setFormError] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [showPatientSuggestions, setShowPatientSuggestions] = useState(false);
  const [selectedPatientLabel, setSelectedPatientLabel] = useState('');

  const getPatientLabel = (patient: PatientOption) => {
    const displayName = patient.name || `Patient #${patient.id}`;
    return `${displayName}${patient.patient_id ? ` (${String(patient.patient_id)})` : ''}`;
  };

  const handlePatientSearchChange = (value: string) => {
    setPatientSearch(value);
    setShowPatientSuggestions(true);
    setSelectedPatientLabel('');
    if (form.patient) {
      setForm((prev) => ({ ...prev, patient: '' }));
    }
  };

  const handlePatientSelect = (patient: PatientOption) => {
    setForm((prev) => ({ ...prev, patient: String(patient.id) }));
    const label = getPatientLabel(patient);
    setPatientSearch(label);
    setSelectedPatientLabel(label);
    setShowPatientSuggestions(false);
  };

  const fetchRows = async (token: string) => {
    const materialData = await api.getPatientMaterials(token);
    setRows(Array.isArray(materialData) ? materialData : []);
  };

  const openCreateModal = () => {
    setEditingRow(null);
    setForm(emptyForm);
    setFormError('');
    setPatientSearch('');
    setSelectedPatientLabel('');
    setPatientSuggestions([]);
    setShowPatientSuggestions(false);
    setShowModal(true);
  };

  const openEditModal = (row: PatientDocumentRow) => {
    setEditingRow(row);
    setForm({
      patient: row.patient ? String(row.patient) : '',
      title: row.title || '',
      unique_id: row.unique_id || '',
      url: row.url || '',
      date: toDatetimeLocal(row.date),
      file: null,
    });

    const label = `${row.patient_name || (row.patient ? `Patient #${row.patient}` : '')}${row.patient_code ? ` (${row.patient_code})` : ''}`;
    setPatientSearch(label);
    setSelectedPatientLabel(label);
    setFormError('');
    setPatientSuggestions([]);
    setShowPatientSuggestions(false);
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
    setEditingRow(null);
    setForm(emptyForm);
    setFormError('');
    setPatientSearch('');
    setSelectedPatientLabel('');
    setPatientSuggestions([]);
    setShowPatientSuggestions(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.token) return;

    if (!form.patient || !form.title.trim()) {
      setFormError('Patient and title are required.');
      return;
    }

    if (!editingRow && !form.file) {
      setFormError('File is required when creating a document.');
      return;
    }

    const formData = new FormData();
    formData.append('patient', form.patient);
    formData.append('title', form.title.trim());

    if (form.unique_id.trim()) formData.append('unique_id', form.unique_id.trim());
    if (form.url.trim()) formData.append('url', form.url.trim());
    if (form.date) formData.append('date', new Date(form.date).toISOString());
    if (form.file) formData.append('document', form.file);

    try {
      setSaving(true);
      if (editingRow) {
        await api.updatePatientMaterial(user.token, editingRow.id, formData);
      } else {
        await api.createPatientMaterial(user.token, formData);
      }

      await fetchRows(user.token);
      closeModal();
    } catch (error: any) {
      setFormError(error.message || 'Failed to save document.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: PatientDocumentRow) => {
    if (!user?.token) return;

    const confirmed = window.confirm(`Delete document "${row.title}"?`);
    if (!confirmed) return;

    try {
      await api.deletePatientMaterial(user.token, row.id);
      await fetchRows(user.token);
    } catch (error: any) {
      alert(error.message || 'Failed to delete document.');
    }
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    const loadPageData = async () => {
      if (user?.token) {
        try {
          await fetchRows(user.token);
        } catch (error: any) {
          console.error('Failed to fetch patient documents list:', error);
          if (error.message?.includes('401') || error.message?.includes('token')) {
            router.push('/login');
          }
        } finally {
          setLoading(false);
        }
      } else if (!authLoading) {
        setLoading(false);
      }
    };

    loadPageData();
  }, [user, isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (!showModal || !user?.token) return;

    const query = patientSearch.trim();
    if (query.length < 2) {
      setPatientSuggestions([]);
      setPatientSearching(false);
      return;
    }

    let active = true;
    setPatientSearching(true);

    const timer = setTimeout(async () => {
      try {
        const results = await api.searchPatients(user.token, query, 20) as PatientOption[];
        if (active) {
          setPatientSuggestions(Array.isArray(results) ? results : []);
        }
      } catch {
        if (active) {
          setPatientSuggestions([]);
        }
      } finally {
        if (active) {
          setPatientSearching(false);
        }
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [patientSearch, showModal, user]);

  return (
    <>
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Patient Documents</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><Link href="/">Home</Link></li>
                <li className="breadcrumb-item"><Link href="/patient">Patient</Link></li>
                <li className="breadcrumb-item active">Documents</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Patient Document Index</h3>
              <div className="card-tools">
                <button className="btn btn-primary btn-sm" onClick={openCreateModal}>
                  <i className="fa fa-plus mr-1"></i> Add Document
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
                      <th>Title</th>
                      <th>Patient</th>
                      <th>Patient ID</th>
                      <th>Uploaded</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center">No documents found</td>
                      </tr>
                    ) : (
                      rows.map((row) => (
                        <tr key={row.id}>
                          <td>{row.title || '-'}</td>
                          <td>{row.patient_name || '-'}</td>
                          <td>{row.patient_code || '-'}</td>
                          <td>{row.uploaded_at ? new Date(row.uploaded_at).toLocaleString() : '-'}</td>
                          <td>
                            <div className="d-flex align-items-center">
                              {row.document || row.url ? (
                                <a
                                  href={row.url || row.document}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="btn btn-info btn-sm mr-1"
                                  title="Open Document"
                                >
                                  <i className="fa fa-file"></i>
                                </a>
                              ) : (
                                <button type="button" className="btn btn-secondary btn-sm mr-1" disabled>
                                  <i className="fa fa-file"></i>
                                </button>
                              )}
                              <button
                                type="button"
                                className="btn btn-warning btn-sm mr-1"
                                title="Edit"
                                onClick={() => openEditModal(row)}
                              >
                                <i className="fa fa-edit"></i>
                              </button>
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                title="Delete"
                                onClick={() => handleDelete(row)}
                              >
                                <i className="fa fa-trash"></i>
                              </button>
                            </div>
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
      </section>

      {showModal && (
        <>
          <div className="modal show d-block" tabIndex={-1} role="dialog" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
            <div className="modal-dialog modal-lg" role="document">
              <form className="modal-content" onSubmit={handleSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title">{editingRow ? 'Edit Document' : 'Add Document'}</h5>
                  <button type="button" className="close" onClick={closeModal} disabled={saving}>
                    <span>&times;</span>
                  </button>
                </div>

                <div className="modal-body">
                  {formError && <div className="alert alert-danger">{formError}</div>}

                  <div className="form-group">
                    <label>Patient</label>
                    <div className="position-relative">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Type patient name or ID"
                        value={patientSearch}
                        onChange={(e) => handlePatientSearchChange(e.target.value)}
                        onFocus={() => setShowPatientSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowPatientSuggestions(false), 150)}
                      />

                      {showPatientSuggestions && (
                        <div className="list-group position-absolute w-100" style={{ zIndex: 1060, maxHeight: 220, overflowY: 'auto' }}>
                          {patientSearch.trim().length < 2 ? (
                            <div className="list-group-item text-muted">Type at least 2 letters to search.</div>
                          ) : patientSearching ? (
                            <div className="list-group-item text-muted">Searching...</div>
                          ) : patientSuggestions.length > 0 ? (
                            patientSuggestions.map((patient) => (
                              <button
                                key={patient.id}
                                type="button"
                                className="list-group-item list-group-item-action"
                                onClick={() => handlePatientSelect(patient)}
                              >
                                {getPatientLabel(patient)}
                              </button>
                            ))
                          ) : (
                            <div className="list-group-item text-muted">No matching patient found.</div>
                          )}
                        </div>
                      )}
                    </div>

                    <input type="hidden" value={form.patient} required />
                    {form.patient && selectedPatientLabel ? (
                      <small className="text-success d-block mt-1">Selected: {selectedPatientLabel}</small>
                    ) : (
                      <small className="text-muted d-block mt-1">Select a patient from suggestions.</small>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Title</label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.title}
                      onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="row">
                    <div className="col-md-6">
                      <div className="form-group">
                        <label>Unique ID</label>
                        <input
                          type="text"
                          className="form-control"
                          value={form.unique_id}
                          onChange={(e) => setForm((prev) => ({ ...prev, unique_id: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-group">
                        <label>Date</label>
                        <input
                          type="datetime-local"
                          className="form-control"
                          value={form.date}
                          onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>External URL</label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.url}
                      onChange={(e) => setForm((prev) => ({ ...prev, url: e.target.value }))}
                    />
                  </div>

                  <div className="form-group">
                    <label>{editingRow ? 'Replace File (optional)' : 'File'}</label>
                    <input
                      type="file"
                      className="form-control"
                      onChange={(e) => setForm((prev) => ({ ...prev, file: e.target.files?.[0] || null }))}
                      required={!editingRow}
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={saving}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : editingRow ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
          <div className="modal-backdrop show"></div>
        </>
      )}
    </>
  );
};

export default PatientDocumentsPage;
