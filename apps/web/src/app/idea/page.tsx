import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { IdeaDetail } from "@/components/idea-detail";
import { RequireFile } from "@/components/require-file";

export default function IdeaPage() {
  return (
    <RequireFile>
      <AppShell>
        <Suspense fallback={null}>
          <IdeaDetail />
        </Suspense>
      </AppShell>
    </RequireFile>
  );
}
