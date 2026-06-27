import type { ReactNode } from "react";
import RoleAccessSwitcher from "../../../components/RoleAccessSwitcher";
import { getActiveUserContext, roleLabels } from "../../../lib/node-state";

const workDetails = [
  { label: "Department", value: "Admin" },
  { label: "Direct Manager", value: "Theresa Webb" },
  { label: "Field ID", value: "Platform Config..." },
];

const securityItems = [
  { icon: "lock", label: "Multi-Factor Authentication", value: "Enabled", detail: "" },
  { icon: "finger", label: "Biometric Login", value: "Configured", detail: "Configured" },
  { icon: "session", label: "Connected Sessions", value: "", detail: "" },
  { icon: "list", label: "PHI Access Preferences", value: "", detail: "Set indiv. privacy rules" },
];

const preferences = [
  { icon: "moon", label: "Dark Mode", value: "Disabled" },
  { icon: "bell", label: "Notification Preferences", value: "Disabled" },
  { icon: "clock", label: "Timezone", value: "Personal override option" },
  { icon: "globe", label: "Language", value: "Personal preference" },
  { icon: "access", label: "Accessibility Settings", value: "Text size, contrast" },
];

function UserPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="user-settings-panel">
      <header>
        <h2>{title}</h2>
        <button aria-label={`More actions for ${title}`} type="button">:</button>
      </header>
      {children}
    </section>
  );
}

function UserIcon({ name }: { name: string }) {
  return <span className={`user-settings-icon ${name}`} aria-hidden="true" />;
}

export default function UserSettingsPage() {
  const activeUser = getActiveUserContext();

  return (
    <section className="user-settings-page">
      <div className="user-settings-card">
        <header className="user-settings-header">
          <h1>SHIN User Settings</h1>
          <div className="user-settings-actions">
            <button className="system-primary-button" type="button">Save Changes</button>
            <button className="system-secondary-button" type="button">x Discard</button>
          </div>
        </header>

        <h2 className="user-settings-section-title">Personal Profile</h2>

        <section className="user-settings-grid">
          <div className="user-settings-left">
            <UserPanel title="Personal Profile">
              <div className="user-profile-card">
                <div className="user-profile-photo" aria-label="Theresa Webb portrait">
                  <div />
                </div>
                <div>
                  <h3>{activeUser.displayName} <span>({roleLabels[activeUser.role]})</span></h3>
                  <p>Title: {roleLabels[activeUser.role]}</p>
                  <p>Role: Access layout preview</p>
                </div>
              </div>
              <div className="user-profile-actions">
                <button type="button">Edit Profile</button>
                <button type="button">Change Password</button>
              </div>
            </UserPanel>

            <div className="user-settings-lower-grid">
              <div className="user-settings-stack">
                <UserPanel title="Work Details">
                  <div className="user-settings-list">
                    {workDetails.map((item) => (
                      <button className="user-settings-row" key={item.label} type="button">
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                        <i>&gt;</i>
                      </button>
                    ))}
                  </div>
                </UserPanel>

                <UserPanel title="Linked Accounts">
                  <button className="user-settings-row icon-row" type="button">
                    <UserIcon name="link" />
                    <span>Linked Accounts</span>
                    <i>&gt;</i>
                  </button>
                </UserPanel>

                <UserPanel title="User Settings">
                  <button className="user-settings-row" type="button">
                    <span>{roleLabels[activeUser.role]}</span>
                    <i>&gt;</i>
                  </button>
                </UserPanel>
              </div>

              <UserPanel title="Security &">
                <div className="user-settings-list">
                  {securityItems.map((item) => (
                    <button className="user-security-row" key={item.label} type="button">
                      <UserIcon name={item.icon} />
                      <span>
                        <b>{item.label}</b>
                        {item.value ? <em>{item.value}</em> : null}
                        {item.detail ? <small>{item.detail}</small> : null}
                      </span>
                      <i>&gt;</i>
                    </button>
                  ))}
                </div>
              </UserPanel>
            </div>
          </div>

          <div className="user-settings-right">
            <UserPanel title="Access Layout">
              <div className="role-access-panel">
                <p>
                  Change the active account role to preview dashboard, sidebar, and module access for different teams.
                </p>
                <RoleAccessSwitcher activeRole={activeUser.role} />
              </div>
            </UserPanel>

            <UserPanel title="System Administration">
              <button className="user-admin-summary" type="button">
                <span>Upcoming profile reviews to summary about profile and secure information to:wothort.</span>
                <strong>Enabled</strong>
                <i>&gt;</i>
              </button>
              <button className="user-settings-row" type="button">
                <span>Upcoming Profile Reviews</span>
                <i>&gt;</i>
              </button>
            </UserPanel>

            <UserPanel title="System Preferences">
              <div className="user-settings-list">
                {preferences.map((item) => (
                  <div className="user-preference-block" key={item.label}>
                    <button className="user-preference-row" type="button">
                      <UserIcon name={item.icon} />
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                      <i>&gt;</i>
                    </button>
                    {item.label === "Notification Preferences" ? (
                      <div className="user-alert-types">
                        <span>Alert types:</span>
                        <div>
                          {["Email", "SMS", "In-App", "Email", "SMS", "In-App", "In-App", "SMS", "In-App"].map((type, index) => (
                            <b className={`tone-${index % 4}`} key={`${type}-${index}`}>{type}</b>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </UserPanel>
          </div>
        </section>

        <button className="system-help-button" type="button">? Help</button>
      </div>
    </section>
  );
}
