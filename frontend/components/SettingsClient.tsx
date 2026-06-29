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
  currentValue,
  onChange,
}: {
  setting: SystemSettingRecord;
  currentValue: string;
  onChange: (value: string) => void;
}) {
  const isBoolean = setting.kind === "boolean";
  const isChoice = setting.kind === "choice";
  const enabled = currentValue.toLowerCase() === "true" || currentValue === "Enabled";

  const isTimezone = setting.key === "timezone.default";
  const isRetention = setting.key === "retention.audit";
  const isLanguage = setting.key === "language.default";
  const isBackup = setting.key === "backup.schedule";
  const isBiometric = setting.key === "iam.biometric.policy";
  const isPhiAccess = setting.key === "privacy.access.preferences";
  const isFeed = setting.key.startsWith("feeds.");

  // Hide edit interface for language.default as requested ("remove language select")
  const isEditable = setting.isEditable && !isLanguage;

  if (setting.key === "audit.log.summary") {
    return (
      <Link href="/foundation/audit" className="system-list-item" style={{ textDecoration: "none" }}>
        <Icon name="db" />
        <span>
          <b>{setting.label}</b>
          <small>{setting.detail}</small>
        </span>
        <div>
          <strong className="success">Available</strong>
        </div>
        <i style={{ color: "#2f66d9" }}>&gt;</i>
      </Link>
    );
  }

  return (
    <div className="system-list-item">
      <Icon name={setting.section.includes("Privacy") ? "lock" : setting.section.includes("IAM") ? "role" : setting.section.includes("Audit") ? "db" : "globe"} />
      <span>
        <b>{setting.label}</b>
        <small>{setting.detail}</small>
      </span>
      <div>
        {isEditable ? (
          isTimezone ? (
            <select
              value={currentValue}
              onChange={(e) => onChange(e.target.value)}
              className="system-setting-select"
            >
              <option value="Asia/Colombo">Asia/Colombo</option>
              <option value="UTC">UTC</option>
              <option value="America/New_York">America/New_York</option>
              <option value="Europe/London">Europe/London</option>
              <option value="Asia/Singapore">Asia/Singapore</option>
            </select>
          ) : isRetention ? (
            <select
              value={currentValue}
              onChange={(e) => onChange(e.target.value)}
              className="system-setting-select"
            >
              <option value="1 year">1 year</option>
              <option value="2 years">2 years</option>
              <option value="3 years">3 years</option>
              <option value="5 years">5 years</option>
              <option value="10 years">10 years</option>
            </select>
          ) : isBackup ? (
            <select
              value={currentValue}
              onChange={(e) => onChange(e.target.value)}
              className="system-setting-select"
            >
              <option value="Hourly">Hourly</option>
              <option value="Nightly">Nightly</option>
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
            </select>
          ) : isBiometric ? (
            <select
              value={currentValue}
              onChange={(e) => onChange(e.target.value)}
              className="system-setting-select"
            >
              <option value="Configured">Configured</option>
              <option value="Enforced">Enforced</option>
              <option value="Disabled">Disabled</option>
            </select>
          ) : isPhiAccess ? (
            <select
              value={currentValue}
              onChange={(e) => onChange(e.target.value)}
              className="system-setting-select"
            >
              <option value="Set individual privacy rules">Set individual privacy rules</option>
              <option value="Enforce global defaults">Enforce global defaults</option>
              <option value="Restrict all PHI access">Restrict all PHI access</option>
            </select>
          ) : isFeed ? (
            <select
              value={currentValue}
              onChange={(e) => onChange(e.target.value)}
              className="system-setting-select"
            >
              <option value="Connected">Connected</option>
              <option value="Disconnected">Disconnected</option>
              <option value="Maintenance">Maintenance</option>
            </select>
          ) : isBoolean ? (
            <select
              value={currentValue}
              onChange={(e) => onChange(e.target.value)}
              className="system-setting-select"
            >
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
          ) : isChoice ? (
            <select
              value={currentValue}
              onChange={(e) => onChange(e.target.value)}
              className="system-setting-select"
            >
              <option value="Opt-In">Opt-In</option>
              <option value="Opt-Out">Opt-Out</option>
            </select>
          ) : (
            <input
              type="text"
              value={currentValue}
              onChange={(e) => onChange(e.target.value)}
              className="system-setting-input"
            />
          )
        ) : (
          <strong className={setting.tone === "success" ? "success" : setting.tone === "warning" ? "connected" : ""}>
            {isBoolean ? (enabled ? "Enabled" : "Disabled") : currentValue}
          </strong>
        )}
      </div>
      <i style={{ color: isEditable ? "#2f66d9" : "#64748b" }}>
        {isEditable ? "✎" : "🔒"}
      </i>
    </div>
  );
}

function ModulePanel({ contribution }: { contribution: ModuleContribution }) {
  const sections = contribution.dashboardSections;

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
              <span className="system-check">✓</span>
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
            <span className="system-check">✓</span>
            <span>
              <b>{contribution.label}</b>
              <small>{contribution.dashboardCards[0]?.detail ?? "Installed module"}</small>
            </span>
            <strong className="success">{contribution.dashboardCards[0]?.value ?? "Installed"}</strong>
            <i>&gt;</i>
          </div>
        )}
      </div>
      {contribution.quickActions.length > 0 ? (
        <p className="system-panel-copy">
          {contribution.quickActions[0].label} and module setup follow the installed module manifest.{" "}
          <Link href={contribution.quickActions[0].href}>Open module</Link>
        </p>
      ) : null}
    </section>
  );
}

export default function SettingsClient({ initialSettings, moduleContributions }: SettingsClientProps) {
  const [settings, setSettings] = useState<SettingsResult>(initialSettings);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showHelp, setShowHelp] = useState(false);

  const settingsBySection = useMemo(() => settings.sections, [settings]);

  // Track modification count
  const changesCount = Object.keys(editedValues).length;

  const handleValueChange = (id: string, value: string) => {
    setSuccess("");
    setError("");
    setEditedValues((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleSaveChanges = async () => {
    if (changesCount === 0) return;

    setSaving(false);
    setError("");
    setSuccess("");

    try {
      const updatePromises = Object.entries(editedValues).map(([id, val]) => {
        let patchValue: any = val;
        if (val === "true") patchValue = true;
        if (val === "false") patchValue = false;
        return updateSetting(id, { value: patchValue });
      });

      await Promise.all(updatePromises);

      // Reload settings from the database
      const reloaded = await getSettings();
      setSettings(reloaded);
      setEditedValues({});
      setSuccess("All configuration settings successfully saved to database!");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to save settings changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleDiscardChanges = () => {
    setEditedValues({});
    setError("");
    setSuccess("");
  };

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
          {section.items
            .filter((item) => item.key !== "language.default")
            .map((item) => {
              const currentValue = editedValues[item.id] !== undefined ? editedValues[item.id] : item.value;
              return (
                <div key={item.id}>
                  <SettingRow
                    setting={item}
                    currentValue={currentValue}
                    onChange={(val) => handleValueChange(item.id, val)}
                  />
                </div>
              );
            })}
        </div>
      </section>
    );
  }

  return (
    <section className="system-settings-page">
      <nav className="facility-breadcrumb" aria-label="Breadcrumb">
        <Link href="/dashboard">Dashboard</Link>
        <span className="separator">/</span>
        <span className="current">Settings</span>
      </nav>

      <div className="system-settings-card">
        <header className="system-settings-header">
          <div>
            <h1>SHIN System Administration</h1>
            <p className="muted">
              Database-backed settings with module behavior from the installed lab module logic.
              {changesCount > 0 && (
                <span style={{ color: "#2f66d9", fontWeight: "900", marginLeft: "8px" }}>
                  ({changesCount} pending changes)
                </span>
              )}
            </p>
          </div>
          <div className="system-settings-actions">
            <button
              className="system-primary-button"
              type="button"
              onClick={handleSaveChanges}
              disabled={changesCount === 0 || saving}
              style={{ opacity: changesCount === 0 || saving ? 0.6 : 1 }}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button
              className="system-secondary-button"
              type="button"
              onClick={handleDiscardChanges}
              disabled={changesCount === 0 || saving}
              style={{ opacity: changesCount === 0 || saving ? 0.6 : 1 }}
            >
              Discard
            </button>
          </div>
        </header>

        {error ? <div className="system-settings-banner">{error}</div> : null}
        {success ? (
          <div
            className="system-settings-banner"
            style={{ background: "#ecfdf5", borderBottom: "1px solid #a7f3d0", color: "#065f46" }}
          >
            {success}
          </div>
        ) : null}

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
                Approved modules surface from the installed registry and their setup checklist logic.{" "}
                <Link href="/modules">Open module registry</Link>
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

        <button className="system-help-button" type="button" onClick={() => setShowHelp(true)}>
          ? Help
        </button>
      </div>

      {showHelp && (
        <div className="system-help-modal-overlay" onClick={() => setShowHelp(false)}>
          <div className="system-help-modal" onClick={(e) => e.stopPropagation()}>
            <h2>SHIN Node Settings Help</h2>
            <p>
              Welcome to the System Administration guide. Configure platform infrastructure, manage local modules, or adjust compliance preferences.
            </p>
            
            <h3>Making Adjustments</h3>
            <ul>
              <li>Use dropdown selectors to configure timezones, retention policies, backup schedules, biometric authentication, and external data feeds.</li>
              <li>Use toggles to enable or disable global features like MFA Enforcement and Callbacks.</li>
            </ul>

            <h3>Saving Changes</h3>
            <ul>
              <li>All edits are stored locally in memory first. The number of pending updates is tracked at the top right of the administration card.</li>
              <li>Click <strong>Save Changes</strong> to commit all changes at once to the database, or click <strong>Discard</strong> to revert to the current database settings.</li>
            </ul>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="system-primary-button" type="button" onClick={() => setShowHelp(false)}>
                Close Help
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
