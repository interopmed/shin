import { NextResponse } from "next/server";
import { createServiceUnit, getServiceUnits } from "@/lib/facilities-db";

export async function GET() {
  const units = await getServiceUnits();
  return NextResponse.json({ units });
}

export async function POST(request: Request) {
  try {
    // In a real app we'd get the auth token from cookies/headers here
    const token = request.headers.get("Authorization")?.split(" ")[1];
    const unit = await createServiceUnit(await request.json(), token);
    return NextResponse.json({ unit }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create service unit." },
      { status: 400 }
    );
  }
}
