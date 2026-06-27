import { NextResponse } from "next/server";
import { getSettings } from "../../../lib/settings-db";

export async function GET() {
  try {
    const payload = await getSettings();
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load settings." },
      { status: 503 }
    );
  }
}
