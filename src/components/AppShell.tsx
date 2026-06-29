import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { CalendarCheck, GraduationCap, LayoutDashboard, Users, BarChart3, LogOut } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

const nav = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/attendance", label: "Roll Call", icon: CalendarCheck },
  { to: "/classes", label: "Classes", icon: GraduationCap },
  { to: "/students", label: "Students", icon: Users },
  { to: "/reports", label: "Reports", icon: BarChart3 },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  const displayName =
    (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "Teacher";
  const initials = displayName
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar px-4 py-6 md:flex">
        <div className="mb-8 flex items-center gap-2 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft">
            <CalendarCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight">Rollcall</div>
            <div className="text-xs text-muted-foreground">Attendance, simplified</div>
          </div>
        </div>
        <nav className="flex flex-col gap-1">
          {nav.map((item) => {
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto space-y-3">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
              {initials || "T"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{displayName}</div>
              <div className="truncate text-xs text-muted-foreground">{user.email}</div>
            </div>
            <Button variant="ghost" size="icon" onClick={signOut} title="Sign out" className="h-8 w-8">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      <main className="pb-24 md:ml-64 md:pb-8">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">{children}</div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-sidebar-border bg-sidebar/95 backdrop-blur md:hidden">
        <div className="grid grid-cols-5">
          {nav.map((item) => {
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className={cn("h-5 w-5", active && "scale-110")} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <Toaster position="top-center" />
    </div>
  );
}
