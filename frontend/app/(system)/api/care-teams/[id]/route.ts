import { NextResponse } from "next/server";
import { updateCareTeam, deleteCareTeam } from "@/lib/care-teams-db";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const data = await request.json();
    const team = await updateCareTeam(id, data);
    return NextResponse.json(team, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update care team." },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    await deleteCareTeam(id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete care team." },
      { status: 400 }
    );
  }
}
