import { AppShell } from "@/components/app-shell";
import { RequireFile } from "@/components/require-file";
import { SettingsView } from "@/components/settings-view";

export default function SettingsPage() {
  return (
    <RequireFile>
      <AppShell>
        <SettingsView />
      </AppShell>
    </RequireFile>
  );
}
