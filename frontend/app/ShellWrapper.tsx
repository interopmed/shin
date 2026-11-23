"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/sidebar";
import TopbarActions from "@/components/TopbarActions";
import GlobalBreadcrumb from "@/components/GlobalBreadcrumb";
import { useAuth } from "@/hooks/useAuth";

const PUBLIC_PATHS = ["/login", "/register", "/forgot-password"];

export default function ShellWrapper({
  children,
  nodeState,
  navigationGroups,
  roleLabel,
}: any) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  const isPublic = Boolean(pathname && PUBLIC_PATHS.includes(pathname));

  useEffect(() => {
    // Once auth check completes, if user is not authenticated and not on a public page, redirect
    if (!loading && !isAuthenticated && !isPublic) {
      router.replace("/login");
    }
  }, [loading, isAuthenticated, isPublic, router]);

  // Render public pages immediately (login, register, etc.)
  if (isPublic) {
    return <>{children}</>;
  }

  // While checking auth, render nothing to prevent flash of protected content
  if (loading || !isAuthenticated) {
    return null;
  }

  return (
    <div className="shell">
      <Sidebar nodeState={nodeState} navigationGroups={navigationGroups} />
      <div className="workspace">
        <header className="topbar">
          <label className="workspace-search">
            <span className="sr-only">Search SHIN workspace</span>
            <input type="search" placeholder="Search modules, patients, events, and settings..." />
            <span>Ctrl K</span>
          </label>
          <TopbarActions roleLabel={roleLabel} />
        </header>
        <main className="main" style={{ display: 'flex', flexDirection: 'column' }}>
          <GlobalBreadcrumb />
          {children}
        </main>
      </div>
    </div>
  );
}
