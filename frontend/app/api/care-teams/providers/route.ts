import { NextResponse } from "next/server";
import { getCareTeamProviders } from "../../../../lib/care-teams-db";

export async function GET() {
  try {
    const providers = await getCareTeamProviders();
    return NextResponse.json(providers, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load providers." },
      { status: 500 }
    );
  }
}
