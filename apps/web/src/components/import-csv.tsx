"use client";

import { addIdeas, importCsv, MAX_FILE_BYTES, type CsvImportResult } from "@idea-matrix/core";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppStore } from "@/lib/store";

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many.replace("{n}", String(n));
}

/** Import rows from a spreadsheet export. Shows what will happen before it does. */
export function ImportCsv() {
  const mutate = useAppStore((s) => s.mutate);
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<CsvImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onFile = async (file: File | undefined) => {
    setError(null);
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setError("That file is too large to be a matrix export.");
      return;
    }
    try {
      const text = await file.text();
      setPreview(importCsv(text));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that file.");
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <Button variant="outline" onClick={() => inputRef.current?.click()}>
        Import CSV…
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Dialog open={preview !== null} onOpenChange={(o) => (o ? undefined : setPreview(null))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{plural(preview?.ideas.length ?? 0, "Import one idea?", "Import {n} ideas?")}</DialogTitle>
            <DialogDescription>
              They will be added to your matrix as new ideas. Nothing already there is changed.
              {preview && preview.skipped > 0
                ? ` ${plural(preview.skipped, "One row without a name was skipped.", "{n} rows without a name were skipped.")}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {preview && preview.ideas.length > 0 ? (
            <ul className="max-h-48 overflow-y-auto rounded-md border p-2 text-sm">
              {preview.ideas.map((i) => (
                <li key={i.id} className="truncate">
                  {i.name} <span className="text-xs text-muted-foreground">· {i.stage}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {preview && preview.warnings.length > 0 ? (
            <ul className="max-h-32 overflow-y-auto text-xs text-muted-foreground">
              {preview.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreview(null)}>
              Cancel
            </Button>
            <Button
              disabled={!preview || preview.ideas.length === 0}
              onClick={() => {
                if (!preview) return;
                const err = mutate((d) => addIdeas(d, preview.ideas));
                setError(err);
                setPreview(null);
              }}
            >
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
