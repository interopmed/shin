import { NextResponse } from "next/server";
import { getIdentityWork } from "../../../../lib/identity-work";

export async function GET() {
  try {
    const payload = await getIdentityWork();
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load identity work." },
      { status: 503 }
    );
  }
}
