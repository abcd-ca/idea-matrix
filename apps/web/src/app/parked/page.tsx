import { AppShell } from "@/components/app-shell";
import { MatrixView } from "@/components/matrix-view";
import { RequireFile } from "@/components/require-file";

export default function ParkedPage() {
  return (
    <RequireFile>
      <AppShell>
        <MatrixView parked />
      </AppShell>
    </RequireFile>
  );
}
