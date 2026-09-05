"use client";

import Link from "next/link";
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
  const [page, setPage] = useState(1);
  const [empPage, setEmpPage] = useState(1);
  const pageSize = 10;

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
      const [updated] = await Promise.all([
        updateIdentityWorkUser(user.id, draft),
        new Promise((resolve) => setTimeout(resolve, 2000))
      ]);
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

  const getPaginationRange = (current: number, total: number) => {
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 3) return [1, 2, 3, 4, '...', total];
    if (current >= total - 2) return [1, '...', total - 3, total - 2, total - 1, total];
    return [1, '...', current - 1, current, current + 1, '...', total];
  };

  const [searchQuery, setSearchQuery] = useState("");

  const filteredUsers = useMemo(() => {
    if (!data?.users) return [];
    if (!searchQuery.trim()) return data.users;

    const lowerQuery = searchQuery.toLowerCase();
    return data.users.filter(user =>
      user.displayName.toLowerCase().includes(lowerQuery) ||
      user.username.toLowerCase().includes(lowerQuery) ||
      (user.email && user.email.toLowerCase().includes(lowerQuery))
    );
  }, [data?.users, searchQuery]);

  const usersCount = filteredUsers.length;
  const totalPages = Math.ceil(usersCount / pageSize) || 1;
  const startRecord = usersCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRecord = Math.min(page * pageSize, usersCount);
  const hasNext = page < totalPages;
  const hasPrevious = page > 1;

  const currentUsers = useMemo(() => {
    return filteredUsers.slice((page - 1) * pageSize, page * pageSize);
  }, [filteredUsers, page, pageSize]);

  const empCount = employeeRoster.length;
  const empTotalPages = Math.ceil(empCount / pageSize) || 1;
  const empStartRecord = empCount === 0 ? 0 : (empPage - 1) * pageSize + 1;
  const empEndRecord = Math.min(empPage * pageSize, empCount);
  const empHasNext = empPage < empTotalPages;
  const empHasPrevious = empPage > 1;

  const currentEmployees = useMemo(() => {
    return employeeRoster.slice((empPage - 1) * pageSize, empPage * pageSize);
  }, [employeeRoster, empPage, pageSize]);

  return (
    <>
      {savingUserId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255, 255, 255, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div style={{ background: '#0f172a', color: 'white', padding: '16px 32px', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ width: '20px', height: '20px', border: '3px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            Saving
          </div>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      )}
      <section className="mpi-page">
        <div className="mpi-card" style={{ marginBottom: "24px" }}>
          <header className="mpi-header">
            <div>
              <div className="eyebrow" style={{ color: "var(--accent)", textTransform: "uppercase", fontSize: "0.85rem", fontWeight: "bold" }}>Foundation</div>
              <h1>Identity Work</h1>
              <p className="patient-db-status">
                Database-driven role, group, employee, and provider management with a separate external registry for lab and referral workflows.
              </p>
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button className="button secondary compact" style={{ display: "flex", gap: "4px", alignItems: "center" }} type="button" onClick={() => window.location.reload()}>
                <Icon name="refresh" />
                Refresh
              </button>
              <button className="mpi-primary-button" style={{ display: "flex", gap: "4px", alignItems: "center", minHeight: "36px", padding: "0 16px" }} type="button">
                <Icon name="shield" />
                Add Role
              </button>
            </div>
          </header>
        </div>

        {error ? <div className="mpi-card" style={{ padding: "16px", marginBottom: "24px", color: "#be123c", backgroundColor: "#ffe4e6", border: "1px solid #fda4af" }}>{error}</div> : null}
        {loading && !data ? <div className="mpi-card" style={{ padding: "40px", marginBottom: "24px", textAlign: "center", color: "#64748b" }}>Loading identity registry...</div> : null}

        {data ? (
          <div>
            <div>
              <div className="mpi-card" style={{ marginBottom: "24px" }}>
                <div className="identity-summary-grid" style={{ padding: "20px" }}>
                  <div style={{ display: "flex", flexDirection: "column" }}><span style={{ fontSize: "13px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Users</span><strong style={{ fontSize: "24px" }}>{data.summary.users}</strong></div>
                  <div style={{ display: "flex", flexDirection: "column" }}><span style={{ fontSize: "13px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Roles</span><strong style={{ fontSize: "24px" }}>{data.summary.roles}</strong></div>
                  <div style={{ display: "flex", flexDirection: "column" }}><span style={{ fontSize: "13px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Groups</span><strong style={{ fontSize: "24px" }}>{data.summary.groups}</strong></div>
                  <div style={{ display: "flex", flexDirection: "column" }}><span style={{ fontSize: "13px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Permissions</span><strong style={{ fontSize: "24px" }}>{data.summary.permissions}</strong></div>
                  <div style={{ display: "flex", flexDirection: "column" }}><span style={{ fontSize: "13px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Employees</span><strong style={{ fontSize: "24px" }}>{data.summary.employees}</strong></div>
                </div>
              </div>

              <div className="mpi-card" style={{ marginBottom: "24px" }}>
                <header className="mpi-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h2 style={{ fontSize: "18px", margin: 0 }}>User Access Layout</h2>
                    <p className="patient-db-status">
                      {data.summary.externalDoctors} external doctors and {data.summary.institutes} institutes in registry
                    </p>
                  </div>
                  <div>
                    <input
                      type="search"
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                      style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", minWidth: "250px" }}
                    />
                  </div>
                </header>

                <div className="mpi-table-wrap">
                  <table className="mpi-table">
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
                      {currentUsers.map((user) => {
                        const draft = drafts[user.id];

                        const isEdited = draft && (
                          draft.roleCode !== user.roleCode ||
                          draft.groupCode !== user.groupCode ||
                          draft.status !== user.status ||
                          draft.mfaEnabled !== user.mfaEnabled
                        );

                        return (
                          <tr key={user.id}>
                            <td>
                              <strong>{user.displayName}</strong>
                              <span style={{ display: "block", color: "#475569", fontSize: "13px" }}>{user.username}</span>
                              <span style={{ display: "block", color: "#64748b", fontSize: "13px" }}>{user.email}</span>
                            </td>
                            <td>
                              <select
                                className="identity-select"
                                style={{ padding: "6px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
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
                                style={{ padding: "6px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                                value={draft?.groupCode ?? ""}
                                onChange={(event) =>
                                  setDrafts((current) => ({
                                    ...current,
                                    [user.id]: { ...(current[user.id] ?? draft), groupCode: event.target.value },
                                  }))
                                }
                              >
                                <option value="">Select group</option>
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
                                style={{ padding: "6px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
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
                              <label className="identity-toggle" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
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
                                <span style={{ fontSize: "13px", fontWeight: 500 }}>MFA</span>
                              </label>
                            </td>
                            <td>
                              <button
                                className="button compact primary"
                                disabled={savingUserId === user.id}
                                type="button"
                                onClick={() => saveUser(user)}
                                style={{ visibility: isEdited ? 'visible' : 'hidden' }}
                              >
                                Save
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mpi-pagination-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: '14px 24px', borderTop: '1px solid #e3e9f1' }}>
                  <p style={{ margin: 0, fontSize: '13px', color: '#667085', fontWeight: 600 }}>
                    Showing <strong>{startRecord}-{endRecord}</strong> of <strong>{usersCount}</strong> user{usersCount === 1 ? "" : "s"}
                  </p>

                  <div className="mpi-pagination-controls" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button
                      className="button secondary compact"
                      disabled={!hasPrevious && page <= 1}
                      onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                      style={{ minHeight: '34px' }}
                    >
                      Previous
                    </button>

                    {getPaginationRange(page, totalPages).map((pageNum, index) => {
                      if (pageNum === "...") {
                        return (
                          <span
                            key={`ellipsis-${index}`}
                            style={{
                              padding: '0 8px',
                              fontSize: '13px',
                              fontWeight: 800,
                              color: '#98a2b3',
                              display: 'inline-flex',
                              alignItems: 'center',
                              minHeight: '34px'
                            }}
                          >
                            ...
                          </span>
                        );
                      }

                      const pageNumber = pageNum as number;
                      const isActive = pageNumber === page;
                      return (
                        <button
                          key={index}
                          onClick={() => setPage(pageNumber)}
                          style={{
                            padding: '0 12px',
                            fontSize: '13px',
                            fontWeight: 700,
                            color: isActive ? '#fff' : '#475467',
                            background: isActive ? '#0f172a' : '#fff',
                            border: `1px solid ${isActive ? '#0f172a' : '#d5dde8'}`,
                            borderRadius: '8px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: '34px',
                            minHeight: '34px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          {pageNumber}
                        </button>
                      );
                    })}

                    <button
                      className="button secondary compact"
                      disabled={!hasNext && page >= totalPages}
                      onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                      style={{ minHeight: '34px' }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>



              <section className="grid cols-2" style={{ gap: "24px", display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                <div className="mpi-card">
                  <header className="mpi-header" style={{ alignItems: "center" }}>
                    <div>
                      <h2 style={{ fontSize: "18px", margin: 0 }}>Access Model</h2>
                      <p className="patient-db-status">Roles</p>
                    </div>
                    <Icon name="key" />
                  </header>
                  <div className="identity-stack" style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                    {data.roles.map((role) => (
                      <div className="identity-list-row" key={role.code} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: "12px", borderBottom: "1px solid #f1f5f9" }}>
                        <div>
                          <strong style={{ display: "block", color: "#0f172a" }}>{role.name}</strong>
                          <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "13px" }}>{role.description}</p>
                        </div>
                        <span style={{ fontSize: "13px", fontWeight: 600, whiteSpace: "nowrap" }}>{role.userCount ?? 0} users</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mpi-card">
                  <header className="mpi-header" style={{ alignItems: "center" }}>
                    <div>
                      <h2 style={{ fontSize: "18px", margin: 0 }}>Security Groups</h2>
                      <p className="patient-db-status">Groups</p>
                    </div>
                    <Icon name="users" />
                  </header>
                  <div className="identity-stack" style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                    {data.groups.map((group) => (
                      <div className="identity-list-row" key={group.code} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: "12px", borderBottom: "1px solid #f1f5f9" }}>
                        <div>
                          <strong style={{ display: "block", color: "#0f172a" }}>{group.name}</strong>
                          <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "13px" }}>{group.description}</p>
                        </div>
                        <span style={{ fontSize: "13px", fontWeight: 600, whiteSpace: "nowrap" }}>{group.memberCount ?? 0} members</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
              <section className="grid cols-2" style={{ gap: "24px", display: "grid", gridTemplateColumns: "1fr 1fr", marginTop: "24px" }}>
                <div className="mpi-card">
                  <header className="mpi-header" style={{ alignItems: "center" }}>
                    <div>
                      <h2 style={{ fontSize: "18px", margin: 0 }}>External Providers</h2>
                      <p className="patient-db-status">Lab Registry</p>
                    </div>
                    <Icon name="building" />
                  </header>
                  <div className="identity-stack" style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                    {data.providerRegistry.people.map((provider: IdentityWorkProviderPerson) => (
                      <div className="identity-list-row" key={provider.code} style={{ display: "flex", flexDirection: "column", gap: "4px", paddingBottom: "12px", borderBottom: "1px solid #f1f5f9" }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <strong style={{ color: "#0f172a" }}>{provider.fullName}</strong>
                          <span style={{ fontSize: "12px", fontWeight: 600, color: "#2563eb", backgroundColor: "#eff6ff", padding: "2px 6px", borderRadius: "4px" }}>{provider.providerCategory}</span>
                        </div>
                        <p style={{ margin: 0, color: "#64748b", fontSize: "13px" }}>{provider.specialty || "Provider"} - {provider.organizationName}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mpi-card">
                  <header className="mpi-header" style={{ alignItems: "center" }}>
                    <div>
                      <h2 style={{ fontSize: "18px", margin: 0 }}>Provider Organizations</h2>
                      <p className="patient-db-status">Institutes</p>
                    </div>
                    <Icon name="bell" />
                  </header>
                  <div className="identity-stack" style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                    {data.providerRegistry.organizations.map((organization) => (
                      <div className="identity-list-row" key={organization.code} style={{ display: "flex", flexDirection: "column", gap: "4px", paddingBottom: "12px", borderBottom: "1px solid #f1f5f9" }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <strong style={{ color: "#0f172a" }}>{organization.name}</strong>
                          <span style={{ fontSize: "12px", fontWeight: 600, color: "#059669", backgroundColor: "#ecfdf5", padding: "2px 6px", borderRadius: "4px" }}>{organization.providerKind}</span>
                        </div>
                        <p style={{ margin: 0, color: "#64748b", fontSize: "13px" }}>{organization.organizationType}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          </div>
        ) : null}
      </section>
    </>
  );
}
