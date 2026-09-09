import { PrivacyView } from "@/components/privacy-view";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata("/privacy/");

export default function PrivacyPage() {
  return <PrivacyView />;
}
