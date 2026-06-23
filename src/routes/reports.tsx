import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useStore, type AttendanceStatus } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download } from "lucide-react";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports — Rollcall" },
      { name: "description", content: "Attendance reports by class and date range with CSV export." },
    ],
  }),
  component: () => (
    <AppShell>
      <Reports />
    </AppShell>
  ),
});

const RANGES = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 14 days", days: 14 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
];

const STATUS_COLOR: Record<AttendanceStatus, string> = {
  present: "var(--success)",
  late: "var(--warning)",
  absent: "var(--destructive)",
  excused: "var(--primary)",
};

function Reports() {
  const classes = useStore((s) => s.classes);
  const students = useStore((s) => s.students);
  const attendance = useStore((s) => s.attendance);
  const [classId, setClassId] = useState<string>("all");
  const [days, setDays] = useState<number>(30);

  const start = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
  }, [days]);

  const filtered = useMemo(
    () => attendance.filter((a) => (classId === "all" || a.classId === classId) && a.date >= start),
    [attendance, classId, start],
  );

  const totals: Record<AttendanceStatus, number> = { present: 0, late: 0, absent: 0, excused: 0 };
  for (const r of filtered) totals[r.status]++;
  const total = filtered.length;
  const rate = total ? Math.round(((totals.present + totals.late) / total) * 100) : 0;

  // Daily trend
  const dailyMap = new Map<string, { present: number; total: number }>();
  for (const r of filtered) {
    const e = dailyMap.get(r.date) ?? { present: 0, total: 0 };
    e.total++;
    if (r.status === "present" || r.status === "late") e.present++;
    dailyMap.set(r.date, e);
  }
  const daily = Array.from(dailyMap.entries()).sort(([a], [b]) => a.localeCompare(b));

  // Per-student
  const perStudent = students
    .filter((s) => classId === "all" || s.classId === classId)
    .map((s) => {
      const recs = filtered.filter((r) => r.studentId === s.id);
      const present = recs.filter((r) => r.status === "present" || r.status === "late").length;
      return { s, total: recs.length, rate: recs.length ? (present / recs.length) * 100 : 0, recs };
    })
    .sort((a, b) => b.rate - a.rate);

  function exportCSV() {
    const rows = [["Date", "Class", "Student", "Roll", "Status"]];
    for (const r of filtered) {
      const stu = students.find((x) => x.id === r.studentId);
      const cls = classes.find((c) => c.id === r.classId);
      if (!stu || !cls) continue;
      rows.push([r.date, cls.name, `${stu.firstName} ${stu.lastName}`, stu.rollNumber ?? "", r.status]);
    }
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${start}-to-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const maxDaily = Math.max(1, ...daily.map(([, v]) => v.total));

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Attendance trends and per-student performance.</p>
        </div>
        <Button onClick={exportCSV} disabled={total === 0} variant="outline" className="shadow-soft">
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <Select value={classId} onValueChange={setClassId}>
          <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All classes</SelectItem>
            {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
          <SelectContent>
            {RANGES.map((r) => <SelectItem key={r.days} value={String(r.days)}>{r.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Card><CardContent className="p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Attendance rate</div>
          <div className="mt-2 text-3xl font-bold">{rate}%</div>
        </CardContent></Card>
        {(["present", "late", "absent", "excused"] as AttendanceStatus[]).map((s) => (
          <Card key={s}><CardContent className="p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground capitalize">{s}</div>
            <div className="mt-2 text-3xl font-bold" style={{ color: STATUS_COLOR[s] }}>{totals[s]}</div>
          </CardContent></Card>
        ))}
      </div>

      {/* Daily trend */}
      <Card>
        <CardContent className="p-5">
          <h3 className="mb-4 font-semibold">Daily attendance</h3>
          {daily.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No attendance data in this range.</p>
          ) : (
            <div className="flex h-48 items-end gap-1.5">
              {daily.map(([date, v]) => {
                const heightPct = (v.total / maxDaily) * 100;
                const presentPct = v.total ? (v.present / v.total) * 100 : 0;
                return (
                  <div key={date} className="group relative flex flex-1 flex-col items-center gap-1.5">
                    <div className="relative flex w-full max-w-[28px] flex-1 items-end overflow-hidden rounded-md bg-muted" style={{ height: `${heightPct}%`, minHeight: 8 }}>
                      <div className="w-full rounded-md bg-primary transition-all" style={{ height: `${presentPct}%` }} />
                    </div>
                    <span className="text-[9px] text-muted-foreground">{date.slice(5)}</span>
                    <div className="pointer-events-none absolute bottom-full mb-2 hidden whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[11px] text-background group-hover:block">
                      {date}: {v.present}/{v.total}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Per-student */}
      <Card>
        <CardContent className="p-5">
          <h3 className="mb-4 font-semibold">Per-student performance</h3>
          {perStudent.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No students to display.</p>
          ) : (
            <ul className="space-y-3">
              {perStudent.map(({ s, total, rate }) => (
                <li key={s.id}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium">{s.firstName} {s.lastName}</span>
                    <span className="text-xs text-muted-foreground">{total ? `${Math.round(rate)}% · ${total} records` : "No data"}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${total ? rate : 0}%`,
                        backgroundColor: rate >= 90 ? "var(--success)" : rate >= 75 ? "var(--warning)" : "var(--destructive)",
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
