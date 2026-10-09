"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { requestJson } from "@/lib/client-api";

type Resource = { id: string; title: string; summary: string; body: string; category: string; tags: string[]; isPublished: boolean };
type EditorValues = Omit<Resource, "id" | "tags"> & { tags: string };
const blankValues: EditorValues = { title: "", summary: "", body: "", category: "Literature", tags: "", isPublished: false };

export function ResourceEditor({ resourceId }: { resourceId?: string }) {
  const router = useRouter();
  const editing = Boolean(resourceId);
  const [values, setValues] = useState<EditorValues>(blankValues);
  const [loading, setLoading] = useState(editing);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!resourceId) return;
    const controller = new AbortController();
    requestJson<{ resource: Resource }>(`/api/resources/${resourceId}`, { signal: controller.signal })
      .then(({ resource }) => setValues({ ...resource, tags: resource.tags.join(", ") }))
      .catch((reason) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "This note could not be loaded.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [resourceId]);

  function updateField<K extends keyof EditorValues>(key: K, value: EditorValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const payload = {
      ...values,
      tags: values.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
    };
    try {
      await requestJson(editing ? `/api/resources/${resourceId}` : "/api/resources", {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      router.push("/dashboard");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your note could not be saved.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <AppHeader />
      <main className="editor-shell">
        <Link className="back-link" href="/dashboard"><ArrowLeft size={15} aria-hidden="true" /> Back to your shelf</Link>
        <p className="eyebrow">A note for the shared shelf</p>
        <h1>{editing ? "Shape your note." : "Start with a thought."}</h1>
        <p>Share something useful, surprising, or worth remembering.</p>
        {loading ? <div className="editor-loading" role="status" aria-live="polite">Opening your note…</div> : (
          <form className="editor-form" onSubmit={submit}>
            <div className="field"><label htmlFor="title">Title</label><input id="title" value={values.title} onChange={(event) => updateField("title", event.target.value)} required minLength={3} maxLength={120} /></div>
            <div className="field"><label htmlFor="summary">Short description</label><textarea id="summary" value={values.summary} onChange={(event) => updateField("summary", event.target.value)} required minLength={20} maxLength={280} rows={3} aria-describedby="summary-hint" /><p className="field-hint" id="summary-hint">A sentence or two to help readers find their way in.</p></div>
            <div className="editor-two-col">
              <div className="field"><label htmlFor="category">Category</label><select id="category" value={values.category} onChange={(event) => updateField("category", event.target.value)}>{["Literature", "Science", "History", "Design", "Technology", "Other"].map((category) => <option key={category}>{category}</option>)}</select></div>
              <div className="field"><label htmlFor="tags">Tags</label><input id="tags" value={values.tags} onChange={(event) => updateField("tags", event.target.value)} placeholder="e.g. memory, field notes" aria-describedby="tags-hint" /><p className="field-hint" id="tags-hint">Separate tags with commas, up to 8.</p></div>
            </div>
            <div className="field"><label htmlFor="body">Your note</label><textarea id="body" value={values.body} onChange={(event) => updateField("body", event.target.value)} required minLength={30} maxLength={20000} rows={12} /></div>
            <label className="publish-row"><input type="checkbox" checked={values.isPublished} onChange={(event) => updateField("isPublished", event.target.checked)} /><span>Share this note publicly</span></label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <div className="editor-actions"><Link className="button button-outline" href="/dashboard">Cancel</Link><button className="button button-dark" type="submit" disabled={pending} aria-busy={pending}><Save size={15} aria-hidden="true" /> {pending ? "Saving…" : editing ? "Save changes" : "Save note"}</button></div>
          </form>
        )}
      </main>
    </>
  );
}