import type { Metadata } from "next";
import { getNavigationGroups } from "@/lib/navigation";
import { getActiveUserContext, getShinNodeState, roleLabels } from "@/lib/node-state";
import { AuthProvider } from "@/hooks/useAuth";
import ShellWrapper from "./ShellWrapper";
import "./globals.css";

export const metadata: Metadata = {
  title: "SHIN Node",
  description: "Semantic Health Interoperability Network node dashboard",
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const nodeState = getShinNodeState();
  const activeUser = getActiveUserContext();
  const navigationGroups = getNavigationGroups(activeUser);

  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ShellWrapper 
            nodeState={nodeState} 
            navigationGroups={navigationGroups} 
            roleLabel={roleLabels[activeUser.role]}
          >
            {children}
          </ShellWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}
