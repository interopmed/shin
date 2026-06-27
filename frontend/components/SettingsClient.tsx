"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { type ModuleContribution } from "../lib/module-contributions";
import { getSettings, updateSetting, type SettingsResult, type SystemSettingRecord } from "../lib/settings-db";

type SettingsClientProps = {
  initialSettings: SettingsResult;
  moduleContributions: ModuleContribution[];
};

function Icon({ name }: { name: "clock" | "globe" | "db" | "lock" | "finger" | "role" | "list" | "bell" | "session" | "moon" | "access" }) {
  return <span className={`system-icon ${name}`} aria-hidden="true" />;
}

function SettingRow({
  setting,
  onToggle,
}: {
  setting: SystemSettingRecord;
  onToggle: (setting: SystemSettingRecord) => void;
}) {
  const isBoolean = setting.kind === "boolean";
  const enabled = setting.value.toLowerCase() === "true" || setting.value === "Enabled";

  return (
    <button className="system-list-item" type="button" onClick={() => isBoolean && setting.isEditable && onToggle(setting)}>
      <Icon name={setting.section.includes("Privacy") ? "lock" : setting.section.includes("IAM") ? "role" : setting.section.includes("Audit") ? "db" : "globe"} />
      <span>
        <b>{setting.label}</b>
        <small>{setting.detail}</small>
      </span>
      <strong className={setting.tone === "success" ? "success" : setting.tone === "warning" ? "connected" : ""}>
        {isBoolean ? (enabled ? "Enabled" : "Disabled") : setting.value}
      </strong>
      <i>{setting.isEditable && isBoolean ? "toggle" : ">"}</i>
    </button>
  );
}

function ModulePanel({ contribution }: { contribution: ModuleContribution }) {
  const sections = contribution.dashboardSections;
  const quickActions = contribution.quickActions;

  return (
    <section className="system-panel">
      <header>
        <h2>{contribution.label}</h2>
        <button aria-label={`More actions for ${contribution.label}`} type="button">:</button>
      </header>
      <div className="system-list">
        {sections.length > 0 ? (
          sections.map((section) => (
            <div className="system-list-item module" key={`${contribution.moduleId}-${section.title}`}>
              <span className="system-check">v</span>
              <span>
                <b>{section.title}</b>
                <small>{section.description ?? "Module dashboard section"}</small>
              </span>
              <strong className="success">{section.widgets.length} widgets</strong>
              <i>&gt;</i>
            </div>
          ))
        ) : (
          <div className="system-list-item module">
            <span className="system-check">v</span>
            <span>
              <b>{contribution.label}</b>
              <small>{contribution.dashboardCards[0]?.detail ?? "Installed module"}</small>
            </span>
            <strong className="success">{contribution.dashboardCards[0]?.value ?? "Installed"}</strong>
            <i>&gt;</i>
          </div>
        )}
      </div>
      {quickActions.length > 0 ? (
        <p className="system-panel-copy">
          {quickActions[0].label} and module setup follow the installed module manifest. <Link href={quickActions[0].href}>Open module</Link>
        </p>
      ) : null}
    </section>
  );
}

export default function SettingsClient({ initialSettings, moduleContributions }: SettingsClientProps) {
  const [settings, setSettings] = useState<SettingsResult>(initialSettings);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const settingsBySection = useMemo(() => settings.sections, [settings]);

  async function toggleSetting(setting: SystemSettingRecord) {
    const nextValue = setting.value.toLowerCase() === "true" || setting.value === "Enabled" ? false : true;
    setSavingId(setting.id);
    setError("");

    try {
      const updated = await updateSetting(setting.id, { value: nextValue });
      setSettings((current) => ({
        ...current,
        sections: current.sections.map((section) => ({
          ...section,
          items: section.items.map((item) => (item.id === updated.id ? updated : item)),
        })),
      }));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to update setting.");
    } finally {
      setSavingId(null);
    }
  }

  function renderSection(title: string) {
    const section = settingsBySection.find((item) => item.section === title);
    if (!section) {
      return null;
    }

    return (
      <section className="system-panel">
        <header>
          <h2>{title}</h2>
          <button aria-label={`More actions for ${title}`} type="button">:</button>
        </header>
        <div className="system-list">
          {section.items.map((item) => (
            <div key={item.id} style={{ opacity: savingId === item.id ? 0.7 : 1 }}>
              <SettingRow setting={item} onToggle={toggleSetting} />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="system-settings-page">
      <div className="system-settings-card">
        <header className="system-settings-header">
          <div>
            <h1>SHIN System Administration</h1>
            <p className="muted">Database-backed settings with module behavior from the installed lab module logic.</p>
          </div>
          <div className="system-settings-actions">
            <button className="system-primary-button" type="button" onClick={async () => setSettings(await getSettings())}>
              Save Changes
            </button>
            <button className="system-secondary-button" type="button" onClick={() => setSettings(initialSettings)}>
              Discard
            </button>
          </div>
        </header>

        {error ? <div className="system-settings-banner">{error}</div> : null}

        <section className="system-settings-grid">
          <div className="system-column">
            <h2 className="system-column-title">Platform Infrastructure</h2>
            {renderSection("Global Configuration")}
            {renderSection("Authentication & IAM")}
            {renderSection("API & Webhooks")}
          </div>

          <div className="system-column">
            <h2 className="system-column-title">Modular Integration</h2>
            <section className="system-panel">
              <header>
                <h2>Module Management</h2>
                <button aria-label="More actions for Module Management" type="button">:</button>
              </header>
              <div className="system-list">
                {moduleContributions.map((contribution) => (
                  <div key={contribution.moduleId} className="system-panel-module">
                    <ModulePanel contribution={contribution} />
                  </div>
                ))}
              </div>
            </section>

            <section className="system-panel">
              <header>
                <h2>Available Extensions</h2>
                <button aria-label="More actions for Available Extensions" type="button">:</button>
              </header>
              <p className="system-panel-copy">
                Approved modules surface from the installed registry and their setup checklist logic. <Link href="/modules">Open module registry</Link>
              </p>
            </section>

            {renderSection("External Data Feeds")}
          </div>

          <div className="system-column">
            <h2 className="system-column-title">Global Audit & Provenance</h2>
            {renderSection("Global Audit & Provenance")}
            {renderSection("Data Privacy & Consent")}
            {renderSection("System Backup & Recovery")}
          </div>
        </section>

        <button className="system-help-button" type="button">? Help</button>
      </div>
    </section>
  );
}
