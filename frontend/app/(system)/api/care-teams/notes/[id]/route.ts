import { NextResponse } from "next/server";
import { deleteCareTeamNote } from "@/lib/care-teams-db";

type Params = {
  params: Promise<{ id: string }>;
};

export async function DELETE(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    await deleteCareTeamNote(id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete note." },
      { status: 400 }
    );
  }
}
