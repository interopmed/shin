import { NextResponse } from "next/server";
import { getAuditEvents } from "../../../../lib/audit-db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId") || undefined;
  const action = searchParams.get("action") || undefined;
  const severity = searchParams.get("severity") || undefined;
  const sourceSystem = searchParams.get("sourceSystem") || undefined;
  const search = searchParams.get("search") || undefined;

  const events = await getAuditEvents({ userId, action, severity, sourceSystem, search });
  return NextResponse.json({ events });
}
