import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarCheck } from "lucide-react";
import { toast } from "sonner";
import { createUserProfile } from "@/lib/user-service";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Rollcall" },
      { name: "description", content: "Teacher sign-in for Rollcall attendance." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        if (!data.user) throw new Error("Signup succeeded but no user was returned.");

        if (!data.session) {
          setStatusMessage(
            "Account created. Check your email for a confirmation link before signing in."
          );
          toast.success("Check your email to complete signup.");
          return;
        }

        // Create user profile in the users table
        await createUserProfile(data.user, name);
        toast.success("Account created. You're signed in.");
        navigate({ to: "/" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setBusy(true);
    setStatusMessage(null);
    const res = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (res.error) {
      toast.error(res.error.message ?? "Google sign-in failed");
      setBusy(false);
      return;
    }
    if (res.redirected) return;
    navigate({ to: "/" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft">
            <CalendarCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold tracking-tight">Rollcall</div>
            <div className="text-xs text-muted-foreground">Attendance for teachers</div>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <h1 className="mb-1 text-2xl font-bold tracking-tight">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="mb-5 text-sm text-muted-foreground">
              {mode === "signin" ? "Sign in to take attendance." : "Start tracking attendance in minutes."}
            </p>

            <Button type="button" variant="outline" className="mb-4 w-full" onClick={google} disabled={busy}>
              Continue with Google
            </Button>

            <div className="mb-4 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> or email <span className="h-px flex-1 bg-border" />
            </div>

            {statusMessage ? (
              <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
                {statusMessage}
              </div>
            ) : null}

            <form className="space-y-3" onSubmit={submit}>
              {mode === "signup" && (
                <div>
                  <label className="mb-1 block text-sm font-medium">Full name</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Teacher" required />
                </div>
              )}
              <div>
                <label className="mb-1 block text-sm font-medium">Email</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Password</label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {mode === "signin" ? "Sign in" : "Create account"}
              </Button>
            </form>

            <button
              type="button"
              className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            >
              {mode === "signin" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
