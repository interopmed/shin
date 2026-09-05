import { NextResponse } from "next/server";
import { getCareTeamNotes, createCareTeamNote } from "@/lib/care-teams-db";

export async function GET() {
  try {
    const notes = await getCareTeamNotes();
    return NextResponse.json(notes, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load notes." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const note = await createCareTeamNote(data);
    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create note." },
      { status: 400 }
    );
  }
}
