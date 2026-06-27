import { NextResponse } from "next/server";
import { createPatient, getPatientDirectory } from "../../../lib/patients-db";

export async function GET() {
  const directory = await getPatientDirectory();

  return NextResponse.json(directory, { status: directory.error ? 503 : 200 });
}

export async function POST(request: Request) {
  try {
    const patient = await createPatient(await request.json());

    return NextResponse.json({ patient }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create patient." },
      { status: 400 }
    );
  }
}
