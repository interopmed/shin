export type CoreValidationIssue = {
  field: string;
  message: string;
};

export type ActorRef = {
  actorId: string;
  actorType: "user" | "system" | "agent";
  display?: string;
};

export type PatientIdentifier = {
  system: string;
  value: string;
};

export type Patient = {
  id: string;
  identifiers: PatientIdentifier[];
  givenName: string;
  familyName: string;
  birthDate?: string;
  sex?: "female" | "male" | "other" | "unknown";
  organizationId?: string;
  createdAt: string;
  updatedAt: string;
};

export type PatientSearchQuery = {
  text?: string;
  identifier?: PatientIdentifier;
  organizationId?: string;
};

export type PatientDemographicPatch = Partial<
  Pick<Patient, "givenName" | "familyName" | "birthDate" | "sex" | "organizationId">
>;

export type PatientDemographicHistory = {
  id: string;
  patientId: string;
  changedAt: string;
  actor: ActorRef;
  changes: Partial<Record<keyof PatientDemographicPatch, { before: string | undefined; after: string | undefined }>>;
};

export type DuplicatePatientCandidate = {
  patient: Patient;
  score: number;
  reasons: string[];
};

export type Organization = {
  id: string;
  name: string;
  type?: "hospital" | "clinic" | "lab" | "payer" | "network" | "partner" | "vendor" | "other";
  createdAt: string;
  updatedAt: string;
};

export type Facility = {
  id: string;
  organizationId: string;
  name: string;
  type?: "hospital" | "clinic" | "lab" | "imaging" | "pharmacy" | "other";
  createdAt: string;
  updatedAt: string;
};

export type Location = {
  id: string;
  facilityId: string;
  name: string;
  type?: "department" | "ward" | "room" | "bed" | "virtual" | "other";
  createdAt: string;
  updatedAt: string;
};

export type Practitioner = {
  id: string;
  organizationId: string;
  givenName: string;
  familyName: string;
  specialty?: string;
  identifiers?: PatientIdentifier[];
  createdAt: string;
  updatedAt: string;
};

export type Role = {
  id: string;
  name: string;
  permissions: string[];
};

export type UserAccount = {
  id: string;
  email: string;
  displayName: string;
  organizationId?: string;
  roleIds: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AccessDecision = {
  allowed: boolean;
  missingPermissions: string[];
};

export type ConsentStatus = "active" | "denied" | "revoked" | "expired";

export type ConsentPolicy = {
  id: string;
  patientId: string;
  organizationId?: string;
  purpose: string;
  status: ConsentStatus;
  grantedTo: string[];
  validFrom: string;
  validUntil?: string;
  createdAt: string;
  updatedAt: string;
};

export type AuditAction =
  | "create"
  | "read"
  | "update"
  | "delete"
  | "access-check"
  | "event-publish"
  | "notification-route"
  | "integration-register"
  | "module-source-approve"
  | "module-manifest-register"
  | "module-install"
  | "module-enable"
  | "module-disable";

export type AuditEvent = {
  id: string;
  timestamp: string;
  action: AuditAction;
  actor: ActorRef;
  resourceType: string;
  resourceId?: string;
  organizationId?: string;
  patientId?: string;
  outcome: "success" | "failure";
  reason?: string;
  metadata?: Record<string, unknown>;
};

export type CoreEventType =
  | "patient.record.created"
  | "patient.record.updated"
  | "organization.created"
  | "facility.created"
  | "location.created"
  | "practitioner.created"
  | "consent.policy.changed"
  | "integration.registered"
  | "notification.queued"
  | "module.source.approved"
  | "module.manifest.registered"
  | "module.installed"
  | "module.enabled"
  | "module.disabled";

export type CoreEvent = {
  id: string;
  type: CoreEventType | string;
  timestamp: string;
  sourceModule: string;
  actor: ActorRef;
  patientId?: string;
  organizationId?: string;
  facilityId?: string;
  resourceType: string;
  resourceId: string;
  context?: Record<string, unknown>;
  resourceUrl?: string;
};

export type NotificationChannel = "email" | "sms" | "in-app" | "webhook";

export type Notification = {
  id: string;
  channel: NotificationChannel;
  recipientId: string;
  subject: string;
  body: string;
  status: "queued" | "sent" | "failed";
  createdAt: string;
};

export type TerminologyCode = {
  system: string;
  code: string;
  display: string;
  version?: string;
};

export type IntegrationStatus = "planned" | "active" | "paused" | "retired";

export type IntegrationRegistration = {
  id: string;
  name: string;
  externalSystemId: string;
  module: string;
  status: IntegrationStatus;
  supportedFormats: string[];
  createdAt: string;
  updatedAt: string;
};

export type ModuleCategory =
  | "platform"
  | "clinical"
  | "clinical-operations"
  | "billing"
  | "lab"
  | "imaging"
  | "pharmacy"
  | "devices"
  | "ai"
  | "integration"
  | "other";

export type ModuleRoute = {
  path: string;
  label: string;
  requiredPermissions?: string[];
};

export type ModuleEventContract = {
  publishes?: string[];
  subscribes?: string[];
};

export type ModuleManifest = {
  moduleId: string;
  name: string;
  version: string;
  category: ModuleCategory;
  description?: string;
  repositoryUrl: string;
  minPlatformVersion: string;
  dependencies?: string[];
  permissions?: string[];
  routes?: ModuleRoute[];
  events?: ModuleEventContract;
  setupChecklist?: string[];
};

export type ApprovedModuleSource = {
  id: string;
  moduleId: string;
  repositoryUrl: string;
  allowedRefs: string[];
  status: "approved" | "paused" | "retired";
  createdAt: string;
  updatedAt: string;
};

export type ModuleInstallStatus = "available" | "installed" | "enabled" | "disabled" | "blocked";

export type ModuleInstallState = {
  id: string;
  organizationId: string;
  moduleId: string;
  manifestVersion: string;
  repositoryUrl: string;
  ref: string;
  status: ModuleInstallStatus;
  installedAt?: string;
  enabledAt?: string;
  disabledAt?: string;
  blockedReason?: string;
  setupCompleted: string[];
  createdAt: string;
  updatedAt: string;
};

export type ModuleInstallPlan = {
  moduleId: string;
  repositoryUrl: string;
  ref: string;
  allowed: boolean;
  missingDependencies: string[];
  requiredPermissions: string[];
  setupChecklist: string[];
  routes: ModuleRoute[];
  issues: CoreValidationIssue[];
};

export type PlatformCoreSnapshot = {
  patients: Patient[];
  patientDemographicHistory: PatientDemographicHistory[];
  organizations: Organization[];
  facilities: Facility[];
  locations: Location[];
  practitioners: Practitioner[];
  roles: Role[];
  users: UserAccount[];
  consents: ConsentPolicy[];
  auditEvents: AuditEvent[];
  events: CoreEvent[];
  notifications: Notification[];
  terminology: TerminologyCode[];
  integrations: IntegrationRegistration[];
  moduleManifests: ModuleManifest[];
  approvedModuleSources: ApprovedModuleSource[];
  moduleInstallStates: ModuleInstallState[];
};

export type PlatformCore = {
  createOrganization(input: Omit<Organization, "id" | "createdAt" | "updatedAt">, actor: ActorRef): Organization;
  createFacility(input: Omit<Facility, "id" | "createdAt" | "updatedAt">, actor: ActorRef): Facility;
  createLocation(input: Omit<Location, "id" | "createdAt" | "updatedAt">, actor: ActorRef): Location;
  createPractitioner(input: Omit<Practitioner, "id" | "createdAt" | "updatedAt">, actor: ActorRef): Practitioner;
  createPatient(input: Omit<Patient, "id" | "createdAt" | "updatedAt">, actor: ActorRef): Patient;
  matchPatient(identifiers: PatientIdentifier[]): Patient | undefined;
  searchPatients(query: PatientSearchQuery, actor: ActorRef): Patient[];
  findDuplicatePatientCandidates(input: Omit<Patient, "id" | "createdAt" | "updatedAt">): DuplicatePatientCandidate[];
  updatePatientDemographics(patientId: string, patch: PatientDemographicPatch, actor: ActorRef): Patient;
  linkExternalIdentifier(patientId: string, identifier: PatientIdentifier, actor: ActorRef): Patient;
  getPatientDemographicHistory(patientId: string): PatientDemographicHistory[];
  createRole(input: Omit<Role, "id">, actor: ActorRef): Role;
  createUser(input: Omit<UserAccount, "id" | "createdAt" | "updatedAt">, actor: ActorRef): UserAccount;
  checkAccess(userId: string, permissions: string[], actor: ActorRef): AccessDecision;
  recordConsent(input: Omit<ConsentPolicy, "id" | "createdAt" | "updatedAt">, actor: ActorRef): ConsentPolicy;
  canUsePatientData(patientId: string, purpose: string, requesterId: string, actor: ActorRef): boolean;
  publishEvent(input: Omit<CoreEvent, "id" | "timestamp">): CoreEvent;
  queueNotification(input: Omit<Notification, "id" | "status" | "createdAt">, actor: ActorRef): Notification;
  addTerminologyCode(input: TerminologyCode, actor: ActorRef): TerminologyCode;
  findTerminologyCode(system: string, code: string): TerminologyCode | undefined;
  registerIntegration(input: Omit<IntegrationRegistration, "id" | "createdAt" | "updatedAt">, actor: ActorRef): IntegrationRegistration;
  approveModuleSource(input: Omit<ApprovedModuleSource, "id" | "createdAt" | "updatedAt">, actor: ActorRef): ApprovedModuleSource;
  registerModuleManifest(input: ModuleManifest, actor: ActorRef): ModuleManifest;
  getModuleManifest(moduleId: string): ModuleManifest | undefined;
  planModuleInstall(organizationId: string, moduleId: string, ref: string): ModuleInstallPlan;
  installModule(organizationId: string, moduleId: string, ref: string, actor: ActorRef): ModuleInstallState;
  enableModule(organizationId: string, moduleId: string, actor: ActorRef): ModuleInstallState;
  disableModule(organizationId: string, moduleId: string, actor: ActorRef): ModuleInstallState;
  recordAudit(event: Omit<AuditEvent, "id" | "timestamp">): AuditEvent;
  snapshot(): PlatformCoreSnapshot;
};
