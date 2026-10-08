import { Redirect } from "wouter";
import { Loader2 } from "lucide-react";
import { authClient } from "../lib/auth";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div className="flex min-h-dvh items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        <span className="text-[13px]">Memuat dashboard…</span>
      </div>
    );
  }
  if (!session) return <Redirect to="/login" />;

  return <>{children}</>;
}
