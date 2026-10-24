import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { apiFetch } from "@/lib/api";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

type SchoolClass = {
  id: string;
  className: string;
  _count: { students: number };
};

function isSchoolClass(value: unknown): value is SchoolClass {
  if (typeof value !== "object" || value === null) return false;

  const candidate = value as Record<string, unknown>;
  if (typeof candidate.id !== "string" || typeof candidate.className !== "string") return false;
  if (typeof candidate._count !== "object" || candidate._count === null) return false;
  return typeof (candidate._count as Record<string, unknown>).students === "number";
}

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
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadClasses = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const response = await apiFetch("/classes");
      const rows: unknown = response?.data;
      if (!Array.isArray(rows) || !rows.every(isSchoolClass)) {
        throw new Error("The classes response was not in the expected format.");
      }
      setClasses(rows);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load classes.";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadClasses();
  }, [loadClasses]);

  function openCreateDialog() {
    setEditingClass(null);
    setName("");
    setOpen(true);
  }

  function openEditDialog(klass: SchoolClass) {
    setEditingClass(klass);
    setName(klass.className);
    setOpen(true);
  }

  async function submit() {
    const className = name.trim();
    if (!className) {
      toast.error("Enter a class name.");
      return;
    }

    setSaving(true);
    try {
      await apiFetch(
        editingClass ? `/classes/${encodeURIComponent(editingClass.id)}` : "/classes",
        {
          method: editingClass ? "PUT" : "POST",
          body: JSON.stringify({ className }),
        },
      );
      toast.success(editingClass ? "Class updated." : "Class created.");
      setOpen(false);
      await loadClasses();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save class.");
    } finally {
      setSaving(false);
    }
  }

  async function removeClass(klass: SchoolClass) {
    setDeletingId(klass.id);
    try {
      await apiFetch(`/classes/${encodeURIComponent(klass.id)}`, { method: "DELETE" });
      setClasses((current) => current.filter((item) => item.id !== klass.id));
      toast.success("Class deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete class.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Classes</h1>
          <p className="text-muted-foreground">Manage your school&apos;s class rosters.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="shadow-soft" onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" /> New class
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingClass ? "Rename class" : "Create a class"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <label htmlFor="class-name" className="block text-sm font-medium">
                Class name
              </label>
              <Input
                id="class-name"
                placeholder="e.g. Senior One"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={100}
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={() => void submit()} disabled={saving}>
                {saving ? "Saving…" : editingClass ? "Save changes" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      {loadError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <p className="text-sm text-destructive">{loadError}</p>
            <Button variant="outline" onClick={() => void loadClasses()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : loading ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            Loading classes…
          </CardContent>
        </Card>
      ) : classes.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            No classes yet. Create one to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((klass) => (
            <Card key={klass.id} className="overflow-hidden">
              <div className="h-2 w-full bg-primary" />
              <CardContent className="p-5">
                <h2 className="font-semibold leading-tight">{klass.className}</h2>
                <div className="mt-4 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    {klass._count.students} students
                  </span>
                  <div className="flex items-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditDialog(klass)}
                      aria-label={`Rename ${klass.className}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          aria-label={`Delete ${klass.className}`}
                          disabled={deletingId === klass.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete {klass.className}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Classes with assigned students cannot be deleted. Student records and
                            attendance history will not be removed.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => void removeClass(klass)}>
                            Delete class
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
