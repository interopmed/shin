import SettingsClient from "@/components/SettingsClient";
import { getSettings } from "@/lib/settings-db";

export default async function SettingsPage() {
  const initialSettings = await getSettings();

  return (
    <SettingsClient
      initialSettings={initialSettings}
    />
  );
}
