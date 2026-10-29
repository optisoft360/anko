import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY } from "d3-force";
import {
  ArrowDownTrayIcon, ArrowPathIcon, ArrowsPointingOutIcon, FunnelIcon, LinkIcon,
  MagnifyingGlassIcon, MinusIcon, PlusIcon, XMarkIcon,
} from "@heroicons/react/24/outline";
import { Modal as Sheet } from "../../components/ui/kit";
import { useIsMobile } from "@/hooks/useIsMobile";
import { knowledgeApi } from "../../api/enterpriseApi";
import { useEnterprise } from "../../context/enterprise-context";
import { useLanguage } from "../../../context/language-context";
import { apiErrorMessage } from "@/utils/apiError";

// Node and edge styles. "document" nodes are the processes (shown as "Process").
const TYPES = {
  concept:    { color: "#3B6FE0", glyph: "C" },
  procedure:  { color: "#E2620A", glyph: "Pr" },
  regulation: { color: "#D92D20", glyph: "Rg" },
  skill:      { color: "#15A34A", glyph: "S" },
  topic:      { color: "#8B3FE0", glyph: "T" },
  rule:       { color: "#5F6672", glyph: "R" },
  document:   { color: "#0E9AB8", glyph: "P" },
};
const NODE_TYPES = Object.keys(TYPES);
const FALLBACK_COLOR = "#64748B";

const EDGES = {
  requires:    { color: "#2563EB", dash: "" },
  related_to:  { color: "#A3ADC2", dash: "" },
  extends:     { color: "#15A34A", dash: "" },
  depends_on:  { color: "#E2620A", dash: "6 3" },
  supersedes:  { color: "#5F6672", dash: "2 3" },
  contradicts: { color: "#E11D48", dash: "8 3 2 3" },
};
const EDGE_TYPES = Object.keys(EDGES);
const edgeStyle = (type) => EDGES[type] || EDGES.related_to;

function useNodeTypeLabels() {
  const { t } = useLanguage();
  return Object.fromEntries(NODE_TYPES.map((k) => [k, t(`enterprise.knowledge.graph.nodeTypes.${k}`)]));
}

function useEdgeTypeLabels() {
  const { t } = useLanguage();
  const key = { requires: "requires", related_to: "relatedTo", extends: "extends", depends_on: "dependsOn", supersedes: "supersedes", contradicts: "contradicts" };
  return Object.fromEntries(EDGE_TYPES.map((k) => [k, t(`enterprise.knowledge.graph.edgeTypes.${key[k]}`)]));
}

// The API sends source_node_id/target_node_id; older payloads used source_id/source.
export const edgeEnds = (e) => [e.source_node_id ?? e.source_id ?? e.source, e.target_node_id ?? e.target_id ?? e.target];
// importance_score is 0-100 from the API; the drawing works with 0-1.
export const importanceOf = (n) => {
  const v = Number(n.importance_score ?? 50);
  return Math.max(0, Math.min(1, v > 1 ? v / 100 : v));
};

const isProcess = (n) => n.node_type === "document";
export const nodeRadius = (n, deg) => (isProcess(n) ? 15 + Math.sqrt(deg) * 2.5 : 6 + Math.sqrt(deg) * 3.2);
const isHub = (n, deg) => deg >= 4 || isProcess(n);
const trunc = (s = "", max = 24) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const sourceKey = (n) => String(n.source_id ?? "none");

/**
 * Force layout: every process (knowledge source) gets its own area, hubs push harder
 * and keep more room around them. Deterministic (d3 places nodes on a phyllotaxis),
 * so the same graph always gets the same picture. Returns { id: {x, y} } around 0,0.
 */
export function layoutGraph(nodes, edges, degree) {
  if (!nodes.length) return {};
  const simNodes = nodes.map((n) => ({ id: n.id, n, deg: degree[n.id] || 0, key: sourceKey(n) }));
  const keys = [...new Set(simNodes.map((d) => d.key))];
  const spread = 1.25 + Math.max(0, keys.length - 3) * 0.2;
  const centers = Object.fromEntries(keys.map((k, i) => {
    if (keys.length === 1) return [k, [0, 0]];
    const a = -Math.PI / 2 + (2 * Math.PI * i) / keys.length;
    return [k, [Math.cos(a) * 420 * spread, Math.sin(a) * 300 * spread]];
  }));
  const hub = (d) => isHub(d.n, d.deg);
  const radius = (d) => nodeRadius(d.n, d.deg);
  const links = edges.map((e) => ({ source: e.s, target: e.t }));
  const sim = forceSimulation(simNodes)
    .force("link", forceLink(links).id((d) => d.id).distance((l) => (hub(l.source) && hub(l.target) ? 140 : 58)).strength(0.7))
    .force("charge", forceManyBody().strength((d) => (hub(d) ? -600 : -140)).distanceMax(420))
    .force("collide", forceCollide((d) => radius(d) + (hub(d) ? 26 : 14)).iterations(2))
    .force("x", forceX((d) => centers[d.key][0]).strength(0.13))
    .force("y", forceY((d) => centers[d.key][1]).strength(0.13))
    .stop();
  for (let i = 0; i < 300; i++) sim.tick();
  return Object.fromEntries(simNodes.map((d) => [d.id, { x: d.x, y: d.y }]));
}

// Colors of the page (light enterprise theme) as literal values, so the exported PNG
// looks like the screen.
function readTheme() {
  const cs = typeof window !== "undefined" ? getComputedStyle(document.documentElement) : null;
  const v = (name, fallback) => (cs && cs.getPropertyValue(name).trim()) || fallback;
  return {
    text: v("--text-primary", "#0F172A"),
    muted: v("--text-tertiary", "#64748B"),
    canvas: v("--bg-elevated", "#F8FAFC"),
    accent: v("--accent", "#4F46E5"),
  };
}

const PAD_TOP = 48;
const DIM = 0.12;

export function KnowledgeGraph() {
  const { activeCompanyId, role, isPlatformAdmin } = useEnterprise();
  // Same roles the backend accepts for /knowledge-graph/rebuild/.
  const canRebuild = isPlatformAdmin || ["owner", "admin", "manager", "trainer"].includes(role);
  const { t } = useLanguage();
  const navigate = useNavigate();
  const TYPE_LABELS = useNodeTypeLabels();
  const EDGE_LABELS = useEdgeTypeLabels();
  const typeLabel = (n) => TYPE_LABELS[n.node_type] || n.node_type;
  const isMobile = useIsMobile();

  const [graph, setGraph] = useState(null);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rebuilding, setRebuilding] = useState(false);
  const [types, setTypes] = useState(() => new Set(NODE_TYPES));
  const [source, setSource] = useState("");
  const [labelMode, setLabelMode] = useState("auto");
  const [positions, setPositions] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [hoverId, setHoverId] = useState(null);
  const [tip, setTip] = useState(null);
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const [size, setSize] = useState({ w: 900, h: 560 });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeResult, setActiveResult] = useState(0);
  const [searchFocused, setSearchFocused] = useState(false);
  const [theme, setTheme] = useState(readTheme);

  const svgRef = useRef(null);
  const canvasRef = useRef(null);
  const searchRef = useRef(null);
  const viewRef = useRef(view);
  viewRef.current = view;
  const animRef = useRef(0);
  const gesture = useRef(null);
  const suppressClick = useRef(false);
  const pointers = useRef(new Map());

  // The enterprise layout switches html to the light theme after this page mounts:
  // read the colors again whenever the html class changes.
  useEffect(() => {
    setTheme(readTheme());
    if (typeof MutationObserver !== "function") return undefined;
    const mo = new MutationObserver(() => setTheme(readTheme()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] });
    return () => mo.disconnect();
  }, []);

  // ── data ────────────────────────────────────────────────────────────────
  const loadGraph = useCallback(() => {
    setLoading(true);
    setError(null);
    return Promise.all([knowledgeApi.getGraph({}), knowledgeApi.list({})])
      .then(([g, ksResp]) => {
        setGraph(g);
        setSources(ksResp.results || ksResp || []);
        setSelectedId(null);
      })
      .catch((err) => { setGraph(null); setError(apiErrorMessage(err, t("enterprise.knowledge.graph.loadError"))); })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompanyId]);

  useEffect(() => { loadGraph(); }, [loadGraph]);

  // Refresh = rebuild the structure graph (trainer role or higher), then reload.
  // Other viewers get a plain reload.
  const refresh = async () => {
    if (canRebuild) {
      setRebuilding(true);
      try {
        await knowledgeApi.rebuildGraph(source ? { knowledge_source_id: source } : {});
      } catch (err) {
        setRebuilding(false);
        setError(apiErrorMessage(err, t("enterprise.knowledge.graph.loadError")));
        return;
      }
      setRebuilding(false);
    }
    loadGraph();
  };

  const { nodes, edges, byId, degree, neighbors } = useMemo(() => {
    const list = graph?.nodes || [];
    const ids = new Set(list.map((n) => n.id));
    const es = (graph?.edges || graph?.relationships || [])
      .map((e, i) => { const [s, tg] = edgeEnds(e); return { key: e.id ?? i, s, t: tg, type: e.relationship_type }; })
      .filter((e) => ids.has(e.s) && ids.has(e.t) && e.s !== e.t);
    const deg = {}; const nb = {};
    list.forEach((n) => { deg[n.id] = 0; nb[n.id] = new Set(); });
    es.forEach((e) => { deg[e.s]++; deg[e.t]++; nb[e.s].add(e.t); nb[e.t].add(e.s); });
    return { nodes: list, edges: es, byId: new Map(list.map((n) => [n.id, n])), degree: deg, neighbors: nb };
  }, [graph]);

  // Lay out every node once per graph, so filters never move anything.
  useEffect(() => { setPositions(layoutGraph(nodes, edges, degree)); }, [nodes, edges, degree]);

  const sourceTitle = useCallback((key) => {
    const s = sources.find((x) => String(x.id) === String(key));
    return s?.title || t("enterprise.knowledge.graph.unknownSource", { id: key });
  }, [sources, t]);

  const sourceOptions = useMemo(() => {
    const counts = {};
    nodes.forEach((n) => { if (n.source_id != null) counts[sourceKey(n)] = (counts[sourceKey(n)] || 0) + 1; });
    return Object.entries(counts).map(([key, count]) => ({ key, count, title: sourceTitle(key) }))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [nodes, sourceTitle]);

  const typeCounts = useMemo(() => {
    const c = {};
    nodes.forEach((n) => { c[n.node_type] = (c[n.node_type] || 0) + 1; });
    return c;
  }, [nodes]);

  const isVisible = useCallback((n) => (!TYPES[n.node_type] || types.has(n.node_type)) && (!source || sourceKey(n) === source), [types, source]);
  const visibleNodes = useMemo(() => nodes.filter(isVisible), [nodes, isVisible]);
  const visibleIds = useMemo(() => new Set(visibleNodes.map((n) => n.id)), [visibleNodes]);
  const visibleEdges = useMemo(() => edges.filter((e) => visibleIds.has(e.s) && visibleIds.has(e.t)), [edges, visibleIds]);

  const selected = selectedId != null && visibleIds.has(selectedId) ? byId.get(selectedId) : null;
  const focusId = hoverId ?? selected?.id ?? null;
  const focusSet = focusId != null ? new Set([focusId, ...(neighbors[focusId] || [])]) : null;

  // ── view (pan / zoom) ──────────────────────────────────────────────────
  const animateTo = useCallback((target, ms = 420) => {
    cancelAnimationFrame(animRef.current);
    const from = viewRef.current;
    if (!ms || typeof requestAnimationFrame !== "function") { setView(target); return; }
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / ms);
      const e = 1 - (1 - p) ** 3;
      setView({ x: from.x + (target.x - from.x) * e, y: from.y + (target.y - from.y) * e, k: from.k + (target.k - from.k) * e });
      if (p < 1) animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
  }, []);
  useEffect(() => () => cancelAnimationFrame(animRef.current), []);

  const padBottom = isMobile ? 64 : 96;
  const fit = useCallback((animate = true) => {
    const pts = visibleNodes.map((n) => positions[n.id]).filter(Boolean);
    if (!pts.length) return;
    const { w, h } = size;
    const xs = pts.map((p) => p.x); const ys = pts.map((p) => p.y);
    const x0 = Math.min(...xs) - 70, x1 = Math.max(...xs) + 70, y0 = Math.min(...ys) - 70, y1 = Math.max(...ys) + 90;
    const k = Math.min(2, 0.96 * Math.min(w / (x1 - x0), (h - PAD_TOP - padBottom) / (y1 - y0)));
    const target = { x: w / 2 - (k * (x0 + x1)) / 2, y: PAD_TOP + (h - PAD_TOP - padBottom) / 2 - (k * (y0 + y1)) / 2, k };
    if (animate) animateTo(target); else { cancelAnimationFrame(animRef.current); setView(target); }
  }, [visibleNodes, positions, size, padBottom, animateTo]);

  // Fit on a new layout, a new source filter and canvas resizes.
  const fitRef = useRef(fit);
  fitRef.current = fit;
  useEffect(() => { fitRef.current(false); }, [positions, size.w, size.h]);
  useEffect(() => { fitRef.current(true); }, [source]);

  const canvasShown = nodes.length > 0;
  useLayoutEffect(() => {
    const el = canvasRef.current;
    if (!el) return undefined;
    const measure = () => { const r = el.getBoundingClientRect(); if (r.width && r.height) setSize({ w: r.width, h: r.height }); };
    measure();
    if (typeof ResizeObserver !== "function") return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [canvasShown]);

  const zoomAt = useCallback((factor, px, py, animate = false) => {
    const v = viewRef.current;
    const k = clamp(v.k * factor, 0.25, 4);
    const cx = px ?? size.w / 2, cy = py ?? size.h / 2;
    const target = { k, x: cx - ((cx - v.x) * k) / v.k, y: cy - ((cy - v.y) * k) / v.k };
    if (animate) animateTo(target, 250); else setView(target);
  }, [size, animateTo]);

  // Non-passive wheel listener so the page doesn't scroll while zooming the graph.
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      cancelAnimationFrame(animRef.current);
      const r = el.getBoundingClientRect();
      zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  });

  const select = useCallback((n) => {
    setSelectedId(n ? n.id : null);
    setTip(null);
    if (!n) return;
    const p = positions[n.id];
    if (!p) return;
    const k = Math.max(viewRef.current.k, 1.6);
    animateTo({ x: size.w / 2 - k * p.x, y: size.h / 2 - k * p.y, k });
  }, [positions, size, animateTo]);

  // Pointer gestures: drag the background to pan, drag a node to move it, two
  // fingers to pinch-zoom. Window listeners (no pointer capture) keep clicks on nodes.
  const localPoint = (e) => {
    const r = svgRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  useEffect(() => {
    const move = (e) => {
      const g = gesture.current;
      if (!g) return;
      if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (g.mode === "pinch") {
        const [a, b] = [...pointers.current.values()];
        if (!a || !b) return;
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const r = svgRef.current.getBoundingClientRect();
        const cx = (a.x + b.x) / 2 - r.left, cy = (a.y + b.y) / 2 - r.top;
        const k = clamp((g.k0 * d) / g.d0, 0.25, 4);
        setView({ k, x: cx - ((g.cx - g.v.x) * k) / g.v.k, y: cy - ((g.cy - g.v.y) * k) / g.v.k });
        return;
      }
      const dx = e.clientX - g.x0, dy = e.clientY - g.y0;
      if (!g.moved && Math.hypot(dx, dy) < 4) return;
      g.moved = true;
      if (g.mode === "pan") setView({ ...g.v, x: g.v.x + dx, y: g.v.y + dy });
      else if (g.mode === "node") {
        const k = viewRef.current.k;
        setPositions((prev) => ({ ...prev, [g.id]: { x: g.p.x + dx / k, y: g.p.y + dy / k } }));
      }
    };
    const up = (e) => {
      pointers.current.delete(e.pointerId);
      const g = gesture.current;
      if (!g) return;
      if (g.mode === "pinch") { gesture.current = null; suppressClick.current = true; return; }
      suppressClick.current = g.moved;
      gesture.current = null;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, []);

  const onPointerDown = (e, node) => {
    if (e.button != null && e.button !== 0) return;
    cancelAnimationFrame(animRef.current);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const r = svgRef.current.getBoundingClientRect();
      gesture.current = { mode: "pinch", d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, k0: viewRef.current.k, v: viewRef.current, cx: (a.x + b.x) / 2 - r.left, cy: (a.y + b.y) / 2 - r.top };
      return;
    }
    suppressClick.current = false;
    gesture.current = node
      ? { mode: "node", id: node.id, p: positions[node.id], x0: e.clientX, y0: e.clientY, moved: false }
      : { mode: "pan", v: viewRef.current, x0: e.clientX, y0: e.clientY, moved: false };
    if (node) e.stopPropagation();
  };

  const onNodeClick = (e, n) => {
    e.stopPropagation();
    if (suppressClick.current) { suppressClick.current = false; return; }
    select(n);
  };
  const onBackgroundClick = () => {
    if (suppressClick.current) { suppressClick.current = false; return; }
    select(null);
  };

  const showTip = (e, n) => {
    if (!canvasRef.current) return;
    const r = canvasRef.current.getBoundingClientRect();
    let x = e.clientX - r.left + 14;
    const y = e.clientY - r.top + 14;
    if (x + 270 > r.width) x -= 290;
    setTip({ x, y, n });
  };

  // ── search ─────────────────────────────────────────────────────────────
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? visibleNodes.filter((n) => (n.title || "").toLowerCase().includes(q)).slice(0, 8) : [];
  }, [query, visibleNodes]);
  const pick = (n) => { setQuery(""); setActiveResult(0); select(n); };
  const onSearchKey = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveResult((i) => Math.min(i + 1, matches.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActiveResult((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && matches[activeResult]) pick(matches[activeResult]);
    if (e.key === "Escape") setQuery("");
  };
  useEffect(() => {
    const onKey = (e) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || "");
      if (e.key === "/" && !typing) { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === "Escape" && !typing) setSelectedId(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // ── export ─────────────────────────────────────────────────────────────
  const exportPng = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const { w, h } = size;
    const clone = svg.cloneNode(true);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", w);
    clone.setAttribute("height", h);
    const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bg.setAttribute("width", "100%"); bg.setAttribute("height", "100%"); bg.setAttribute("fill", theme.canvas);
    clone.insertBefore(bg, clone.firstChild);
    const img = new Image();
    img.onload = () => {
      const scale = 2;
      const canvas = document.createElement("canvas");
      canvas.width = w * scale; canvas.height = h * scale;
      const ctx = canvas.getContext("2d");
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "knowledge-graph.png";
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      });
    };
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(clone))}`;
  };

  // ── drawing helpers ────────────────────────────────────────────────────
  const inv = 1 / clamp(view.k, 0.55, 1.6);
  const radiusOf = (n) => nodeRadius(n, degree[n.id] || 0);
  const hubOf = (n) => isHub(n, degree[n.id] || 0);
  const colorOf = (n) => TYPES[n.node_type]?.color || FALLBACK_COLOR;
  const labelShown = (n) => {
    if (labelMode === "all") return true;
    if (focusSet) return focusSet.has(n.id);
    return hubOf(n) || view.k >= 1.5;
  };
  const linkPath = (e) => {
    const a = positions[e.s], b = positions[e.t];
    if (!a || !b) return null;
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
    const rs = radiusOf(byId.get(e.s)), rt = radiusOf(byId.get(e.t)) + (e.type === "related_to" ? 0 : 3);
    return `M${a.x + (dx / d) * rs},${a.y + (dy / d) * rs}L${b.x - (dx / d) * rt},${b.y - (dy / d) * rt}`;
  };
  const hulls = useMemo(() => {
    const groups = {};
    visibleNodes.forEach((n) => {
      const p = positions[n.id];
      if (!p || n.source_id == null) return;
      (groups[sourceKey(n)] ||= []).push(p);
    });
    return Object.entries(groups).map(([key, pts]) => {
      const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y), pad = 46;
      const x = Math.min(...xs) - pad, y = Math.min(...ys) - pad;
      return { key, x, y, w: Math.max(...xs) - x + pad, h: Math.max(...ys) - y + pad };
    });
  }, [visibleNodes, positions]);
  const drawOrder = useMemo(() => [...visibleNodes].sort((a, b) => hubOf(a) - hubOf(b)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visibleNodes, degree]);

  // ── summary ────────────────────────────────────────────────────────────
  const isolated = visibleNodes.filter((n) => !degree[n.id]).length;
  const leaves = visibleNodes.filter((n) => degree[n.id] === 1).length;
  const visibleSources = new Set(visibleNodes.filter((n) => n.source_id != null).map(sourceKey)).size;
  const hubs = [...visibleNodes].sort((a, b) => (degree[b.id] || 0) - (degree[a.id] || 0)).slice(0, 6);
  const visibleTypeCounts = NODE_TYPES.map((k) => [k, visibleNodes.filter((n) => n.node_type === k).length]).filter(([, c]) => c);
  const selectedRelations = selected
    ? EDGE_TYPES.map((type) => [type, visibleEdges.filter((e) => (e.type || "related_to") === type && (e.s === selected.id || e.t === selected.id))]).filter(([, l]) => l.length)
    : [];

  // ── pieces ─────────────────────────────────────────────────────────────
  const pill = (value, label, warn) => (
    <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[12.5px]"
      style={{ background: "var(--bg-surface)", borderColor: warn ? "rgba(226,98,10,0.4)" : "var(--border)", color: "var(--text-secondary)" }}>
      <b style={{ color: "var(--text-primary)", fontWeight: 600 }}>{value}</b>{label}
    </span>
  );

  const chips = (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("enterprise.knowledge.graph.nodeTypesLabel")}>
      {NODE_TYPES.filter((k) => typeCounts[k]).map((k) => {
        const on = types.has(k);
        const c = TYPES[k].color;
        return (
          <button key={k} type="button" aria-pressed={on} data-testid={`type-chip-${k}`}
            onClick={() => setTypes((prev) => { const next = new Set(prev); next.has(k) ? next.delete(k) : next.add(k); return next; })}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-2.5 text-[13px] font-medium transition md:min-h-[32px]"
            style={{
              borderColor: on ? `${c}73` : "var(--border)",
              background: on ? `${c}17` : "var(--bg-surface)",
              color: on ? "var(--text-primary)" : "var(--text-secondary)",
              opacity: on ? 1 : 0.55,
            }}>
            <span className="h-2.5 w-2.5 rounded-full" style={on ? { background: c } : { boxShadow: `inset 0 0 0 2px ${c}` }} />
            {TYPE_LABELS[k]}
            <span className="text-xs tabular-nums" style={{ color: "var(--text-tertiary)" }}>{typeCounts[k]}</span>
          </button>
        );
      })}
    </div>
  );

  const sourceSelect = (
    <label className="flex items-center gap-2 text-[13px]" style={{ color: "var(--text-tertiary)" }}>
      {t("enterprise.knowledge.graph.sourceLabel")}
      <select value={source} onChange={(e) => setSource(e.target.value)} aria-label={t("enterprise.knowledge.graph.knowledgeSourceLabel")}
        className="min-h-[44px] min-w-0 max-w-[260px] rounded-lg border px-2.5 text-[13px] outline-none md:min-h-[36px]"
        style={{ background: "var(--bg-surface)", borderColor: "var(--border)", color: "var(--text-primary)" }}>
        <option value="">{t("enterprise.knowledge.graph.allSources")}</option>
        {sourceOptions.map((s) => <option key={s.key} value={s.key}>{`${s.title} (${s.count})`}</option>)}
      </select>
    </label>
  );

  const labelToggle = (
    <div className="flex items-center gap-2 text-[13px]" style={{ color: "var(--text-tertiary)" }}>
      {t("enterprise.knowledge.graph.labelsLabel")}
      <div className="inline-flex overflow-hidden rounded-lg border" style={{ borderColor: "var(--border)" }}>
        {[["auto", "labelsAuto"], ["all", "labelsAll"]].map(([v, key]) => (
          <button key={v} type="button" aria-pressed={labelMode === v} onClick={() => setLabelMode(v)}
            className="min-h-[44px] px-2.5 text-[13px] md:min-h-[34px]"
            style={labelMode === v
              ? { background: "var(--bg-accent)", color: "var(--text-accent)", fontWeight: 600 }
              : { background: "var(--bg-surface)", color: "var(--text-secondary)" }}>
            {t(`enterprise.knowledge.graph.${key}`)}
          </button>
        ))}
      </div>
    </div>
  );

  const search = (
    <div className="relative min-w-[200px] flex-1 md:max-w-[280px]">
      <MagnifyingGlassIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--text-tertiary)" }} />
      <input ref={searchRef} type="search" value={query} placeholder={t("enterprise.knowledge.graph.searchPlaceholder")}
        aria-label={t("enterprise.knowledge.graph.searchLabel")} role="combobox" aria-expanded={searchFocused && matches.length > 0} aria-controls="kg-results" autoComplete="off"
        onChange={(e) => { setQuery(e.target.value); setActiveResult(0); }} onKeyDown={onSearchKey}
        onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)}
        className="h-11 w-full rounded-lg border pl-8 pr-9 text-[13px] outline-none md:h-9"
        style={{ background: "var(--bg-elevated)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
      <kbd className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border px-1.5 text-[11px] md:block"
        style={{ borderColor: "var(--border)", color: "var(--text-tertiary)", background: "var(--bg-surface)" }}>/</kbd>
      {searchFocused && matches.length > 0 && (
        <div id="kg-results" role="listbox" className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 max-h-[280px] overflow-auto rounded-xl border p-1"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-pop)" }}>
          {matches.map((n, i) => (
            <button key={n.id} type="button" role="option" aria-selected={i === activeResult}
              onMouseDown={(e) => { e.preventDefault(); pick(n); }}
              className="flex min-h-[40px] w-full items-center gap-2 rounded-md px-2 text-left text-[13px]"
              style={{ background: i === activeResult ? "var(--bg-hover)" : "transparent", color: "var(--text-primary)" }}>
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: colorOf(n) }} />
              <span className="truncate">{n.title}</span>
              <small className="ml-auto shrink-0" style={{ color: "var(--text-tertiary)" }}>{typeLabel(n)}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const card = "rounded-xl border";
  const cardStyle = { background: "var(--bg-surface)", borderColor: "var(--border)" };
  const sectionTitle = (text) => (
    <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.05em]" style={{ color: "var(--text-tertiary)" }}>{text}</h3>
  );
  const nodeButton = (n, meta) => (
    <button key={`${n.id}-${meta}`} type="button" onClick={() => select(n)}
      className="flex min-h-[36px] w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-[var(--bg-hover)]"
      style={{ color: "var(--text-primary)" }}>
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: colorOf(n) }} />
      <span className="min-w-0 truncate">{n.title}</span>
      <span className="ml-auto shrink-0 whitespace-nowrap text-[11.5px]" style={{ color: "var(--text-tertiary)" }}>{meta}</span>
    </button>
  );

  const summaryPanel = (
    <>
      <header className="border-b p-4" style={{ borderColor: "var(--border)" }}>
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: "var(--text-tertiary)" }}>{t("enterprise.knowledge.graph.summaryEyebrow")}</div>
        <h2 className="text-base font-semibold leading-snug" style={{ color: "var(--text-primary)" }}>{t("enterprise.knowledge.graph.summaryTitle")}</h2>
      </header>
      <div className="flex flex-col gap-4 overflow-auto p-4">
        <div className="grid grid-cols-2 gap-2">
          {[
            [visibleNodes.length, "statNodes"], [visibleEdges.length, "statRelationships"],
            [visibleNodes.length ? ((2 * visibleEdges.length) / visibleNodes.length).toFixed(1) : "0", "statAvgDegree"], [leaves, "statLeaves"],
          ].map(([v, key]) => (
            <div key={key} className="rounded-lg p-2.5" style={{ background: "var(--bg-elevated)" }}>
              <b className="block text-xl tabular-nums" style={{ color: "var(--text-primary)" }}>{v}</b>
              <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{t(`enterprise.knowledge.graph.${key}`)}</span>
            </div>
          ))}
        </div>
        {visibleTypeCounts.length > 0 && (
          <div>
            {sectionTitle(t("enterprise.knowledge.graph.distribution"))}
            <div className="flex h-2.5 overflow-hidden rounded" style={{ background: "var(--bg-elevated)" }} role="img"
              aria-label={visibleTypeCounts.map(([k, c]) => `${TYPE_LABELS[k]} ${c}`).join(", ")}>
              {visibleTypeCounts.map(([k, c]) => <span key={k} style={{ background: TYPES[k].color, width: `${(c / visibleNodes.length) * 100}%` }} />)}
            </div>
            <div className="mt-2 flex flex-col">
              {visibleTypeCounts.map(([k, c]) => (
                <div key={k} className="flex items-center gap-2 px-2 py-0.5 text-[12.5px]" style={{ color: "var(--text-primary)" }}>
                  <span className="h-2 w-2 rounded-full" style={{ background: TYPES[k].color }} />{TYPE_LABELS[k]}
                  <span className="ml-auto tabular-nums" style={{ color: "var(--text-tertiary)" }}>{c} · {Math.round((c / visibleNodes.length) * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {hubs.length > 0 && (
          <div>
            {sectionTitle(t("enterprise.knowledge.graph.mostConnected"))}
            <div className="flex flex-col gap-0.5">{hubs.map((n) => nodeButton(n, degree[n.id] || 0))}</div>
          </div>
        )}
        {leaves > 0 && (
          <div className="rounded-lg border p-2.5 text-[12.5px]" style={{ background: "rgba(226,98,10,0.06)", borderColor: "rgba(226,98,10,0.25)", color: "var(--text-secondary)" }}>
            <b style={{ color: "var(--text-primary)" }}>{t("enterprise.knowledge.graph.leafNote", { count: leaves, total: visibleNodes.length })}</b>{" "}
            <Link to="/enterprise/learning/gaps" className="underline underline-offset-2">{t("enterprise.knowledge.graph.leafNoteLink")}</Link>
          </div>
        )}
      </div>
    </>
  );

  const detailPanel = selected && (
    <>
      <header className="border-b p-4" style={{ borderColor: "var(--border)" }}>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold"
            style={{ background: `${colorOf(selected)}1F`, color: "var(--text-primary)" }}>
            <i className="h-2 w-2 rounded-full" style={{ background: colorOf(selected) }} />{typeLabel(selected)}
          </span>
          <button type="button" onClick={() => select(null)} aria-label={t("enterprise.knowledge.graph.closeDetail")}
            className="-mr-2 grid h-9 w-9 place-items-center rounded-lg hover:bg-[var(--bg-hover)]" style={{ color: "var(--text-secondary)" }}>
            <XMarkIcon className="h-[18px] w-[18px]" />
          </button>
        </div>
        <h2 className="text-base font-semibold leading-snug [overflow-wrap:anywhere]" style={{ color: "var(--text-primary)" }}>{selected.title}</h2>
      </header>
      <div className="flex flex-col gap-4 overflow-auto p-4">
        {selected.description && <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>{selected.description}</p>}
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[13px]">
          {selected.source_id != null && (<>
            <dt style={{ color: "var(--text-tertiary)" }}>{t("enterprise.knowledge.graph.sourceLabel")}</dt>
            <dd className="text-right font-medium [overflow-wrap:anywhere]" style={{ color: "var(--text-primary)" }}>{sourceTitle(selected.source_id)}</dd>
          </>)}
          <dt style={{ color: "var(--text-tertiary)" }}>{t("enterprise.knowledge.graph.connectionsLabel")}</dt>
          <dd className="text-right font-medium" style={{ color: "var(--text-primary)" }}>{degree[selected.id] || 0}</dd>
        </dl>
        {selected.importance_score != null && (
          <div>
            <div className="mb-1 flex justify-between text-[12px]">
              <span style={{ color: "var(--text-tertiary)" }}>{t("enterprise.knowledge.graph.importance")}</span>
              <span className="font-semibold" style={{ color: "var(--text-accent)" }}>{Math.round(importanceOf(selected) * 100)}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "var(--bg-elevated)" }}>
              <div className="h-full rounded-full" style={{ background: "var(--accent)", width: `${importanceOf(selected) * 100}%` }} />
            </div>
          </div>
        )}
        {selectedRelations.map(([type, list]) => (
          <div key={type}>
            {sectionTitle(`${EDGE_LABELS[type]} · ${list.length}`)}
            <div className="flex flex-col gap-0.5">
              {list.map((e) => {
                const out = e.s === selected.id;
                const other = byId.get(out ? e.t : e.s);
                return other ? nodeButton(other, `${out ? "→" : "←"} ${typeLabel(other)}`) : null;
              })}
            </div>
          </div>
        ))}
      </div>
      {selected.source_id != null && (
        <div className="border-t p-3" style={{ borderColor: "var(--border)" }}>
          <button type="button" onClick={() => navigate(`/enterprise/knowledge/${selected.source_id}`)}
            className="ank-btn-ghost min-h-[44px] w-full justify-center text-xs md:min-h-[36px]">
            {t("enterprise.knowledge.graph.openSource")}
          </button>
        </div>
      )}
    </>
  );

  const overlay = "absolute rounded-[10px] border backdrop-blur-md";
  const overlayStyle = { background: "color-mix(in srgb, var(--bg-surface) 92%, transparent)", borderColor: "var(--border)", boxShadow: "var(--shadow-card)" };
  const zoomBtn = "grid h-11 w-11 place-items-center rounded-md hover:bg-[var(--bg-hover)] md:h-9 md:w-9";

  return (
    <div className="flex flex-col gap-3.5">
      {isMobile && filtersOpen && (
        <Sheet title={t("enterprise.knowledge.graph.filters")} onClose={() => setFiltersOpen(false)}>
          <div className="flex flex-col gap-4">{chips}{sourceSelect}{labelToggle}</div>
        </Sheet>
      )}
      {isMobile && selected && (
        <Sheet title={selected.title} onClose={() => select(null)}>
          <div className="-mx-5 -my-5 flex flex-col [&>header]:hidden">{detailPanel}</div>
        </Sheet>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0">
          <h1 style={{ color: "var(--text-primary)", fontSize: 22, fontWeight: 700, letterSpacing: "-0.01em" }}>{t("enterprise.knowledge.graph.title")}</h1>
          <div className="mt-1.5 flex flex-wrap gap-1.5" data-testid="graph-stats">
            {pill(visibleNodes.length, t("enterprise.knowledge.graph.nodesPill"))}
            {pill(visibleEdges.length, t("enterprise.knowledge.graph.relationshipsPill"))}
            {pill(visibleSources, t("enterprise.knowledge.graph.sourcesPill"))}
            {pill(isolated, t("enterprise.knowledge.graph.isolatedPill"), isolated > 0)}
          </div>
        </div>
        <div className="flex-1" />
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setFiltersOpen(true)} className="ank-btn-ghost min-h-[44px] text-xs md:hidden" data-testid="graph-filters">
            <FunnelIcon className="h-4 w-4" /> {t("enterprise.knowledge.graph.filters")}
          </button>
          <button type="button" onClick={exportPng} disabled={!visibleNodes.length} className="ank-btn-ghost min-h-[44px] text-xs md:min-h-[36px]" style={{ opacity: visibleNodes.length ? 1 : 0.5 }}>
            <ArrowDownTrayIcon className="h-4 w-4" /> <span className="hidden sm:inline">{t("enterprise.knowledge.graph.exportPng")}</span>
          </button>
          <button type="button" onClick={refresh} disabled={loading || rebuilding} className="ank-btn-ghost min-h-[44px] text-xs md:min-h-[36px]" style={{ opacity: loading || rebuilding ? 0.6 : 1 }}>
            <ArrowPathIcon className={`h-4 w-4 ${loading || rebuilding ? "animate-spin" : ""}`} /> {t("enterprise.knowledge.graph.refresh")}
          </button>
        </div>
      </div>

      {/* Toolbar (phones: search only, the rest in the Filters sheet) */}
      <div className={`${card} flex flex-wrap items-center gap-2.5 px-3 py-2.5`} style={cardStyle}>
        {search}
        <div className="hidden h-6 w-px md:block" style={{ background: "var(--border)" }} />
        <div className="hidden md:contents">
          {chips}
          <div className="h-6 w-px" style={{ background: "var(--border)" }} />
          {sourceSelect}
          {labelToggle}
        </div>
      </div>

      {error && !loading && (
        <div role="alert" className="rounded-xl border p-4 text-[13px]" style={{ background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.25)", color: "var(--error)" }}>{error}</div>
      )}

      {!loading && !error && !nodes.length ? (
        <div className={`${card} flex h-96 flex-col items-center justify-center gap-2.5`} style={{ ...cardStyle, color: "var(--text-tertiary)" }}>
          <LinkIcon className="h-10 w-10 opacity-30" />
          <p className="text-[13px] font-semibold">{t("enterprise.knowledge.graph.noData")}</p>
          <p className="px-4 text-center text-xs">{t("enterprise.knowledge.graph.noDataHint")}</p>
        </div>
      ) : (
        <div className="grid gap-3.5 xl:grid-cols-[minmax(0,1fr)_320px]">
          {/* Canvas */}
          <section ref={canvasRef} aria-label={t("enterprise.knowledge.graph.canvasLabel")}
            className={`${card} relative h-[calc(100dvh-280px)] min-h-[340px] overflow-hidden md:h-[calc(100dvh-320px)] md:min-h-[480px]`}
            style={{ ...cardStyle, background: theme.canvas, backgroundImage: "radial-gradient(var(--border) 1px, transparent 1px)", backgroundSize: "22px 22px" }}>
            {loading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center gap-2.5" style={{ background: "color-mix(in srgb, var(--bg-surface) 70%, transparent)", color: "var(--text-secondary)" }}>
                <ArrowPathIcon className="h-5 w-5 animate-spin" />
                <span className="text-[13px]">{t("enterprise.knowledge.graph.computingLayout")}</span>
              </div>
            )}
            {nodes.length > 0 && (
              <svg ref={svgRef} data-testid="knowledge-graph" role="img" aria-label={t("enterprise.knowledge.graph.canvasLabel")}
                width="100%" height="100%" className="absolute inset-0 block touch-none select-none"
                style={{ cursor: gesture.current?.mode === "pan" ? "grabbing" : "grab", fontFamily: "Inter, system-ui, sans-serif" }}
                onPointerDown={(e) => onPointerDown(e, null)} onClick={onBackgroundClick}>
                <defs>
                  {EDGE_TYPES.map((k) => (
                    <marker key={k} id={`kg-arrow-${k}`} viewBox="0 -4 8 8" refX="8" refY="0" markerWidth="7" markerHeight="7" orient="auto">
                      <path d="M0,-4L8,0L0,4" fill={EDGES[k].color} />
                    </marker>
                  ))}
                </defs>
                <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
                  <g>
                    {hulls.map((hl) => (
                      <g key={hl.key}>
                        <rect x={hl.x} y={hl.y} width={hl.w} height={hl.h} rx={22} fill={theme.muted} fillOpacity={0.035}
                          stroke={theme.muted} strokeOpacity={0.22} strokeDasharray="4 4" />
                        <text x={hl.x + 16} y={hl.y + 22} fontSize={11 * inv} fontWeight={600} letterSpacing="0.06em" fill={theme.muted}>
                          {trunc(sourceTitle(hl.key), 40).toUpperCase()}
                        </text>
                      </g>
                    ))}
                  </g>
                  <g>
                    {visibleEdges.map((e) => {
                      const d = linkPath(e);
                      if (!d) return null;
                      const st = edgeStyle(e.type);
                      const related = !e.type || e.type === "related_to";
                      const dim = focusId != null && e.s !== focusId && e.t !== focusId;
                      return (
                        <path key={e.key} d={d} className="kg-link" data-edge-type={e.type} fill="none" stroke={st.color}
                          strokeWidth={related ? 1.3 : 2} strokeDasharray={st.dash || undefined}
                          markerEnd={related ? undefined : `url(#kg-arrow-${EDGES[e.type] ? e.type : "related_to"})`}
                          opacity={dim ? DIM : 1} style={{ transition: "opacity .2s" }} />
                      );
                    })}
                  </g>
                  <g>
                    {drawOrder.map((n) => {
                      const p = positions[n.id];
                      if (!p) return null;
                      const r = radiusOf(n);
                      const hub = hubOf(n);
                      const isSel = selected?.id === n.id;
                      const dim = focusSet && !focusSet.has(n.id);
                      return (
                        <g key={n.id} data-node-title={n.title} transform={`translate(${p.x},${p.y})`}
                          tabIndex={0} role="button" aria-label={t("enterprise.knowledge.graph.nodeAria", { title: n.title, type: typeLabel(n), count: degree[n.id] || 0 })}
                          className="cursor-pointer outline-none" opacity={dim ? DIM : 1} style={{ transition: "opacity .2s" }}
                          onPointerDown={(e) => onPointerDown(e, n)} onClick={(e) => onNodeClick(e, n)}
                          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(n); } }}
                          onMouseEnter={(e) => { setHoverId(n.id); showTip(e, n); }} onMouseMove={(e) => showTip(e, n)}
                          onMouseLeave={() => { setHoverId(null); setTip(null); }}
                          onFocus={() => setHoverId(n.id)} onBlur={() => setHoverId(null)}>
                          <circle r={r + 5} fill="none" stroke={theme.accent} strokeWidth={2.5} opacity={isSel ? 1 : 0} />
                          <circle r={r} fill={colorOf(n)} stroke={theme.canvas} strokeWidth={2.5} />
                          {r >= 11 && (
                            <text textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={700} fill="#fff" pointerEvents="none">
                              {TYPES[n.node_type]?.glyph || "•"}
                            </text>
                          )}
                          {labelShown(n) && (
                            <text textAnchor="middle" y={r + 4} dy="1em" pointerEvents="none"
                              fontSize={(hub ? 13 : 11.5) * inv} fontWeight={hub ? 600 : 500} fill={theme.text}
                              stroke={theme.canvas} strokeWidth={4 * inv} strokeLinejoin="round" paintOrder="stroke">
                              {trunc(n.title, hub ? 30 : 24)}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </g>
                </g>
              </svg>
            )}

            {nodes.length > 0 && !visibleNodes.length && !loading && (
              <p className="absolute inset-x-0 top-1/2 text-center text-[13px]" style={{ color: "var(--text-tertiary)" }}>{t("enterprise.knowledge.graph.noData")}</p>
            )}

            <div className={`${overlay} right-3 top-3 hidden px-2.5 py-1.5 text-xs md:block`} style={{ ...overlayStyle, color: "var(--text-tertiary)" }}>
              {t("enterprise.knowledge.graph.hint")}
            </div>

            {tip && (
              <div className={`${overlay} pointer-events-none z-[5] max-w-[260px] px-2.5 py-2 text-[12.5px]`} style={{ ...overlayStyle, left: tip.x, top: tip.y }}>
                <b className="block text-[13px]" style={{ color: "var(--text-primary)" }}>{tip.n.title}</b>
                <span style={{ color: "var(--text-tertiary)" }}>
                  {typeLabel(tip.n)} · {t("enterprise.knowledge.graph.connectionsCount", { count: degree[tip.n.id] || 0 })}
                  {tip.n.source_id != null ? ` · ${sourceTitle(tip.n.source_id)}` : ""}
                </span>
              </div>
            )}

            <div className={`${overlay} bottom-3 left-3 grid max-w-[calc(100%-90px)] gap-1 px-3 py-2 text-xs`} style={{ ...overlayStyle, color: "var(--text-secondary)" }} aria-label={t("enterprise.knowledge.graph.legendRelations")}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.05em]" style={{ color: "var(--text-tertiary)" }}>{t("enterprise.knowledge.graph.legendRelations")}</span>
                {EDGE_TYPES.map((k) => (
                  <span key={k} className="inline-flex items-center gap-1.5">
                    <svg width="26" height="8" aria-hidden="true"><line x1="1" y1="4" x2="25" y2="4" stroke={EDGES[k].color} strokeWidth="2.2" strokeDasharray={EDGES[k].dash || undefined} /></svg>
                    {EDGE_LABELS[k]}
                  </span>
                ))}
              </div>
              <div className="hidden flex-wrap items-center gap-3 md:flex">
                <span className="text-[11px] font-semibold uppercase tracking-[0.05em]" style={{ color: "var(--text-tertiary)" }}>{t("enterprise.knowledge.graph.legendSize")}</span>
                <span className="inline-flex items-center gap-1.5">
                  <svg width="34" height="14" aria-hidden="true"><circle cx="5" cy="7" r="4" fill={theme.muted} /><circle cx="23" cy="7" r="7" fill={theme.muted} /></svg>
                  {t("enterprise.knowledge.graph.legendSizeHint")}
                </span>
              </div>
            </div>

            <div className={`${overlay} bottom-3 right-3 flex flex-col p-1`} style={{ ...overlayStyle, color: "var(--text-secondary)" }} role="group">
              <button type="button" data-testid="zoom-in" aria-label={t("enterprise.knowledge.graph.zoomIn")} onClick={() => zoomAt(1.3, null, null, true)} className={zoomBtn}><PlusIcon className="h-[18px] w-[18px]" /></button>
              <button type="button" data-testid="zoom-out" aria-label={t("enterprise.knowledge.graph.zoomOut")} onClick={() => zoomAt(1 / 1.3, null, null, true)} className={zoomBtn}><MinusIcon className="h-[18px] w-[18px]" /></button>
              <hr className="mx-1 my-0.5" style={{ borderColor: "var(--border)" }} />
              <button type="button" data-testid="zoom-fit" aria-label={t("enterprise.knowledge.graph.fitView")} onClick={() => fit(true)} className={zoomBtn}><ArrowsPointingOutIcon className="h-[18px] w-[18px]" /></button>
            </div>
          </section>

          {/* Inspector (phones: the node detail opens in a sheet) */}
          <aside aria-live="polite" data-testid="graph-inspector"
            className={`${card} hidden min-h-0 flex-col overflow-hidden md:flex xl:h-[calc(100dvh-320px)] xl:min-h-[480px]`} style={cardStyle}>
            {selected ? detailPanel : summaryPanel}
          </aside>
        </div>
      )}
    </div>
  );
}

export default KnowledgeGraph;
