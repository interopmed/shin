"use server";

import { revalidatePath } from "next/cache";
import { installModule, setModuleStatus, uninstallModule } from "../../lib/module-manager";

function readModuleId(formData: FormData) {
  const moduleId = formData.get("moduleId");
  if (typeof moduleId !== "string" || moduleId.length === 0) {
    throw new Error("Missing moduleId");
  }

  return moduleId;
}

export async function installModuleAction(formData: FormData) {
  await installModule(readModuleId(formData));
  revalidatePath("/", "layout");
}

export async function enableModuleAction(formData: FormData) {
  await setModuleStatus(readModuleId(formData), "enabled");
  revalidatePath("/", "layout");
}

export async function disableModuleAction(formData: FormData) {
  await setModuleStatus(readModuleId(formData), "disabled");
  revalidatePath("/", "layout");
}

export async function uninstallModuleAction(formData: FormData) {
  uninstallModule(readModuleId(formData));
  revalidatePath("/", "layout");
}
