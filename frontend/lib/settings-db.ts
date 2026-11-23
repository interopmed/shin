import { getBackendBaseUrl } from "./backend-config";

export type SystemSettingRecord = {
  id: string;
  section: string;
  key: string;
  label: string;
  value: string;
  detail: string;
  kind: "text" | "boolean" | "choice";
  tone: "default" | "success" | "warning" | "critical";
  sortOrder: number;
  isEditable: boolean;
};

export type SettingsSectionRecord = {
  section: string;
  items: SystemSettingRecord[];
};

export type SettingsResult = {
  summary: {
    sections: number;
    settings: number;
    editable: number;
  };
  sections: SettingsSectionRecord[];
};

type SettingUpdateInput = {
  value?: string | boolean | null;
  detail?: string;
  tone?: string;
};

function backendBaseUrl() {
  return getBackendBaseUrl();
}

function backendUrl(path: string) {
  return new URL(path.startsWith("/") ? path : `/${path}`, `${backendBaseUrl()}/`).toString();
}

async function readJson<T>(path: string, init?: RequestInit): Promise<T> {
  const requestUrl = backendUrl(path);
  const response = await fetch(requestUrl, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed for ${path}`);
  }

  return (await response.json()) as T;
}

export async function getSettings(): Promise<SettingsResult> {
  return readJson<SettingsResult>("/api/settings/");
}

export async function updateSetting(settingId: string, input: SettingUpdateInput): Promise<SystemSettingRecord> {
  return readJson<SystemSettingRecord>(`/api/settings/items/${settingId}/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
}
