"use client";

import { exportCsv, exportMarkdown, serializeDocument, FILE_EXTENSION } from "@idea-matrix/core";
import { ChevronDownIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { downloadText, safeFileStem } from "@/lib/download";
import { useAppStore } from "@/lib/store";
import { useTranslation } from "react-i18next";

/** One Export menu, three formats. Downloads go through the browser, nowhere else. */
export function ExportMenu() {
  const { t } = useTranslation("common");
  const doc = useAppStore((s) => s.doc);
  if (!doc) return null;
  const stem = safeFileStem(doc.name);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={buttonVariants({ variant: "default" })}>
        {t("export.button")} <ChevronDownIcon data-icon="inline-end" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80">
        <DropdownMenuItem
          onClick={() => downloadText(`${stem}${FILE_EXTENSION}`, serializeDocument(doc), "application/json")}
        >
          <div>
            <p>{t("export.json")}</p>
            <p className="text-xs text-muted-foreground">{t("export.jsonHint")}</p>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => downloadText(`${stem}.md`, exportMarkdown(doc), "text/markdown")}>
          <div>
            <p>{t("export.markdown")}</p>
            <p className="text-xs text-muted-foreground">{t("export.markdownHint")}</p>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => downloadText(`${stem}.csv`, exportCsv(doc), "text/csv")}>
          <div>
            <p>{t("export.csv")}</p>
            <p className="text-xs text-muted-foreground">{t("export.csvHint")}</p>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
