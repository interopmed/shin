"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

type TopbarActionsProps = {
  roleLabel?: string;
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

export default function TopbarActions({ roleLabel: fallbackRoleLabel, userInitials: fallbackInitials = "NA" }: TopbarActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { logout, user } = useAuth();
  
  const displayRole = user?.role || fallbackRoleLabel || "User";
  const displayUsername = user?.username || "Node Administrator";
  
  const computedInitials = user?.username 
    ? user.username.substring(0, 2).toUpperCase()
    : fallbackInitials;

  return (
    <div className="topbar-actions">
      <span className="topbar-role">{displayRole}</span>

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
          {computedInitials}
        </button>
        {isOpen ? (
          <div className="topbar-menu" role="menu">
            <div className="topbar-menu-header">
              <strong>{displayUsername}</strong>
              <span>{displayRole}</span>
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
            <div style={{ height: '1px', background: '#eaeaea', margin: '4px 0' }} />
            <a href="#" onClick={(e) => { e.preventDefault(); setIsOpen(false); logout(); }} role="menuitem" style={{ color: '#d32f2f' }}>
              Logout
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}
