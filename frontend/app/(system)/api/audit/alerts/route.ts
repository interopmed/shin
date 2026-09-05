import { NextResponse } from "next/server";
import { getThreatAlerts } from "@/lib/audit-db";

export async function GET() {
  const alerts = await getThreatAlerts();
  return NextResponse.json({ alerts });
}
