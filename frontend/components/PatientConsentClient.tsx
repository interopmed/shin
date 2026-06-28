"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { PatientConsentRecord } from "../lib/patients-db";

type PatientConsentClientProps = {
  consent: PatientConsentRecord;
};

export default function PatientConsentClient({ consent }: PatientConsentClientProps) {
  const [preferences, setPreferences] = useState(consent.preferences);
  const [activeDetail, setActiveDetail] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [requestState, setRequestState] = useState<Record<string, string>>(
    Object.fromEntries(consent.requests.map((request) => [request.id, request.status]))
  );
  const systemWide = preferences.find((item) => item.category === "System-Wide Data Sharing");
  const research = preferences.find((item) => item.category === "Research Study Participation");

  const summary = useMemo(
    () => ({
      granted: preferences.filter((item) => item.grantAccess).length,
      total: preferences.length,
    }),
    [preferences]
  );

  async function savePreference(nextValue: typeof preferences[number]) {
    setSavingId(nextValue.id);
    setStatus("");
    const previous = preferences.find((item) => item.id === nextValue.id);

    try {
      setPreferences((current) =>
        current.map((item) => (item.id === nextValue.id ? nextValue : item))
      );
      const response = await fetch(`/api/patients/${consent.patientId}/consent`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextValue),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to update consent.");
      }

      setStatus(`Saved ${nextValue.category}`);
    } catch (error) {
      if (previous) {
        setPreferences((current) =>
          current.map((item) => (item.id === previous.id ? previous : item))
        );
      }
      setStatus(error instanceof Error ? error.message : "Unable to update consent.");
    } finally {
      setSavingId(null);
    }
  }

  function downloadPolicy() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            patient: consent.patientName,
            patientId: consent.patientId,
            preferences,
            requests: consent.requests.map((request) => ({
              ...request,
              status: requestState[request.id] ?? request.status,
            })),
          },
          null,
          2
        ),
      ],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${consent.patientId}-consent-policy.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus("Downloaded consent policy.");
  }

  async function updateConsentBundle() {
    setStatus("");
    setSavingId("bundle");

    try {
      for (const preference of preferences) {
        const response = await fetch(`/api/patients/${consent.patientId}/consent`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(preference),
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error ?? `Unable to update ${preference.category}.`);
        }
      }

      setStatus("Consent bundle saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to update consent.");
    } finally {
      setSavingId(null);
    }
  }

  function toggleRequest(requestId: string) {
    setRequestState((current) => {
      const currentStatus = current[requestId] ?? "Pending";
      const nextStatus = currentStatus === "Pending" ? "Resolved" : currentStatus === "Resolved" ? "Draft" : "Pending";
      return { ...current, [requestId]: nextStatus };
    });
  }

  function toggleSpecialPreference(category: "System-Wide Data Sharing" | "Research Study Participation") {
    const preference = preferences.find((item) => item.category === category);
    if (preference) {
      void savePreference({ ...preference, grantAccess: !preference.grantAccess });
    }
  }

  return (
    <section className="consent-page">
      <nav className="facility-breadcrumb" aria-label="Breadcrumb">
        <Link href="/patients">Patients</Link>
        <span className="separator">/</span>
        <Link href={`/patients/${consent.patientId}`}>{consent.patientName}</Link>
        <span className="separator">/</span>
        <span className="current">Consent & Privacy</span>
      </nav>

      <div className="consent-card">
        <header className="consent-header">
          <div className="consent-actions">
            <button className="consent-download-button" onClick={downloadPolicy} type="button">
              <span aria-hidden="true" className="consent-button-icon">
                <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 2.5V9.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                  <path d="M5.5 7.5L8 10L10.5 7.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                  <path d="M3 12.5H13" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
                </svg>
              </span>
              Download Privacy Policy
            </button>
            <button className="consent-primary-button" onClick={updateConsentBundle} type="button">
              {savingId === "bundle" ? "Saving..." : "Update Consent"}
            </button>
          </div>
        </header>

        <section className="consent-patient-banner">
          <div className="consent-patient-photo" aria-label={`${consent.patientName} portrait`}>
            <div />
          </div>
          <div>
            <h1>{consent.patientName}</h1>
            <p>EID-{consent.patientNumber || consent.patientId}</p>
          </div>
          <p>DOB: {consent.birthDate}</p>
          <p>Gender, Status: {consent.sex}</p>
        </section>

        {status ? (
          <div className="consent-status-banner" role="status">
            <span className="consent-status-dot" aria-hidden="true" />
            <p>{status}</p>
          </div>
        ) : null}
        <div className="consent-summary-bar">
          <div className="consent-summary-metric">
            <strong>{summary.granted}</strong>
            <span>Granted</span>
          </div>
          <div className="consent-summary-metric">
            <strong>{summary.total}</strong>
            <span>Categories</span>
          </div>
          <Link className="consent-summary-link" href={`/patients/${consent.patientId}/audit`}>
            View audit
          </Link>
        </div>

        <section className="consent-grid">
          <div className="consent-panel consent-sharing-panel">
            <h2>Data Sharing Preferences</h2>
            <div className="consent-table-wrap">
              <table className="consent-sharing-table">
                <thead>
                  <tr>
                    <th>Information Categories</th>
                    <th>Access Group</th>
                    <th>Grant Access</th>
                    <th>Limit Access</th>
                    <th>Detailed Controls</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {preferences.map((item) => (
                    <tr key={item.id} className={activeDetail === item.id ? "active" : ""}>
                      <td>{item.category}</td>
                      <td>{item.groupName}</td>
                      <td>
                        <button
                          className={item.grantAccess ? "consent-toggle active" : "consent-toggle"}
                          aria-label={`Toggle access for ${item.category}`}
                        onClick={() => savePreference({ ...item, grantAccess: !item.grantAccess })}
                        disabled={savingId === item.id || savingId === "bundle"}
                          type="button"
                        >
                          <span />
                        </button>
                      </td>
                      <td>
                        <button
                          className="consent-limit-pill"
                          onClick={() =>
                            savePreference({
                              ...item,
                              limitAccess: item.limitAccess === "Restrictive" ? "Standard" : "Restrictive",
                            })
                          }
                          type="button"
                        >
                          {item.limitAccess}
                        </button>
                      </td>
                      <td>
                        <button
                          className="consent-chevron-button"
                          type="button"
                          aria-label={`Open controls for ${item.category}`}
                          onClick={() => setActiveDetail((current) => (current === item.id ? null : item.id))}
                        >
                          <span aria-hidden="true" className="consent-chevron-icon">
                            <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path
                                d="M4.5 6.5L8 10L11.5 6.5"
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="1.5"
                              />
                            </svg>
                          </span>
                        </button>
                      </td>
                      <td>
                        <button className="consent-menu-button" type="button" aria-label={`More actions for ${item.category}`}>
                          ...
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>

          <div className="consent-side-stack">
            <div className="consent-panel">
              <h2>Opt-In/Out Status</h2>
              <div className="consent-status-list">
                <div>
                  <span>System-Wide Data Sharing</span>
                  <strong>
                    <button
                      className={systemWide?.grantAccess ? "consent-toggle active" : "consent-toggle"}
                      onClick={() => toggleSpecialPreference("System-Wide Data Sharing")}
                      type="button"
                    >
                      <span />
                    </button>
                    {systemWide?.grantAccess ? "Enabled" : "Disabled"}
                  </strong>
                </div>
                <div>
                  <span>Research Study Participation</span>
                  <strong>
                    <button
                      className={research?.grantAccess ? "consent-toggle active" : "consent-toggle"}
                      onClick={() => toggleSpecialPreference("Research Study Participation")}
                      type="button"
                    >
                      <span />
                    </button>
                    {research?.grantAccess ? "Enabled" : "Disabled"}
                  </strong>
                </div>
              </div>
            </div>

            <div className="consent-panel">
              <h2>Pending Consent Requests</h2>
              <div className="consent-request-list">
                {consent.requests.map((request) => (
                  <div className="consent-request-item" key={request.id}>
                    <strong>{request.title}</strong>
                    <button onClick={() => toggleRequest(request.id)} type="button">
                      {requestState[request.id] ?? request.status}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="consent-panel consent-log-panel">
            <h2>Consent Log</h2>
            <table className="consent-log-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Action</th>
                  <th>Author</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {consent.events.map((item) => (
                  <tr key={item.id}>
                    <td>{item.dateLabel}</td>
                    <td>{item.action}</td>
                    <td>{item.author}</td>
                    <td>
                      <button
                        className="consent-menu-button"
                        type="button"
                        aria-label={`More actions for ${item.action}`}
                        onClick={() => setStatus(`Selected ${item.action}`)}
                      >
                        :
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <button className="consent-help-button" type="button" aria-label="Help">
          ?
        </button>
      </div>

      {activeDetail ? (
        <div className="consent-modal-backdrop" role="presentation" onClick={() => setActiveDetail(null)}>
          <section
            aria-labelledby="consent-detail-title"
            className="consent-detail-modal"
            role="dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="consent-detail-header">
              <div>
                <p>Detailed Controls</p>
                <h2 id="consent-detail-title">
                  {preferences.find((item) => item.id === activeDetail)?.category}
                </h2>
              </div>
              <button type="button" aria-label="Close detailed controls" onClick={() => setActiveDetail(null)}>
                x
              </button>
            </header>

            <div className="consent-detail-body">
              <div className="consent-detail-meta">
                <span>Access Group</span>
                <strong>{preferences.find((item) => item.id === activeDetail)?.groupName}</strong>
              </div>
              <div className="consent-detail-meta">
                <span>Current Limit</span>
                <strong>{preferences.find((item) => item.id === activeDetail)?.limitAccess}</strong>
              </div>
              <p>{preferences.find((item) => item.id === activeDetail)?.details}</p>
            </div>

            <footer className="consent-detail-footer">
              <button className="consent-download-button" type="button" onClick={() => setActiveDetail(null)}>
                Close
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </section>
  );
}
