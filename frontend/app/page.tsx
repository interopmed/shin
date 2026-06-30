import Link from "next/link";
import { createDemoFoundationState } from "../lib/demo-foundation";
import { getVisibleModuleContributions } from "../lib/module-contributions";
import { canAccess, getActiveUserContext, getShinNodeState } from "../lib/node-state";

type RoleDashboardMetric = {
  label: string;
  value: string;
  detail: string;
  requiredPermissions?: string[];
};

const roleLabels = {
  administrator: "Administration",
  clinician: "Clinical Team",
  "lab-manager": "Lab Operations",
  "front-desk": "Front Desk",
  auditor: "Audit & Compliance",
} as const;

const roleCopy = {
  administrator: {
    kicker: "Administration Operations",
    title: "Administrative command center",
    body: "Manage modules, governance, identity, facilities, audit activity, and node readiness from one workspace.",
  },
  clinician: {
    kicker: "Clinical Operations",
    title: "Clinical team workspace",
    body: "Focus on patients, care teams, encounters, lab results, and the clinical work available to your role.",
  },
  "lab-manager": {
    kicker: "Lab Operations",
    title: "Laboratory command center",
    body: "Track lab orders, specimens, analyzer activity, critical results, and review queues for the laboratory team.",
  },
  "front-desk": {
    kicker: "Access & Scheduling",
    title: "Front desk workspace",
    body: "Keep patient lookup, appointment flow, check-in demand, and provider availability close at hand.",
  },
  auditor: {
    kicker: "Governance Review",
    title: "Audit and compliance workspace",
    body: "Review governance trails, access activity, event streams, and compliance signals without clinical work queue noise.",
  },
} as const;

function visibleItems<T extends { requiredPermissions?: string[] }>(items: T[], user: ReturnType<typeof getActiveUserContext>): T[] {
  return items.filter((item) => canAccess(user, item.requiredPermissions));
}

export default function DashboardPage() {
  const foundation = createDemoFoundationState();
  const nodeState = getShinNodeState();
  const activeUser = getActiveUserContext();
  const enabledModules = nodeState.installedModules.filter((module) => module.status === "enabled");
  const installedModules = nodeState.installedModules.filter((module) => module.status === "installed" || module.status === "enabled");
  const contributions = getVisibleModuleContributions({ includeInstalled: true });
  const moduleSections = contributions.flatMap((contribution) =>
    contribution.dashboardSections.map((section) => ({
      ...section,
      moduleLabel: contribution.label,
      moduleId: contribution.moduleId,
    }))
  );
  const moduleAlerts = contributions.flatMap((contribution) => contribution.alerts);
  const moduleNotifications = contributions.flatMap((contribution) => contribution.notifications);
  const quickActions = contributions.flatMap((contribution) => contribution.quickActions);
  const roleContent = roleCopy[activeUser.role];
  const heroActions = visibleItems(
    [
      { label: "Patient index", detail: "Clinical access", href: "/modules/ehr/patients", requiredPermissions: ["patient.read"] },
      { label: "Manage modules", detail: "Administration", href: "/modules", requiredPermissions: ["module.manage"] },
      { label: "Audit activity", detail: "Governance", href: "/foundation/audit", requiredPermissions: ["audit.read"] },
      { label: "Event stream", detail: "Activity feed", href: "/foundation/events", requiredPermissions: ["event.read"] },
      { label: "Scheduling", detail: "Front desk", href: "/modules/scheduling", requiredPermissions: ["scheduling.read"] },
      { label: "Lab results", detail: "Lab review", href: "/modules/lab/results", requiredPermissions: ["lab.read"] },
    ],
    activeUser
  ).slice(0, 2);
  const roleMetrics = visibleItems<RoleDashboardMetric>(
    [
      { label: "Node Status", value: "Active", detail: "Healthy runtime" },
      { label: "Patients", value: "1", detail: "Master identity ready", requiredPermissions: ["patient.read"] },
      { label: "Care Team", value: "1", detail: "Provider directory ready", requiredPermissions: ["provider.read"] },
      { label: "Enabled Modules", value: String(enabledModules.length), detail: enabledModules.length ? enabledModules.map((module) => module.name).join(", ") : "Foundation only" },
      { label: "Governance Events", value: String(foundation.events.length), detail: "Audit-ready activity", requiredPermissions: ["event.read"] },
      { label: "Registry", value: String(installedModules.length), detail: "Installed modules", requiredPermissions: ["module.manage"] },
    ],
    activeUser
  ).slice(0, 4);
  const readinessChecks = [
    { label: "Node state", done: true, value: "Active" },
    { label: "Patient access", done: canAccess(activeUser, ["patient.read"]), value: canAccess(activeUser, ["patient.read"]) ? "Available" : "Restricted", requiredPermissions: ["patient.read"] },
    { label: "Enabled workflows", done: enabledModules.length > 0, value: `${enabledModules.length} enabled` },
    { label: "Module registry", done: installedModules.length > 0, value: `${installedModules.length} installed`, requiredPermissions: ["module.manage"] },
    { label: "Governance stream", done: foundation.events.length > 0, value: `${foundation.events.length} events`, requiredPermissions: ["event.read"] },
  ];
  const visibleReadinessChecks = visibleItems(readinessChecks, activeUser);
  const readinessScore = Math.round((visibleReadinessChecks.filter((item) => item.done).length / visibleReadinessChecks.length) * 100);
  const actionFallbacks = visibleItems(
    [
      { label: "Review registry", href: "/modules", requiredPermissions: ["module.manage"] },
      { label: "Audit activity", href: "/foundation/audit", requiredPermissions: ["audit.read"] },
      { label: "Open patients", href: "/modules/ehr/patients", requiredPermissions: ["patient.read"] },
    ],
    activeUser
  );
  const visibleActions = [...quickActions, ...actionFallbacks].slice(0, 6);

  return (
    <main className="dashboard-page">
      <section className="dashboard-grid">
        <section className="dashboard-main">
          <div className="hero-card">
            <div>
              <p className="section-kicker">{roleContent.kicker}</p>
              <h1>{roleContent.title}</h1>
              <p>{roleContent.body}</p>
            </div>
            <div className="hero-actions">
              {heroActions.map((action, index) => (
                <Link className={index === 0 ? "button" : "button secondary"} href={action.href} key={action.href}>
                  {action.label}
                </Link>
              ))}
            </div>
          </div>

          <section className="metric-grid">
            {roleMetrics.map(({ label, value, detail }) => (
              <div className="metric-card" key={label}>
                <p>{label}</p>
                <strong>{value}</strong>
                <span>{detail}</span>
              </div>
            ))}
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="section-kicker">Workflow Center</p>
                <h2>{roleLabels[activeUser.role]} readiness</h2>
              </div>
              <span className="status success">{readinessScore}% ready</span>
            </div>
            <div className="readiness-list">
              {visibleReadinessChecks.map((item) => (
                <div className="readiness-item" key={item.label}>
                  <div>
                    <strong>{item.label}</strong>
                    <p>{item.value}</p>
                  </div>
                  <span className={item.done ? "status success" : "status warning"}>{item.done ? "Ready" : "Pending"}</span>
                </div>
              ))}
            </div>
          </section>

          {moduleSections.length > 0 ? (
            <section className="dashboard-injected">
              {moduleSections.map((section) => (
                <div className="panel" key={`${section.moduleId}-${section.title}`}>
                  <div className="panel-header">
                    <div>
                      <p className="section-kicker">{section.moduleLabel}</p>
                      <h2>{section.title}</h2>
                      {section.description ? <p className="muted">{section.description}</p> : null}
                    </div>
                    {section.href ? (
                      <Link className="button secondary compact" href={section.href}>
                        Open
                      </Link>
                    ) : null}
                  </div>
                  <div className="dashboard-widget-grid">
                    {section.widgets.map((widget) => {
                      const widgetContent = (
                        <>
                          <p>{widget.label}</p>
                          <strong>{widget.value}</strong>
                          <span>{widget.detail}</span>
                        </>
                      );

                      return widget.href ? (
                        <Link className={`dashboard-widget ${widget.tone ?? "default"}`} href={widget.href} key={`${section.title}-${widget.label}`}>
                          {widgetContent}
                        </Link>
                      ) : (
                        <div className={`dashboard-widget ${widget.tone ?? "default"}`} key={`${section.title}-${widget.label}`}>
                          {widgetContent}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </section>
          ) : null}

          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="section-kicker">Recent Activity</p>
                <h2>{canAccess(activeUser, ["audit.read"]) ? "Foundation timeline" : "Role activity"}</h2>
              </div>
              {canAccess(activeUser, ["event.read"]) ? (
                <Link className="button secondary compact" href="/foundation/events">
                  View all
                </Link>
              ) : null}
            </div>
            <div className="timeline">
              {foundation.events.slice(-5).map((event) => (
                <div className="timeline-item" key={event.id}>
                  <div>
                    <strong>{event.type}</strong>
                    <p>
                      {event.resourceType} {event.resourceId}
                    </p>
                  </div>
                  <span>{event.sourceModule}</span>
                </div>
              ))}
            </div>
          </section>
        </section>

        <aside className="action-rail">
          <div className="panel compact-panel">
            <p className="section-kicker">{canAccess(activeUser, ["module.manage"]) ? "Installed Modules" : "Clinical Modules"}</p>
            <h2>Enabled workflows</h2>
            <div className="link-list">
              {enabledModules.map((module) => (
                <Link href={module.routes?.[0]?.href ?? module.routes?.[0]?.path ?? `/modules/${module.moduleId}`} key={module.moduleId}>
                  <strong>{module.name}</strong>
                  <span>Version {module.manifestVersion}</span>
                </Link>
              ))}
              {enabledModules.length === 0 ? (
                <Link href="/modules">
                  <strong>No modules enabled</strong>
                  <span>Open registry</span>
                </Link>
              ) : null}
            </div>
          </div>

          <div className="panel compact-panel">
            <p className="section-kicker">{roleLabels[activeUser.role]} Actions</p>
            <div className="action-list">
              {visibleActions.map((action) => (
                <Link href={action.href} key={`${action.label}-${action.href}`}>
                  <strong>{action.label}</strong>
                  <span>Open action</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="panel compact-panel">
            <p className="section-kicker">Alerts</p>
            <div className="notice-list">
              {moduleAlerts.map((alert) => (
                <Link className="notice-card" href={alert.href ?? "/"} key={`${alert.title}-${alert.href}`}>
                  <span className={`status ${alert.severity === "warning" ? "warning" : "success"}`}>{alert.severity}</span>
                  <strong>{alert.title}</strong>
                  <p>{alert.body}</p>
                </Link>
              ))}
              {moduleNotifications.map((notification) => (
                <Link className="notice-card" href={notification.href ?? "/"} key={`${notification.title}-${notification.href}`}>
                  <span className="status warning">setup</span>
                  <strong>{notification.title}</strong>
                  <p>{notification.body}</p>
                </Link>
              ))}
              {moduleAlerts.length === 0 && moduleNotifications.length === 0 ? (
                <div className="notice-card">
                  <span className="status success">clear</span>
                  <strong>No module alerts</strong>
                  <p>Installed modules can surface alerts here when the operator has access.</p>
                </div>
              ) : null}
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
