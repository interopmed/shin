import { getBackendBaseUrl } from "./backend-config";

export type IdentityWorkRole = {
  id?: string;
  code: string;
  name: string;
  scope?: string;
  description?: string;
  userCount?: number;
  permissionCount?: number;
};

export type IdentityWorkGroup = {
  id?: string;
  code: string;
  name: string;
  description?: string;
  memberCount?: number;
};

export type IdentityWorkPermission = {
  id?: string;
  code: string;
  module: string;
  description?: string;
};

export type IdentityWorkUser = {
  id: string;
  username: string;
  displayName: string;
  email: string;
  title: string;
  status: string;
  mfaEnabled: boolean;
  isExternal: boolean;
  roleCode: string;
  roleName: string;
  groupCode: string;
  groupName: string;
  providerName: string;
};

export type IdentityWorkProviderOrganization = {
  id: string;
  code: string;
  name: string;
  providerKind: string;
  organizationType: string;
  isActive: boolean;
};

export type IdentityWorkProviderPerson = {
  id: string;
  code: string;
  fullName: string;
  specialty: string;
  providerCategory: string;
  organizationName: string;
  registrationNo: string;
  isExternal: boolean;
  isActive: boolean;
};

export type IdentityWorkEmployee = {
  id: string;
  code: string;
  employeeNumber: string;
  fullName: string;
  jobTitle: string;
  staffType: string;
  employmentType: string;
  department: string;
  facility: string;
  isActive: boolean;
  username: string;
  roleName: string;
  groupName: string;
};

export type IdentityWorkResult = {
  summary: {
    users: number;
    roles: number;
    groups: number;
    permissions: number;
    providers: number;
    employees: number;
    externalDoctors: number;
    institutes: number;
  };
  users: IdentityWorkUser[];
  employees: IdentityWorkEmployee[];
  roles: IdentityWorkRole[];
  groups: IdentityWorkGroup[];
  permissions: IdentityWorkPermission[];
  providerRegistry: {
    organizations: IdentityWorkProviderOrganization[];
    people: IdentityWorkProviderPerson[];
  };
};

export type IdentityWorkUserUpdateInput = {
  roleCode?: string;
  groupCode?: string;
  status?: string;
  mfaEnabled?: boolean;
};

function backendBaseUrl() {
  return getBackendBaseUrl();
}

function backendUrl(path: string) {
  return new URL(path.startsWith("/") ? path : `/${path}`, `${backendBaseUrl()}/`).toString();
}

async function readJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(backendUrl(path), {
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

export async function getIdentityWork(): Promise<IdentityWorkResult> {
  return readJson<IdentityWorkResult>("/api/identity/work");
}

export async function updateIdentityWorkUser(userId: string, input: IdentityWorkUserUpdateInput): Promise<IdentityWorkUser> {
  return readJson<IdentityWorkUser>(`/api/identity/work/users/${userId}/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
}
