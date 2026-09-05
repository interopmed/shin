import { NextResponse } from "next/server";
import { getCareTeams, createCareTeam } from "@/lib/care-teams-db";

export async function GET() {
  try {
    const teams = await getCareTeams();
    return NextResponse.json(teams, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to get care teams." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const team = await createCareTeam(data);
    return NextResponse.json(team, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create care team." },
      { status: 400 }
    );
  }
}
