"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getIdentityWork,
  type IdentityWorkEmployee,
  type IdentityWorkGroup,
  type IdentityWorkProviderPerson,
  type IdentityWorkResult,
  type IdentityWorkRole,
  type IdentityWorkUser,
  updateIdentityWorkUser,
} from "../lib/identity-work";

function Icon({ name }: { name: "shield" | "users" | "building" | "key" | "bell" | "refresh" }) {
  const common = {
    "aria-hidden": true,
    fill: "none",
    height: 16,
    viewBox: "0 0 24 24",
    width: 16,
    xmlns: "http://www.w3.org/2000/svg",
  } as const;

  if (name === "users") {
    return (
      <svg {...common}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        <path d="M11 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      </svg>
    );
  }

  if (name === "building") {
    return (
      <svg {...common}>
        <path d="M3 21h18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        <path d="M5 21V7l7-4 7 4v14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        <path d="M9 21v-4h6v4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      </svg>
    );
  }

  if (name === "key") {
    return (
      <svg {...common}>
        <path d="m21 2-2 2m-3.5 3.5a5 5 0 1 0-7.07 7.07A5 5 0 0 0 15.5 7.5Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        <path d="M11 13 7 17H4v3H1v-3l7-7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      </svg>
    );
  }

  if (name === "bell") {
    return (
      <svg {...common}>
        <path d="M10.5 21a2 2 0 0 0 3 0" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      </svg>
    );
  }

  if (name === "refresh") {
    return (
      <svg {...common}>
        <path d="M21 12a9 9 0 1 1-3.2-6.9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        <path d="M21 3v6h-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M10 3h4l1 3h4l-1 14H6L5 6h4l1-3Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

type Draft = {
  roleCode: string;
  groupCode: string;
  status: string;
  mfaEnabled: boolean;
};

export default function IdentityWorkClient() {
  const [data, setData] = useState<IdentityWorkResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        const payload = await getIdentityWork();
        if (!alive) {
          return;
        }

        setData(payload);
        setDrafts(
          payload.users.reduce<Record<string, Draft>>((accumulator, user) => {
            accumulator[user.id] = {
              roleCode: user.roleCode,
              groupCode: user.groupCode,
              status: user.status,
              mfaEnabled: user.mfaEnabled,
            };
            return accumulator;
          }, {})
        );
        setError("");
      } catch (nextError) {
        if (!alive) {
          return;
        }

        setError(nextError instanceof Error ? nextError.message : "Unable to load identity work.");
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      alive = false;
    };
  }, []);

  const roleOptions = useMemo<IdentityWorkRole[]>(() => data?.roles ?? [], [data]);
  const groupOptions = useMemo<IdentityWorkGroup[]>(() => data?.groups ?? [], [data]);
  const employeeRoster = useMemo<IdentityWorkEmployee[]>(() => data?.employees ?? [], [data]);

  async function saveUser(user: IdentityWorkUser) {
    const draft = drafts[user.id];
    if (!draft) {
      return;
    }

    setSavingUserId(user.id);
    try {
      const updated = await updateIdentityWorkUser(user.id, draft);
      setData((current) =>
        current
          ? {
              ...current,
              users: current.users.map((row) => (row.id === user.id ? updated : row)),
            }
          : current
      );
      setDrafts((current) => ({
        ...current,
        [user.id]: {
          roleCode: updated.roleCode,
          groupCode: updated.groupCode,
          status: updated.status,
          mfaEnabled: updated.mfaEnabled,
        },
      }));
    } finally {
      setSavingUserId(null);
    }
  }

  return (
    <section className="identity-work-page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Foundation</div>
          <h1>Identity Work</h1>
          <p className="muted">
            Database-driven role, group, employee, and provider management with a separate external registry for lab and referral workflows.
          </p>
        </div>
        <div className="action-row">
          <button className="button secondary" type="button" onClick={() => window.location.reload()}>
            <Icon name="refresh" />
            Refresh
          </button>
          <button className="button" type="button">
            <Icon name="shield" />
            Add Role
          </button>
        </div>
      </div>

      {error ? <div className="panel identity-banner danger">{error}</div> : null}
      {loading && !data ? <div className="panel identity-banner">Loading identity registry...</div> : null}

      {data ? (
        <div className="identity-work-grid">
          <div className="identity-work-main">
            <section className="panel">
              <div className="identity-summary-grid">
                <div><span>Users</span><strong>{data.summary.users}</strong></div>
                <div><span>Roles</span><strong>{data.summary.roles}</strong></div>
                <div><span>Groups</span><strong>{data.summary.groups}</strong></div>
                <div><span>Permissions</span><strong>{data.summary.permissions}</strong></div>
                <div><span>Employees</span><strong>{data.summary.employees}</strong></div>
              </div>
            </section>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <div className="eyebrow">Access Control</div>
                  <h2>User Access Layout</h2>
                </div>
                <div className="muted">
                  {data.summary.externalDoctors} external doctors and {data.summary.institutes} institutes in registry
                </div>
              </div>

              <div className="identity-table-wrap">
                <table className="identity-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Role</th>
                      <th>Group</th>
                      <th>Status</th>
                      <th>MFA</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {data.users.map((user) => {
                      const draft = drafts[user.id];

                      return (
                        <tr key={user.id}>
                          <td>
                            <strong>{user.displayName}</strong>
                            <span>{user.username}</span>
                            <span>{user.email}</span>
                          </td>
                          <td>
                            <select
                              className="identity-select"
                              value={draft?.roleCode ?? ""}
                              onChange={(event) =>
                                setDrafts((current) => ({
                                  ...current,
                                  [user.id]: { ...(current[user.id] ?? draft), roleCode: event.target.value },
                                }))
                              }
                            >
                              {roleOptions.map((role) => (
                                <option key={role.code} value={role.code}>
                                  {role.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <select
                              className="identity-select"
                              value={draft?.groupCode ?? ""}
                              onChange={(event) =>
                                setDrafts((current) => ({
                                  ...current,
                                  [user.id]: { ...(current[user.id] ?? draft), groupCode: event.target.value },
                                }))
                              }
                            >
                              {groupOptions.map((group) => (
                                <option key={group.code} value={group.code}>
                                  {group.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <select
                              className="identity-select"
                              value={draft?.status ?? user.status}
                              onChange={(event) =>
                                setDrafts((current) => ({
                                  ...current,
                                  [user.id]: { ...(current[user.id] ?? draft), status: event.target.value },
                                }))
                              }
                            >
                              <option value="Active">Active</option>
                              <option value="Inactive">Inactive</option>
                              <option value="Suspended">Suspended</option>
                            </select>
                          </td>
                          <td>
                            <label className="identity-toggle">
                              <input
                                checked={Boolean(draft?.mfaEnabled)}
                                onChange={(event) =>
                                  setDrafts((current) => ({
                                    ...current,
                                    [user.id]: { ...(current[user.id] ?? draft), mfaEnabled: event.target.checked },
                                  }))
                                }
                                type="checkbox"
                              />
                              <span>MFA</span>
                            </label>
                          </td>
                          <td>
                            <button
                              className="button compact"
                              disabled={savingUserId === user.id}
                              type="button"
                              onClick={() => saveUser(user)}
                            >
                              {savingUserId === user.id ? "Saving..." : "Save"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <div className="eyebrow">Staff</div>
                  <h2>Internal Employees</h2>
                </div>
                <div className="muted">Clinical and non-clinical staff</div>
              </div>
              <div className="identity-stack">
                {employeeRoster.map((employee) => (
                  <div className="identity-list-row" key={employee.code}>
                    <div>
                      <strong>{employee.fullName}</strong>
                      <p>
                        {employee.jobTitle} - {employee.department} / {employee.facility}
                      </p>
                    </div>
                    <span>{employee.staffType}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid cols-2">
              <div className="panel">
                <div className="panel-header">
                  <div>
                    <div className="eyebrow">Roles</div>
                    <h2>Access Model</h2>
                  </div>
                  <Icon name="key" />
                </div>
                <div className="identity-stack">
                  {data.roles.map((role) => (
                    <div className="identity-list-row" key={role.code}>
                      <div>
                        <strong>{role.name}</strong>
                        <p>{role.description}</p>
                      </div>
                      <span>{role.userCount ?? 0} users</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <div>
                    <div className="eyebrow">Groups</div>
                    <h2>Security Groups</h2>
                  </div>
                  <Icon name="users" />
                </div>
                <div className="identity-stack">
                  {data.groups.map((group) => (
                    <div className="identity-list-row" key={group.code}>
                      <div>
                        <strong>{group.name}</strong>
                        <p>{group.description}</p>
                      </div>
                      <span>{group.memberCount ?? 0} members</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          <aside className="identity-work-side">
            <section className="panel">
              <div className="panel-header">
                <div>
                  <div className="eyebrow">Lab Registry</div>
                  <h2>External Providers</h2>
                </div>
                <Icon name="building" />
              </div>
              <div className="identity-stack">
                {data.providerRegistry.people.map((provider: IdentityWorkProviderPerson) => (
                  <div className="identity-list-row" key={provider.code}>
                    <div>
                      <strong>{provider.fullName}</strong>
                      <p>{provider.specialty || "Provider"} - {provider.organizationName}</p>
                    </div>
                    <span>{provider.providerCategory}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <div className="eyebrow">Institutes</div>
                  <h2>Provider Organizations</h2>
                </div>
                <Icon name="bell" />
              </div>
              <div className="identity-stack">
                {data.providerRegistry.organizations.map((organization) => (
                  <div className="identity-list-row" key={organization.code}>
                    <div>
                      <strong>{organization.name}</strong>
                      <p>{organization.organizationType}</p>
                    </div>
                    <span>{organization.providerKind}</span>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
