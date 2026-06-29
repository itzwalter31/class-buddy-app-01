import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useStore, store, studentRate, parseCSV, downloadCSV } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Search, Trash2, Upload, Download } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/students")({
  head: () => ({
    meta: [
      { title: "Students — Rollcall" },
      { name: "description", content: "Student records with attendance rate and class assignment." },
    ],
  }),
  component: () => (
    <AppShell>
      <Students />
    </AppShell>
  ),
});

function Students() {
  const classes = useStore((s) => s.classes);
  const students = useStore((s) => s.students);
  const [query, setQuery] = useState("");
  const [filterClass, setFilterClass] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importClassId, setImportClassId] = useState(classes[0]?.id ?? "");
  const [importText, setImportText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [classId, setClassId] = useState(classes[0]?.id ?? "");

  const list = useMemo(() => {
    return students
      .filter((s) => (filterClass === "all" ? true : s.classId === filterClass))
      .filter((s) => `${s.firstName} ${s.lastName} ${s.rollNumber ?? ""}`.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => a.firstName.localeCompare(b.firstName));
  }, [students, query, filterClass]);

  function submit() {
    if (!firstName.trim() || !lastName.trim() || !classId) return;
    store.addStudent(classId, firstName.trim(), lastName.trim(), rollNumber.trim() || undefined);
    setFirstName(""); setLastName(""); setRollNumber("");
    setOpen(false);
    toast.success("Student added.");
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImportText(String(reader.result ?? ""));
    };
    reader.readAsText(f);
    e.target.value = "";
  }

  function runImport() {
    if (!importClassId) { toast.error("Pick a class first."); return; }
    const rows = parseCSV(importText);
    if (rows.length === 0) { toast.error("No rows found."); return; }
    // Detect header
    const first = rows[0].map((c) => c.trim().toLowerCase());
    const hasHeader = first.some((c) => ["first name", "firstname", "first", "last name", "lastname", "last", "name", "roll", "roll number", "rollnumber"].includes(c));
    let firstIdx = 0, lastIdx = 1, rollIdx = 2, nameIdx = -1;
    let dataStart = 0;
    if (hasHeader) {
      dataStart = 1;
      firstIdx = first.findIndex((c) => c === "first name" || c === "firstname" || c === "first");
      lastIdx = first.findIndex((c) => c === "last name" || c === "lastname" || c === "last");
      nameIdx = first.findIndex((c) => c === "name" || c === "full name" || c === "fullname");
      rollIdx = first.findIndex((c) => c === "roll" || c === "roll number" || c === "rollnumber" || c === "roll no" || c === "id");
    }
    const items: { classId: string; firstName: string; lastName: string; rollNumber?: string }[] = [];
    for (let i = dataStart; i < rows.length; i++) {
      const r = rows[i];
      let fn = "", ln = "";
      if (firstIdx >= 0 && lastIdx >= 0) {
        fn = (r[firstIdx] ?? "").trim();
        ln = (r[lastIdx] ?? "").trim();
      } else if (nameIdx >= 0) {
        const parts = (r[nameIdx] ?? "").trim().split(/\s+/);
        fn = parts[0] ?? ""; ln = parts.slice(1).join(" ");
      } else {
        // assume 2-3 columns: first, last, roll
        fn = (r[0] ?? "").trim();
        ln = (r[1] ?? "").trim();
      }
      const roll = rollIdx >= 0 ? (r[rollIdx] ?? "").trim() : (r[2] ?? "").trim();
      if (!fn && !ln) continue;
      items.push({ classId: importClassId, firstName: fn, lastName: ln, rollNumber: roll || undefined });
    }
    if (items.length === 0) { toast.error("No valid student rows."); return; }
    store.addStudentsBulk(items);
    toast.success(`Imported ${items.length} students.`);
    setImportText("");
    setImportOpen(false);
  }

  function exportStudents() {
    const rows: (string | number)[][] = [["First name", "Last name", "Roll number", "Class", "Attendance rate %", "Records"]];
    for (const s of list) {
      const cls = classes.find((c) => c.id === s.classId);
      const stats = studentRate(s.id);
      rows.push([s.firstName, s.lastName, s.rollNumber ?? "", cls?.name ?? "", stats.total ? Math.round(stats.rate) : "", stats.total]);
    }
    downloadCSV(`students-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Students</h1>
          <p className="text-muted-foreground">All your students with attendance performance.</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o && !classId) setClassId(classes[0]?.id ?? ""); }}>
          <DialogTrigger asChild>
            <Button size="lg" className="shadow-soft" disabled={classes.length === 0}>
              <Plus className="mr-2 h-4 w-4" /> Add student
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add student</DialogTitle></DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium">Class</label>
                <Select value={classId} onValueChange={setClassId}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">First name</label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Last name</label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium">Roll number (optional)</label>
                <Input value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} placeholder="e.g. 12" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={submit}>Add</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search students…" value={query} onChange={(e) => setQuery(e.target.value)} className="h-11 pl-9" />
        </div>
        <Select value={filterClass} onValueChange={setFilterClass}>
          <SelectTrigger className="h-11 sm:w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All classes</SelectItem>
            {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {list.map((s) => {
              const cls = classes.find((c) => c.id === s.classId);
              const stats = studentRate(s.id);
              const rateColor = stats.rate >= 90 ? "var(--success)" : stats.rate >= 75 ? "var(--warning)" : "var(--destructive)";
              return (
                <li key={s.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
                    {s.firstName[0]}{s.lastName[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{s.firstName} {s.lastName}</span>
                      {s.rollNumber && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">#{s.rollNumber}</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {cls && (
                        <span className="inline-flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cls.color }} />
                          {cls.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="hidden text-right sm:block">
                    <div className="text-xs text-muted-foreground">{stats.total} records</div>
                  </div>
                  <div className="w-16 text-right text-sm font-semibold" style={{ color: stats.total ? rateColor : "var(--muted-foreground)" }}>
                    {stats.total ? `${Math.round(stats.rate)}%` : "—"}
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove {s.firstName} {s.lastName}?</AlertDialogTitle>
                        <AlertDialogDescription>All attendance history for this student will be removed.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => { store.deleteStudent(s.id); toast.success("Student removed."); }}>Remove</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </li>
              );
            })}
            {list.length === 0 && (
              <li className="p-10 text-center text-sm text-muted-foreground">No students yet.</li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
