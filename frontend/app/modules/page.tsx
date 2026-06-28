import Link from "next/link";
import registry from "../../config/approved-modules.json";
import { getShinNodeState } from "../../lib/node-state";
import {
  disableModuleAction,
  enableModuleAction,
  installModuleAction,
  uninstallModuleAction,
} from "./actions";

export default function ModulesPage() {
  const nodeState = getShinNodeState();
  const installedModules = new Map(nodeState.installedModules.map((module) => [module.moduleId, module]));
  const approvedModuleIds = new Set(registry.manifests.map((module) => module.moduleId));
  const moduleRows = [
    ...registry.manifests.map((module) => ({ ...module, approved: true })),
    ...nodeState.installedModules
      .filter((module) => !approvedModuleIds.has(module.moduleId))
      .map((module) => ({
        moduleId: module.moduleId,
        name: module.name,
        version: module.manifestVersion,
        category: "installed",
        description: "Installed module discovered from this SHIN Node state.",
        repositoryUrl: module.repositoryUrl,
        minPlatformVersion: nodeState.platformVersion,
        dependencies: [],
        permissions: module.permissions ?? [],
        routes: module.routes ?? [],
        events: { publishes: [], subscribes: [] },
        setupChecklist: module.setupChecklist ?? [],
        approved: false,
      })),
  ];

  return (
    <div className="stack">
      <nav className="facility-breadcrumb" aria-label="Breadcrumb">
        <Link href="/dashboard">Dashboard</Link>
        <span className="separator">/</span>
        <span className="current">Modules</span>
      </nav>

      <header className="page-header">
        <div>
          <div className="eyebrow">Module Registry</div>
          <h1>Installed and Available Modules</h1>
          <p className="muted">Approved module manifests that can be installed into this SHIN Node.</p>
        </div>
      </header>

      <section className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Module</th>
              <th>Status</th>
              <th>Source</th>
              <th>Permissions</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {moduleRows.map((module) => {
              const installed = installedModules.get(module.moduleId);
              const isEnabled = installed?.status === "enabled";

              return (
                <tr key={module.moduleId}>
                  <td>
                    <strong>{module.name}</strong>
                    <p className="muted">{module.description}</p>
                    {!module.approved ? <p className="muted">Local installed module, not in approved registry.</p> : null}
                    {installed?.installPath ? <p className="muted">Installed at {installed.installPath}</p> : null}
                  </td>
                  <td>
                    <span className={`status ${isEnabled ? "success" : "warning"}`}>
                      {installed?.status ?? "available"}
                    </span>
                  </td>
                  <td>{module.repositoryUrl}</td>
                  <td>{module.permissions.join(", ")}</td>
                  <td>
                    <div className="action-row">
                      {!installed && module.approved ? (
                        <form action={installModuleAction}>
                          <input name="moduleId" type="hidden" value={module.moduleId} />
                          <button className="button compact" type="submit">
                            Install
                          </button>
                        </form>
                      ) : null}
                      {installed && installed.status !== "enabled" ? (
                        <form action={enableModuleAction}>
                          <input name="moduleId" type="hidden" value={module.moduleId} />
                          <button className="button compact" type="submit">
                            Enable
                          </button>
                        </form>
                      ) : null}
                      {installed?.status === "enabled" ? (
                        <form action={disableModuleAction}>
                          <input name="moduleId" type="hidden" value={module.moduleId} />
                          <button className="button secondary compact" type="submit">
                            Disable
                          </button>
                        </form>
                      ) : null}
                      {installed ? (
                        <form action={uninstallModuleAction}>
                          <input name="moduleId" type="hidden" value={module.moduleId} />
                          <button className="button danger compact" type="submit">
                            Uninstall
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
