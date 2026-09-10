import { SetupWizard } from "@/components/setup-wizard";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata("/setup/");

export default function SetupPage() {
  return <SetupWizard />;
}
