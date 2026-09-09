import { AppShell } from "@/components/app-shell";
import { MatrixView } from "@/components/matrix-view";
import { RequireFile } from "@/components/require-file";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata("/parked/");

export default function ParkedPage() {
  return (
    <RequireFile>
      <AppShell>
        <MatrixView parked />
      </AppShell>
    </RequireFile>
  );
}
