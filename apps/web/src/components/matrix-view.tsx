"use client";

import {
  CONFIDENCE_INFO,
  CRITERION_INFO,
  CRITERIA,
  STAGES,
  addIdea,
  maxConfidenceAllowed,
  potential,
  score,
  updateIdea,
  type Idea,
  type Stage,
} from "@idea-matrix/core";
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
import { useMemo, useState, type ReactNode } from "react";
import { BandLegend, BandPill, StageBadge } from "@/components/pills";
import { ScoreSelect } from "@/components/score-select";
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

type Row = Idea & { potential: number | null; score: number | null };

const columnHelper = createColumnHelper<Row>();
const ACTIVE_STAGES = STAGES.filter((s) => s !== "Parked");

export function MatrixView({ parked = false }: { parked?: boolean }) {
  const router = useRouter();
  const doc = useAppStore((s) => s.doc);
  const mutate = useAppStore((s) => s.mutate);
  const [stageFilter, setStageFilter] = useState<Stage | "all">("all");
  const [sorting, setSorting] = useState<SortingState>([{ id: "score", desc: true }]);
  const [error, setError] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);

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

  const change = (ideaId: string, patch: Parameters<typeof updateIdea>[2]) => {
    setError(mutate((d) => updateIdea(d, ideaId, patch)));
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "Idea",
        cell: (info) => <span className="font-medium">{info.getValue()}</span>,
        sortingFn: "alphanumeric",
      }),
      columnHelper.accessor("stage", {
        header: "Stage",
        cell: (info) => <StageBadge stage={info.getValue()} />,
      }),
      columnHelper.group({
        id: "scores",
        header: () => <span data-tour="scores">Reach · Impact · Profit · Vision · Ease</span>,
        columns: CRITERIA.map((key) =>
          columnHelper.accessor((row) => row.scores[key], {
            id: key,
            header: CRITERION_INFO[key].short,
            enableSorting: false,
            cell: (info) => (
              <ScoreSelect
                label={`${CRITERION_INFO[key].label} for ${info.row.original.name}`}
                value={info.getValue()}
                min={key === "profitability" ? 0 : 1}
                meanings={CRITERION_INFO[key].levels}
                onChange={(v) => change(info.row.original.id, { scores: { [key]: v } })}
              />
            ),
          }),
        ),
      }),
      columnHelper.accessor("confidence", {
        header: () => <span data-tour="confidence">Conf</span>,
        enableSorting: false,
        cell: (info) => {
          const allowed = maxConfidenceAllowed(info.row.original.evidence);
          return (
            <ScoreSelect
              label={`Confidence for ${info.row.original.name}`}
              value={info.getValue()}
              max={allowed}
              allowEmpty={false}
              meanings={CONFIDENCE_INFO.levels}
              onChange={(v) => change(info.row.original.id, { confidence: v ?? 1 })}
            />
          );
        },
      }),
      columnHelper.accessor("potential", {
        header: () => <span data-tour="potential">Potential</span>,
        sortUndefined: "last",
        cell: (info) => <BandPill value={info.getValue()} emptyText="needs all 5" />,
      }),
      columnHelper.accessor("score", {
        header: () => <span data-tour="score">Score</span>,
        sortUndefined: "last",
        cell: (info) => <BandPill value={info.getValue()} />,
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-3xl font-bold">{parked ? "Parked ideas" : doc.name}</h1>
        {!parked ? (
          <Button onClick={() => setNewOpen(true)}>
            <PlusIcon data-icon="inline-start" /> New idea
          </Button>
        ) : null}
      </div>

      {!parked ? (
        <div className="flex flex-wrap items-center gap-2" data-tour="stages">
          <span className="text-sm text-muted-foreground">Stage</span>
          <Chip active={stageFilter === "all"} onClick={() => setStageFilter("all")}>
            All
          </Chip>
          {ACTIVE_STAGES.map((s) => (
            <Chip key={s} active={stageFilter === s} onClick={() => setStageFilter(s)}>
              {s}
            </Chip>
          ))}
        </div>
      ) : (
        <p className="max-w-prose text-sm text-muted-foreground">
          Parked ideas keep their scores as history. Open one to see why it was parked, or to bring it back.
        </p>
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
                        className={cn(
                          "px-2 py-2 text-left font-medium whitespace-nowrap",
                          h.column.getCanSort() && "cursor-pointer select-none hover:text-foreground",
                          ["potential", "score", "confidence", ...CRITERIA].includes(h.column.id) && "text-center",
                        )}
                        onClick={h.column.getToggleSortingHandler()}
                        aria-sort={
                          h.column.getIsSorted() === "asc" ? "ascending" : h.column.getIsSorted() === "desc" ? "descending" : undefined
                        }
                      >
                        <span className="inline-flex items-center gap-1">
                          {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                          {h.column.getIsSorted() === "asc" ? <ArrowUpIcon className="size-3" /> : null}
                          {h.column.getIsSorted() === "desc" ? <ArrowDownIcon className="size-3" /> : null}
                        </span>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="cursor-pointer border-t hover:bg-muted/40"
                    onClick={() => router.push(`/idea/?id=${encodeURIComponent(row.original.id)}`)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className={cn(
                          "px-2 py-1.5 align-middle",
                          ["potential", "score", "confidence", ...CRITERIA].includes(cell.column.id) && "text-center",
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards on phones */}
          <ul className="flex flex-col gap-2 md:hidden">
            {table.getRowModel().rows.map(({ original: idea }) => (
              <li key={idea.id}>
                <button
                  type="button"
                  className="flex w-full flex-col gap-1 rounded-md border p-3 text-left hover:bg-muted/40"
                  onClick={() => router.push(`/idea/?id=${encodeURIComponent(idea.id)}`)}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-medium">{idea.name}</span>
                    <BandPill value={idea.score} />
                  </span>
                  <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <StageBadge stage={idea.stage} />
                    <span>
                      Potential {idea.potential ?? "–"} · Confidence {idea.confidence}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <BandLegend />

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
          if (!err && created) router.push(`/idea/?id=${encodeURIComponent(created)}`);
        }}
      />
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
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
  return (
    <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
      {parked ? (
        <p>Nothing is parked. When you park an idea, it lands here with its reason.</p>
      ) : filtered ? (
        <p>No ideas at this stage.</p>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <p>No ideas yet. Add the first one and score it.</p>
          <Button onClick={onNew}>
            <PlusIcon data-icon="inline-start" /> New idea
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
            <DialogTitle>New idea</DialogTitle>
            <DialogDescription>A short name is enough. You can describe and score it next.</DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Trailhead weather board"
            maxLength={200}
            aria-label="Idea name"
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={name.trim() === ""}>
              Add idea
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
