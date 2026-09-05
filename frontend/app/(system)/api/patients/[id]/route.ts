import { NextResponse } from "next/server";
import { getPatientById, updatePatient } from "@/lib/patients-db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const patient = await getPatientById(id);

  if (!patient) {
    return NextResponse.json({ error: "Patient not found." }, { status: 404 });
  }

  return NextResponse.json(patient);
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const patient = await updatePatient(id, await request.json());

    if (!patient) {
      return NextResponse.json({ error: "Patient not found." }, { status: 404 });
    }

    return NextResponse.json({ patient });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update patient." },
      { status: 400 }
    );
  }
}
