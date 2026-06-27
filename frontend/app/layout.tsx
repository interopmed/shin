import type { Metadata } from "next";
import Sidebar from "../components/sidebar";
import TopbarActions from "../components/TopbarActions";
import { getNavigationGroups } from "../lib/navigation";
import { getActiveUserContext, getShinNodeState, roleLabels } from "../lib/node-state";
import "./globals.css";

export const metadata: Metadata = {
  title: "SHIN Node",
  description: "Semantic Health Interoperability Network node dashboard",
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const nodeState = getShinNodeState();
  const activeUser = getActiveUserContext();
  const navigationGroups = getNavigationGroups();

  return (
    <html lang="en">
      <body>
        <div className="shell">
          <Sidebar nodeState={nodeState} navigationGroups={navigationGroups} />
          <div className="workspace">
            <header className="topbar">
              <label className="workspace-search">
                <span className="sr-only">Search SHIN workspace</span>
                <input type="search" placeholder="Search modules, patients, events, and settings..." />
                <span>Ctrl K</span>
              </label>
              <TopbarActions roleLabel={roleLabels[activeUser.role]} />
            </header>
            <main className="main">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
