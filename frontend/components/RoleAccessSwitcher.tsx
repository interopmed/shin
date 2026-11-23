"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type RoleAccessSwitcherProps = {
  activeRole: string;
};

type ActiveUserRole = "administrator" | "clinician" | "lab-manager" | "front-desk" | "auditor";

const activeUserRoles: ActiveUserRole[] = ["administrator", "clinician", "lab-manager", "front-desk", "auditor"];

const roleLabels: Record<ActiveUserRole, string> = {
  administrator: "Administration",
  clinician: "Clinical Team",
  "lab-manager": "Lab Operations",
  "front-desk": "Front Desk",
  auditor: "Audit & Compliance",
};

const roleProfiles: Record<ActiveUserRole, { displayName: string; permissions: string[] }> = {
  administrator: {
    displayName: "Node Administrator",
    permissions: ["patient.read", "provider.read", "facility.read", "audit.read", "event.read", "module.manage"],
  },
  clinician: {
    displayName: "Clinical Team",
    permissions: ["patient.read", "provider.read", "ehr.read", "lab.read", "scheduling.read", "event.read"],
  },
  "lab-manager": {
    displayName: "Lab Manager",
    permissions: ["patient.read", "provider.read", "lab.read", "lab.review", "event.read"],
  },
  "front-desk": {
    displayName: "Front Desk",
    permissions: ["patient.read", "provider.read", "scheduling.read"],
  },
  auditor: {
    displayName: "Compliance Auditor",
    permissions: ["audit.read", "event.read"],
  },
};

export default function RoleAccessSwitcher({ activeRole }: RoleAccessSwitcherProps) {
  const router = useRouter();
  const [pendingRole, setPendingRole] = useState<ActiveUserRole | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function changeRole(role: ActiveUserRole) {
    setPendingRole(role);
    setError(null);

    try {
      const response = await fetch("/api/active-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });

      if (!response.ok) {
        throw new Error("Role update failed");
      }

      router.refresh();
    } catch {
      setError("Could not update the access layout.");
    } finally {
      setPendingRole(null);
    }
  }

  return (
    <div className="role-access-switcher">
      <div className="role-access-grid" role="list">
        {activeUserRoles.map((role) => {
          const profile = roleProfiles[role];
          const isActive = role === activeRole;
          const isPending = pendingRole === role;

          return (
            <button
              className={isActive ? "role-access-option active" : "role-access-option"}
              disabled={pendingRole !== null}
              key={role}
              onClick={() => changeRole(role)}
              type="button"
            >
              <span>{roleLabels[role]}</span>
              <strong>{profile.displayName}</strong>
              <small>{profile.permissions.length} permissions</small>
              <b>{isPending ? "Applying" : isActive ? "Active" : "Preview"}</b>
            </button>
          );
        })}
      </div>
      {error ? <p className="role-access-error">{error}</p> : null}
    </div>
  );
}
