import { useEffect, useState } from "react";
import { Card, SegmentedControl } from "@radix-ui/themes";
import { Link, useParams, useSearchParams } from "react-router";
import { getFlavor } from "../../helpers/game-flavor";
import { ClassColor } from "../../helpers/classColorHelper";
import "./blue-tracker.css";

interface BluePost {
    id: number; title: string; author: string; authorTitle: string; createdAt: string;
    updatedAt?: string; category: string; excerpt: string; sourceUrl: string; html?: string;
}
const classNames = Array.from(ClassColor.keys()).filter(name => name !== "" && name !== "hunterpet");
const classPattern = new RegExp(`\\b(${classNames.join("s?|")}s?)\\b`, "gi");
const label = () => getFlavor() === "classic" ? "MoP Classic" : "Retail";
const date = (value: string) => new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

// Rebuild the remote markup with an explicit allowlist; never insert upstream HTML directly.
function formatBluePost(html: string, region: string): string {
    const source = new DOMParser().parseFromString(html, "text/html");
    const output = document.createElement("div");
    const allowed = new Set("p br h1 h2 h3 h4 h5 h6 ul ol li strong b em i u s del blockquote pre code table thead tbody tr th td hr a img details summary span div".split(" "));
    const root = `https://${region}.forums.blizzard.com/en/wow/`;
    const copy = (node: Node, parent: HTMLElement) => {
        if (node.nodeType === Node.TEXT_NODE) {
            const parts = (node.textContent ?? "").split(classPattern);
            for (const part of parts) {
                const name = classNames.find(c => c.toLowerCase() === part.toLowerCase() || (c + "s").toLowerCase() === part.toLowerCase());
                if (name) { const span = document.createElement("span"); span.style.color = ClassColor.get(name) ?? ""; span.className = "wow-class"; span.textContent = part; parent.append(span); }
                else parent.append(document.createTextNode(part));
            }
            return;
        }
        if (!(node instanceof Element)) return;
        const tag = node.tagName.toLowerCase();
        if (["script", "style", "iframe", "object", "embed", "form", "svg", "math"].includes(tag)) return;
        if (!allowed.has(tag)) { node.childNodes.forEach(n => copy(n, parent)); return; }
        const el = document.createElement(tag);
        for (const attr of ["href", "src"]) {
            if ((tag === "a" && attr === "href") || (tag === "img" && attr === "src")) {
                try { const url = new URL(node.getAttribute(attr) ?? "", root); if (url.protocol === "https:") el.setAttribute(attr, url.href); } catch { /* discard invalid URLs */ }
            }
        }
        if (tag === "a") { el.setAttribute("target", "_blank"); el.setAttribute("rel", "noopener noreferrer"); }
        if (tag === "img") { if (!el.hasAttribute("src")) return; el.setAttribute("alt", node.getAttribute("alt") ?? "Forum image"); el.setAttribute("loading", "lazy"); }
        node.childNodes.forEach(n => copy(n, el)); parent.append(el);
    };
    source.body.childNodes.forEach(n => copy(n, output));
    return output.innerHTML;
}

function useBlueData<T>(url: string) {
    const [attempt, retry] = useState(0);
    const key = `${url}:${attempt}`;
    const [result, setResult] = useState<{ key: string; data?: T; error?: string }>();
    useEffect(() => {
        const controller = new AbortController();
        fetch(url, { signal: controller.signal }).then(async response => {
            if (!response.ok) throw new Error(response.status === 404 ? "This post is unavailable for the selected game flavor." : "Blizzard’s forums could not be loaded. Please try again.");
            return response.json() as Promise<T>;
        }).then(data => { if (!controller.signal.aborted) setResult({ key, data }); }).catch(e => { if (!controller.signal.aborted) setResult({ key, error: e.message }); });
        return () => controller.abort();
    }, [url, key]);
    return { data: result?.key === key ? result.data : undefined, error: result?.key === key ? result.error : undefined, retry: () => retry(n => n + 1) };
}

export function BlueTracker({ compact = false }: { compact?: boolean }) {
    const [params, setParams] = useSearchParams();
    const region = params.get("region") === "eu" ? "eu" : "us";
    const [search, setSearch] = useState("");
    const { data, error, retry } = useBlueData<BluePost[]>(`/api/blue-tracker?region=${region}`);
    const posts = data?.filter(p => `${p.title} ${p.excerpt} ${p.category}`.toLowerCase().includes(search.toLowerCase()));
    return <Card asChild><section className={`blue-tracker ${compact ? "blue-compact" : ""}`} aria-label="Blizzard blue tracker">
        <header className="blue-header"><div><span className="blue-eyebrow">BLIZZARD FORUMS · {label()}</span><h1>Blue Tracker</h1></div>
            <SegmentedControl.Root size="1" value={region} aria-label="Forum region" onValueChange={r => setParams(previous => { const next = new URLSearchParams(previous); next.set("region", r); return next; })}>
                <SegmentedControl.Item value="us">US</SegmentedControl.Item>
                <SegmentedControl.Item value="eu">EU</SegmentedControl.Item>
            </SegmentedControl.Root>
        </header>
        {!compact && <input className="blue-search" aria-label="Search blue posts" placeholder="Search recent blue posts…" value={search} onChange={e => setSearch(e.target.value)} />}
        <div aria-live="polite">{error ? <div className="blue-status" role="alert">{error} <button onClick={retry}>Retry</button></div> : !posts ? <p className="blue-status">Loading Blizzard posts…</p> : posts.length === 0 ? <p className="blue-status">No matching {label()} blue posts in the recent forum activity.</p> :
            posts.slice(0, compact ? 8 : 30).map(post => <Link className="blue-row" key={post.id} to={`/blue-tracker/${region}/${post.id}`}>
                <span className="blue-category" style={{ color: ClassColor.get(post.category) }}>{post.category}</span><h2>{post.title}</h2>
                {!compact && <p className="blue-excerpt">{post.excerpt}</p>}
                <div className="blue-meta"><span>{post.author}</span><time dateTime={post.createdAt}>{date(post.createdAt)}</time></div>
            </Link>)}</div>
        <footer className="blue-footer">{compact ? <Link to={`/blue-tracker?region=${region}`}>View all blue posts →</Link> : <span>Recent official posts · refreshed every 5 minutes</span>}<a href={`https://${region}.forums.blizzard.com/en/wow/g/blizzard-tracker/activity/posts`} target="_blank" rel="noopener noreferrer">Blizzard ↗</a></footer>
    </section></Card>;
}

export function BluePostPage() {
    const { region = "us", postId = "" } = useParams();
    const valid = ["us", "eu"].includes(region) && /^\d+$/.test(postId);
    const { data: post, error, retry } = useBlueData<BluePost>(valid ? `/api/blue-tracker/${region}/${postId}` : "/api/blue-tracker/invalid/0");
    return <Card asChild><article className="blue-tracker blue-article">
        <Link className="blue-back" to={`/blue-tracker?region=${region}`}>← Blue Tracker</Link>
        {error ? <p role="alert">{error} <button onClick={retry}>Retry</button></p> : !post ? <p aria-live="polite">Loading Blizzard post…</p> : <>
            <header><span className="blue-eyebrow">{label()} · {region.toUpperCase()} · BLIZZARD POST</span><h1>{post.title}</h1>
                <div className="blue-author"><strong>{post.author}</strong><span>{post.authorTitle}</span><time dateTime={post.createdAt}>{date(post.createdAt)}</time></div>
            </header>
            <div className="blue-content" dangerouslySetInnerHTML={{ __html: formatBluePost(post.html ?? "", region) }} />
            <footer className="blue-footer"><span>Originally posted by Blizzard Entertainment{post.updatedAt && post.updatedAt !== post.createdAt ? ` · Updated ${date(post.updatedAt)}` : ""}</span><a href={post.sourceUrl} target="_blank" rel="noopener noreferrer">View original post ↗</a></footer>
        </>}
    </article></Card>;
}
