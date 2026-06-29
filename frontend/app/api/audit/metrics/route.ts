import { NextResponse } from "next/server";
import { getAuditMetrics } from "../../../../lib/audit-db";

export async function GET() {
  const metrics = await getAuditMetrics();
  return NextResponse.json(metrics);
}
