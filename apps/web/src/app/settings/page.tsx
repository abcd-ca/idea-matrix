import { AppShell } from "@/components/app-shell";
import { RequireFile } from "@/components/require-file";
import { SettingsView } from "@/components/settings-view";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata("/settings/");

export default function SettingsPage() {
  return (
    <RequireFile>
      <AppShell>
        <SettingsView />
      </AppShell>
    </RequireFile>
  );
}
