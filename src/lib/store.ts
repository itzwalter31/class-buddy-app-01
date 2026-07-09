import { useSyncExternalStore } from "react";

export type AttendanceStatus = "present" | "absent" | "late" | "excused";

export interface SchoolClass {
  id: string;
  name: string;
  subjects: string[];
  stream?: string;
  color: string;
  createdAt: string;
}

export interface Student {
  id: string;
  classId: string;
  firstName: string;
  lastName: string;
  rollNumber?: string;
}

export interface AttendanceRecord {
  id: string;
  classId: string;
  studentId: string;
  date: string;
  status: AttendanceStatus;
}

interface State {
  classes: SchoolClass[];
  students: Student[];
  attendance: AttendanceRecord[];
}

const COLORS = [
  "oklch(0.72 0.13 180)",
  "oklch(0.72 0.15 75)",
  "oklch(0.70 0.15 25)",
  "oklch(0.70 0.15 155)",
  "oklch(0.65 0.18 290)",
  "oklch(0.70 0.15 220)",
];

const EMPTY: State = { classes: [], students: [], attendance: [] };

let userKey: string | null = null;
let state: State = EMPTY;
const listeners = new Set<() => void>();

function storageKey() {
  return userKey ? `rollcall.state.v2.${userKey}` : null;
}

function seed(): State {
  const today = new Date().toISOString().slice(0, 10);
  const classIds = Array.from({ length: 6 }, () => crypto.randomUUID());
  const classDefinitions = [
    { name: "Senior One", subjects: ["Mathematics", "Physics"], stream: "Science" },
    { name: "Senior Two", subjects: ["English", "Literature"], stream: "Arts" },
    { name: "Senior Three", subjects: ["Biology", "Chemistry"], stream: "Science" },
    { name: "Senior Four", subjects: ["Physics", "Mathematics"], stream: "Science" },
    { name: "Senior Five", subjects: ["Chemistry", "Biology"], stream: "Commercial" },
    { name: "Senior Six", subjects: ["History", "Geography"], stream: "Arts" },
  ];
  const studentNames = [
    ["Amelia", "Carter"], ["Liam", "Hughes"], ["Noah", "Patel"], ["Olivia", "Kim"],
    ["Ethan", "Brooks"], ["Mia", "Nguyen"], ["Lucas", "Garcia"], ["Sophia", "Ahmed"],
    ["Aiden", "Walker"], ["Isla", "Rivera"], ["Maya", "Cohen"], ["Daniel", "Okafor"],
    ["Zoe", "Bennett"], ["Owen", "Sato"], ["Ava", "Lopez"], ["Henry", "Park"],
    ["Charlotte", "Diallo"], ["Jack", "Reyes"], ["Lily", "Singh"], ["Leo", "Murphy"],
    ["Grace", "Musa"], ["Noah", "Lem"], ["Emma", "Adeyemi"], ["Ethan", "Owens"],
  ];

  const students: Student[] = studentNames.flatMap(([f, l], i) => {
    const classIndex = i % classIds.length;
    return [{
      id: crypto.randomUUID(),
      classId: classIds[classIndex],
      firstName: f,
      lastName: l,
      rollNumber: String((Math.floor(i / classIds.length) + 1)).padStart(2, "0"),
    }];
  });

  const attendance: AttendanceRecord[] = [];
  for (let d = 14; d >= 1; d--) {
    const date = new Date();
    date.setDate(date.getDate() - d);
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    const dateStr = date.toISOString().slice(0, 10);

    for (const student of students) {
      const r = Math.random();
      const status: AttendanceStatus = r < 0.82 ? "present" : r < 0.9 ? "late" : r < 0.97 ? "absent" : "excused";
      attendance.push({ id: `${student.classId}:${dateStr}:${student.id}`, classId: student.classId, studentId: student.id, date: dateStr, status });
    }
  }

  return {
    classes: classDefinitions.map((classDef, index) => ({
      id: classIds[index],
      name: classDef.name,
      subjects: classDef.subjects,
      stream: classDef.stream,
      color: COLORS[index % COLORS.length],
      createdAt: today,
    })),
    students,
    attendance,
  };
}

function migrateLegacyClasses(parsed: State): State {
  const classes = parsed.classes.map((c) => {
    if ((c as any).subject && !c.subjects?.length) {
      return {
        ...c,
        subjects: [(c as any).subject].filter(Boolean),
        stream: c.stream ?? undefined,
      };
    }
    return c;
  });

  return { ...parsed, classes };
}

function isLegacySeed(state: State) {
  return (
    state.classes.length === 2 &&
    state.classes.some((c) => c.name === "Grade 7 — Section A") &&
    state.classes.some((c) => c.name === "Grade 9 — Section B")
  );
}

function load(): State {
  const key = storageKey();
  if (!key || typeof window === "undefined") return EMPTY;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      const seeded = seed();
      localStorage.setItem(key, JSON.stringify(seeded));
      return seeded;
    }
      let parsed = JSON.parse(raw) as State;
    if (
      !parsed.classes?.length &&
      !parsed.students?.length &&
      !parsed.attendance?.length
    ) {
      const seeded = seed();
      localStorage.setItem(key, JSON.stringify(seeded));
      return seeded;
    }
    parsed = migrateLegacyClasses(parsed);
    if (isLegacySeed(parsed)) {
      const seeded = seed();
      localStorage.setItem(key, JSON.stringify(seeded));
      return seeded;
    }
    localStorage.setItem(key, JSON.stringify(parsed));
    return parsed;
  } catch {
    const seeded = seed();
    localStorage.setItem(key, JSON.stringify(seeded));
    return seeded;
  }
}

function persist() {
  const key = storageKey();
  if (key && typeof window !== "undefined") {
    localStorage.setItem(key, JSON.stringify(state));
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function setUserScope(uid: string | null) {
  if (userKey === uid) return;
  userKey = uid;
  state = uid ? load() : EMPTY;
  listeners.forEach((l) => l());
}

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(state),
  );
}

export const store = {
  getState: () => state,
  addClass(name: string, subjects: string[], stream?: string) {
    const c: SchoolClass = {
      id: crypto.randomUUID(),
      name,
      subjects,
      stream,
      color: COLORS[state.classes.length % COLORS.length],
      createdAt: new Date().toISOString().slice(0, 10),
    };
    state = { ...state, classes: [...state.classes, c] };
    persist();
    return c;
  },
  updateClass(id: string, patch: Partial<SchoolClass>) {
    state = { ...state, classes: state.classes.map((c) => (c.id === id ? { ...c, ...patch } : c)) };
    persist();
  },
  deleteClass(id: string) {
    state = {
      classes: state.classes.filter((c) => c.id !== id),
      students: state.students.filter((s) => s.classId !== id),
      attendance: state.attendance.filter((a) => a.classId !== id),
    };
    persist();
  },
  addStudent(classId: string, firstName: string, lastName: string, rollNumber?: string) {
    const s: Student = { id: crypto.randomUUID(), classId, firstName, lastName, rollNumber };
    state = { ...state, students: [...state.students, s] };
    persist();
    return s;
  },
  addStudentsBulk(items: { classId: string; firstName: string; lastName: string; rollNumber?: string }[]) {
    const added = items.map((it) => ({ id: crypto.randomUUID(), ...it }));
    state = { ...state, students: [...state.students, ...added] };
    persist();
    return added;
  },
  updateStudent(id: string, patch: Partial<Student>) {
    state = { ...state, students: state.students.map((s) => (s.id === id ? { ...s, ...patch } : s)) };
    persist();
  },
  deleteStudent(id: string) {
    state = {
      ...state,
      students: state.students.filter((s) => s.id !== id),
      attendance: state.attendance.filter((a) => a.studentId !== id),
    };
    persist();
  },
  setAttendance(classId: string, date: string, studentId: string, status: AttendanceStatus) {
    const id = `${classId}:${date}:${studentId}`;
    const existing = state.attendance.find((a) => a.id === id);
    if (existing) {
      state = { ...state, attendance: state.attendance.map((a) => (a.id === id ? { ...a, status } : a)) };
    } else {
      state = { ...state, attendance: [...state.attendance, { id, classId, date, studentId, status }] };
    }
    persist();
  },
  bulkSetAttendance(classId: string, date: string, studentIds: string[], status: AttendanceStatus) {
    const map = new Map(state.attendance.map((a) => [a.id, a]));
    for (const sid of studentIds) {
      const id = `${classId}:${date}:${sid}`;
      map.set(id, { id, classId, date, studentId: sid, status });
    }
    state = { ...state, attendance: Array.from(map.values()) };
    persist();
  },
};

export function studentRate(studentId: string, classId?: string) {
  const records = state.attendance.filter(
    (a) => a.studentId === studentId && (!classId || a.classId === classId),
  );
  if (records.length === 0) return { rate: 0, total: 0, present: 0, absent: 0, late: 0, excused: 0 };
  const present = records.filter((r) => r.status === "present").length;
  const late = records.filter((r) => r.status === "late").length;
  const absent = records.filter((r) => r.status === "absent").length;
  const excused = records.filter((r) => r.status === "excused").length;
  const rate = ((present + late) / records.length) * 100;
  return { rate, total: records.length, present, absent, late, excused };
}

export function downloadCSV(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else field += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { cur.push(field); field = ""; }
      else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        cur.push(field); rows.push(cur); cur = []; field = "";
      } else field += ch;
    }
  }
  if (field.length > 0 || cur.length > 0) { cur.push(field); rows.push(cur); }
  return rows.filter((r) => r.some((c) => c.trim().length > 0));
}
