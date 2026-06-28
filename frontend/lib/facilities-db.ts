export type FacilityRecord = {
  id: string;
  name: string;
  type: string;
  location: string;
  departments: number;
  rooms: number;
  status: string;
  occupancy: string;
};

export type FacilityDepartmentRecord = {
  name: string;
  lead: string;
  capacity: string;
  status: string;
};

export type CreateFacilityInput = {
  name: string;
  type: string;
  location: string;
  departments: number;
  rooms: number;
  status: string;
  occupancy: string;
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
  return (process.env.SHIN_BACKEND_URL || process.env.BACKEND_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");
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

  return (await response.json()) as T;
}

function normalizeFacility(row: Partial<FacilityRecord>): FacilityRecord {
  return {
    id: String(row.id ?? ""),
    name: typeof row.name === "string" && row.name.trim() ? row.name.trim() : "Unnamed facility",
    type: typeof row.type === "string" && row.type.trim() ? row.type.trim() : "Other",
    location: typeof row.location === "string" && row.location.trim() ? row.location.trim() : "Not recorded",
    departments: typeof row.departments === "number" ? row.departments : Number(row.departments ?? 0) || 0,
    rooms: typeof row.rooms === "number" ? row.rooms : Number(row.rooms ?? 0) || 0,
    status: typeof row.status === "string" && row.status.trim() ? row.status.trim() : "Operational",
    occupancy: typeof row.occupancy === "string" && row.occupancy.trim() ? row.occupancy.trim() : "0%",
  };
}

export async function getFacilities(): Promise<FacilityRecord[]> {
  try {
    const payload = await backendRequest<Partial<FacilityRecord>[]>("/api/facilities/");
    return Array.isArray(payload) ? payload.map(normalizeFacility) : [];
  } catch {
    return [];
  }
}

export async function createFacility(input: CreateFacilityInput): Promise<FacilityRecord> {
  const payload = await backendRequest<Partial<FacilityRecord>>("/api/facilities/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  return normalizeFacility(payload);
}

/**
 * Update an existing facility.
 *
 * The backend expects a PUT request to `/api/facilities/{id}` with the same
 * payload shape as `CreateFacilityInput`. The response returns the updated
 * facility record.
 */
export async function updateFacility(id: string, input: CreateFacilityInput): Promise<FacilityRecord> {
  const payload = await backendRequest<Partial<FacilityRecord>>(`/api/facilities/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  return normalizeFacility(payload);
}

export async function getFacilityDepartments(id: string): Promise<FacilityDepartmentRecord[]> {
  const payload = await backendRequest<{ departments?: FacilityDepartmentRecord[] }>(`/api/facilities/${id}/departments`);
  if (!Array.isArray(payload.departments)) {
    return [];
  }

  return payload.departments.map((row) => ({
    name: typeof row.name === "string" ? row.name : "",
    lead: typeof row.lead === "string" ? row.lead : "",
    capacity: typeof row.capacity === "string" ? row.capacity : "",
    status: typeof row.status === "string" ? row.status : "Ready",
  }));
}

export async function updateFacilityDepartments(id: string, departments: FacilityDepartmentRecord[]): Promise<FacilityDepartmentRecord[]> {
  const payload = await backendRequest<{ departments?: FacilityDepartmentRecord[] }>(`/api/facilities/${id}/departments`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ departments }),
  });

  return Array.isArray(payload.departments) ? payload.departments : [];
}
