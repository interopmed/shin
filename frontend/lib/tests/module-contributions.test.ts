import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getVisibleModuleContributions } from "../module-contributions";

describe("module dashboard contributions", () => {
  const originalCwd = process.cwd();
  const testDir = mkdtempSync(join(tmpdir(), "shin-node-test-"));
  const stateDir = join(testDir, ".shin-node");
  const statePath = join(stateDir, "state.json");

  beforeAll(() => {
    process.chdir(testDir);
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(
      statePath,
      `${JSON.stringify(
        {
          nodeId: "shin-node-test",
          organization: {
            id: "org-test",
            name: "Test Healthcare Organization",
            type: "lab",
          },
          platformVersion: "0.1.0",
          installedModules: [
            {
              moduleId: "lab",
              name: "Lab/LIS",
              status: "enabled",
              manifestVersion: "0.1.0",
              repositoryUrl: "https://github.com/interopmed/shin-lab",
              ref: "v0.1.0",
              commit: "test-commit",
              installPath: ".shin-node/modules/lab/repo",
              manifestPath: ".shin-node/modules/lab/interopmed.module.json",
              routes: [
                {
                  path: "/modules/lab",
                  label: "Lab/LIS",
                  detail: "Lab operations",
                  icon: "activity",
                  sidebarSection: "Patients",
                },
              ],
              dashboard: {
                cards: [
                  {
                    label: "Critical Results",
                    value: "4",
                    detail: "Need review",
                    tone: "critical",
                    href: "/modules/lab/results",
                  },
                ],
                sections: [
                  {
                    title: "Lab Operations",
                    description: "Orders and results",
                    href: "/modules/lab",
                    widgets: [
                      {
                        label: "Pending Orders",
                        value: "31",
                        detail: "7 STAT orders",
                        tone: "warning",
                        href: "/modules/lab/orders",
                      },
                    ],
                  },
                ],
                alerts: [
                  {
                    severity: "critical",
                    title: "Critical result review",
                    body: "Critical results need clinician acknowledgement.",
                    href: "/modules/lab/results",
                  },
                ],
                quickActions: [{ label: "Review lab results", href: "/modules/lab/results" }],
              },
            },
          ],
        },
        null,
        2
      )}\n`
    );
  });

  afterAll(() => {
    process.chdir(originalCwd);
    rmSync(testDir, { recursive: true, force: true });
  });

  it("exposes enabled module navigation from installed module metadata", () => {
    const contributions = getVisibleModuleContributions();
    const lab = contributions.find((contribution) => contribution.moduleId === "lab");

    expect(lab).toBeDefined();
    expect(lab?.label).toBe("Lab/LIS");
    expect(lab?.navItems).toEqual([
      {
        label: "Lab/LIS",
        href: "/modules/lab",
        detail: "Lab operations",
        icon: "activity",
        sidebarSection: "Patients",
        requiredPermissions: [],
      },
    ]);
    expect(lab?.dashboardCards[0]).toMatchObject({
      label: "Critical Results",
      value: "4",
      tone: "critical",
      href: "/modules/lab/results",
    });
    expect(lab?.dashboardSections[0]).toMatchObject({
      title: "Lab Operations",
      description: "Orders and results",
      href: "/modules/lab",
      widgets: [
        {
          label: "Pending Orders",
          value: "31",
          detail: "7 STAT orders",
          tone: "warning",
          href: "/modules/lab/orders",
        },
      ],
    });
    expect(lab?.alerts[0]).toMatchObject({
      severity: "critical",
      title: "Critical result review",
      href: "/modules/lab/results",
    });
    expect(lab?.quickActions[0]).toMatchObject({ label: "Review lab results", href: "/modules/lab/results" });
  });
});
