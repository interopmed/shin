"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuditEventRecord, AuditMetricsRecord, ThreatAlertRecord, createAuditEvent, updateAuditEvent, deleteAuditEvent } from "../../../lib/audit-db";

const templates = [
  "Analyze Bessie Cooper Access",
  "Show All LOGIN_ATTEMPT events",
  "Show Critical / High Risk Events",
  "Show Epic Feed Node Events",
];

// Helper options for dropdown selectors
const userOptions = ["Admin-TW", "Epic Feed Node", "Dr. Adam Bennett", "Theresa Webb", "Unknown-IP", "System-Scheduler"];
const actionOptions = ["PATIENT_READ", "MPI_LINK_EDIT", "PHI_VIEW", "CONSENT_FLAG", "LOGIN_ATTEMPT", "PROFILE_VERIFY", "CLINICAL_NOTE_READ", "BACKUP_RUN", "ROLE_ASSIGN"];
const systemOptions = ["MedTrackr Core", "MPI Engine", "Epic Feed Node", "EHR Notes", "Consent Manager", "Identity Access", "Patient Directory", "Core DB Utility"];
const severityOptions = ["Low", "Medium", "High"];

export default function AuditLogPage() {
  const [events, setEvents] = useState<AuditEventRecord[]>([]);
  const [metrics, setMetrics] = useState<AuditMetricsRecord>({
    totalEvents24h: 0,
    anomalousAlertsCount: 0,
    complianceDrift: 0,
    topUsers: []
  });
  const [alerts, setAlerts] = useState<ThreatAlertRecord[]>([]);

  // CRUD state & handlers
  const [editingEvent, setEditingEvent] = useState<Partial<AuditEventRecord> | null>(null);

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;

    try {
      const eventData = {
        eventId: editingEvent.eventId || "10000",
        userId: editingEvent.userId || "Unknown",
        action: editingEvent.action || "UNKNOWN_ACTION",
        objectType: editingEvent.objectType || "Unknown",
        sourceSystem: editingEvent.sourceSystem || "Unknown",
        severity: editingEvent.severity || "Low",
        traceId: editingEvent.traceId || "",
      };

      if (editingEvent.id) {
        await updateAuditEvent(editingEvent.id, eventData);
      } else {
        await createAuditEvent(eventData);
      }

      setEditingEvent(null);
      fetchData();
    } catch (error) {
      console.error("Failed to save audit event:", error);
    }
  };

  const handleDeleteEvent = async () => {
    if (!editingEvent || !editingEvent.id) return;
    if (!confirm("Are you sure you want to delete this audit event?")) return;

    try {
      await deleteAuditEvent(editingEvent.id);
      setEditingEvent(null);
      fetchData();
    } catch (error) {
      console.error("Failed to delete audit event:", error);
    }
  };

  // Filter States
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedAction, setSelectedAction] = useState("");
  const [selectedSystem, setSelectedSystem] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState("");

  const [loading, setLoading] = useState(true);

  // Fetch all data
  const fetchData = async () => {
    setLoading(true);
    try {
      // Build query string
      const params = new URLSearchParams();
      if (selectedUser) params.set("userId", selectedUser);
      if (selectedAction) params.set("action", selectedAction);
      if (selectedSystem) params.set("sourceSystem", selectedSystem);
      if (selectedSeverity) params.set("severity", selectedSeverity);
      if (search) params.set("search", search);

      const eventsRes = await fetch(`/api/audit/events?${params.toString()}`);
      const eventsData = await eventsRes.json();
      setEvents(eventsData.events || []);

      const metricsRes = await fetch("/api/audit/metrics");
      const metricsData = await metricsRes.json();
      setMetrics(metricsData);

      const alertsRes = await fetch("/api/audit/alerts");
      const alertsData = await alertsRes.json();
      setAlerts(alertsData.alerts || []);
    } catch (error) {
      console.error("Failed to load audit data from DB:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedUser, selectedAction, selectedSystem, selectedSeverity]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const handleClearFilters = () => {
    setSelectedUser("");
    setSelectedAction("");
    setSelectedSystem("");
    setSelectedSeverity("");
    setSearch("");
  };

  // Run template query
  const applyTemplate = (templateName: string) => {
    // Reset filters
    setSelectedUser("");
    setSelectedAction("");
    setSelectedSystem("");
    setSelectedSeverity("");
    setSearch("");

    if (templateName === "Analyze Bessie Cooper Access") {
      setSearch("Bessie Cooper");
    } else if (templateName === "Show All LOGIN_ATTEMPT events") {
      setSelectedAction("LOGIN_ATTEMPT");
    } else if (templateName === "Show Critical / High Risk Events") {
      setSelectedSeverity("High");
    } else if (templateName === "Show Epic Feed Node Events") {
      setSelectedUser("Epic Feed Node");
    }
  };

  // Trigger search when query input is cleared manually
  useEffect(() => {
    if (search === "") {
      fetchData();
    }
  }, [search]);

  // Helper to format timestamp nicely
  const formatTimestamp = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
      const dateStr = date.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
      return { timeStr, dateStr };
    } catch {
      return { timeStr: "Unknown", dateStr: "" };
    }
  };

  // Calculate dynamic bar chart dimensions
  const maxCount = Math.max(...metrics.topUsers.map(u => u.count), 1);

  return (
    <section className="audit-page">
      <nav className="facility-breadcrumb" aria-label="Breadcrumb">
        <Link href="/dashboard">Dashboard</Link>
        <span className="separator">/</span>
        <span className="current">Audit Log</span>
      </nav>

      <div className="audit-card">
        <header className="audit-header">
          <h1>Security, Privacy, and Compliance: Technical/Security Audit Log</h1>
          <div className="audit-header-actions">
            <Link className="audit-secondary-button" href="/">
              &lt; Back
            </Link>
            <button
              className="audit-primary-button"
              type="button"
              onClick={() =>
                setEditingEvent({
                  eventId: "",
                  userId: "",
                  action: "",
                  objectType: "",
                  sourceSystem: "",
                  severity: "Low",
                  traceId: "",
                })
              }
            >
              + Create Event
            </button>
          </div>
        </header>

        <section className="audit-layout">
          <div className="audit-main">
            <section className="audit-panel audit-monitor">
              <div className="audit-panel-header">
                <h2>Real-time Threat & Compliance Monitor</h2>
                <button className="audit-secondary-button compact" type="button" onClick={fetchData}>
                  Refresh
                </button>
              </div>
              <div className="audit-metrics">
                <div className="audit-metric">
                  <span>Total Events (24h)</span>
                  <strong>{metrics.totalEvents24h}</strong>
                  <p>Active logs: <b>{metrics.totalEvents24h}</b></p>
                </div>
                <div className="audit-metric">
                  <span>Anomalous Activity Alerts</span>
                  <strong>{metrics.anomalousAlertsCount}</strong>
                  <p className="audit-chip danger">Anomalous Activity {metrics.anomalousAlertsCount}</p>
                </div>
                <div className="audit-metric">
                  <span>Compliance Drift (HIPAA/ATNA)</span>
                  <strong>{metrics.complianceDrift}</strong>
                  <p className="audit-chip warning">Compliance Drift {metrics.complianceDrift}</p>
                </div>
                <div className="audit-metric audit-users-metric">
                  <span>Top Active Users</span>
                  <div className="audit-bars-chart" aria-label="Top active users chart">
                    {metrics.topUsers.map((user, idx) => {
                      const heightPercent = Math.min(54, Math.round((user.count / maxCount) * 54));
                      return (
                        <i
                          key={user.userId}
                          style={{ height: `${heightPercent}px`, opacity: Math.max(0.3, 1 - idx * 0.15) }}
                          title={`${user.userId}: ${user.count} events`}
                        />
                      );
                    })}
                    {metrics.topUsers.length === 0 && (
                      <span style={{ fontSize: "12px", color: "#667085" }}>No active users</span>
                    )}
                  </div>
                  <div className="audit-user-labels">
                    {metrics.topUsers.slice(0, 3).map((user) => (
                      <span key={user.userId} title={user.userId}>
                        {user.userId.length > 8 ? `${user.userId.substring(0, 6)}...` : user.userId}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="audit-panel audit-trail-panel">
              <div className="audit-panel-header">
                <h2>Live Security Event Trail</h2>
                <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <input
                    type="text"
                    placeholder="Search query..."
                    className="audit-filter-input"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <button className="audit-secondary-button compact" type="submit">
                    Search
                  </button>
                </form>
              </div>

              <div className="audit-filter-row">
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="audit-filter-select"
                >
                  <option value="">All Users</option>
                  {userOptions.map((user) => (
                    <option key={user} value={user}>
                      {user}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedAction}
                  onChange={(e) => setSelectedAction(e.target.value)}
                  className="audit-filter-select"
                >
                  <option value="">All Actions</option>
                  {actionOptions.map((action) => (
                    <option key={action} value={action}>
                      {action}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedSystem}
                  onChange={(e) => setSelectedSystem(e.target.value)}
                  className="audit-filter-select"
                >
                  <option value="">All Systems</option>
                  {systemOptions.map((system) => (
                    <option key={system} value={system}>
                      {system}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedSeverity}
                  onChange={(e) => setSelectedSeverity(e.target.value)}
                  className="audit-filter-select"
                >
                  <option value="">All Risks</option>
                  {severityOptions.map((severity) => (
                    <option key={severity} value={severity}>
                      {severity}
                    </option>
                  ))}
                </select>

                <button type="button" onClick={handleClearFilters}>
                  Reset Filters
                </button>
              </div>

              <div className="audit-table-wrap">
                <table className="audit-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Event ID</th>
                      <th>User ID/Node</th>
                      <th>Action</th>
                      <th>Object Type</th>
                      <th>Source System</th>
                      <th>Severity</th>
                      <th>Trace ID</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((row) => {
                      const { timeStr, dateStr } = formatTimestamp(row.timestamp);
                      return (
                        <tr key={row.id}>
                          <td>
                            <strong>{timeStr}</strong>
                            <span>{dateStr}</span>
                          </td>
                          <td>{row.eventId}</td>
                          <td>{row.userId}</td>
                          <td>{row.action}</td>
                          <td>{row.objectType}</td>
                          <td>{row.sourceSystem}</td>
                          <td>{row.severity}</td>
                          <td>{row.traceId}</td>
                          <td>
                            <button
                              type="button"
                              className="audit-secondary-button compact"
                              style={{ padding: "0 8px", minHeight: "26px", fontSize: "12px" }}
                              onClick={() => setEditingEvent(row)}
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {events.length === 0 && (
                      <tr>
                        <td colSpan={9} style={{ textAlign: "center", padding: "24px", color: "#667085" }}>
                          {loading ? "Loading audit events..." : "No events found matching the criteria."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <aside className="audit-side">
            <section className="audit-panel audit-feed">
              <h2>Threat Intelligence Feed</h2>
              <div className="audit-live-alerts">
                <div className="audit-alert-title">
                  <span>!</span>
                  <strong>Live Alerts</strong>
                  <button aria-label="More live alert actions" type="button">:</button>
                </div>
                {alerts.map((alert) => (
                  <div className="audit-alert-card" key={alert.id}>
                    <strong>{alert.title}</strong>
                    <p>Confidence Score: {alert.score}</p>
                    <div className="audit-map" aria-hidden="true">
                      <span className="pin one" />
                      <span className="pin two" />
                    </div>
                    <span className="audit-confidence">Confidence: {alert.confidence}%</span>
                  </div>
                ))}
                {alerts.length === 0 && (
                  <div style={{ padding: "16px", textAlign: "center", background: "#ffffff", color: "#667085" }}>
                    No threat alerts in system.
                  </div>
                )}
              </div>
            </section>

            <section className="audit-panel audit-search-panel">
              <h2>Audit Trail Search & Analysis</h2>
              <p>Quick investigation filters templates to find security, compliance, and access indicators</p>
              <h3>Investigation templates</h3>
              <div className="audit-template-list">
                {templates.map((template) => (
                  <button key={template} type="button" onClick={() => applyTemplate(template)}>
                    {template}
                  </button>
                ))}
              </div>
            </section>
          </aside>
        </section>

        <section className="audit-question">
          <h2>Key Question Resolved: "Did someone look at or modify medical records who shouldn't have?"</h2>
          <p>Automatically flagged, unresolved high-risk access events are highlighted in compliance drift logs.</p>
        </section>
      </div>

      {editingEvent && (
        <div className="audit-modal-overlay" onClick={() => setEditingEvent(null)}>
          <div className="audit-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingEvent.id ? "Edit Audit Event" : "Create Audit Event"}</h2>
            <form onSubmit={handleSaveEvent}>
              <div className="audit-form-group">
                <label htmlFor="modal-event-id">Event ID</label>
                <input
                  id="modal-event-id"
                  type="text"
                  required
                  className="audit-form-input"
                  value={editingEvent.eventId || ""}
                  onChange={(e) => setEditingEvent({ ...editingEvent, eventId: e.target.value })}
                />
              </div>

              <div className="audit-form-group">
                <label htmlFor="modal-user-id">User ID/Node</label>
                <input
                  id="modal-user-id"
                  type="text"
                  required
                  className="audit-form-input"
                  value={editingEvent.userId || ""}
                  onChange={(e) => setEditingEvent({ ...editingEvent, userId: e.target.value })}
                />
              </div>

              <div className="audit-form-group">
                <label htmlFor="modal-action">Action</label>
                <select
                  id="modal-action"
                  className="audit-form-select"
                  value={editingEvent.action || ""}
                  onChange={(e) => setEditingEvent({ ...editingEvent, action: e.target.value })}
                >
                  <option value="">Select Action...</option>
                  {actionOptions.map((action) => (
                    <option key={action} value={action}>
                      {action}
                    </option>
                  ))}
                </select>
              </div>

              <div className="audit-form-group">
                <label htmlFor="modal-object-type">Object Type</label>
                <input
                  id="modal-object-type"
                  type="text"
                  required
                  className="audit-form-input"
                  value={editingEvent.objectType || ""}
                  onChange={(e) => setEditingEvent({ ...editingEvent, objectType: e.target.value })}
                />
              </div>

              <div className="audit-form-group">
                <label htmlFor="modal-source-system">Source System</label>
                <select
                  id="modal-source-system"
                  className="audit-form-select"
                  value={editingEvent.sourceSystem || ""}
                  onChange={(e) => setEditingEvent({ ...editingEvent, sourceSystem: e.target.value })}
                >
                  <option value="">Select System...</option>
                  {systemOptions.map((sys) => (
                    <option key={sys} value={sys}>
                      {sys}
                    </option>
                  ))}
                </select>
              </div>

              <div className="audit-form-group">
                <label htmlFor="modal-severity">Severity</label>
                <select
                  id="modal-severity"
                  className="audit-form-select"
                  value={editingEvent.severity || ""}
                  onChange={(e) => setEditingEvent({ ...editingEvent, severity: e.target.value })}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              <div className="audit-form-group">
                <label htmlFor="modal-trace-id">Trace ID</label>
                <input
                  id="modal-trace-id"
                  type="text"
                  className="audit-form-input"
                  value={editingEvent.traceId || ""}
                  onChange={(e) => setEditingEvent({ ...editingEvent, traceId: e.target.value })}
                />
              </div>

              <div className="audit-modal-actions">
                {editingEvent.id && (
                  <button
                    type="button"
                    className="audit-danger-button"
                    onClick={handleDeleteEvent}
                  >
                    Delete Event
                  </button>
                )}
                <button
                  type="button"
                  className="audit-secondary-button"
                  onClick={() => setEditingEvent(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="audit-primary-button">
                  Save Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
