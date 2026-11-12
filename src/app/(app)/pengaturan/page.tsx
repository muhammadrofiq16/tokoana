import prisma from "@/lib/prisma";
import SettingsClient from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settingsList = await prisma.setting.findMany();
  const settings: Record<string, string> = {};
  for (const s of settingsList) {
    if (s.value !== null) {
      settings[s.key] = s.value;
    }
  }

  return <SettingsClient initialSettings={settings} />;
}
