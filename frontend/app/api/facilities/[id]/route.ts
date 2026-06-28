import { NextResponse } from "next/server";
import { updateFacility } from "../../../../lib/facilities-db";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const facility = await updateFacility(id, await request.json());
    return NextResponse.json({ facility });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update facility." },
      { status: 400 }
    );
  }
}
