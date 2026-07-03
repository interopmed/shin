import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { getShinNodeStateDir, isActiveUserRole, roleLabels, roleProfiles } from "../../../lib/node-state";

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as { role?: string } | null;
  const role = payload?.role;

  if (!role || !isActiveUserRole(role)) {
    return NextResponse.json({ error: "Unsupported role" }, { status: 400 });
  }

  const stateDir = getShinNodeStateDir();
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(
    path.join(stateDir, "active-role.json"),
    `${JSON.stringify(
      {
        role,
        label: roleLabels[role],
        userId: roleProfiles[role].userId,
        updatedAt: new Date().toISOString(),
      },
      null,
      2
    )}\n`
  );

  return NextResponse.json({ role, label: roleLabels[role] });
}
