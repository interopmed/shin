"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { NavigationGroup } from "../lib/navigation";
import type { ShinNodeState } from "../lib/node-state";

type SidebarProps = {
  nodeState: ShinNodeState;
  navigationGroups: NavigationGroup[];
};

function isActive(pathname: string, href: string) {
  const cleanHref = href.split("#")[0];
  if (cleanHref === "/") {
    return pathname === "/";
  }

  if (cleanHref === "/modules/ehr/patients") {
    return pathname === "/modules/ehr/patients" || (pathname.startsWith("/modules/ehr/patients/") && !pathname.startsWith("/patients/mpi"));
  }

  if (cleanHref.startsWith("/modules/") && cleanHref.split("/").length === 3) {
    return pathname === cleanHref;
  }

  return pathname === cleanHref || pathname.startsWith(`${cleanHref}/`);
}

function SidebarIcon({ name = "dashboard" }: { name?: string }) {
  const commonProps = {
    xmlns: "http://www.w3.org/2000/svg",
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "sidebar-icon",
    "aria-hidden": true,
  };

  if (name === "users") {
    return (
      <svg {...commonProps}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  }

  if (name === "shield") {
    return (
      <svg {...commonProps}>
        <path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V5l8-3 8 3z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    );
  }

  if (name === "settings") {
    return (
      <svg {...commonProps}>
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.51a2 2 0 0 1 1-1.72l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }

  if (name === "activity") {
    return (
      <svg {...commonProps}>
        <path d="M3 12h4l3 8 4-16 3 8h4" />
      </svg>
    );
  }

  if (name === "bell") {
    return (
      <svg {...commonProps}>
        <path d="M10.3 21a2 2 0 0 0 3.4 0" />
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      </svg>
    );
  }

  if (name === "file") {
    return (
      <svg {...commonProps}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M8 13h8" />
        <path d="M8 17h5" />
      </svg>
    );
  }

  if (name === "building") {
    return (
      <svg {...commonProps}>
        <path d="M3 21h18" />
        <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" />
        <path d="M9 7h1" />
        <path d="M14 7h1" />
        <path d="M9 12h1" />
        <path d="M14 12h1" />
      </svg>
    );
  }

  if (name === "module") {
    return (
      <svg {...commonProps}>
        <rect width="7" height="7" x="3" y="3" rx="1" />
        <rect width="7" height="7" x="14" y="3" rx="1" />
        <rect width="7" height="7" x="14" y="14" rx="1" />
        <rect width="7" height="7" x="3" y="14" rx="1" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </svg>
  );
}

export default function Sidebar({ nodeState, navigationGroups }: SidebarProps) {
  const pathname = usePathname();
  const currentPathname = pathname ?? "/";
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside className={`sidebar ${isCollapsed ? "is-collapsed" : ""}`}>
      <div className="sidebar-inner">
        <div className={`sidebar-brand-row ${isCollapsed ? "centered" : ""}`}>
          <div className="brand-mark">SN</div>
          <div className={isCollapsed ? "sr-only" : "brand-copy"}>
            <Link href="/" className="brand">
              SHIN Node
            </Link>
            <p className="brand-subtitle">Institute dashboard</p>
          </div>
        </div>

        <nav className={`nav ${isCollapsed ? "collapsed" : ""}`} aria-label="SHIN navigation">
          <div className={`collapse-row ${isCollapsed ? "centered" : ""}`}>
            <button
              type="button"
              onClick={() => setIsCollapsed((value) => !value)}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="sidebar-collapse-button"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={isCollapsed ? "rotated sidebar-icon" : "sidebar-icon"}
                aria-hidden="true"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
          </div>

          {navigationGroups.map((group) => (
            <div className="nav-section" key={group.label}>
              <p className={isCollapsed ? "sr-only" : "nav-heading"}>{group.label}</p>
              <div className="nav-items">
                {group.items.map((item) => {
                  const active = isActive(currentPathname, item.href);

                  return (
                    <Link
                      href={item.href}
                      key={item.href}
                      title={isCollapsed ? item.label : undefined}
                      className={`nav-link ${active ? "active" : ""}`}
                    >
                      <span className="nav-link-main">
                        <span className="nav-icon-box">
                          <SidebarIcon name={item.icon} />
                        </span>
                        <span className={isCollapsed ? "sr-only" : "nav-text"}>
                          <span className="nav-label">{item.label}</span>
                          {item.detail ? <span className="nav-detail">{item.detail}</span> : null}
                        </span>
                      </span>
                      {item.badge && !isCollapsed ? <span className="nav-badge">{item.badge}</span> : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className={isCollapsed ? "node-chip centered" : "node-chip"}>
            <div className="node-avatar">NA</div>
            <div className={isCollapsed ? "sr-only" : "node-copy"}>
              <p>{nodeState.organization.name}</p>
              <span>Local administrator</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
