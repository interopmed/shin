import { NextResponse } from "next/server";
import { createFacility, getFacilities } from "@/lib/facilities-db";

export async function GET() {
  const facilities = await getFacilities();
  return NextResponse.json({ facilities });
}

export async function POST(request: Request) {
  try {
    const facility = await createFacility(await request.json());
    return NextResponse.json({ facility }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create facility." },
      { status: 400 }
    );
  }
}
