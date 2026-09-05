"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function GlobalBreadcrumb() {
  const pathname = usePathname();

  // Don't show breadcrumbs on root, dashboard, or login pages
  if (!pathname || pathname === "/" || pathname === "/dashboard" || pathname.startsWith("/login")) {
    return null;
  }

  // Split path into segments, ignoring empty strings
  const segments = pathname.split("/").filter(Boolean);

  return (
    <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 0 16px 0', fontSize: '14px', fontWeight: 600, color: '#475467', flexWrap: 'wrap' }}>
      <Link href="/dashboard" style={{ color: '#2f66d9', textDecoration: 'none' }}>
        Home
      </Link>

      {segments.map((segment, index) => {
        // Build the href up to this segment
        const href = "/" + segments.slice(0, index + 1).join("/");

        // Format the label (capitalize, remove hyphens)
        const isId = !isNaN(Number(segment));
        let label = segment.replace(/-/g, " ");
        if (isId) {
          // If it's a number, represent it as an ID
          label = `Record ${segment}`;
        } else {
          // Title Case words
          label = label.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        }

        const isLast = index === segments.length - 1;

        return (
          <React.Fragment key={href}>
            <span style={{ margin: '0 2px', color: '#9ca3af' }}>/</span>
            {isLast ? (
              <span style={{ color: '#111827', fontWeight: 700 }}>
                {label}
              </span>
            ) : (
              <Link href={href} style={{ color: '#2f66d9', textDecoration: 'none' }}>
                {label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
