"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { ResourceEditor } from "@/components/resource-editor";

function EditResourceContent() {
  const { id } = useParams<{ id: string }>();
  return <ResourceEditor key={id} resourceId={id} />;
}

export default function EditResourcePage() {
  return <Suspense fallback={<main className="editor-shell"><div className="editor-loading" role="status">Opening your note…</div></main>}><EditResourceContent /></Suspense>;
}