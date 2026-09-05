import { NextResponse } from "next/server";
import { getFacilityDepartments, updateFacilityDepartments } from "@/lib/facilities-db";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const departments = await getFacilityDepartments(id);
    return NextResponse.json({ departments });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load departments." },
      { status: 400 }
    );
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const payload = (await request.json()) as { departments?: Array<{ name: string; lead: string; capacity: string; status: string }> };
    const departments = await updateFacilityDepartments(id, Array.isArray(payload.departments) ? payload.departments : []);
    return NextResponse.json({ departments });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save departments." },
      { status: 400 }
    );
  }
}
