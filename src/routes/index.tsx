import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useStore, studentRate } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarCheck, GraduationCap, Users, TrendingUp, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overview — Rollcall" },
      { name: "description", content: "Today's attendance overview, classes and top student performance." },
    ],
  }),
  component: () => (
    <AppShell>
      <Dashboard />
    </AppShell>
  ),
});

function Dashboard() {
  const classes = useStore((s) => s.classes);
  const students = useStore((s) => s.students);
  const attendance = useStore((s) => s.attendance);

  const today = new Date().toISOString().slice(0, 10);
  const todayRecords = attendance.filter((a) => a.date === today);
  const presentToday = todayRecords.filter((r) => r.status === "present" || r.status === "late").length;
  const todayRate = todayRecords.length ? Math.round((presentToday / todayRecords.length) * 100) : 0;

  const overallRecords = attendance;
  const overallPresent = overallRecords.filter((r) => r.status === "present" || r.status === "late").length;
  const overallRate = overallRecords.length ? Math.round((overallPresent / overallRecords.length) * 100) : 0;

  const topStudents = [...students]
    .map((s) => ({ s, ...studentRate(s.id) }))
    .filter((x) => x.total > 0)
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 5);

  const atRisk = [...students]
    .map((s) => ({ s, ...studentRate(s.id) }))
    .filter((x) => x.total >= 3 && x.rate < 80)
    .sort((a, b) => a.rate - b.rate)
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Today, {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Welcome back 👋</h1>
          <p className="mt-1 text-muted-foreground">Here's how your classes are doing.</p>
        </div>
        <Button asChild size="lg" className="shadow-soft">
          <Link to="/attendance">
            <CalendarCheck className="mr-2 h-4 w-4" /> Take roll call
          </Link>
        </Button>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat icon={CalendarCheck} label="Today's attendance" value={todayRecords.length ? `${todayRate}%` : "—"} hint={`${presentToday}/${todayRecords.length} present`} />
        <Stat icon={TrendingUp} label="All-time rate" value={`${overallRate}%`} hint={`${overallRecords.length} records`} />
        <Stat icon={GraduationCap} label="Classes" value={String(classes.length)} hint="Active rosters" />
        <Stat icon={Users} label="Students" value={String(students.length)} hint="Across all classes" />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your classes</h2>
          <Link to="/classes" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            Manage <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((c) => {
            const cStudents = students.filter((s) => s.classId === c.id);
            const cRecords = attendance.filter((a) => a.classId === c.id);
            const cPresent = cRecords.filter((r) => r.status === "present" || r.status === "late").length;
            const rate = cRecords.length ? Math.round((cPresent / cRecords.length) * 100) : 0;
            return (
              <Link key={c.id} to="/attendance" search={{ classId: c.id } as never}>
                <Card className="group h-full transition-all hover:-translate-y-0.5 hover:shadow-lift">
                  <CardContent className="p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="h-10 w-10 rounded-xl" style={{ backgroundColor: c.color }} />
                      <span className="text-sm font-semibold text-foreground">{rate}%</span>
                    </div>
                    <h3 className="font-semibold leading-tight">{c.name}</h3>
                    {c.subject && <p className="text-sm text-muted-foreground">{c.subject}</p>}
                    <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{cStudents.length} students</span>
                      <span className="font-medium text-primary group-hover:underline">Take roll →</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
          {classes.length === 0 && (
            <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No classes yet. <Link to="/classes" className="font-medium text-primary hover:underline">Add one</Link>.</CardContent></Card>
          )}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <PerformanceList title="Top performers" items={topStudents} tone="success" empty="Take attendance to see top performers." />
        <PerformanceList title="Needs attention" items={atRisk} tone="warning" empty="No students at risk. 🎉" />
      </section>
    </div>
  );
}

function Stat({ icon: Icon, label, value, hint }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; hint: string }) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="text-2xl font-bold tracking-tight sm:text-3xl">{value}</div>
        <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
      </CardContent>
    </Card>
  );
}

function PerformanceList({
  title,
  items,
  tone,
  empty,
}: {
  title: string;
  items: { s: { id: string; firstName: string; lastName: string }; rate: number; total: number }[];
  tone: "success" | "warning";
  empty: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <h3 className="mb-4 font-semibold">{title}</h3>
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>
        ) : (
          <ul className="space-y-2">
            {items.map(({ s, rate, total }) => (
              <li key={s.id} className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-muted">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
                    {s.firstName[0]}{s.lastName[0]}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{s.firstName} {s.lastName}</div>
                    <div className="text-xs text-muted-foreground">{total} records</div>
                  </div>
                </div>
                <span
                  className="rounded-full px-2.5 py-1 text-xs font-semibold"
                  style={{
                    backgroundColor: tone === "success" ? "color-mix(in oklch, var(--success) 18%, transparent)" : "color-mix(in oklch, var(--warning) 25%, transparent)",
                    color: tone === "success" ? "var(--success)" : "var(--warning-foreground)",
                  }}
                >
                  {Math.round(rate)}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
