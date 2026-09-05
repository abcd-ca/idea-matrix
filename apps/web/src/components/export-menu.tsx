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

/** One Export menu, three formats. Downloads go through the browser, nowhere else. */
export function ExportMenu() {
  const doc = useAppStore((s) => s.doc);
  if (!doc) return null;
  const stem = safeFileStem(doc.name);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={buttonVariants({ variant: "default" })}>
        Export <ChevronDownIcon data-icon="inline-end" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80">
        <DropdownMenuItem onClick={() => downloadText(`${stem}${FILE_EXTENSION}`, serializeDocument(doc), "application/json")}>
          <div>
            <p>JSON</p>
            <p className="text-xs text-muted-foreground">A copy of the matrix file itself. Always round-trips.</p>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => downloadText(`${stem}.md`, exportMarkdown(doc), "text/markdown")}>
          <div>
            <p>Markdown</p>
            <p className="text-xs text-muted-foreground">One section per idea, for reading and keeping.</p>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => downloadText(`${stem}.csv`, exportCsv(doc), "text/csv")}>
          <div>
            <p>CSV</p>
            <p className="text-xs text-muted-foreground">One row per idea, for a spreadsheet.</p>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
