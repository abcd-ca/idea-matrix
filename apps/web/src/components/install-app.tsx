"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/config";
import { promptInstall, useInstallState } from "@/lib/install";

/** The Settings section: a sentence for where things stand, and the Install button while the browser offers one. */
export function InstallApp() {
  const { t } = useTranslation("settings");
  const state = useInstallState();
  const [busy, setBusy] = useState(false);

  return (
    <>
      <p>{t(`install.${state}`, { app: APP_NAME })}</p>
      {state === "available" ? (
        <Button
          variant="outline"
          className="w-fit"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await promptInstall();
            } finally {
              setBusy(false);
            }
          }}
        >
          {t("install.button")}
        </Button>
      ) : null}
    </>
  );
}
