import type { CoreValidationIssue, PatientIdentifier } from "./types";

export function createTimestamp(): string {
  return new Date().toISOString();
}

export function createId(prefix: string): string {
  const randomPart =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);

  return `${prefix}_${randomPart}`;
}

export function normalizeIdentifierValue(value: string): string {
  return value.trim().toLowerCase();
}

export function identifierKey(identifier: PatientIdentifier): string {
  return `${identifier.system.trim().toLowerCase()}|${normalizeIdentifierValue(identifier.value)}`;
}

export function validateRequiredFields(
  input: Record<string, unknown>,
  fields: string[]
): CoreValidationIssue[] {
  return fields.flatMap((field) => {
    const value = input[field];

    if (typeof value === "string" && value.trim()) {
      return [];
    }

    if (Array.isArray(value) && value.length > 0) {
      return [];
    }

    if (value !== undefined && value !== null && typeof value !== "string") {
      return [];
    }

    return [{ field, message: `${field} is required` }];
  });
}

export function assertNoValidationIssues(issues: CoreValidationIssue[]): void {
  if (issues.length === 0) {
    return;
  }

  const message = issues.map((issue) => `${issue.field}: ${issue.message}`).join("; ");
  throw new Error(`Platform Core validation failed: ${message}`);
}
