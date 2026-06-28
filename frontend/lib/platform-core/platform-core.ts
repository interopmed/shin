import {
  assertNoValidationIssues,
  createId,
  createTimestamp,
  identifierKey,
  validateRequiredFields,
} from "./utils";
import type {
  AccessDecision,
  ActorRef,
  ApprovedModuleSource,
  AuditEvent,
  ConsentPolicy,
  CoreEvent,
  CoreValidationIssue,
  DuplicatePatientCandidate,
  Facility,
  IntegrationRegistration,
  Location,
  ModuleInstallPlan,
  ModuleInstallState,
  ModuleManifest,
  Notification,
  Organization,
  Patient,
  PatientDemographicHistory,
  PatientDemographicPatch,
  PatientIdentifier,
  PatientSearchQuery,
  PlatformCore,
  PlatformCoreSnapshot,
  Practitioner,
  Role,
  TerminologyCode,
  UserAccount,
} from "./types";

const PLATFORM_CORE_SOURCE = "platform-core";

export function createPlatformCore(): PlatformCore {
  return new InMemoryPlatformCore();
}

export class InMemoryPlatformCore implements PlatformCore {
  private patients = new Map<string, Patient>();
  private patientIdentifierIndex = new Map<string, string>();
  private patientDemographicHistory: PatientDemographicHistory[] = [];
  private organizations = new Map<string, Organization>();
  private facilities = new Map<string, Facility>();
  private locations = new Map<string, Location>();
  private practitioners = new Map<string, Practitioner>();
  private roles = new Map<string, Role>();
  private users = new Map<string, UserAccount>();
  private consents = new Map<string, ConsentPolicy>();
  private auditEvents: AuditEvent[] = [];
  private events: CoreEvent[] = [];
  private notifications = new Map<string, Notification>();
  private terminology = new Map<string, TerminologyCode>();
  private integrations = new Map<string, IntegrationRegistration>();
  private moduleManifests = new Map<string, ModuleManifest>();
  private approvedModuleSources = new Map<string, ApprovedModuleSource>();
  private moduleInstallStates = new Map<string, ModuleInstallState>();

  createOrganization(
    input: Omit<Organization, "id" | "createdAt" | "updatedAt">,
    actor: ActorRef
  ): Organization {
    assertNoValidationIssues(validateRequiredFields(input, ["name"]));
    const organization = { ...input, id: createId("org"), createdAt: createTimestamp(), updatedAt: createTimestamp() };
    this.organizations.set(organization.id, organization);
    this.recordAuditSuccess("create", actor, "Organization", organization.id);
    this.publishEvent({
      type: "organization.created",
      sourceModule: PLATFORM_CORE_SOURCE,
      actor,
      organizationId: organization.id,
      resourceType: "Organization",
      resourceId: organization.id,
      resourceUrl: `/api/v1/organizations/${organization.id}`,
    });
    return organization;
  }

  createFacility(
    input: Omit<Facility, "id" | "createdAt" | "updatedAt">,
    actor: ActorRef
  ): Facility {
    assertNoValidationIssues(validateRequiredFields(input, ["organizationId", "name"]));
    this.assertExists(this.organizations, input.organizationId, "Organization");
    const facility = { ...input, id: createId("fac"), createdAt: createTimestamp(), updatedAt: createTimestamp() };
    this.facilities.set(facility.id, facility);
    this.recordAuditSuccess("create", actor, "Facility", facility.id, input.organizationId);
    this.publishEvent({
      type: "facility.created",
      sourceModule: PLATFORM_CORE_SOURCE,
      actor,
      organizationId: input.organizationId,
      facilityId: facility.id,
      resourceType: "Facility",
      resourceId: facility.id,
      resourceUrl: `/api/v1/facilities/${facility.id}`,
    });
    return facility;
  }

  createLocation(
    input: Omit<Location, "id" | "createdAt" | "updatedAt">,
    actor: ActorRef
  ): Location {
    assertNoValidationIssues(validateRequiredFields(input, ["facilityId", "name"]));
    this.assertExists(this.facilities, input.facilityId, "Facility");
    const location = { ...input, id: createId("loc"), createdAt: createTimestamp(), updatedAt: createTimestamp() };
    this.locations.set(location.id, location);
    this.recordAuditSuccess("create", actor, "Location", location.id);
    this.publishEvent({
      type: "location.created",
      sourceModule: PLATFORM_CORE_SOURCE,
      actor,
      facilityId: input.facilityId,
      resourceType: "Location",
      resourceId: location.id,
      resourceUrl: `/api/v1/locations/${location.id}`,
    });
    return location;
  }

  createPractitioner(
    input: Omit<Practitioner, "id" | "createdAt" | "updatedAt">,
    actor: ActorRef
  ): Practitioner {
    assertNoValidationIssues(validateRequiredFields(input, ["organizationId", "givenName", "familyName"]));
    this.assertExists(this.organizations, input.organizationId, "Organization");
    const practitioner = { ...input, id: createId("prac"), createdAt: createTimestamp(), updatedAt: createTimestamp() };
    this.practitioners.set(practitioner.id, practitioner);
    this.recordAuditSuccess("create", actor, "Practitioner", practitioner.id, input.organizationId);
    this.publishEvent({
      type: "practitioner.created",
      sourceModule: PLATFORM_CORE_SOURCE,
      actor,
      organizationId: input.organizationId,
      resourceType: "Practitioner",
      resourceId: practitioner.id,
      resourceUrl: `/api/v1/practitioners/${practitioner.id}`,
    });
    return practitioner;
  }

  createPatient(input: Omit<Patient, "id" | "createdAt" | "updatedAt">, actor: ActorRef): Patient {
    assertNoValidationIssues(validateRequiredFields(input, ["identifiers", "givenName", "familyName"]));
    if (input.organizationId) {
      this.assertExists(this.organizations, input.organizationId, "Organization");
    }

    const existing = this.matchPatient(input.identifiers);
    if (existing) {
      return existing;
    }

    const patient = { ...input, id: createId("pat"), createdAt: createTimestamp(), updatedAt: createTimestamp() };
    this.patients.set(patient.id, patient);
    for (const identifier of patient.identifiers) {
      this.patientIdentifierIndex.set(identifierKey(identifier), patient.id);
    }
    this.recordAuditSuccess("create", actor, "Patient", patient.id, input.organizationId, patient.id);
    this.publishEvent({
      type: "patient.record.created",
      sourceModule: PLATFORM_CORE_SOURCE,
      actor,
      patientId: patient.id,
      organizationId: input.organizationId,
      resourceType: "Patient",
      resourceId: patient.id,
      resourceUrl: `/api/v1/patients/${patient.id}`,
    });
    return patient;
  }

  matchPatient(identifiers: PatientIdentifier[]): Patient | undefined {
    for (const identifier of identifiers) {
      const patientId = this.patientIdentifierIndex.get(identifierKey(identifier));
      if (patientId) {
        return this.patients.get(patientId);
      }
    }

    return undefined;
  }

  searchPatients(query: PatientSearchQuery, actor: ActorRef): Patient[] {
    const text = query.text?.trim().toLowerCase();
    const identifierKeyToFind = query.identifier ? identifierKey(query.identifier) : undefined;
    const patients = [...this.patients.values()].filter((patient) => {
      if (query.organizationId && patient.organizationId !== query.organizationId) {
        return false;
      }

      if (identifierKeyToFind && !patient.identifiers.some((identifier) => identifierKey(identifier) === identifierKeyToFind)) {
        return false;
      }

      if (!text) {
        return true;
      }

      const haystack = [
        patient.givenName,
        patient.familyName,
        patient.birthDate,
        patient.sex,
        ...patient.identifiers.flatMap((identifier) => [identifier.system, identifier.value]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(text);
    });

    this.recordAudit({
      action: "read",
      actor,
      resourceType: "Patient",
      organizationId: query.organizationId,
      outcome: "success",
      metadata: { query, resultCount: patients.length },
    });
    return patients;
  }

  findDuplicatePatientCandidates(input: Omit<Patient, "id" | "createdAt" | "updatedAt">): DuplicatePatientCandidate[] {
    return [...this.patients.values()]
      .map((patient) => {
        const reasons: string[] = [];
        let score = 0;

        if (patient.organizationId && input.organizationId && patient.organizationId === input.organizationId) {
          score += 10;
          reasons.push("same organization");
        }

        if (patient.birthDate && input.birthDate && patient.birthDate === input.birthDate) {
          score += 30;
          reasons.push("same birth date");
        }

        if (patient.givenName.trim().toLowerCase() === input.givenName.trim().toLowerCase()) {
          score += 25;
          reasons.push("same given name");
        }

        if (patient.familyName.trim().toLowerCase() === input.familyName.trim().toLowerCase()) {
          score += 25;
          reasons.push("same family name");
        }

        if (patient.sex && input.sex && patient.sex === input.sex) {
          score += 5;
          reasons.push("same sex");
        }

        if (patient.identifiers.some((identifier) => input.identifiers.some((candidate) => identifierKey(identifier) === identifierKey(candidate)))) {
          score += 100;
          reasons.push("matching identifier");
        }

        return { patient, score, reasons };
      })
      .filter((candidate) => candidate.score >= 50)
      .sort((left, right) => right.score - left.score);
  }

  updatePatientDemographics(patientId: string, patch: PatientDemographicPatch, actor: ActorRef): Patient {
    const patient = this.patients.get(patientId);
    if (!patient) {
      throw new Error(`Patient not found: ${patientId}`);
    }

    if (patch.organizationId) {
      this.assertExists(this.organizations, patch.organizationId, "Organization");
    }

    const changes: PatientDemographicHistory["changes"] = {};
    for (const key of ["givenName", "familyName", "birthDate", "sex", "organizationId"] as const) {
      if (patch[key] !== undefined && patch[key] !== patient[key]) {
        changes[key] = {
          before: patient[key],
          after: patch[key],
        };
      }
    }

    if (Object.keys(changes).length === 0) {
      return patient;
    }

    const updated = { ...patient, ...patch, updatedAt: createTimestamp() };
    this.patients.set(patientId, updated);
    this.patientDemographicHistory.push({
      id: createId("patdemo"),
      patientId,
      changedAt: createTimestamp(),
      actor,
      changes,
    });
    this.recordAuditSuccess("update", actor, "Patient", patientId, updated.organizationId, patientId);
    this.publishEvent({
      type: "patient.record.updated",
      sourceModule: PLATFORM_CORE_SOURCE,
      actor,
      patientId,
      organizationId: updated.organizationId,
      resourceType: "Patient",
      resourceId: patientId,
      resourceUrl: `/api/v1/patients/${patientId}`,
      context: { changes },
    });
    return updated;
  }

  linkExternalIdentifier(patientId: string, identifier: PatientIdentifier, actor: ActorRef): Patient {
    const patient = this.patients.get(patientId);
    if (!patient) {
      throw new Error(`Patient not found: ${patientId}`);
    }

    const key = identifierKey(identifier);
    const existingPatientId = this.patientIdentifierIndex.get(key);
    if (existingPatientId && existingPatientId !== patientId) {
      throw new Error(`Identifier is already linked to another patient: ${identifier.system}|${identifier.value}`);
    }

    if (patient.identifiers.some((existing) => identifierKey(existing) === key)) {
      return patient;
    }

    const updated = {
      ...patient,
      identifiers: [...patient.identifiers, identifier],
      updatedAt: createTimestamp(),
    };
    this.patients.set(patientId, updated);
    this.patientIdentifierIndex.set(key, patientId);
    this.recordAudit({
      action: "update",
      actor,
      resourceType: "Patient",
      resourceId: patientId,
      organizationId: updated.organizationId,
      patientId,
      outcome: "success",
      metadata: { linkedIdentifier: identifier },
    });
    this.publishEvent({
      type: "patient.record.updated",
      sourceModule: PLATFORM_CORE_SOURCE,
      actor,
      patientId,
      organizationId: updated.organizationId,
      resourceType: "Patient",
      resourceId: patientId,
      resourceUrl: `/api/v1/patients/${patientId}`,
      context: { linkedIdentifier: identifier },
    });
    return updated;
  }

  getPatientDemographicHistory(patientId: string): PatientDemographicHistory[] {
    return this.patientDemographicHistory.filter((entry) => entry.patientId === patientId);
  }

  createRole(input: Omit<Role, "id">, actor: ActorRef): Role {
    assertNoValidationIssues(validateRequiredFields(input, ["name", "permissions"]));
    const role = { ...input, id: createId("role") };
    this.roles.set(role.id, role);
    this.recordAuditSuccess("create", actor, "Role", role.id);
    return role;
  }

  createUser(input: Omit<UserAccount, "id" | "createdAt" | "updatedAt">, actor: ActorRef): UserAccount {
    assertNoValidationIssues(validateRequiredFields(input, ["email", "displayName", "roleIds"]));
    for (const roleId of input.roleIds) {
      this.assertExists(this.roles, roleId, "Role");
    }
    if (input.organizationId) {
      this.assertExists(this.organizations, input.organizationId, "Organization");
    }
    const user = { ...input, id: createId("usr"), createdAt: createTimestamp(), updatedAt: createTimestamp() };
    this.users.set(user.id, user);
    this.recordAuditSuccess("create", actor, "UserAccount", user.id, input.organizationId);
    return user;
  }

  checkAccess(userId: string, permissions: string[], actor: ActorRef): AccessDecision {
    const user = this.users.get(userId);
    const grantedPermissions = new Set<string>();

    if (user?.active) {
      for (const roleId of user.roleIds) {
        const role = this.roles.get(roleId);
        role?.permissions.forEach((permission) => grantedPermissions.add(permission));
      }
    }

    const missingPermissions = permissions.filter((permission) => !grantedPermissions.has(permission));
    const decision = { allowed: missingPermissions.length === 0, missingPermissions };
    this.recordAudit({
      action: "access-check",
      actor,
      resourceType: "UserAccount",
      resourceId: userId,
      organizationId: user?.organizationId,
      outcome: decision.allowed ? "success" : "failure",
      reason: decision.allowed ? undefined : `Missing permissions: ${missingPermissions.join(", ")}`,
      metadata: { requestedPermissions: permissions },
    });
    return decision;
  }

  recordConsent(
    input: Omit<ConsentPolicy, "id" | "createdAt" | "updatedAt">,
    actor: ActorRef
  ): ConsentPolicy {
    assertNoValidationIssues(validateRequiredFields(input, ["patientId", "purpose", "status", "validFrom"]));
    this.assertExists(this.patients, input.patientId, "Patient");
    const consent = { ...input, id: createId("consent"), createdAt: createTimestamp(), updatedAt: createTimestamp() };
    this.consents.set(consent.id, consent);
    this.recordAuditSuccess("create", actor, "ConsentPolicy", consent.id, input.organizationId, input.patientId);
    this.publishEvent({
      type: "consent.policy.changed",
      sourceModule: PLATFORM_CORE_SOURCE,
      actor,
      patientId: input.patientId,
      organizationId: input.organizationId,
      resourceType: "ConsentPolicy",
      resourceId: consent.id,
      resourceUrl: `/api/v1/consents/${consent.id}`,
    });
    return consent;
  }

  canUsePatientData(patientId: string, purpose: string, requesterId: string, actor: ActorRef): boolean {
    const now = createTimestamp();
    const allowed = [...this.consents.values()].some(
      (consent) =>
        consent.patientId === patientId &&
        consent.purpose === purpose &&
        consent.status === "active" &&
        consent.grantedTo.includes(requesterId) &&
        consent.validFrom <= now &&
        (!consent.validUntil || consent.validUntil >= now)
    );

    this.recordAudit({
      action: "access-check",
      actor,
      resourceType: "ConsentPolicy",
      patientId,
      outcome: allowed ? "success" : "failure",
      reason: allowed ? undefined : "No active consent policy matched the requested purpose",
      metadata: { purpose, requesterId },
    });
    return allowed;
  }

  publishEvent(input: Omit<CoreEvent, "id" | "timestamp">): CoreEvent {
    const event = { ...input, id: createId("evt"), timestamp: createTimestamp() };
    this.events.push(event);
    this.recordAudit({
      action: "event-publish",
      actor: input.actor,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      organizationId: input.organizationId,
      patientId: input.patientId,
      outcome: "success",
      metadata: { eventType: input.type, sourceModule: input.sourceModule },
    });
    return event;
  }

  queueNotification(input: Omit<Notification, "id" | "status" | "createdAt">, actor: ActorRef): Notification {
    assertNoValidationIssues(validateRequiredFields(input, ["channel", "recipientId", "subject", "body"]));
    const notification = { ...input, id: createId("ntf"), status: "queued" as const, createdAt: createTimestamp() };
    this.notifications.set(notification.id, notification);
    this.recordAuditSuccess("notification-route", actor, "Notification", notification.id);
    this.publishEvent({
      type: "notification.queued",
      sourceModule: PLATFORM_CORE_SOURCE,
      actor,
      resourceType: "Notification",
      resourceId: notification.id,
    });
    return notification;
  }

  addTerminologyCode(input: TerminologyCode, actor: ActorRef): TerminologyCode {
    assertNoValidationIssues(validateRequiredFields(input, ["system", "code", "display"]));
    this.terminology.set(`${input.system}|${input.code}`, input);
    this.recordAuditSuccess("create", actor, "TerminologyCode", `${input.system}|${input.code}`);
    return input;
  }

  findTerminologyCode(system: string, code: string): TerminologyCode | undefined {
    return this.terminology.get(`${system}|${code}`);
  }

  registerIntegration(
    input: Omit<IntegrationRegistration, "id" | "createdAt" | "updatedAt">,
    actor: ActorRef
  ): IntegrationRegistration {
    assertNoValidationIssues(validateRequiredFields(input, ["name", "externalSystemId", "module", "status", "supportedFormats"]));
    const integration = { ...input, id: createId("int"), createdAt: createTimestamp(), updatedAt: createTimestamp() };
    this.integrations.set(integration.id, integration);
    this.recordAuditSuccess("integration-register", actor, "IntegrationRegistration", integration.id);
    this.publishEvent({
      type: "integration.registered",
      sourceModule: PLATFORM_CORE_SOURCE,
      actor,
      resourceType: "IntegrationRegistration",
      resourceId: integration.id,
      context: {
        module: input.module,
        externalSystemId: input.externalSystemId,
        status: input.status,
      },
    });
    return integration;
  }

  approveModuleSource(
    input: Omit<ApprovedModuleSource, "id" | "createdAt" | "updatedAt">,
    actor: ActorRef
  ): ApprovedModuleSource {
    assertNoValidationIssues(validateRequiredFields(input, ["moduleId", "repositoryUrl", "allowedRefs", "status"]));
    const source = { ...input, id: createId("modsrc"), createdAt: createTimestamp(), updatedAt: createTimestamp() };
    this.approvedModuleSources.set(input.repositoryUrl, source);
    this.recordAuditSuccess("module-source-approve", actor, "ApprovedModuleSource", source.id);
    this.publishEvent({
      type: "module.source.approved",
      sourceModule: PLATFORM_CORE_SOURCE,
      actor,
      resourceType: "ApprovedModuleSource",
      resourceId: source.id,
      context: {
        moduleId: source.moduleId,
        repositoryUrl: source.repositoryUrl,
        allowedRefs: source.allowedRefs,
        status: source.status,
      },
    });
    return source;
  }

  registerModuleManifest(input: ModuleManifest, actor: ActorRef): ModuleManifest {
    assertNoValidationIssues(
      validateRequiredFields(input, ["moduleId", "name", "version", "category", "repositoryUrl", "minPlatformVersion"])
    );
    const approvedSource = this.approvedModuleSources.get(input.repositoryUrl);

    if (!approvedSource || approvedSource.moduleId !== input.moduleId || approvedSource.status !== "approved") {
      throw new Error(`Module source is not approved for ${input.moduleId}: ${input.repositoryUrl}`);
    }

    this.moduleManifests.set(input.moduleId, input);
    this.recordAuditSuccess("module-manifest-register", actor, "ModuleManifest", input.moduleId);
    this.publishEvent({
      type: "module.manifest.registered",
      sourceModule: PLATFORM_CORE_SOURCE,
      actor,
      resourceType: "ModuleManifest",
      resourceId: input.moduleId,
      context: {
        moduleId: input.moduleId,
        version: input.version,
        routes: input.routes?.map((route) => route.path) ?? [],
      },
    });
    return input;
  }

  getModuleManifest(moduleId: string): ModuleManifest | undefined {
    return this.moduleManifests.get(moduleId);
  }

  planModuleInstall(organizationId: string, moduleId: string, ref: string): ModuleInstallPlan {
    const issues: CoreValidationIssue[] = [];
    const manifest = this.moduleManifests.get(moduleId);

    if (!this.organizations.has(organizationId)) {
      issues.push({ field: "organizationId", message: `Organization not found: ${organizationId}` });
    }

    if (!manifest) {
      issues.push({ field: "moduleId", message: `Module manifest not found: ${moduleId}` });
      return {
        moduleId,
        repositoryUrl: "",
        ref,
        allowed: false,
        missingDependencies: [],
        requiredPermissions: [],
        setupChecklist: [],
        routes: [],
        issues,
      };
    }

    const approvedSource = this.approvedModuleSources.get(manifest.repositoryUrl);
    if (!approvedSource || approvedSource.status !== "approved") {
      issues.push({ field: "repositoryUrl", message: `Module source is not approved: ${manifest.repositoryUrl}` });
    } else if (!approvedSource.allowedRefs.includes(ref) && !approvedSource.allowedRefs.includes("*")) {
      issues.push({ field: "ref", message: `Ref is not approved for module ${moduleId}: ${ref}` });
    }

    const installedModuleIds = new Set(
      [...this.moduleInstallStates.values()]
        .filter((state) => state.organizationId === organizationId && ["installed", "enabled"].includes(state.status))
        .map((state) => state.moduleId)
    );
    const missingDependencies = (manifest.dependencies ?? []).filter((dependency) => !installedModuleIds.has(dependency));

    if (missingDependencies.length > 0) {
      issues.push({ field: "dependencies", message: `Missing dependencies: ${missingDependencies.join(", ")}` });
    }

    return {
      moduleId: manifest.moduleId,
      repositoryUrl: manifest.repositoryUrl,
      ref,
      allowed: issues.length === 0,
      missingDependencies,
      requiredPermissions: manifest.permissions ?? [],
      setupChecklist: manifest.setupChecklist ?? [],
      routes: manifest.routes ?? [],
      issues,
    };
  }

  installModule(organizationId: string, moduleId: string, ref: string, actor: ActorRef): ModuleInstallState {
    const plan = this.planModuleInstall(organizationId, moduleId, ref);
    const manifest = this.moduleManifests.get(moduleId);

    if (!manifest) {
      throw new Error(`Module manifest not found: ${moduleId}`);
    }

    const existingState = this.moduleInstallStates.get(this.moduleInstallKey(organizationId, moduleId));
    const timestamp = createTimestamp();
    const state: ModuleInstallState = {
      id: existingState?.id ?? createId("modinst"),
      organizationId,
      moduleId,
      manifestVersion: manifest.version,
      repositoryUrl: manifest.repositoryUrl,
      ref,
      status: plan.allowed ? "installed" : "blocked",
      installedAt: plan.allowed ? timestamp : existingState?.installedAt,
      enabledAt: existingState?.enabledAt,
      disabledAt: existingState?.disabledAt,
      blockedReason: plan.allowed ? undefined : plan.issues.map((issue) => issue.message).join("; "),
      setupCompleted: existingState?.setupCompleted ?? [],
      createdAt: existingState?.createdAt ?? timestamp,
      updatedAt: timestamp,
    };

    this.moduleInstallStates.set(this.moduleInstallKey(organizationId, moduleId), state);
    this.recordAudit({
      action: "module-install",
      actor,
      resourceType: "ModuleInstallState",
      resourceId: state.id,
      organizationId,
      outcome: plan.allowed ? "success" : "failure",
      reason: state.blockedReason,
      metadata: { moduleId, ref },
    });
    this.publishEvent({
      type: "module.installed",
      sourceModule: PLATFORM_CORE_SOURCE,
      actor,
      organizationId,
      resourceType: "ModuleInstallState",
      resourceId: state.id,
      context: { moduleId, ref, status: state.status },
    });
    return state;
  }

  enableModule(organizationId: string, moduleId: string, actor: ActorRef): ModuleInstallState {
    const state = this.assertModuleInstallState(organizationId, moduleId);
    if (state.status !== "installed" && state.status !== "disabled" && state.status !== "enabled") {
      throw new Error(`Module cannot be enabled from status ${state.status}: ${moduleId}`);
    }

    const updated = { ...state, status: "enabled" as const, enabledAt: createTimestamp(), updatedAt: createTimestamp() };
    this.moduleInstallStates.set(this.moduleInstallKey(organizationId, moduleId), updated);
    this.recordAuditSuccess("module-enable", actor, "ModuleInstallState", updated.id, organizationId);
    this.publishEvent({
      type: "module.enabled",
      sourceModule: PLATFORM_CORE_SOURCE,
      actor,
      organizationId,
      resourceType: "ModuleInstallState",
      resourceId: updated.id,
      context: { moduleId },
    });
    return updated;
  }

  disableModule(organizationId: string, moduleId: string, actor: ActorRef): ModuleInstallState {
    const state = this.assertModuleInstallState(organizationId, moduleId);
    if (state.status !== "enabled" && state.status !== "installed" && state.status !== "disabled") {
      throw new Error(`Module cannot be disabled from status ${state.status}: ${moduleId}`);
    }

    const updated = { ...state, status: "disabled" as const, disabledAt: createTimestamp(), updatedAt: createTimestamp() };
    this.moduleInstallStates.set(this.moduleInstallKey(organizationId, moduleId), updated);
    this.recordAuditSuccess("module-disable", actor, "ModuleInstallState", updated.id, organizationId);
    this.publishEvent({
      type: "module.disabled",
      sourceModule: PLATFORM_CORE_SOURCE,
      actor,
      organizationId,
      resourceType: "ModuleInstallState",
      resourceId: updated.id,
      context: { moduleId },
    });
    return updated;
  }

  recordAudit(event: Omit<AuditEvent, "id" | "timestamp">): AuditEvent {
    const auditEvent = { ...event, id: createId("aud"), timestamp: createTimestamp() };
    this.auditEvents.push(auditEvent);
    return auditEvent;
  }

  snapshot(): PlatformCoreSnapshot {
    return {
      patients: [...this.patients.values()],
      patientDemographicHistory: [...this.patientDemographicHistory],
      organizations: [...this.organizations.values()],
      facilities: [...this.facilities.values()],
      locations: [...this.locations.values()],
      practitioners: [...this.practitioners.values()],
      roles: [...this.roles.values()],
      users: [...this.users.values()],
      consents: [...this.consents.values()],
      auditEvents: [...this.auditEvents],
      events: [...this.events],
      notifications: [...this.notifications.values()],
      terminology: [...this.terminology.values()],
      integrations: [...this.integrations.values()],
      moduleManifests: [...this.moduleManifests.values()],
      approvedModuleSources: [...this.approvedModuleSources.values()],
      moduleInstallStates: [...this.moduleInstallStates.values()],
    };
  }

  private recordAuditSuccess(
    action: AuditEvent["action"],
    actor: ActorRef,
    resourceType: string,
    resourceId?: string,
    organizationId?: string,
    patientId?: string
  ): AuditEvent {
    return this.recordAudit({
      action,
      actor,
      resourceType,
      resourceId,
      organizationId,
      patientId,
      outcome: "success",
    });
  }

  private assertExists<T>(store: Map<string, T>, id: string, resourceType: string): void {
    if (!store.has(id)) {
      throw new Error(`${resourceType} not found: ${id}`);
    }
  }

  private moduleInstallKey(organizationId: string, moduleId: string): string {
    return `${organizationId}|${moduleId}`;
  }

  private assertModuleInstallState(organizationId: string, moduleId: string): ModuleInstallState {
    const state = this.moduleInstallStates.get(this.moduleInstallKey(organizationId, moduleId));
    if (!state) {
      throw new Error(`Module is not installed for organization ${organizationId}: ${moduleId}`);
    }

    return state;
  }
}
