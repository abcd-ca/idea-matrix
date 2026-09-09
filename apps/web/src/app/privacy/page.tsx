import { PrivacyView } from "@/components/privacy-view";
import { APP_NAME } from "@/lib/config";

export const metadata = { title: `Privacy and trust · ${APP_NAME}` };

export default function PrivacyPage() {
  return <PrivacyView />;
}
