import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useStore, store } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/classes")({
  head: () => ({
    meta: [
      { title: "Classes — Rollcall" },
      { name: "description", content: "Create and manage class rosters." },
    ],
  }),
  component: () => (
    <AppShell>
      <Classes />
    </AppShell>
  ),
});

function Classes() {
  const classes = useStore((s) => s.classes);
  const students = useStore((s) => s.students);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [subjectsText, setSubjectsText] = useState("");
  const [stream, setStream] = useState("");

  function submit() {
    if (!name.trim()) return;
    const subjects = subjectsText
      .split(",")
      .map((subject) => subject.trim())
      .filter(Boolean);

    store.addClass(name.trim(), subjects, stream.trim() || undefined);
    setName("");
    setSubjectsText("");
    setStream("");
    setOpen(false);
    toast.success("Class created.");
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Classes</h1>
          <p className="text-muted-foreground">Your class rosters and subjects.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="shadow-soft"><Plus className="mr-2 h-4 w-4" /> New class</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create a class</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Class name</label>
                <Input placeholder="e.g. Grade 7 — Section A" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Subjects (comma-separated)</label>
                <Input placeholder="e.g. Mathematics, Physics" value={subjectsText} onChange={(e) => setSubjectsText(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Stream (optional)</label>
                <Input placeholder="e.g. Science" value={stream} onChange={(e) => setStream(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={submit}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {classes.map((c) => {
          const count = students.filter((s) => s.classId === c.id).length;
          return (
            <Card key={c.id} className="overflow-hidden">
              <div className="h-2 w-full" style={{ backgroundColor: c.color }} />
              <CardContent className="p-5">
                <h3 className="font-semibold leading-tight">{c.name}</h3>
                {c.stream && <p className="text-sm text-muted-foreground">Stream: {c.stream}</p>}
                {c.subjects?.length ? (
                  <p className="text-sm text-muted-foreground">Subjects: {c.subjects.join(", ")}</p>
                ) : null}
                <div className="mt-4 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Users className="h-3.5 w-3.5" /> {count} students
                  </span>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete {c.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This removes the class, its {count} students, and all attendance history. This can't be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => { store.deleteClass(c.id); toast.success("Class deleted."); }}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {classes.length === 0 && (
          <Card className="col-span-full"><CardContent className="p-10 text-center text-sm text-muted-foreground">No classes yet. Create one above to get started.</CardContent></Card>
        )}
      </div>
    </div>
  );
}
