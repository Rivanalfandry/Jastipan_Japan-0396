import * as React from "react";
import { useLocation } from "wouter";
import { Loader2, PackageCheck } from "lucide-react";
import { Button } from "../components/ui/button";
import { Field, Input } from "../components/ui/field";
import { authClient } from "../lib/auth";

export default function Login() {
  const [, navigate] = useLocation();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [mode, setMode] = React.useState<"signin" | "signup">("signin");
  const [form, setForm] = React.useState({ name: "", email: "", password: "" });
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (session) navigate("/", { replace: true });
  }, [session, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result =
        mode === "signin"
          ? await authClient.signIn.email({ email: form.email.trim(), password: form.password })
          : await authClient.signUp.email({
              name: form.name.trim() || form.email.split("@")[0],
              email: form.email.trim(),
              password: form.password,
            });
      if (result.error) {
        setError(result.error.message ?? "Gagal masuk. Cek email dan password.");
        return;
      }
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-5 flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-lg bg-foreground text-primary-foreground">
            <PackageCheck className="size-4.5" />
          </div>
          <div>
            <h1 className="text-[17px] leading-tight font-extrabold tracking-tight">
              Jastip Dashboard
            </h1>
            <p className="text-[12px] text-muted-foreground">Tracking titipan multi-client</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-[0_18px_40px_-28px_rgba(20,23,26,0.4)]">
          <div className="mb-4 flex gap-1 rounded-lg bg-muted p-1">
            {(
              [
                ["signin", "Masuk"],
                ["signup", "Daftar akun tim"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setMode(value);
                  setError("");
                }}
                className={`flex-1 rounded-md px-3 py-1.5 text-[12.5px] font-semibold transition ${
                  mode === value
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="grid gap-3">
            {mode === "signup" && (
              <Field label="Nama">
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Nama kamu"
                />
              </Field>
            )}
            <Field label="Email">
              <Input
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="kamu@email.com"
              />
            </Field>
            <Field label="Password" hint={mode === "signup" ? "Minimal 8 karakter." : undefined}>
              <Input
                type="password"
                required
                minLength={8}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
              />
            </Field>
            {error && <p className="text-[12px] text-destructive">{error}</p>}
            <Button type="submit" disabled={busy || sessionPending} className="mt-1 w-full">
              {busy && <Loader2 className="size-3.5 animate-spin" />}
              {mode === "signin" ? "Masuk" : "Buat akun"}
            </Button>
          </form>
        </div>

        <p className="mt-3 text-center text-[11.5px] text-muted-foreground">
          Semua anggota tim yang punya akun melihat data client yang sama.
        </p>
      </div>
    </div>
  );
}
