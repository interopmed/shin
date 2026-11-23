import SettingsClient from "@/components/SettingsClient";
import { getSettings, type SettingsResult } from "@/lib/settings-db";

export default async function SettingsPage() {
  let initialSettings: SettingsResult;
  try {
    initialSettings = await getSettings();
  } catch (err) {
    console.error("Failed to fetch settings during SSR:", err);
    initialSettings = {
      summary: { sections: 0, settings: 0, editable: 0 },
      sections: [],
    };
  }

  if (!initialSettings || !Array.isArray(initialSettings.sections)) {
    initialSettings = {
      summary: initialSettings?.summary || { sections: 0, settings: 0, editable: 0 },
      sections: Array.isArray(initialSettings?.sections) ? initialSettings.sections : [],
    };
  }

  return (
    <SettingsClient
      initialSettings={initialSettings}
    />
  );
}
