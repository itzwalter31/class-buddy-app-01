import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useStore, store, downloadCSV, type AttendanceStatus } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { CheckCircle2, XCircle, Clock, FileCheck, Search, CalendarDays, CheckSquare, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SearchParams {
  classId?: string;
  date?: string;
}

export const Route = createFileRoute("/attendance")({
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    classId: typeof s.classId === "string" ? s.classId : undefined,
    date: typeof s.date === "string" ? s.date : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Roll Call — Rollcall" },
      { name: "description", content: "Mark attendance quickly with bulk present and per-student status." },
    ],
  }),
  component: () => (
    <AppShell>
      <Attendance />
    </AppShell>
  ),
});

const STATUS_META: Record<AttendanceStatus, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  present: { label: "Present", icon: CheckCircle2, color: "var(--success)" },
  absent: { label: "Absent", icon: XCircle, color: "var(--destructive)" },
  late: { label: "Late", icon: Clock, color: "var(--warning)" },
  excused: { label: "Excused", icon: FileCheck, color: "var(--primary)" },
};

function Attendance() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const classes = useStore((s) => s.classes);
  const students = useStore((s) => s.students);
  const attendance = useStore((s) => s.attendance);

  const classId = search.classId ?? classes[0]?.id ?? "";
  const date = search.date ?? new Date().toISOString().slice(0, 10);
  const [query, setQuery] = useState("");

  const klass = classes.find((c) => c.id === classId);
  const classStudents = useMemo(
    () => students.filter((s) => s.classId === classId).sort((a, b) => (a.rollNumber || "").localeCompare(b.rollNumber || "")),
    [students, classId],
  );

  const filteredStudents = classStudents.filter((s) =>
    `${s.firstName} ${s.lastName} ${s.rollNumber ?? ""}`.toLowerCase().includes(query.toLowerCase()),
  );

  const records = attendance.filter((a) => a.classId === classId && a.date === date);
  const recordMap = new Map(records.map((r) => [r.studentId, r.status]));

  const counts: Record<AttendanceStatus, number> = { present: 0, absent: 0, late: 0, excused: 0 };
  for (const r of records) counts[r.status]++;
  const marked = records.length;
  const unmarked = classStudents.length - marked;

  function markAllPresent() {
    if (!klass) return;
    const ids = classStudents.filter((s) => !recordMap.has(s.id)).map((s) => s.id);
    if (ids.length === 0) {
      toast.info("Everyone is already marked.");
      return;
    }
    store.bulkSetAttendance(classId, date, ids, "present");
    toast.success(`Marked ${ids.length} students present.`);
  }

  function resetDay() {
    if (!klass) return;
    const ids = classStudents.map((s) => s.id);
    store.bulkSetAttendance(classId, date, ids, "present");
    // overwrite all to present (acts as reset to baseline)
    toast.success("Day reset — all marked present.");
  }

  if (classes.length === 0) {
    return (
      <EmptyState
        title="No classes yet"
        description="Add a class to start taking attendance."
        actionHref="/classes"
        actionLabel="Add a class"
      />
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Roll Call</h1>
        <p className="text-muted-foreground">Tap "Mark all present", then flag exceptions. Fastest way to take attendance.</p>
      </header>

      {/* Controls */}
      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-[1fr_auto_auto] sm:items-end sm:p-5">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Class</label>
            <Select value={classId} onValueChange={(v) => navigate({ search: { classId: v, date } })}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                      {c.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</label>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="date"
                value={date}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => navigate({ search: { classId, date: e.target.value } })}
                className="h-11 pl-9"
              />
            </div>
          </div>
          <Button size="lg" onClick={markAllPresent} className="h-11 shadow-soft">
            <CheckSquare className="mr-2 h-4 w-4" /> Mark all present
          </Button>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-3">
        <SummaryPill label="Total" value={classStudents.length} />
        {(["present", "late", "absent", "excused"] as AttendanceStatus[]).map((s) => (
          <SummaryPill key={s} label={STATUS_META[s].label} value={counts[s]} color={STATUS_META[s].color} />
        ))}
      </div>

      {/* Search + actions */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search students…" value={query} onChange={(e) => setQuery(e.target.value)} className="h-10 pl-9" />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{marked} marked · {unmarked} pending</span>
          {marked > 0 && (
            <Button variant="ghost" size="sm" onClick={resetDay}>Reset day</Button>
          )}
        </div>
      </div>

      {/* Student list */}
      <div className="space-y-2">
        {filteredStudents.map((s) => {
          const status = recordMap.get(s.id);
          return (
            <Card key={s.id} className="overflow-hidden">
              <CardContent className="flex items-center gap-3 p-3 sm:p-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
                  {s.firstName[0]}{s.lastName[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{s.firstName} {s.lastName}</span>
                    {s.rollNumber && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">#{s.rollNumber}</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {status ? `Marked ${STATUS_META[status].label.toLowerCase()}` : "Not marked yet"}
                  </div>
                </div>
                <div className="flex gap-1">
                  {(["present", "late", "absent", "excused"] as AttendanceStatus[]).map((st) => {
                    const Icon = STATUS_META[st].icon;
                    const active = status === st;
                    return (
                      <button
                        key={st}
                        onClick={() => store.setAttendance(classId, date, s.id, st)}
                        title={STATUS_META[st].label}
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-lg border transition-all",
                          active
                            ? "scale-105 border-transparent text-white shadow-soft"
                            : "border-border bg-background text-muted-foreground hover:bg-muted",
                        )}
                        style={active ? { backgroundColor: STATUS_META[st].color } : undefined}
                      >
                        <Icon className="h-4 w-4" />
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filteredStudents.length === 0 && (
          <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No students match your search.</CardContent></Card>
        )}
      </div>
    </div>
  );
}

function SummaryPill({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-lg font-bold" style={color ? { color } : undefined}>{value}</span>
    </div>
  );
}

function EmptyState({ title, description, actionHref, actionLabel }: { title: string; description: string; actionHref: string; actionLabel: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <p className="mt-2 max-w-sm text-muted-foreground">{description}</p>
      <Button asChild className="mt-6"><a href={actionHref}>{actionLabel}</a></Button>
    </div>
  );
}
