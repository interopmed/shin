import { getBackendBaseUrl } from "./backend-config";

export type PatientDirectoryRecord = {
  id: string;
  name: string;
  phone: string;
  email: string;
  birthDate: string;
  age: number | null;
  status: "Active" | "Inactive";
  assignedDoctorId: string;
  doctor: string;
  lastVisit: string;
};

export type PatientDirectoryResult = {
  patients: PatientDirectoryRecord[];
  total: number;
  active: number;
  inactive: number;
  configured: boolean;
  error?: string;
};

export type PatientDetailRecord = PatientDirectoryRecord & {
  birthDateRaw: string;
  address: string;
  sex: string;
  bloodGroup: string;
  patientNumber: string;
  userId: string;
  imageUrl: string;
  note: string;
  methodOfArrival: string;
  editedTime: string;
  createdAt: string;
  updatedAt: string;
  assignedDoctorName?: string;
};

export type DoctorOption = {
  id: string;
  name: string;
};

export type PatientConsentPreference = {
  id: string;
  category: string;
  groupName: string;
  grantAccess: boolean;
  limitAccess: string;
  details: string;
};

export type PatientConsentEvent = {
  id: string;
  dateLabel: string;
  action: string;
  author: string;
};

export type PatientConsentRequest = {
  id: string;
  title: string;
  status: string;
};

export type PatientConsentUpdateInput = {
  category: string;
  groupName: string;
  grantAccess: boolean;
  limitAccess: string;
  details: string;
};

export type PatientConsentRecord = {
  patientId: string;
  patientName: string;
  patientNumber: string;
  birthDate: string;
  sex: string;
  preferences: PatientConsentPreference[];
  events: PatientConsentEvent[];
  requests: PatientConsentRequest[];
};

export type MpiPatientRecord = {
  id: string;
  patientNumber: string;
  name: string;
  sex: string;
  birthDate: string;
  address: string;
  confidence: number;
  action: string;
  tone: "verify" | "match" | "conflict";
};

export type ConflictPatientDetail = {
  id: string;
  patientNumber: string;
  name: string;
  sex: string;
  birthDate: string;
  address: string;
  phone: string;
  email: string;
  lastVisit: string;
};

export type MpiConflictRecord = {
  id: string;
  title: string;
  time: string;
  tone: "danger" | "neutral" | "info";
  patients?: ConflictPatientDetail[];
};

export type MpiSourceRecord = {
  name: string;
  records: number;
  mark: string;
  tone: "pink" | "green" | "blue";
};

export type MpiSummaryRecord = {
  integrity: number;
  duplicateRate: number;
  duplicateClusters: number;
  assignedDoctorLinks: number;
};

export type PatientMpiRecord = {
  patients: MpiPatientRecord[];
  conflicts: MpiConflictRecord[];
  dataSources: MpiSourceRecord[];
  summary: MpiSummaryRecord;
  pagination?: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
};

export type CreatePatientInput = {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  sex?: string;
  birthDate?: string;
  bloodGroup?: string;
  assignedDoctorId?: string;
  doctor?: string;
  patientNumber?: string;
  note?: string;
};

export type UpdatePatientInput = CreatePatientInput;

type BackendListEnvelope<T> = {
  count?: number;
  results?: T[];
};

type BackendPatient = Partial<PatientDetailRecord> & {
  id?: string;
  name?: string;
  phone?: string;
  email?: string;
  birthDate?: string;
  birthDateRaw?: string;
  age?: number | string | null;
  status?: string;
  assignedDoctorId?: string;
  doctor?: string;
  assignedDoctorName?: string;
  patientNumber?: string;
  bloodGroup?: string;
  address?: string;
  sex?: string;
  userId?: string;
  imageUrl?: string;
  note?: string;
  methodOfArrival?: string;
  editedTime?: string;
  lastVisit?: string;
  createdAt?: string;
  updatedAt?: string;
};

type BackendConsent = PatientConsentRecord;

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

async function readJson<T>(path: string, init?: RequestInit): Promise<T> {
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

function unwrapList<T>(payload: BackendListEnvelope<T> | T[] | unknown): { items: T[]; count: number } {
  if (Array.isArray(payload)) {
    return { items: payload as T[], count: payload.length };
  }

  if (payload && typeof payload === "object") {
    const envelope = payload as BackendListEnvelope<T>;
    return { items: (envelope.results ?? []) as T[], count: envelope.count ?? (envelope.results?.length ?? 0) };
  }

  return { items: [], count: 0 };
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeDoctorName(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim() : "Unassigned";
}

function normalizePatient(row: BackendPatient): PatientDirectoryRecord {
  const assignedDoctorId = typeof row.assignedDoctorId === "string" ? row.assignedDoctorId.trim() : "";
  const doctor = normalizeDoctorName(row.doctor ?? row.assignedDoctorName);

  return {
    id: String(row.id ?? ""),
    name: typeof row.name === "string" && row.name.trim() ? row.name.trim() : `Patient ${row.id ?? ""}`,
    phone: typeof row.phone === "string" && row.phone.trim() ? row.phone.trim() : "Not recorded",
    email: typeof row.email === "string" && row.email.trim() ? row.email.trim() : "Not recorded",
    birthDate: typeof row.birthDate === "string" && row.birthDate.trim() ? row.birthDate.trim() : "Not recorded",
    age: toNumber(row.age),
    status: row.status === "Inactive" ? "Inactive" : "Active",
    assignedDoctorId,
    doctor,
    lastVisit: typeof row.lastVisit === "string" && row.lastVisit.trim() ? row.lastVisit.trim() : "Not recorded",
  };
}

function normalizePatientDetail(row: BackendPatient): PatientDetailRecord {
  const patient = normalizePatient(row);
  return {
    ...patient,
    birthDateRaw: typeof row.birthDateRaw === "string" ? row.birthDateRaw : patient.birthDate,
    address: typeof row.address === "string" && row.address.trim() ? row.address.trim() : "Not recorded",
    sex: typeof row.sex === "string" && row.sex.trim() ? row.sex.trim() : "Not recorded",
    bloodGroup: typeof row.bloodGroup === "string" && row.bloodGroup.trim() ? row.bloodGroup.trim() : "Not recorded",
    patientNumber: typeof row.patientNumber === "string" && row.patientNumber.trim() ? row.patientNumber.trim() : "",
    userId: typeof row.userId === "string" && row.userId.trim() ? row.userId.trim() : "",
    imageUrl: typeof row.imageUrl === "string" && row.imageUrl.trim() ? row.imageUrl.trim() : "",
    note: typeof row.note === "string" && row.note.trim() ? row.note.trim() : "Not recorded",
    methodOfArrival: typeof row.methodOfArrival === "string" && row.methodOfArrival.trim() ? row.methodOfArrival.trim() : "Not recorded",
    editedTime: typeof row.editedTime === "string" && row.editedTime.trim() ? row.editedTime.trim() : "Not recorded",
    createdAt: typeof row.createdAt === "string" && row.createdAt.trim() ? row.createdAt.trim() : "Not recorded",
    updatedAt: typeof row.updatedAt === "string" && row.updatedAt.trim() ? row.updatedAt.trim() : "Not recorded",
    assignedDoctorName: typeof row.assignedDoctorName === "string" && row.assignedDoctorName.trim() ? row.assignedDoctorName.trim() : patient.doctor,
  };
}

function normalizeConsentPreference(row: PatientConsentPreference): PatientConsentPreference {
  return {
    id: row.id,
    category: row.category,
    groupName: row.groupName,
    grantAccess: Boolean(row.grantAccess),
    limitAccess: row.limitAccess || "Restrictive",
    details: row.details || "",
  };
}

async function backendRequest<T>(path: string, init?: RequestInit): Promise<T> {
  return readJson<T>(path, init);
}

export async function getDoctorOptions(): Promise<DoctorOption[]> {
  const payload = await backendRequest<BackendListEnvelope<DoctorOption> | DoctorOption[]>("/api/doctors/");
  const { items } = unwrapList<DoctorOption>(payload as BackendListEnvelope<DoctorOption> | DoctorOption[]);
  const seen = new Set<string>();

  return items
    .map((row) => ({
      id: String(row.id),
      name: row.name?.trim() || `Doctor ${row.id}`,
    }))
    .filter((doctor) => {
      const key = doctor.name.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
}

export async function getPatientConsent(id: string): Promise<PatientConsentRecord | null> {
  try {
    const payload = await backendRequest<BackendConsent>(`/api/patients/${id}/consent/`);
    return {
      ...payload,
      preferences: payload.preferences.map(normalizeConsentPreference),
    };
  } catch (error) {
    if (error instanceof BackendRequestError && error.status === 404) {
      return null;
    }

    throw error;
  }
}

export async function getPatientDirectory(): Promise<PatientDirectoryResult> {
  try {
    const payload = await backendRequest<BackendListEnvelope<BackendPatient> | BackendPatient[]>("/api/patients/");
    const { items, count } = unwrapList<BackendPatient>(payload as BackendListEnvelope<BackendPatient> | BackendPatient[]);

    return {
      patients: items.map(normalizePatient),
      total: count,
      active: count,
      inactive: 0,
      configured: true,
    };
  } catch (error) {
    return {
      patients: [],
      total: 0,
      active: 0,
      inactive: 0,
      configured: false,
      error: error instanceof Error ? error.message : "Unable to load patients from the backend.",
    };
  }
}

export async function createPatient(input: CreatePatientInput): Promise<PatientDirectoryRecord> {
  const payload = await backendRequest<BackendPatient>("/api/patients/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  return normalizePatient(payload);
}

export async function updatePatient(id: string, input: UpdatePatientInput): Promise<PatientDetailRecord | null> {
  try {
    const payload = await backendRequest<BackendPatient>(`/api/patients/${id}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    return normalizePatientDetail(payload);
  } catch (error) {
    if (error instanceof BackendRequestError && error.status === 404) {
      return null;
    }

    throw error;
  }
}

export async function getPatientById(id: string): Promise<PatientDetailRecord | null> {
  try {
    const payload = await backendRequest<BackendPatient>(`/api/patients/${id}/`);
    return normalizePatientDetail(payload);
  } catch (error) {
    if (error instanceof BackendRequestError && error.status === 404) {
      return null;
    }

    throw error;
  }
}

export async function getPatientMpi(
  page: number = 1,
  pageSize: number = 10,
  query: string = "",
  sex: string = "",
  confidence: string = ""
): Promise<PatientMpiRecord> {
  const params = new URLSearchParams();
  params.set("page", page.toString());
  params.set("pageSize", pageSize.toString());
  if (query) {
    params.set("query", query);
  }
  if (sex) {
    params.set("sex", sex);
  }
  if (confidence) {
    params.set("confidence", confidence);
  }
  return backendRequest<PatientMpiRecord>(`/api/mpi/?${params.toString()}`);
}

export async function savePatientConsentPreference(
  patientId: string,
  input: PatientConsentUpdateInput
): Promise<PatientConsentPreference> {
  const payload = await backendRequest<PatientConsentPreference>(`/api/patients/${patientId}/consent/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  return normalizeConsentPreference(payload);
}

export async function mergePatientMpi(keepId: string, deleteIds: string[]): Promise<boolean> {
  const result = await backendRequest<{ success: boolean }>("/api/mpi/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "merge", keepId, deleteIds }),
  });
  return result?.success || false;
}
