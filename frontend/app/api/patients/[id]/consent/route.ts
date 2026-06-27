import { NextResponse } from "next/server";
import { getPatientConsent, savePatientConsentPreference } from "../../../../../lib/patients-db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const consent = await getPatientConsent(id);

  if (!consent) {
    return NextResponse.json({ detail: "Patient not found." }, { status: 404 });
  }

  return NextResponse.json(consent);
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;

  try {
    const payload = await request.json();
    const preference = await savePatientConsentPreference(id, {
      category: String(payload.category ?? ""),
      groupName: String(payload.groupName ?? payload.group_name ?? ""),
      grantAccess: Boolean(payload.grantAccess ?? payload.grant_access),
      limitAccess: String(payload.limitAccess ?? payload.limit_access ?? "Restrictive"),
      details: String(payload.details ?? ""),
    });

    return NextResponse.json(preference);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update consent." },
      { status: 400 }
    );
  }
}

export async function POST(request: Request, { params }: Params) {
  return PATCH(request, { params });
}
