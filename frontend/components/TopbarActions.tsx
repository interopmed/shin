"use client";

import Link from "next/link";
import { useState } from "react";

type TopbarActionsProps = {
  roleLabel: string;
  userInitials?: string;
};

function BellIcon() {
  return (
    <svg
      aria-hidden="true"
      className="topbar-action-icon"
      fill="none"
      height="18"
      viewBox="0 0 24 24"
      width="18"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10.3 21a2 2 0 0 0 3.4 0M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export default function TopbarActions({ roleLabel, userInitials = "NA" }: TopbarActionsProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="topbar-actions">
      <span className="topbar-role">{roleLabel}</span>
      <Link className="topbar-primary" href="/modules">
        Manage modules
      </Link>
      <Link className="topbar-icon" href="/foundation/events" aria-label="Events">
        <BellIcon />
        <span className="notification-dot" />
      </Link>
      <div className="topbar-user-menu">
        <button
          aria-expanded={isOpen}
          aria-haspopup="menu"
          aria-label="Open user menu"
          className="topbar-avatar"
          onClick={() => setIsOpen((value) => !value)}
          type="button"
        >
          {userInitials}
        </button>
        {isOpen ? (
          <div className="topbar-menu" role="menu">
            <div className="topbar-menu-header">
              <strong>Node Administrator</strong>
              <span>{roleLabel}</span>
            </div>
            <Link href="/settings/user" onClick={() => setIsOpen(false)} role="menuitem">
              User settings
            </Link>
            <Link href="/settings/user" onClick={() => setIsOpen(false)} role="menuitem">
              Access layout
            </Link>
            <Link href="/settings" onClick={() => setIsOpen(false)} role="menuitem">
              Node settings
            </Link>
            <Link href="/dashboard" onClick={() => setIsOpen(false)} role="menuitem">
              Dashboard
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
