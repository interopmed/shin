import { getBackendBaseUrl } from "./backend-config";

export type CareTeamMemberRecord = {
  id?: string;
  doctorId?: string | null;
  employeeId?: string | null;
  name: string;
  role: string;
};

export type CareTeamRecord = {
  id?: string;
  name: string;
  leadDoctorId?: string | null;
  leadEmployeeId?: string | null;
  leadName?: string;
  risk: string;
  status: string;
  members: CareTeamMemberRecord[];
};

export type ProviderRecord = {
  id: string;
  doctorId?: string | null;
  employeeId?: string | null;
  name: string;
  role: string;
  specialty: string;
  department: string;
  patients: number;
  status: string;
  tone: string;
};

export type CareTeamNoteRecord = {
  id?: string;
  careTeamId?: string | null;
  title: string;
  content: string;
  created_at?: string;
  updated_at?: string;
};

export type CreateCareTeamInput = {
  name: string;
  leadDoctorId?: string | null;
  leadEmployeeId?: string | null;
  risk: string;
  status: string;
  members: {
    doctorId?: string | null;
    employeeId?: string | null;
    role: string;
  }[];
};

class BackendRequestError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "BackendRequestError";
  }
}

function backendBaseUrl() {
  return getBackendBaseUrl();
}

function backendUrl(path: string) {
  return new URL(path.startsWith("/") ? path : `/${path}`, `${backendBaseUrl()}/`).toString();
}

async function backendRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(backendUrl(path), {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    let message = text || `Backend request failed for ${path}`;

    try {
      const parsed = JSON.parse(text) as { detail?: string; error?: string };
      message = parsed.detail || parsed.error || message;
    } catch {
      // Keep the raw response text.
    }

    throw new BackendRequestError(response.status, message);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return (await response.json()) as T;
}

export async function getCareTeams(): Promise<CareTeamRecord[]> {
  try {
    const payload = await backendRequest<CareTeamRecord[]>("/api/care-teams/");
    return Array.isArray(payload) ? payload : [];
  } catch {
    return [];
  }
}

export async function createCareTeam(input: CreateCareTeamInput): Promise<CareTeamRecord> {
  return backendRequest<CareTeamRecord>("/api/care-teams/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function updateCareTeam(id: string, input: CreateCareTeamInput): Promise<CareTeamRecord> {
  return backendRequest<CareTeamRecord>(`/api/care-teams/${id}/`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function deleteCareTeam(id: string): Promise<void> {
  await backendRequest<void>(`/api/care-teams/${id}/`, {
    method: "DELETE",
  });
}

export async function getCareTeamProviders(): Promise<ProviderRecord[]> {
  try {
    const payload = await backendRequest<ProviderRecord[]>("/api/care-team-providers/");
    return Array.isArray(payload) ? payload : [];
  } catch {
    return [];
  }
}

export async function getCareTeamNotes(): Promise<CareTeamNoteRecord[]> {
  try {
    const payload = await backendRequest<CareTeamNoteRecord[]>("/api/care-team-notes/");
    return Array.isArray(payload) ? payload : [];
  } catch {
    return [];
  }
}

export async function createCareTeamNote(input: {
  careTeamId?: string | null;
  title: string;
  content: string;
}): Promise<CareTeamNoteRecord> {
  return backendRequest<CareTeamNoteRecord>("/api/care-team-notes/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function deleteCareTeamNote(id: string): Promise<void> {
  await backendRequest<void>(`/api/care-team-notes/${id}/`, {
    method: "DELETE",
  });
}
