import SettingsClient from "../../components/SettingsClient";
import { getVisibleModuleContributions } from "../../lib/module-contributions";
import { getSettings } from "../../lib/settings-db";
import { getShinNodeState } from "../../lib/node-state";
import registry from "../../config/approved-modules.json";

export default async function SettingsPage() {
  const [initialSettings, moduleContributions] = await Promise.all([
    getSettings(),
    Promise.resolve(getVisibleModuleContributions({ includeInstalled: true })),
  ]);
  const nodeState = getShinNodeState();

  return (
    <SettingsClient
      initialSettings={initialSettings}
      moduleContributions={moduleContributions}
      nodeState={nodeState}
      registry={registry}
    />
  );
}
