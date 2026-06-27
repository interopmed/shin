import Link from "next/link";
import { notFound } from "next/navigation";
import { getShinNodeState } from "../../../lib/node-state";

type ModulePageProps = {
  params: Promise<{
    moduleId: string;
  }>;
};

export default async function InstalledModulePage({ params }: ModulePageProps) {
  const { moduleId } = await params;
  const nodeState = getShinNodeState();
  const module = nodeState.installedModules.find((installed) => installed.moduleId === moduleId);

  if (!module) {
    notFound();
  }

  const routes = module.routes ?? [];
  const setupChecklist = module.setupChecklist ?? [];
  const setupCompleted = new Set(module.setupCompleted ?? []);

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <div className="eyebrow">Installed Module</div>
          <h1>{module.name}</h1>
          <p className="muted">
            Version {module.manifestVersion} from {module.repositoryUrl} at {module.ref}.
          </p>
        </div>
        <Link className="button secondary" href="/modules">
          Module Registry
        </Link>
      </header>

      <section className="grid cols-4">
        <div className="panel stat">
          <span className="muted">Status</span>
          <span className="stat-value">{module.status}</span>
          <span className={module.status === "enabled" ? "status success" : "status warning"}>{module.moduleId}</span>
        </div>
        <div className="panel stat">
          <span className="muted">Routes</span>
          <span className="stat-value">{routes.length}</span>
          <span className="muted">From installed manifest</span>
        </div>
        <div className="panel stat">
          <span className="muted">Permissions</span>
          <span className="stat-value">{module.permissions?.length ?? 0}</span>
          <span className="muted">Module-scoped access</span>
        </div>
        <div className="panel stat">
          <span className="muted">Setup</span>
          <span className="stat-value">
            {setupCompleted.size}/{setupChecklist.length}
          </span>
          <span className="muted">Checklist progress</span>
        </div>
      </section>

      <section className="grid cols-2">
        <div className="panel">
          <h2>Installed Source</h2>
          <ul className="list">
            <li>
              <strong>Repo</strong>
              <p className="muted">{module.installPath ?? "Not recorded"}</p>
            </li>
            <li>
              <strong>Manifest</strong>
              <p className="muted">{module.manifestPath ?? "Not recorded"}</p>
            </li>
            <li>
              <strong>Commit</strong>
              <p className="muted">{module.commit ?? "Not recorded"}</p>
            </li>
          </ul>
        </div>

        <div className="panel">
          <h2>Module Routes</h2>
          <ul className="list">
            {routes.map((route) => {
              const href = route.href ?? route.path ?? `/modules/${module.moduleId}`;

              return (
                <li key={`${route.label}-${href}`}>
                  <strong>{route.label}</strong>
                  <p className="muted">{href}</p>
                </li>
              );
            })}
            {routes.length === 0 ? (
              <li>
                <strong>No routes declared</strong>
                <p className="muted">Add routes to the module manifest to show links in the SHIN sidebar.</p>
              </li>
            ) : null}
          </ul>
        </div>
      </section>

      <section className="grid cols-2">
        <div className="panel">
          <h2>Permissions</h2>
          <ul className="list">
            {(module.permissions ?? []).map((permission) => (
              <li key={permission}>
                <strong>{permission}</strong>
              </li>
            ))}
            {module.permissions?.length ? null : (
              <li>
                <strong>No permissions declared</strong>
                <p className="muted">This module has not declared shell-visible permissions.</p>
              </li>
            )}
          </ul>
        </div>

        <div className="panel">
          <h2>Setup Checklist</h2>
          <ul className="list">
            {setupChecklist.map((item) => (
              <li key={item}>
                <strong>{item}</strong>
                <p className="muted">{setupCompleted.has(item) ? "Completed" : "Pending"}</p>
              </li>
            ))}
            {setupChecklist.length === 0 ? (
              <li>
                <strong>No setup steps declared</strong>
                <p className="muted">This module can add setupChecklist entries to its manifest.</p>
              </li>
            ) : null}
          </ul>
        </div>
      </section>
    </div>
  );
}
