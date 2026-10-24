import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { API_BASE_URL, apiFetch } from "@/lib/api";
import {
  useStore,
  store,
  studentRate,
  parseCSV,
  downloadCSV,
} from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Plus,
  Search,
  Trash2,
  Upload,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/students")({
  head: () => ({
    meta: [
      { title: "Students — Rollcall" },
      {
        name: "description",
        content:
          "Student records with attendance rate and class assignment.",
      },
    ],
  }),

  component: () => (
    <AppShell>
      <Students />
    </AppShell>
  ),
});

async function fetchAndStoreStudents() {
  try {
    const data = await apiFetch("/students");

    const result = data?.data;

    const rows: any[] = Array.isArray(result?.data)
      ? result.data
      : Array.isArray(result)
        ? result
        : [];

    const backendStudents = rows.map((student) => ({
      id: student.id,
      classId: student.classId ?? "",
      firstName: student.firstName ?? "",
      lastName: student.lastName ?? "",
      rollNumber:
        student.studentNumber ?? student.rollNumber ?? "",
      studentNumber: student.studentNumber ?? "",
    }));

    console.log(
      "Fetched backend students:",
      backendStudents.map((student) => ({
        id: student.id,
        studentNumber: student.studentNumber,
        firstName: student.firstName,
        lastName: student.lastName,
      })),
    );

    store.setStudents(backendStudents);
  } catch (error) {
    console.error(
      "Failed to fetch students from backend:",
      error,
    );

    toast.error("Failed to load students.");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function fetchClassesFromBackend() {
  try {
    const response = await apiFetch("/classes");
    const rows: unknown[] = Array.isArray(response?.data)
      ? response.data
      : Array.isArray(response?.data?.data)
        ? response.data.data
        : [];

    return rows.flatMap((item) => {
      if (!isRecord(item)) {
        return [];
      }

      const id = typeof item?.id === "string" ? item.id : "";
      const name =
        typeof item?.className === "string"
          ? item.className
          : typeof item?.class_name === "string"
            ? item.class_name
            : "";

      return id && name
        ? [{ id, name, color: "var(--primary)" }]
        : [];
    });
  } catch (error) {
    console.error("Failed to fetch classes from backend:", error);
    toast.error("Failed to load classes.");
    return [];
  }
}

function Students() {
  const [classes, setClasses] = useState<
    { id: string; name: string; color: string }[]
  >([]);
  const students = useStore((state) => state.students);

  const [query, setQuery] = useState("");
  const [filterClass, setFilterClass] =
    useState<string>("all");

  const [open, setOpen] = useState(false);

  const [importOpen, setImportOpen] = useState(false);
  const [importClassId, setImportClassId] = useState("");
  const [importText, setImportText] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [rollNumber, setRollNumber] = useState("");

  const [classId, setClassId] = useState("");

  const [photoStudent, setPhotoStudent] =
    useState<any>(null);

  const [photoPreview, setPhotoPreview] =
    useState<string>("");

  const [photoFiles, setPhotoFiles] =
    useState<File[]>([]);

  const photoRef = useRef<HTMLInputElement>(null);


useEffect(() => {
  async function checkBackendAccess() {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    console.log("Supabase session check:", {
      hasSession: !!session,
      hasAccessToken: !!session?.access_token,
      sessionError: error?.message ?? null,
    });

    await fetchAndStoreStudents();

    const backendClasses = await fetchClassesFromBackend();
    console.log("Backend classes received:", backendClasses);

    setClasses(backendClasses);
  }

  void checkBackendAccess();
}, []);


  useEffect(() => {
    if (classes.length === 0) {
      return;
    }

    if (!classes.some((item) => item.id === classId)) {
      setClassId(classes[0]?.id ?? "");
    }

    if (!classes.some((item) => item.id === importClassId)) {
      setImportClassId(classes[0]?.id ?? "");
    }
  }, [classes, classId, importClassId]);

  const list = useMemo(() => {
    return students
      .filter((student) => {
        if (filterClass === "all") {
          return true;
        }

        return student.classId === filterClass;
      })
      .filter((student) => {
        const searchText = `
          ${student.firstName}
          ${student.lastName}
          ${student.rollNumber ?? student.studentNumber ?? ""}
        `
          .toLowerCase()
          .trim();

        return searchText.includes(
          query.toLowerCase().trim(),
        );
      })
      .sort((a, b) =>
        a.firstName.localeCompare(b.firstName),
      );
  }, [students, query, filterClass]);

  useEffect(() => {
    if (list.length === 0) {
      return;
    }

    console.log(
      "Displayed students:",
      list.map((student) => ({
        id: student.id,
        studentNumber: student.studentNumber,
        firstName: student.firstName,
        lastName: student.lastName,
      })),
    );
  }, [list]);

  async function submit() {
    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !classes.some((item) => item.id === classId)
    ) {
      toast.error("First name, last name and class are required.");
      return;
    }

    try {
      const generatedStudentNumber =
        rollNumber.trim() ||
        `${firstName.charAt(0)}${lastName.charAt(0)}${Date.now()}`;

      const response = await apiFetch("/students", {
        method: "POST",
        body: JSON.stringify({
          studentNumber: generatedStudentNumber,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          otherNames: null,
          gender: "OTHER",
          dateOfBirth: new Date()
            .toISOString()
            .split("T")[0],
          classId,
        }),
      });

      if (response?.data || response?.success) {
        await fetchAndStoreStudents();

        setFirstName("");
        setLastName("");
        setRollNumber("");
        setOpen(false);

        toast.success(
          "Student added successfully.",
        );
      } else {
        toast.error(
          response?.message ??
            "Failed to add student.",
        );
      }
    } catch (error) {
      console.error(
        "Failed to add student:",
        error,
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to add student to backend.",
      );
    }
  }

  function onFile(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setImportText(
        String(reader.result ?? ""),
      );
    };

    reader.readAsText(file);

    event.target.value = "";
  }

  async function runImport() {
    if (!classes.some((item) => item.id === importClassId)) {
      toast.error("Pick a class first.");
      return;
    }

    if (!importText.trim()) {
      toast.error(
        "Upload a CSV file or paste CSV data.",
      );
      return;
    }

    const rows = parseCSV(importText);

    if (rows.length === 0) {
      toast.error("No rows found.");
      return;
    }

    const first = rows[0].map((column) =>
      column.trim().toLowerCase(),
    );

    const hasHeader = first.some((column) =>
      [
        "first name",
        "firstname",
        "first",
        "last name",
        "lastname",
        "last",
        "name",
        "full name",
        "fullname",
        "roll",
        "roll number",
        "rollnumber",
        "roll no",
        "id",
      ].includes(column),
    );

    let firstIdx = 0;
    let lastIdx = 1;
    let rollIdx = 2;
    let nameIdx = -1;
    let dataStart = 0;

    if (hasHeader) {
      dataStart = 1;

      firstIdx = first.findIndex((column) =>
        [
          "first name",
          "firstname",
          "first",
        ].includes(column),
      );

      lastIdx = first.findIndex((column) =>
        [
          "last name",
          "lastname",
          "last",
        ].includes(column),
      );

      nameIdx = first.findIndex((column) =>
        [
          "name",
          "full name",
          "fullname",
        ].includes(column),
      );

      rollIdx = first.findIndex((column) =>
        [
          "roll",
          "roll number",
          "rollnumber",
          "roll no",
          "id",
        ].includes(column),
      );
    }

    const items: {
      classId: string;
      firstName: string;
      lastName: string;
      rollNumber?: string;
    }[] = [];

    for (
      let index = dataStart;
      index < rows.length;
      index++
    ) {
      const row = rows[index];

      let first = "";
      let last = "";

      if (firstIdx >= 0 && lastIdx >= 0) {
        first = (row[firstIdx] ?? "").trim();
        last = (row[lastIdx] ?? "").trim();
      } else if (nameIdx >= 0) {
        const parts = (row[nameIdx] ?? "")
          .trim()
          .split(/\s+/);

        first = parts[0] ?? "";
        last = parts.slice(1).join(" ");
      } else {
        first = (row[0] ?? "").trim();
        last = (row[1] ?? "").trim();
      }

      const roll =
        rollIdx >= 0
          ? (row[rollIdx] ?? "").trim()
          : (row[2] ?? "").trim();

      if (!first && !last) {
        continue;
      }

      items.push({
        classId: importClassId,
        firstName: first,
        lastName: last,
        rollNumber: roll || undefined,
      });
    }

    if (items.length === 0) {
      toast.error("No valid student rows.");
      return;
    }

    try {
      let successCount = 0;

      for (const item of items) {
        try {
          const studentNumber =
            item.rollNumber ||
            `${item.firstName.charAt(0)}${item.lastName.charAt(0)}${Date.now()}-${successCount}`;

          await apiFetch("/students", {
            method: "POST",
            body: JSON.stringify({
              studentNumber,
              firstName: item.firstName,
              lastName: item.lastName,
              otherNames: null,
              gender: "OTHER",
              dateOfBirth: new Date()
                .toISOString()
                .split("T")[0],
              classId: item.classId,
            }),
          });

          successCount++;
        } catch (error) {
          console.error(
            `Failed to create student ${item.firstName} ${item.lastName}:`,
            error,
          );
        }
      }

      await fetchAndStoreStudents();

      if (successCount > 0) {
        toast.success(
          `Imported ${successCount} student${
            successCount === 1 ? "" : "s"
          }.`,
        );
      } else {
        toast.error(
          "No students were imported.",
        );
      }

      setImportText("");
      setImportOpen(false);
    } catch (error) {
      console.error(
        "Failed to import students:",
        error,
      );

      toast.error("Failed to import students.");
    }
  }

  function exportStudents() {
    const rows: (string | number)[][] = [
      [
        "First name",
        "Last name",
        "Roll number",
        "Class",
        "Attendance rate %",
        "Records",
      ],
    ];

    for (const student of list) {
      const cls = classes.find(
        (item) => item.id === student.classId,
      );

      const stats = studentRate(student.id);

      rows.push([
        student.firstName,
        student.lastName,
        student.rollNumber ??
          student.studentNumber ??
          "",
        cls?.name ?? "",
        stats.total
          ? Math.round(stats.rate)
          : "",
        stats.total,
      ]);
    }

    downloadCSV(
      `students-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`,
      rows,
    );
  }

  function openPhotoDialog(student: any) {
    setPhotoStudent(student);
    setPhotoFiles([]);
    setPhotoPreview("");
  }

  function closePhotoDialog() {
    setPhotoStudent(null);
    setPhotoFiles([]);
    setPhotoPreview("");
  }

  function selectPhoto(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const files = event.target.files;

    if (!files) {
      return;
    }

    const selectedFiles = Array.from(files);

    setPhotoFiles(selectedFiles);

    if (selectedFiles[0]) {
      const url = URL.createObjectURL(
        selectedFiles[0],
      );

      setPhotoPreview(url);
    }

    event.target.value = "";
  }

  async function uploadPhotos() {
    if (!photoStudent) {
      toast.error("No student selected.");
      return;
    }

    if (photoFiles.length < 5) {
      toast.error(
        "Select at least 5 photos.",
      );
      return;
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error(
          "You are not authenticated. Please log in again.",
        );
      }

      const formData = new FormData();

      for (const file of photoFiles) {
        formData.append("photos", file);
      }

      const url = `${API_BASE_URL}/students/${photoStudent.id}/photos`;

      console.log("Uploading photos:", {
        url,
        fileCount: photoFiles.length,
        studentId: photoStudent.id,
        studentNumber:
          photoStudent.studentNumber,
      });

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      const responseData = await response
        .json()
        .catch(() => null);

      console.log(
        "Photo upload response:",
        responseData,
      );

      if (!response.ok) {
        throw new Error(
          responseData?.message ||
            responseData?.error ||
            `Upload failed with status ${response.status}`,
        );
      }

      toast.success(
        `${photoFiles.length} photos uploaded successfully.`,
      );

      closePhotoDialog();
    } catch (error) {
      console.error(
        "Failed to upload photos:",
        error,
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to upload photos.",
      );
    }
  }

  return (
    <div className="space-y-6">
      <input
        ref={photoRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={selectPhoto}
      />

      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Students
          </h1>

          <p className="text-muted-foreground">
            All your students with attendance
            performance.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={exportStudents}
            disabled={list.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>

          <Dialog
            open={importOpen}
            onOpenChange={(value) => {
              setImportOpen(value);

              if (value && !importClassId) {
                setImportClassId(
                  classes[0]?.id ?? "",
                );
              }
            }}
          >
            <DialogTrigger asChild>
              <Button
                variant="outline"
                disabled={classes.length === 0}
              >
                <Upload className="mr-2 h-4 w-4" />
                Import CSV
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  Import students from CSV
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Add to class
                  </label>

                  <Select
                    value={importClassId}
                    onValueChange={
                      setImportClassId
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>

                    <SelectContent>
                      {classes.map((item) => (
                        <SelectItem
                          key={item.id}
                          value={item.id}
                        >
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Upload .csv file
                  </label>

                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv,text/csv"
                    onChange={onFile}
                  />

                  <p className="mt-1 text-xs text-muted-foreground">
                    Columns:{" "}
                    <code>
                      First name, Last name, Roll
                      number
                    </code>{" "}
                    (header optional). A single{" "}
                    <code>Name</code> column is also
                    accepted.
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Or paste CSV
                  </label>

                  <textarea
                    value={importText}
                    onChange={(event) =>
                      setImportText(
                        event.target.value,
                      )
                    }
                    rows={6}
                    placeholder={
                      "First name,Last name,Roll number\nAva,Lopez,03\nLeo,Murphy,04"
                    }
                    className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={() =>
                    setImportOpen(false)
                  }
                >
                  Cancel
                </Button>

                <Button
                  onClick={runImport}
                  disabled={!importText.trim()}
                >
                  Import
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog
            open={open}
            onOpenChange={(value) => {
              setOpen(value);

              if (value && !classId) {
                setClassId(
                  classes[0]?.id ?? "",
                );
              }
            }}
          >
            <DialogTrigger asChild>
              <Button
                size="lg"
                className="shadow-soft"
                disabled={classes.length === 0}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add student
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  Add student
                </DialogTitle>
              </DialogHeader>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium">
                    Class
                  </label>

                  <Select
                    value={classId}
                    onValueChange={setClassId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>

                    <SelectContent>
                      {classes.map((item) => (
                        <SelectItem
                          key={item.id}
                          value={item.id}
                        >
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    First name
                  </label>

                  <Input
                    value={firstName}
                    onChange={(event) =>
                      setFirstName(
                        event.target.value,
                      )
                    }
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Last name
                  </label>

                  <Input
                    value={lastName}
                    onChange={(event) =>
                      setLastName(
                        event.target.value,
                      )
                    }
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium">
                    Roll number (optional)
                  </label>

                  <Input
                    value={rollNumber}
                    onChange={(event) =>
                      setRollNumber(
                        event.target.value,
                      )
                    }
                    placeholder="e.g. 12"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>

                <Button onClick={submit}>
                  Add
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

          <Input
            placeholder="Search students…"
            value={query}
            onChange={(event) =>
              setQuery(event.target.value)
            }
            className="h-11 pl-9"
          />
        </div>

        <Select
          value={filterClass}
          onValueChange={setFilterClass}
        >
          <SelectTrigger className="h-11 sm:w-56">
            <SelectValue />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="all">
              All classes
            </SelectItem>

            {classes.map((item) => (
              <SelectItem
                key={item.id}
                value={item.id}
              >
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {list.map((student) => {
              const cls = classes.find(
                (item) =>
                  item.id === student.classId,
              );

              const stats = studentRate(
                student.id,
              );

              const rateColor =
                stats.rate >= 90
                  ? "var(--success)"
                  : stats.rate >= 75
                    ? "var(--warning)"
                    : "var(--destructive)";

              return (
                <li
                  key={student.id}
                  className="flex items-center gap-3 px-4 py-3 sm:px-5"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
                    {student.firstName?.[0] ?? ""}
                    {student.lastName?.[0] ?? ""}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">
                        {student.firstName}{" "}
                        {student.lastName}
                      </span>

                      {(student.rollNumber ||
                        student.studentNumber) && (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          #
                          {student.rollNumber ??
                            student.studentNumber}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      {cls && (
                        <span className="inline-flex items-center gap-1">
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{
                              backgroundColor:
                                cls.color,
                            }}
                          />

                          {cls.name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="hidden text-right sm:block">
                    <div className="text-xs text-muted-foreground">
                      {stats.total} records
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      openPhotoDialog(student);
                      setTimeout(() => {
                        photoRef.current?.click();
                      }, 100);
                    }}
                  >
                    📷
                  </Button>

                  <div
                    className="w-16 text-right text-sm font-semibold"
                    style={{
                      color: stats.total
                        ? rateColor
                        : "var(--muted-foreground)",
                    }}
                  >
                    {stats.total
                      ? `${Math.round(
                          stats.rate,
                        )}%`
                      : "—"}
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger
                      asChild
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>

                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Remove{" "}
                          {student.firstName}{" "}
                          {student.lastName}?
                        </AlertDialogTitle>

                        <AlertDialogDescription>
                          All attendance history
                          for this student will be
                          removed.
                        </AlertDialogDescription>
                      </AlertDialogHeader>

                      <AlertDialogFooter>
                        <AlertDialogCancel>
                          Cancel
                        </AlertDialogCancel>

                        <AlertDialogAction
                          onClick={() => {
                            store.deleteStudent(
                              student.id,
                            );

                            toast.success(
                              "Student removed.",
                            );
                          }}
                        >
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </li>
              );
            })}

            {list.length === 0 && (
              <li className="p-10 text-center text-sm text-muted-foreground">
                No students yet.
              </li>
            )}
          </ul>
        </CardContent>
      </Card>

      <Dialog
        open={!!photoStudent}
        onOpenChange={(value) => {
          if (!value) {
            closePhotoDialog();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Upload photos for{" "}
              {photoStudent?.firstName}{" "}
              {photoStudent?.lastName}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">
                Select at least 5 photos of this
                student for face recognition.
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                Selected: {photoFiles.length} photo
                {photoFiles.length === 1
                  ? ""
                  : "s"}
              </p>
            </div>

            {photoPreview && (
              <img
                src={photoPreview}
                alt={`Preview of ${
                  photoStudent?.firstName ??
                  "student"
                }`}
                className="mx-auto h-48 w-48 rounded-full object-cover"
              />
            )}

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={selectPhoto}
              className="w-full"
            />

            {photoFiles.length > 0 && (
              <div className="max-h-32 overflow-auto rounded-md border p-2">
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {photoFiles.map(
                    (file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="truncate rounded bg-muted p-2 text-xs"
                        title={file.name}
                      >
                        {index + 1}.{" "}
                        {file.name}
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={closePhotoDialog}
            >
              Cancel
            </Button>

            <Button
              onClick={uploadPhotos}
              disabled={photoFiles.length < 5}
            >
              Save Photos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}