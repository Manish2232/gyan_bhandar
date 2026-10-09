import Image from "next/image";

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Resource = {
  id: string;
  title: string;
  summary: string;
  category: string;
  tags: string[];
  owner: { name: string };
  createdAt: string;
};

const categories = ["All notes", "Literature", "Science", "History", "Design"];
const covers = ["cover-coral", "cover-blue", "cover-lime", "cover-gold"];

export default function Home() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All notes");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/resources?limit=12", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("The library could not be reached.");
        const data = (await response.json()) as { resources: Resource[] };
        setResources(data.resources);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : "Something went wrong.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return resources.filter((resource) => {
      const matchesCategory = category === "All notes" || resource.category === category;
      const searchable = `${resource.title} ${resource.summary} ${resource.tags.join(" ")}`.toLocaleLowerCase();
      return matchesCategory && (!query || searchable.includes(query));
    });
  }, [resources, search, category]);

  return (
    <>
      <header className="site-header">
        <Link className="wordmark" href="/" aria-label="Gyan Bhandar home">
          <span className="wordmark-mark" aria-hidden="true">g.</span>
          <span>gyan bhandar</span>
        </Link>
        <nav className="main-nav" aria-label="Main navigation">
          <a href="#library">Explore</a>
          <a href="#about">Our idea</a>
        </nav>
        <div className="header-actions">
          <Link className="text-link sign-in-link" href="/login">Sign in</Link>
          <Link className="button button-dark button-small" href="/signup">Contribute <span aria-hidden="true">↗</span></Link>
        </div>
      </header>

      <main>
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow"><span className="eyebrow-dot" /> A little corner for big ideas</p>
            <h1 id="hero-title">Knowledge grows<br />when it is <em>shared.</em></h1>
            <p className="hero-description">A thoughtful library of notes, discoveries, and useful things worth passing on.</p>
            <a className="button button-dark hero-button" href="#library">Explore the library <span aria-hidden="true">↓</span></a>
            <div className="hero-footnote"><span className="avatar-stack" aria-hidden="true"><i>G</i><i>B</i><i>+</i></span><span>Made richer by curious minds</span></div>
          </div>
          <div className="hero-art">
            <img src="https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1400&q=85" alt="Sunlit shelves in a quiet library" fetchPriority="high" />
            <span className="art-label">FIELD NOTES <span>VOL. 01 / ALWAYS OPEN</span></span>
            <span className="art-caption">A place to keep what moves you.</span>
          </div>
        </section>

        <section className="library-section" id="library" aria-labelledby="library-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">The shared shelf</p>
              <h2 id="library-title">Find your next <em>rabbit hole.</em></h2>
            </div>
            <p className="section-aside">Ideas are better in good company.<br />Start wherever curiosity takes you.</p>
          </div>

          <div className="library-controls">
            <div className="category-tabs" role="group" aria-label="Filter by category">
              {categories.map((item) => (
                <button key={item} className={category === item ? "category-tab active" : "category-tab"} onClick={() => setCategory(item)} aria-pressed={category === item}>
                  {item}
                </button>
              ))}
            </div>
            <label className="search-box">
              <span className="search-icon" aria-hidden="true">⌕</span>
              <span className="visually-hidden">Search the library</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search the library" />
              <kbd>/</kbd>
            </label>
          </div>

          {loading ? (
            <div className="resource-grid" aria-label="Loading resources" aria-busy="true">
              {Array.from({ length: 4 }, (_, index) => <div className="resource-skeleton" key={index}><div /><span /><span /></div>)}
            </div>
          ) : error ? (
            <div className="empty-state" role="status"><span className="empty-icon">!</span><h3>We lost our place.</h3><p>{error} Try refreshing in a moment.</p></div>
          ) : filtered.length ? (
            <div className="resource-grid">
              {filtered.map((resource, index) => (
                <Link className="resource-card" href={`/resources/${resource.id}`} key={resource.id}>
                  <div className={`resource-cover ${covers[index % covers.length]}`}>
                    <span className="cover-category">{resource.category}</span>
                    <span className="cover-glyph" aria-hidden="true">{resource.title.slice(0, 1).toUpperCase()}</span>
                    <span className="cover-bottom">GYAN BHANDAR <span>№ {String(index + 1).padStart(2, "0")}</span></span>
                  </div>
                  <div className="resource-card-copy">
                    <div className="resource-meta"><span>{resource.category}</span><span>{new Date(resource.createdAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })}</span></div>
                    <h3>{resource.title}</h3>
                    <p>{resource.summary}</p>
                    <span className="resource-author">By {resource.owner.name}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty-state" role="status">
              <span className="empty-icon" aria-hidden="true">✳</span>
              <h3>{search || category !== "All notes" ? "Nothing on this shelf yet." : "The first page is yours."}</h3>
              <p>{search || category !== "All notes" ? "Try another search or category." : "Share a note, a discovery, or something you wish you had found sooner."}</p>
              <Link className="text-link" href="/signup">Add to the library <span aria-hidden="true">↗</span></Link>
            </div>
          )}
        </section>

        <section className="contribute-band" id="about">
          <div className="contribute-mark" aria-hidden="true">g.</div>
          <div><p className="eyebrow">A library, not a leaderboard</p><h2>Keep the good things<br />in circulation.</h2></div>
          <p className="contribute-copy">No noise, no race to the top. Just generous people collecting what they learn and leaving the door open for the next curious person.</p>
          <Link className="button button-light" href="/signup">Leave a note <span aria-hidden="true">↗</span></Link>
        </section>
      </main>

      <footer className="site-footer"><Link className="wordmark" href="/"><span className="wordmark-mark" aria-hidden="true">g.</span><span>gyan bhandar</span></Link><span>A shared library for the endlessly curious.</span><span>© 2026 · Made to be passed on</span></footer>
    </>
  );
}
