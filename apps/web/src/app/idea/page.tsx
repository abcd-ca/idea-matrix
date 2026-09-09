import { AppShell } from "@/components/app-shell";
import { IdeaDetail } from "@/components/idea-detail";
import { RequireFile } from "@/components/require-file";
import { pageMetadata } from "@/lib/site";
import { Suspense } from "react";

export const metadata = pageMetadata("/idea/");

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
