"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowLeft } from "lucide-react";
import { requestJson } from "@/lib/client-api";

type AuthFormProps = { mode: "login" | "signup" };

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const isSignUp = mode === "signup";
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    try {
      await requestJson(`/api/auth/${mode}`, { method: "POST", body: JSON.stringify(payload) });
      router.push("/dashboard");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We could not sign you in.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="auth-page">
      <aside className="auth-aside">
        <Link className="wordmark" href="/"><span className="wordmark-mark" aria-hidden="true">g.</span><span>gyan bhandar</span></Link>
        <div className="auth-aside-copy">
          <p className="eyebrow">A shared shelf for curious minds</p>
          <h1>Leave a little<br />light <em>on.</em></h1>
          <p>Keep the things you learn in circulation. Someone else is looking for exactly what you found.</p>
        </div>
        <span className="auth-aside-foot">A library is made by everyone who adds to it.</span>
      </aside>
      <section className="auth-main" aria-labelledby="auth-heading">
        <div className="auth-panel">
          <Link className="back-link" href="/"><ArrowLeft size={15} aria-hidden="true" /> Back to the library</Link>
          <p className="eyebrow">{isSignUp ? "Make yourself at home" : "Welcome back"}</p>
          <h2 id="auth-heading">{isSignUp ? "Create your account" : "Sign in to your shelf"}</h2>
          <p className="auth-intro">{isSignUp ? "A good library starts with one good note." : "Your notes are right where you left them."}</p>
          <form className="form-stack" onSubmit={submit}>
            {isSignUp && <div className="field"><label htmlFor="name">Name</label><input id="name" name="name" autoComplete="name" required minLength={2} maxLength={60} /></div>}
            <div className="field"><label htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="email" required maxLength={254} /></div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input id="password" name="password" type="password" autoComplete={isSignUp ? "new-password" : "current-password"} required minLength={isSignUp ? 12 : 1} maxLength={128} />
              {isSignUp && <p className="field-hint">Use at least 12 characters.</p>}
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="button button-dark form-submit" type="submit" disabled={pending} aria-busy={pending}>
              {pending ? "One moment…" : isSignUp ? "Create account" : "Sign in"}<span aria-hidden="true">↗</span>
            </button>
          </form>
          <p className="auth-switch">
            {isSignUp ? "Already have an account? " : "New to the library? "}
            <Link href={isSignUp ? "/login" : "/signup"}>{isSignUp ? "Sign in" : "Create an account"}</Link>
          </p>
        </div>
      </section>
    </main>
  );
}