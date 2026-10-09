"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Pencil } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { requestJson } from "@/lib/client-api";

type Resource = { id: string; title: string; summary: string; body: string; category: string; tags: string[]; userId: string; owner: { id: string; name: string }; createdAt: string; updatedAt: string };
type User = { id: string; name: string; email: string };
const detailCovers = ["#bd6654", "#567d91", "#647b57", "#bd9c43"];

function ResourceDetailContent() {
  const { id } = useParams<{ id: string }>();
  const [resource, setResource] = useState<Resource | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      requestJson<{ resource: Resource }>(`/api/resources/${id}`, { signal: controller.signal }),
      requestJson<{ user: User | null }>("/api/auth/me", { signal: controller.signal }).catch(() => ({ user: null })),
    ]).then(([resourceData, session]) => {
      setResource(resourceData.resource);
      setUser(session.user);
    }).catch((reason) => {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "This note could not be opened.");
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [id]);

  const isOwner = Boolean(resource && user?.id === resource.userId);
  const coverIndex = resource ? resource.id.charCodeAt(0) % detailCovers.length : 0;

  return (
    <>
      <AppHeader name={user?.name} />
      {loading ? <main className="resource-detail" aria-busy="true"><p className="eyebrow">Opening a note</p><div className="detail-loading" role="status">Gathering the pages…</div></main> : error || !resource ? (
        <main className="error-page"><span className="empty-icon" aria-hidden="true">?</span><h1>We couldn’t find that note.</h1><p>{error || "It may have been moved or is no longer shared."}</p><Link className="button button-dark" href="/#library"><ArrowLeft size={15} aria-hidden="true" /> Back to the library</Link></main>
      ) : (
        <main className="resource-detail">
          <div className="detail-topline"><Link className="back-link" href="/#library"><ArrowLeft size={15} aria-hidden="true" /> Back to the library</Link>{isOwner && <Link className="button button-outline button-compact" href={`/resources/${resource.id}/edit`}><Pencil size={14} aria-hidden="true" /> Edit note</Link>}</div>
          <div className="detail-cover" style={{ background: detailCovers[coverIndex] }} aria-hidden="true"><span>{resource.title.slice(0, 1).toUpperCase()}</span></div>
          <div className="detail-meta"><span>{resource.category}</span><span>·</span><span>Shared by {resource.owner.name}</span><span>·</span><time dateTime={resource.createdAt}>{new Date(resource.createdAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</time></div>
          <h1>{resource.title}</h1>
          <p className="detail-summary">{resource.summary}</p>
          <div className="detail-body">{resource.body}</div>
          {resource.tags.length > 0 && <div className="detail-tags" aria-label="Tags">{resource.tags.map((tag) => <span className="detail-tag" key={tag}>{tag}</span>)}</div>}
          <div className="detail-endnote"><span className="wordmark-mark" aria-hidden="true">g.</span><p>Passed along by <strong>{resource.owner.name}</strong></p></div>
        </main>
      )}
    </>
  );
}

export default function ResourceDetailPage() {
  return <Suspense fallback={<><AppHeader /><main className="resource-detail"><div className="detail-loading" role="status">Opening a note…</div></main></>}><ResourceDetailContent /></Suspense>;
}