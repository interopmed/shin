import { NextResponse } from "next/server";
import { updateIdentityWorkUser } from "@/lib/identity-work";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;

  try {
    const payload = await request.json();
    const user = await updateIdentityWorkUser(id, {
      roleCode: payload.roleCode ?? payload.role_code ?? "",
      groupCode: payload.groupCode ?? payload.group_code ?? "",
      status: payload.status,
      mfaEnabled: payload.mfaEnabled ?? payload.mfa_enabled,
    });

    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update user access." },
      { status: 400 }
    );
  }
}
