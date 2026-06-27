import SettingsClient from "../../components/SettingsClient";
import { getVisibleModuleContributions } from "../../lib/module-contributions";
import { getSettings } from "../../lib/settings-db";

export default async function SettingsPage() {
  const [initialSettings, moduleContributions] = await Promise.all([
    getSettings(),
    Promise.resolve(getVisibleModuleContributions({ includeInstalled: true })),
  ]);

  return <SettingsClient initialSettings={initialSettings} moduleContributions={moduleContributions} />;
}
