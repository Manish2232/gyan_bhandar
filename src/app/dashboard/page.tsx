"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUpRight, FilePlus2, Pencil, Trash2 } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { requestJson } from "@/lib/client-api";

type User = { id: string; name: string; email: string };
type Resource = { id: string; title: string; summary: string; category: string; isPublished: boolean; updatedAt: string };
type ResourceList = { resources: Resource[]; total: number };
const swatches = ["#bd6654", "#567d91", "#647b57", "#bd9c43"];

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState("");
  const [pendingDelete, setPendingDelete] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const sessionResponse = await fetch("/api/auth/me", { signal: controller.signal });
        const session = await sessionResponse.json() as { user: User | null };
        if (!session.user) {
          router.replace("/login");
          return;
        }
        setUser(session.user);
        const data = await requestJson<ResourceList>("/api/resources?mine=true&limit=24");
        setResources(data.resources);
      } catch (reason) {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Your shelf could not be loaded.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [router]);

  async function deleteResource() {
    if (!deleteId) return;
    setPendingDelete(true);
    setError("");
    try {
      await requestJson(`/api/resources/${deleteId}`, { method: "DELETE" });
      setResources((items) => items.filter((item) => item.id !== deleteId));
      setDeleteId("");
      setNotice("Your note was removed.");
      window.setTimeout(() => setNotice(""), 3200);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The note could not be deleted.");
    } finally {
      setPendingDelete(false);
    }
  }

  return (
    <>
      <AppHeader name={user?.name} />
      <main className="dashboard">
        <div className="dashboard-heading">
          <div><p className="eyebrow">Your corner of the library</p><h1>Your shelf.</h1><p>Keep your notes tidy and pass the useful ones along.</p></div>
          <Link className="button button-dark" href="/resources/new"><FilePlus2 size={16} aria-hidden="true" /> New note</Link>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {loading ? (
          <div className="resource-list" aria-label="Loading your notes" aria-busy="true">
            {Array.from({ length: 3 }, (_, index) => <div className="resource-row" key={index}><div className="resource-row-main"><span className="row-swatch skeleton-swatch" /><div className="row-skeleton"><span /><span /></div></div></div>)}
          </div>
        ) : resources.length ? (
          <div className="resource-list">
            {resources.map((resource, index) => (
              <article className="resource-row" key={resource.id}>
                <div className="resource-row-main">
                  <span className="row-swatch" style={{ background: swatches[index % swatches.length] }} aria-hidden="true">{resource.title.slice(0, 1).toUpperCase()}</span>
                  <div className="resource-row-copy">
                    <h2>{resource.title}<span className={resource.isPublished ? "row-status published" : "row-status"}>{resource.isPublished ? "Published" : "Draft"}</span></h2>
                    <p>{resource.category} · Updated {new Date(resource.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</p>
                  </div>
                </div>
                <div className="row-actions">
                  <Link className="icon-action" href={`/resources/${resource.id}/edit`} aria-label={`Edit ${resource.title}`} title="Edit"><Pencil size={15} aria-hidden="true" /></Link>
                  {resource.isPublished && <Link className="icon-action" href={`/resources/${resource.id}`} aria-label={`View ${resource.title}`} title="View"><ArrowUpRight size={16} aria-hidden="true" /></Link>}
                  <button className="icon-action delete-action" type="button" onClick={() => setDeleteId(resource.id)} aria-label={`Delete ${resource.title}`} title="Delete"><Trash2 size={15} aria-hidden="true" /></button>
                </div>
                {deleteId === resource.id && <div className="delete-confirm" role="group" aria-label={`Confirm deleting ${resource.title}`}><span>Remove this note from your shelf?</span><button type="button" className="text-link" onClick={() => setDeleteId("")}>Keep it</button><button type="button" className="confirm-delete-button" onClick={deleteResource} disabled={pendingDelete}>{pendingDelete ? "Removing…" : "Remove"}</button></div>}
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state dashboard-empty" role="status"><span className="empty-icon"><FilePlus2 size={18} aria-hidden="true" /></span><h3>A shelf with room to grow.</h3><p>Your first note can be a small discovery, a useful link, or an idea you want to remember.</p><Link className="button button-dark" href="/resources/new">Write your first note <span aria-hidden="true">↗</span></Link></div>
        )}
        <div className="dashboard-footer"><span>{resources.length} {resources.length === 1 ? "note" : "notes"}</span><Link className="text-link" href="/#library">Browse the shared shelf <span aria-hidden="true">↗</span></Link></div>
      </main>
      {notice && <p className="toast" role="status">{notice}</p>}
    </>
  );
}