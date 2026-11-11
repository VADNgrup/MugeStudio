"use client";

import { useMemo, useState } from "react";
import { Check, Clipboard, Search } from "lucide-react";
import { apiCatalog } from "../api/catalog";

const groups = ["Projects", "Generation", "Editor", "Storage"];

export default function ApiGuide() {
  const [query, setQuery] = useState("");
  const [copiedPath, setCopiedPath] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const visibleApis = useMemo(
    () => apiCatalog.filter((api) => `${api.title} ${api.path} ${api.buttons.join(" ")} ${api.description}`.toLowerCase().includes(normalizedQuery)),
    [normalizedQuery],
  );

  async function copyPath(path: string) {
    try {
      await navigator.clipboard.writeText(path);
      setCopiedPath(path);
      window.setTimeout(() => setCopiedPath(""), 1600);
    } catch (error) {
      console.error("Could not copy API path", error);
    }
  }

  return (
    <div className="page-content api-guide-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow"><span className="live-dot" /> DEVELOPER REFERENCE</div>
          <h1>API guide</h1>
          <p>See what each action calls, what to send, and what the API returns.</p>
        </div>
        <label className="api-guide-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search button or endpoint..." /></label>
      </div>
      <div className="api-guide-notice"><strong>Demo status</strong><span>Only the four endpoints marked “Implemented demo” are connected to the current fake-data API. Other entries are proposed contracts for the backend; the UI currently simulates these actions locally.</span></div>
      <div className="api-guide-legend"><span><i className="api-status-dot implemented" /> Implemented demo</span><span><i className="api-status-dot proposed" /> Proposed API</span><span>{visibleApis.length} endpoints</span></div>
      {groups.map((group) => {
        const apis = visibleApis.filter((api) => api.group === group);
        if (apis.length === 0) return null;
        return <section className="api-guide-group" key={group}>
          <div className="api-guide-group-heading"><h2>{group}</h2><span>{apis.length} endpoints</span></div>
          <div className="api-guide-list">
            {apis.map((api) => <article className="api-guide-card" key={`${api.method} ${api.path}`}>
              <div className="api-guide-card-heading">
                <div className="api-endpoint">
                  <span className={`api-method method-${api.method.toLowerCase()}`}>{api.method}</span>
                  <code>{api.path}</code>
                  <button className="api-copy-button" onClick={() => void copyPath(api.path)} aria-label={`Copy ${api.path}`}>
                    {copiedPath === api.path ? <Check size={14} /> : <Clipboard size={14} />}
                  </button>
                </div>
                <span className={`api-status ${api.status === "Proposed" ? "api-status-proposed" : "api-status-implemented"}`}>{api.status}</span>
              </div>
              <div className="api-guide-card-body">
                <div className="api-guide-summary"><h3>{api.title}</h3><p>{api.description}</p><div className="api-button-map"><strong>UI buttons</strong>{api.buttons.map((button) => <span key={button}>{button}</span>)}</div></div>
                <div className="api-schema-columns">
                  <div><h4>INPUT</h4><pre><code>{api.request}</code></pre></div>
                  <div><h4>OUTPUT</h4><pre><code>{api.response}</code></pre></div>
                </div>
              </div>
            </article>)}
          </div>
        </section>;
      })}
      {visibleApis.length === 0 && <div className="api-guide-empty">No APIs match “{query}”. Try searching for a button name or path.</div>}
      <div className="api-guide-footnote">All JSON examples are illustrative. IDs and timestamps vary by environment. Successful JSON responses use a <code>{"{ data: ... }"}</code> envelope; errors use <code>{"{ error: string }"}</code>.</div>
    </div>
  );
}
