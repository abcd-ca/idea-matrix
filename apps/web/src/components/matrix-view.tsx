"use client";

import { CRITERIA, STAGES, addIdea, potential, score, type Idea, type Stage } from "@idea-matrix/core";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { cn } from "cn";
import { ArrowDownIcon, ArrowUpIcon, PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ColumnHelp } from "@/components/column-help";
import { BandPill, StageBadge } from "@/components/pills";
import { SaveIndicator } from "@/components/save-indicator";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/lib/store";
import { coreLevels } from "@/lib/i18n";
import { useTranslation } from "react-i18next";

type Row = Idea & { potential: number | null; score: number | null };

const columnHelper = createColumnHelper<Row>();
const ACTIVE_STAGES = STAGES.filter((s) => s !== "Parked");
const SHOW_SCORES_KEY = "ideamatrix.showScores";
const CENTERED = new Set<string>(["potential", "score", "confidence", ...CRITERIA]);

export function MatrixView({ parked = false }: { parked?: boolean }) {
  const { t, i18n } = useTranslation("matrix");
  const router = useRouter();
  const doc = useAppStore((s) => s.doc);
  const mutate = useAppStore((s) => s.mutate);
  const [stageFilter, setStageFilter] = useState<Stage | "all">("all");
  const [sorting, setSorting] = useState<SortingState>([{ id: "score", desc: true }]);
  const [error, setError] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [showScores, setShowScores] = useState(false);

  useEffect(() => {
    try {
      setShowScores(localStorage.getItem(SHOW_SCORES_KEY) === "1");
    } catch {
      // storage unavailable: keep the default
    }
  }, []);

  const toggleScores = (on: boolean) => {
    setShowScores(on);
    try {
      localStorage.setItem(SHOW_SCORES_KEY, on ? "1" : "0");
    } catch {
      // ignore
    }
  };

  const rows = useMemo<Row[]>(() => {
    const ideas = doc?.ideas ?? [];
    return ideas
      .filter((i) => (parked ? i.stage === "Parked" : i.stage !== "Parked"))
      .filter((i) => parked || stageFilter === "all" || i.stage === stageFilter)
      .map((i) => {
        const p = potential(i.scores);
        return { ...i, potential: p, score: score(p, i.confidence) };
      });
  }, [doc, parked, stageFilter]);

  const columns = useMemo(() => {
    // Names sort by the current language's rules, so accented letters land where a reader expects.
    const collator = new Intl.Collator(i18n.language, { numeric: true });
    return [
      columnHelper.accessor("name", {
        header: t("columns.idea"),
        cell: (info) => <span className="font-medium">{info.getValue()}</span>,
        sortingFn: (a, b) => collator.compare(a.original.name, b.original.name),
      }),
      columnHelper.accessor("stage", {
        header: t("columns.stage"),
        cell: (info) => <StageBadge stage={info.getValue()} />,
      }),
      ...(showScores
        ? CRITERIA.map((key) =>
            columnHelper.accessor((row) => row.scores[key], {
              id: key,
              header: t(`criterion.${key}.short`, { ns: "core" }),
              sortUndefined: "last",
              cell: (info) => {
                const v = info.getValue();
                return v === null ? (
                  <span className="text-muted-foreground">–</span>
                ) : (
                  <span className="tabular-nums">{v}</span>
                );
              },
            }),
          )
        : []),
      columnHelper.accessor("potential", {
        header: t("terms.potential", { ns: "common" }),
        sortUndefined: "last",
        cell: (info) => <BandPill value={info.getValue()} showLabel emptyText={t("scoreIt")} />,
      }),
      columnHelper.accessor("confidence", {
        header: t("confidence.label", { ns: "core" }),
        cell: (info) => (
          <span className="tabular-nums" title={coreLevels(t, "confidence.levels")[info.getValue()]}>
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("score", {
        header: t("terms.score", { ns: "common" }),
        sortUndefined: "last",
        cell: (info) => <BandPill value={info.getValue()} showLabel />,
      }),
    ];
  }, [i18n.language, showScores, t]);

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    sortDescFirst: true,
  });

  if (!doc) return null;

  const open = (id: string) => router.push(`/idea/?id=${encodeURIComponent(id)}`);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-semibold sm:text-3xl">{parked ? t("parkedTitle") : doc.name}</h1>
        <div className="flex items-center gap-4">
          <SaveIndicator className="hidden sm:inline-flex" />
          {!parked ? (
            <Button onClick={() => setNewOpen(true)}>
              <PlusIcon data-icon="inline-start" /> {t("newIdea")}
            </Button>
          ) : null}
        </div>
      </div>

      {!parked ? (
        <div className="flex flex-wrap items-center gap-2" data-tour="stages">
          <span className="text-sm text-muted-foreground">{t("stageFilter")}</span>
          <Chip active={stageFilter === "all"} onClick={() => setStageFilter("all")}>
            {t("all")}
          </Chip>
          {ACTIVE_STAGES.map((s) => (
            <Chip
              key={s}
              active={stageFilter === s}
              onClick={() => setStageFilter(s)}
              title={t(`stage.${s}`, { ns: "core" })}
            >
              {t(`stageName.${s}`, { ns: "core" })}
            </Chip>
          ))}
        </div>
      ) : (
        <p className="max-w-prose text-sm text-muted-foreground">{t("parkedIntro")}</p>
      )}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState parked={parked} filtered={stageFilter !== "all"} onNew={() => setNewOpen(true)} />
      ) : (
        <>
          {/* Table on wider screens */}
          <div className="hidden overflow-x-auto rounded-md border md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id}>
                    {hg.headers.map((h) => (
                      <th
                        key={h.id}
                        colSpan={h.colSpan}
                        data-tour={h.column.id}
                        className={cn(
                          "px-3 py-2 text-left font-medium whitespace-nowrap",
                          h.column.getCanSort() && "cursor-pointer select-none hover:text-foreground",
                          CENTERED.has(h.column.id) && "text-center",
                        )}
                        onClick={h.column.getToggleSortingHandler()}
                        aria-sort={
                          h.column.getIsSorted() === "asc"
                            ? "ascending"
                            : h.column.getIsSorted() === "desc"
                              ? "descending"
                              : undefined
                        }
                      >
                        <span className="inline-flex items-center gap-1">
                          <ColumnHelp columnId={h.column.id}>
                            {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                          </ColumnHelp>
                          {h.column.getIsSorted() === "asc" ? <ArrowUpIcon className="size-3" /> : null}
                          {h.column.getIsSorted() === "desc" ? <ArrowDownIcon className="size-3" /> : null}
                        </span>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row, index) => (
                  <tr
                    key={row.id}
                    data-tour={index === 0 ? "first-row" : undefined}
                    className="cursor-pointer border-t hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
                    tabIndex={0}
                    onClick={() => open(row.original.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        open(row.original.id);
                      }
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className={cn("px-3 py-2 align-middle", CENTERED.has(cell.column.id) && "text-center")}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="hidden items-center justify-between gap-3 text-xs text-muted-foreground md:flex">
            <span>{t("hint")}</span>
            <label className="inline-flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                className="size-3.5 accent-primary"
                checked={showScores}
                onChange={(e) => toggleScores(e.target.checked)}
              />
              {t("showScores")}
            </label>
          </div>

          {/* Cards on phones */}
          <ul className="flex flex-col gap-2 md:hidden">
            {table.getRowModel().rows.map(({ original: idea }, index) => (
              <li key={idea.id}>
                <button
                  type="button"
                  data-tour={index === 0 ? "first-card" : undefined}
                  className="flex w-full flex-col gap-1 rounded-md border p-3 text-left hover:bg-muted/40"
                  onClick={() => open(idea.id)}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-medium">{idea.name}</span>
                    <BandPill value={idea.score} />
                  </span>
                  <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <StageBadge stage={idea.stage} />
                    <span>{t("cardMeta", { potential: idea.potential ?? "–", confidence: idea.confidence })}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <NewIdeaDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        onCreate={(name) => {
          let created: string | null = null;
          const err = mutate((d) => {
            const result = addIdea(d, name);
            created = result.idea.id;
            return result.doc;
          });
          setError(err);
          if (!err && created) open(created);
        }}
      />
    </div>
  );
}

function Chip({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      title={title}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs whitespace-nowrap",
        active ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

function EmptyState({ parked, filtered, onNew }: { parked: boolean; filtered: boolean; onNew: () => void }) {
  const { t } = useTranslation("matrix");
  return (
    <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
      {parked ? (
        <p>{t("empty.parked")}</p>
      ) : filtered ? (
        <p>{t("empty.filtered")}</p>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <p>{t("empty.none")}</p>
          <Button onClick={onNew}>
            <PlusIcon data-icon="inline-start" /> {t("newIdea")}
          </Button>
        </div>
      )}
    </div>
  );
}

function NewIdeaDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string) => void;
}) {
  const { t } = useTranslation("matrix");
  const [name, setName] = useState("");
  return (
    <Dialog open={open} onOpenChange={(o) => onOpenChange(o)}>
      <DialogContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim() === "") return;
            onCreate(name.trim());
            setName("");
            onOpenChange(false);
          }}
          className="flex flex-col gap-4"
        >
          <DialogHeader>
            <DialogTitle>{t("newDialog.title")}</DialogTitle>
            <DialogDescription>{t("newDialog.description")}</DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("newDialog.placeholder")}
            maxLength={200}
            aria-label={t("newDialog.nameLabel")}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("actions.cancel", { ns: "common" })}
            </Button>
            <Button type="submit" disabled={name.trim() === ""}>
              {t("newDialog.add")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
