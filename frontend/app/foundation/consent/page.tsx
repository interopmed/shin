import { FoundationPage } from "../../../components/FoundationPage";

export default function ConsentPage() {
  return (
    <FoundationPage
      eyebrow="Foundation"
      title="Consent"
      description="System consent infrastructure for purpose-based data use, policy templates, and auditable access decisions."
      stats={[
        { label: "Consent Engine", value: "On", detail: "Purpose and requester checks" },
        { label: "Policy Templates", value: "Ready", detail: "Used by patient consent screens" },
        { label: "Audit", value: "On", detail: "Consent decisions are traceable" },
      ]}
      sections={[
        {
          title: "Platform Role",
          body: "This foundation service defines organization-wide consent rules, purpose categories, policy defaults, and shared enforcement hooks.",
        },
        {
          title: "Patient Consent",
          body: "Patient-specific consent management now lives with the patient profile at /patients/P10001/consent.",
        },
      ]}
    />
  );
}
