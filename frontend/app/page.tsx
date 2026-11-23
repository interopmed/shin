"use client";

import Link from "next/link";
import { createDemoFoundationState } from "@/lib/demo-foundation";
import { canAccess, createActiveUserFromToken, roleLabels, roleBadgeColor, EHRRole } from "@/lib/permissions";
import { useAuth } from "@/hooks/useAuth";

// ─── Role Copy ────────────────────────────────────────────────────────────────
const roleCopy: Record<EHRRole, { kicker: string; title: string; body: string }> = {
  "system-admin": {
    kicker: "Platform Administration",
    title: "System control center",
    body: "Manage modules, identity & access, facilities, system settings, and monitor the full audit trail. Patient data access is intentionally restricted from this role.",
  },
  "doctor": {
    kicker: "Clinical Operations",
    title: "Physician workspace",
    body: "Access your patient list, review lab results, write prescriptions, manage care teams, and coordinate with the ward — all from one clinical workspace.",
  },
  "nurse": {
    kicker: "Nursing Operations",
    title: "Nursing station",
    body: "Monitor your ward, administer medications, update vitals, coordinate care activities, and review lab results for your assigned patients.",
  },
  "lab-technician": {
    kicker: "Laboratory Operations",
    title: "Lab technician workspace",
    body: "Process incoming lab orders, record specimen results, manage the review queue, and generate lab reports for clinical teams.",
  },
  "pharmacist": {
    kicker: "Pharmacy Operations",
    title: "Pharmacy dispensing desk",
    body: "Review and dispense medication orders, check drug interactions, manage pharmacy inventory, and coordinate with clinical teams.",
  },
  "radiologist": {
    kicker: "Radiology Operations",
    title: "Radiology reading station",
    body: "Interpret imaging studies, issue radiology reports, review pending imaging orders, and manage your reading queue.",
  },
  "front-desk": {
    kicker: "Access & Scheduling",
    title: "Front desk workspace",
    body: "Register patients, manage appointment scheduling, handle check-in and check-out, and coordinate provider availability.",
  },
  "billing-officer": {
    kicker: "Finance & Billing",
    title: "Billing operations desk",
    body: "Process invoices, manage insurance claims, track outstanding payments, and generate financial reports for the organization.",
  },
  "auditor": {
    kicker: "Governance & Compliance",
    title: "Audit and compliance workspace",
    body: "Review access logs, audit governance trails, monitor system events, and generate compliance reports — with read-only access to all audit data.",
  },
  "medical-records": {
    kicker: "Health Information Management",
    title: "Medical records workspace",
    body: "Manage the full health record lifecycle — document scanning, coding, record requests, release of information, and records archival.",
  },
  "ward-manager": {
    kicker: "Ward Operations",
    title: "Ward management center",
    body: "Oversee ward bed management, coordinate nursing staff assignments, manage patient flow, and monitor operational readiness across the unit.",
  },
  "hr-officer": {
    kicker: "Human Resources",
    title: "HR management workspace",
    body: "Manage employee records, process department assignments, handle staff onboarding, and maintain the organizational staff directory.",
  },
};

// ─── Role Quick Actions ────────────────────────────────────────────────────────
type QuickAction = { label: string; href: string; requiredPermissions?: string[] };

const roleQuickActions: Partial<Record<EHRRole, QuickAction[]>> = {
  "system-admin": [
    { label: "Audit log", href: "/foundation/audit" },
    { label: "Identity & Access", href: "/foundation/identitywork" },
    { label: "Event stream", href: "/foundation/events" },
    { label: "Node settings", href: "/settings" },
    { label: "Facilities", href: "/facilities" },
  ],
  "doctor": [
    { label: "Patient list", href: "/patients" },
    { label: "Ward dashboard", href: "/ward" },
    { label: "Lab results", href: "/lab/reports" },
    { label: "Prescriptions", href: "/prescriptions" },
    { label: "Appointments", href: "/scheduling/appointment" },
    { label: "Care teams", href: "/care-teams" },
  ],
  "nurse": [
    { label: "Ward dashboard", href: "/ward" },
    { label: "My Unit", href: "/unit" },
    { label: "Lab results", href: "/lab/reports" },
    { label: "Appointments", href: "/scheduling/appointment" },
  ],
  "lab-technician": [
    { label: "Orders queue", href: "/lab/orders" },
    { label: "Lab results", href: "/lab/reports" },
  ],
  "pharmacist": [
    { label: "Prescriptions", href: "/prescriptions" },
    { label: "Pharmacy inventory", href: "/stocks" },
  ],
  "radiologist": [
    { label: "Appointments", href: "/scheduling/appointment" },
    { label: "Patient list", href: "/patients" },
  ],
  "front-desk": [
    { label: "Appointments", href: "/scheduling/appointment" },
    { label: "Patient registration", href: "/patients" },
  ],
  "billing-officer": [
    { label: "Billing", href: "/billing/finance" },
    { label: "Sales report", href: "/billing/sales" },
  ],
  "auditor": [
    { label: "Audit log", href: "/foundation/audit" },
    { label: "Event stream", href: "/foundation/events" },
  ],
  "medical-records": [
    { label: "Patient records", href: "/patients" },
    { label: "Lab results", href: "/lab/reports" },
  ],
  "ward-manager": [
    { label: "Ward dashboard", href: "/ward" },
    { label: "Appointments", href: "/scheduling/appointment" },
    { label: "Staff directory", href: "/human-resources/employees" },
  ],
  "hr-officer": [
    { label: "Staff directory", href: "/human-resources/employees" },
  ],
};

// ─── Role Hero Actions ────────────────────────────────────────────────────────
const roleHeroActions: Partial<Record<EHRRole, { label: string; href: string; primary?: boolean }[]>> = {
  "system-admin": [{ label: "Audit log", href: "/foundation/audit", primary: true }, { label: "Identity & Access", href: "/foundation/identitywork" }],
  "doctor": [{ label: "Patient list", href: "/patients", primary: true }, { label: "Ward dashboard", href: "/ward" }],
  "nurse": [{ label: "Ward dashboard", href: "/ward", primary: true }, { label: "My Unit", href: "/unit" }],
  "lab-technician": [{ label: "Orders queue", href: "/lab/orders", primary: true }, { label: "Lab results", href: "/lab/reports" }],
  "pharmacist": [{ label: "Prescriptions", href: "/prescriptions", primary: true }, { label: "Inventory", href: "/stocks" }],
  "radiologist": [{ label: "Appointments", href: "/scheduling/appointment", primary: true }, { label: "Patient list", href: "/patients" }],
  "front-desk": [{ label: "Appointments", href: "/scheduling/appointment", primary: true }, { label: "Register patient", href: "/patients" }],
  "billing-officer": [{ label: "Billing", href: "/billing/finance", primary: true }, { label: "Sales report", href: "/billing/sales" }],
  "auditor": [{ label: "Audit log", href: "/foundation/audit", primary: true }, { label: "Event stream", href: "/foundation/events" }],
  "medical-records": [{ label: "Patient records", href: "/patients", primary: true }, { label: "Lab results", href: "/lab/reports" }],
  "ward-manager": [{ label: "Ward dashboard", href: "/ward", primary: true }, { label: "Appointments", href: "/scheduling/appointment" }],
  "hr-officer": [{ label: "Staff directory", href: "/human-resources/employees", primary: true }],
};

// ─── Role Readiness Checks ────────────────────────────────────────────────────
type ReadinessItem = { label: string; done: boolean; value: string; requiredPermissions?: string[] };

function getRoleReadiness(role: EHRRole, eventCount: number): ReadinessItem[] {
  const base: ReadinessItem[] = [{ label: "Node status", done: true, value: "Active" }];

  switch (role) {
    case "system-admin": return [...base, { label: "Identity config", done: true, value: "Configured" }, { label: "Audit stream", done: eventCount > 0, value: `${eventCount} events` }];
    case "doctor": return [...base, { label: "Patient access", done: true, value: "Available" }, { label: "Lab integration", done: true, value: "Connected" }];
    case "nurse": return [...base, { label: "Ward access", done: true, value: "Available" }, { label: "Patient queue", done: true, value: "Active" }];
    case "lab-technician": return [...base, { label: "Lab orders queue", done: true, value: "Ready" }, { label: "Result entry", done: true, value: "Active" }];
    case "pharmacist": return [...base, { label: "Prescription queue", done: true, value: "Ready" }, { label: "Inventory", done: true, value: "Stocked" }];
    case "radiologist": return [...base, { label: "Imaging queue", done: true, value: "Ready" }, { label: "Report system", done: true, value: "Active" }];
    case "front-desk": return [...base, { label: "Scheduling system", done: true, value: "Ready" }, { label: "Patient registration", done: true, value: "Active" }];
    case "billing-officer": return [...base, { label: "Billing module", done: true, value: "Ready" }, { label: "Claim gateway", done: true, value: "Connected" }];
    case "auditor": return [...base, { label: "Audit access", done: eventCount > 0, value: `${eventCount} events` }, { label: "Compliance stream", done: true, value: "Active" }];
    case "medical-records": return [...base, { label: "Records access", done: true, value: "Active" }, { label: "Coding system", done: true, value: "ICD-10 ready" }];
    case "ward-manager": return [...base, { label: "Ward config", done: true, value: "Active" }, { label: "Staff assignments", done: true, value: "Up to date" }];
    case "hr-officer": return [...base, { label: "Staff directory", done: true, value: "Ready" }, { label: "Department config", done: true, value: "Configured" }];
    default: return base;
  }
}

// ─── Metric Cards ────────────────────────────────────────────────────────────
type MetricCard = { label: string; value: string; detail: string };

function getRoleMetrics(role: EHRRole, eventCount: number): MetricCard[] {
  switch (role) {
    case "system-admin": return [{ label: "Node Status", value: "Active", detail: "Healthy runtime" }, { label: "Audit Events", value: String(eventCount), detail: "Governance activity" }, { label: "Identity Users", value: "12", detail: "Seeded staff accounts" }, { label: "Modules", value: "1", detail: "Core module active" }];
    case "doctor": return [{ label: "Patients", value: "1", detail: "Active records" }, { label: "Lab Orders", value: "0", detail: "Pending review" }, { label: "Appointments", value: "0", detail: "Today" }, { label: "Prescriptions", value: "0", detail: "Active orders" }];
    case "nurse": return [{ label: "Ward Patients", value: "1", detail: "Assigned patients" }, { label: "Medications Due", value: "0", detail: "This shift" }, { label: "Lab Pending", value: "0", detail: "Awaiting results" }, { label: "Vitals Overdue", value: "0", detail: "Flagged" }];
    case "lab-technician": return [{ label: "Pending Orders", value: "0", detail: "Unprocessed" }, { label: "In Progress", value: "0", detail: "Active specimens" }, { label: "Results Ready", value: "0", detail: "Awaiting sign-off" }, { label: "Critical Alerts", value: "0", detail: "Flagged results" }];
    case "pharmacist": return [{ label: "Pending Scripts", value: "0", detail: "To be dispensed" }, { label: "Drug Alerts", value: "0", detail: "Interactions flagged" }, { label: "Low Stock", value: "0", detail: "Below threshold" }, { label: "Dispensed Today", value: "0", detail: "Completed" }];
    case "radiologist": return [{ label: "Imaging Queue", value: "0", detail: "Studies to read" }, { label: "Reports Due", value: "0", detail: "Pending sign-off" }, { label: "Critical Findings", value: "0", detail: "Flagged" }, { label: "Completed Today", value: "0", detail: "Reports issued" }];
    case "front-desk": return [{ label: "Appointments Today", value: "0", detail: "Scheduled" }, { label: "Check-ins", value: "0", detail: "Arrived" }, { label: "Waiting", value: "0", detail: "In queue" }, { label: "No-Shows", value: "0", detail: "Flagged" }];
    case "billing-officer": return [{ label: "Invoices Pending", value: "0", detail: "To be processed" }, { label: "Claims Outstanding", value: "0", detail: "With insurers" }, { label: "Overdue", value: "0", detail: "Past due date" }, { label: "Revenue Today", value: "—", detail: "Collected" }];
    case "auditor": return [{ label: "Audit Events", value: String(eventCount), detail: "Total records" }, { label: "Access Alerts", value: "0", detail: "Unusual activity" }, { label: "PHI Access Logs", value: "0", detail: "Today" }, { label: "Compliance Score", value: "100%", detail: "No violations" }];
    case "medical-records": return [{ label: "Records Pending", value: "0", detail: "To be filed" }, { label: "Release Requests", value: "0", detail: "Awaiting action" }, { label: "Coding Backlog", value: "0", detail: "Uncoded" }, { label: "Archived Today", value: "0", detail: "Completed" }];
    case "ward-manager": return [{ label: "Ward Occupancy", value: "0%", detail: "Beds filled" }, { label: "Patients", value: "1", detail: "Admitted" }, { label: "Staff on Duty", value: "0", detail: "Active shift" }, { label: "Discharge Due", value: "0", detail: "Today" }];
    case "hr-officer": return [{ label: "Total Staff", value: "12", detail: "Active employees" }, { label: "On Leave", value: "0", detail: "Approved" }, { label: "Open Positions", value: "0", detail: "Unfilled" }, { label: "Reviews Due", value: "0", detail: "Upcoming" }];
    default: return [{ label: "Node Status", value: "Active", detail: "Healthy runtime" }];
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user, loading } = useAuth();
  const foundation = createDemoFoundationState();
  const activeUser = createActiveUserFromToken(user || undefined);
  const role = activeUser.role;

  if (loading) {
    return (
      <div style={{ display: "flex", minHeight: "50vh", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "1rem" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid #e2e8f0", borderTopColor: "#4364F7", animation: "spin 0.8s linear infinite" }} />
        <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>Loading workspace…</p>
      </div>
    );
  }

  const copy = roleCopy[role];
  const heroActions = roleHeroActions[role] || [];
  const quickActions = roleQuickActions[role] || [];
  const metrics = getRoleMetrics(role, foundation.events.length);
  const readiness = getRoleReadiness(role, foundation.events.length);
  const readinessScore = Math.round((readiness.filter((r) => r.done).length / readiness.length) * 100);
  const badgeColor = roleBadgeColor[role];

  return (
    <main className="dashboard-page">
      <section className="dashboard-grid">
        <section className="dashboard-main">

          {/* Hero Card */}
          <div className="hero-card">
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem" }}>
                <p className="section-kicker">{copy.kicker}</p>
                <span style={{
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  padding: "0.15rem 0.6rem",
                  borderRadius: 999,
                  background: badgeColor + "20",
                  color: badgeColor,
                  border: `1px solid ${badgeColor}40`,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}>
                  {roleLabels[role]}
                </span>
              </div>
              <h1>{copy.title}</h1>
              <p>{copy.body}</p>
            </div>
            <div className="hero-actions">
              {heroActions.map((action, i) => (
                <Link
                  key={action.href}
                  className={i === 0 ? "button" : "button secondary"}
                  href={action.href}
                >
                  {action.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Metrics */}
          <section className="metric-grid">
            {metrics.map(({ label, value, detail }) => (
              <div className="metric-card" key={label}>
                <p>{label}</p>
                <strong>{value}</strong>
                <span>{detail}</span>
              </div>
            ))}
          </section>

          {/* Readiness */}
          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="section-kicker">Workflow Center</p>
                <h2>{roleLabels[role]} readiness</h2>
              </div>
              <span className="status success">{readinessScore}% ready</span>
            </div>
            <div className="readiness-list">
              {readiness.map((item) => (
                <div className="readiness-item" key={item.label}>
                  <div>
                    <strong>{item.label}</strong>
                    <p>{item.value}</p>
                  </div>
                  <span className={item.done ? "status success" : "status warning"}>
                    {item.done ? "Ready" : "Pending"}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Activity Feed — only show for roles with event/audit access */}
          {(canAccess(activeUser, ["event.read"]) || canAccess(activeUser, ["audit.read"])) && (
            <section className="panel">
              <div className="panel-header">
                <div>
                  <p className="section-kicker">Recent Activity</p>
                  <h2>
                    {canAccess(activeUser, ["audit.read"])
                      ? "Foundation timeline"
                      : "Role activity"}
                  </h2>
                </div>
                {canAccess(activeUser, ["event.read"]) && (
                  <Link className="button secondary compact" href="/foundation/events">
                    View all
                  </Link>
                )}
              </div>
              <div className="timeline">
                {foundation.events.slice(-5).map((event) => (
                  <div className="timeline-item" key={event.id}>
                    <div>
                      <strong>{event.type}</strong>
                      <p>{event.resourceType} {event.resourceId}</p>
                    </div>
                    <span>{event.sourceModule}</span>
                  </div>
                ))}
                {foundation.events.length === 0 && (
                  <p style={{ color: "#94a3b8", fontSize: "0.9rem", padding: "0.5rem 0" }}>No events recorded yet.</p>
                )}
              </div>
            </section>
          )}
        </section>

        {/* Action Rail */}
        <aside className="action-rail">
          <div className="panel compact-panel">
            <p className="section-kicker">{roleLabels[role]} Actions</p>
            <div className="action-list">
              {quickActions.map((action) => (
                <Link href={action.href} key={`${action.label}-${action.href}`}>
                  <strong>{action.label}</strong>
                  <span>Open</span>
                </Link>
              ))}
              {quickActions.length === 0 && (
                <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>No quick actions available.</p>
              )}
            </div>
          </div>

          <div className="panel compact-panel">
            <p className="section-kicker">Alerts</p>
            <div className="notice-list">
              <div className="notice-card">
                <span className="status success">clear</span>
                <strong>No alerts</strong>
                <p>System is operating normally.</p>
              </div>
            </div>
          </div>

          {/* HIPAA notice for PHI roles */}
          {canAccess(activeUser, ["phi.read"]) && (
            <div className="panel compact-panel" style={{ borderLeft: "3px solid #0ea5e9" }}>
              <p className="section-kicker" style={{ color: "#0ea5e9" }}>HIPAA Notice</p>
              <p style={{ fontSize: "0.8rem", color: "#64748b", lineHeight: 1.5 }}>
                You have PHI access. All patient data access is logged and audited per HIPAA §164.312(b).
              </p>
            </div>
          )}
        </aside>
      </section>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </main>
  );
}
