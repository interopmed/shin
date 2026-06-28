import { createPlatformCore } from "./platform-core/platform-core";
import type { ActorRef, CoreEvent } from "./platform-core/types";

const actor: ActorRef = {
  actorId: "shin-demo",
  actorType: "system",
  display: "SHIN Demo",
};

export function createDemoFoundationState() {
  const core = createPlatformCore();
  const organization = core.createOrganization({ name: "ABC Health Institute", type: "other" }, actor);
  const practitioner = core.createPractitioner(
    {
      organizationId: organization.id,
      givenName: "Maya",
      familyName: "Perera",
      specialty: "Clinical Operations",
    },
    actor
  );
  const patient = core.createPatient(
    {
      identifiers: [{ system: "MRN", value: "SHIN-100" }],
      givenName: "Arun",
      familyName: "Silva",
      organizationId: organization.id,
    },
    actor
  );

  core.createPatient(
    {
      identifiers: [{ system: "TEMP", value: "TMP-445" }],
      givenName: "Arun",
      familyName: "Silva",
      birthDate: "1980-01-02",
      sex: "male",
      organizationId: organization.id,
    },
    actor
  );

  const updatedPatient = core.updatePatientDemographics(patient.id, { familyName: "De Silva" }, actor);
  core.linkExternalIdentifier(patient.id, { system: "National ID", value: "NIC-19800102" }, actor);
  core.linkExternalIdentifier(patient.id, { system: "Partner EHR", value: "EHR-7781" }, actor);

  const snapshot = core.snapshot();

  return {
    organization,
    patient: updatedPatient,
    patientSearchResults: core.searchPatients({ text: "arun" }, actor),
    duplicatePatientCandidates: core.findDuplicatePatientCandidates({
      identifiers: [{ system: "Passport", value: "N1234567" }],
      givenName: "Arun",
      familyName: "Silva",
      birthDate: "1980-01-02",
      sex: "male",
      organizationId: organization.id,
    }),
    patientDemographicHistory: core.getPatientDemographicHistory(patient.id),
    practitioner,
    events: snapshot.events as CoreEvent[],
    auditEvents: snapshot.auditEvents,
  };
}
