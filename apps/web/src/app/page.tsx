import { AppShell } from "@/components/app-shell";
import { MatrixView } from "@/components/matrix-view";
import { RequireFile } from "@/components/require-file";
import { TourAutostart } from "@/components/tour";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata("/");

export default function HomePage() {
  return (
    <RequireFile>
      <AppShell>
        <MatrixView />
        <TourAutostart />
      </AppShell>
    </RequireFile>
  );
}
