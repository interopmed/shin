import { NextResponse } from "next/server";
import { updateSetting } from "../../../../../lib/settings-db";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;

  try {
    const payload = await request.json();
    const setting = await updateSetting(id, {
      value: payload.value ?? payload.enabled ?? payload.checked,
      detail: payload.detail,
      tone: payload.tone,
    });

    return NextResponse.json(setting);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update setting." },
      { status: 400 }
    );
  }
}
