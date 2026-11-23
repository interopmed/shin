import { NextResponse } from "next/server";
import { updateServiceUnit, deleteServiceUnit } from "@/lib/facilities-db";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const token = request.headers.get("Authorization")?.split(" ")[1];
    const unit = await updateServiceUnit(id, await request.json(), token);
    return NextResponse.json({ unit });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update service unit." },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const token = request.headers.get("Authorization")?.split(" ")[1];
    await deleteServiceUnit(id, token);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete service unit." },
      { status: 400 }
    );
  }
}
