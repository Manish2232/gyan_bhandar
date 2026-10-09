"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BookOpen, LogOut } from "lucide-react";
import { requestJson } from "@/lib/client-api";

export function AppHeader({ name }: { name?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function signOut() {
    setPending(true);
    setError("");
    try {
      await requestJson("/api/auth/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Sign out failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <header className="app-header">
        <Link className="wordmark" href="/" aria-label="Gyan Bhandar home"><span className="wordmark-mark" aria-hidden="true">g.</span><span>gyan bhandar</span></Link>
        <div className="app-header-actions">
          <Link className="text-link dashboard-nav-link" href="/dashboard"><BookOpen size={15} aria-hidden="true" /> My shelf</Link>
          {name && <span className="user-label">{name}</span>}
          <button className="icon-action signout-action" type="button" onClick={signOut} disabled={pending} aria-label="Sign out" title="Sign out"><LogOut size={16} aria-hidden="true" /></button>
        </div>
      </header>
      {error && <p className="toast" role="alert">{error}</p>}
    </>
  );
}