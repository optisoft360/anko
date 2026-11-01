import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowPathIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";
import GlobalCrudPage from "@/widgets/GlobalCrudPage";
import { useLanguage } from "@/context/language-context";
import projectService from "@/services/projectService";
import { Badge, BTN_PRIMARY, BTN_SECONDARY, Card, EmptyBlock, FOCUS, PageHeader, Segmented, SkeletonRows, Spinner, TextInput } from "@/enterprise/components/ui/kit";
import { AdminModal } from "@/widgets/admin/AdminModal";
import { BooleanBadge, DASH, EntityCell } from "@/widgets/admin/cells";
import { fetchAll } from "@/widgets/admin/fetchAll";
import { fieldErrors } from "@/widgets/admin/format";

const UNLIMITED = 99999; // seeded sentinel: anything at or above it means no practical limit
const humanize = (key) => String(key || "").replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
const hasValue = (lim) => { const v = valueOf(lim); return !(v === null || v === undefined || v === ""); };
const valueOf = (lim) => (lim.value_type === "bool" ? lim.bool_value : lim.value_type === "str" ? lim.str_value : lim.int_value);

function LimitValue({ lim }) {
  const { t } = useLanguage();
  if (!lim) return DASH;
  if (lim.value_type === "bool") return <BooleanBadge value={lim.bool_value} />;
  const v = valueOf(lim);
  if (v === null || v === undefined || v === "") return <span title={t("admin.pages.planLimits.notSetUnknown")}>{DASH}</span>;
  if (lim.value_type === "int" && Number(v) >= UNLIMITED) {
    return <span title={String(v)}><Badge tone="indigo">{t("admin.pages.planLimits.unlimited")}</Badge></span>;
  }
  return <span className="tabular-nums">{String(v)}</span>;
}

function EditLimit({ lim, planName, onClose, onSaved }) {
  // lim without id = "Add": creates the PlanLimit row for this plan and key.
  const { t } = useLanguage();
  const k = (key, params) => t(`admin.pages.planLimits.${key}`, params);
  const [value, setValue] = useState(valueOf(lim) ?? (lim.value_type === "bool" ? false : ""));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const field = lim.value_type === "bool" ? "bool_value" : lim.value_type === "str" ? "str_value" : "int_value";
  const save = async () => {
    setSaving(true); setError("");
    try {
      const v = lim.value_type === "int" ? (value === "" ? null : Number(value)) : value;
      if (lim.id) await projectService.updateItem("plan-limits", lim.id, { [field]: v });
      else await projectService.createItem("plan-limits", { plan: lim.plan, key: lim.key, value_type: lim.value_type, [field]: v });
      onSaved();
    } catch (err) {
      const fe = fieldErrors(err?.response?.data ?? err);
      setError(fe[field] || fe._ || t("admin.toast.error"));
      setSaving(false);
    }
  };
  return (
    <AdminModal title={`${humanize(lim.key)} · ${planName}`} onClose={onClose} width="max-w-sm"
      footer={<>
        <button type="button" onClick={onClose} disabled={saving} className={BTN_SECONDARY}>{t("admin.modal.cancel")}</button>
        <button type="button" onClick={save} disabled={saving} className={BTN_PRIMARY}>{saving && <Spinner className="!h-4 !w-4 border-white/40 border-t-white" />}{t("admin.modal.save")}</button>
      </>}>
      {lim.value_type === "bool" ? (
        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#E2E8F0] px-3 py-2.5">
          <input type="checkbox" checked={Boolean(value)} onChange={(e) => setValue(e.target.checked)} className="h-4 w-4 accent-[#4F46E5]" />
          <span className="text-sm text-[#334155]">{k("enabled")}</span>
        </label>
      ) : (
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-[#334155]">{k("value")}</span>
          <TextInput type={lim.value_type === "int" ? "number" : "text"} value={value ?? ""} onChange={(e) => setValue(e.target.value)} />
        </label>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-[#BE123C]">{error}</p>}
    </AdminModal>
  );
}

function LimitsMatrix() {
  const { t } = useLanguage();
  const k = (key, params) => t(`admin.pages.planLimits.${key}`, params);
  const [state, setState] = useState("loading");
  const [plans, setPlans] = useState([]);
  const [limits, setLimits] = useState([]);
  const [editing, setEditing] = useState(null);
  const [reload, setReload] = useState(0);
  const [defaults, setDefaults] = useState(null); // null = older API without /defaults/

  useEffect(() => {
    let alive = true;
    setState("loading");
    Promise.all([fetchAll("plans"), fetchAll("plan-limits"), projectService.getList("plan-limits/defaults").catch(() => null)])
      .then(([p, l, d]) => {
        if (!alive) return;
        setPlans([...p].sort((a, b) => (a.price_cents || 0) - (b.price_cents || 0)));
        setLimits(l);
        setDefaults(d?.keys || null);
        setState("ready");
      })
      .catch(() => alive && setState("error"));
    return () => { alive = false; };
  }, [reload]);

  const rows = useMemo(() => {
    const byKey = new Map();
    Object.keys(defaults || {}).forEach((key) => byKey.set(key, {})); // enforced limits even without rows
    limits.forEach((l) => {
      if (!byKey.has(l.key)) byKey.set(l.key, {});
      byKey.get(l.key)[l.plan] = l;
    });
    return [...byKey.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [limits, defaults]);

  const typeOf = (key, byPlan) => defaults?.[key]?.type || Object.values(byPlan)[0]?.value_type || "int";
  // What applies when a plan has no value for a key: the app's default, none, or nothing (unused key).
  const fallback = (key, p) => {
    if (!defaults) return { label: k("notSet"), tip: k("notSetUnknown") };
    if (!(key in defaults)) return { label: k("notSet"), tip: k("notEnforced") };
    const def = defaults[key].defaults?.[p.tier];
    if (def === undefined || def === null) return { label: k("noDefault"), tip: k("noDefaultTip") };
    const shown = typeof def === "boolean" ? t(def ? "admin.cells.yes" : "admin.cells.no") : Number(def) >= UNLIMITED ? k("unlimited") : String(def);
    return { label: k("defaultValue", { n: shown }), tip: k("defaultTip") };
  };
  const Fallback = ({ k: key, p }) => {
    const f = fallback(key, p);
    return <span className="text-xs italic text-[#64748B]" title={f.tip}>{f.label}</span>;
  };
  const emptyCell = (key, byPlan, p) => {
    return (
      <span className="inline-flex items-center gap-1.5">
        <Fallback k={key} p={p} />
        <button type="button" onClick={() => setEditing({ lim: { plan: p.id, key, value_type: typeOf(key, byPlan) }, planName: p.name })}
          aria-label={`${k("add")} ${humanize(key)} · ${p.name}`} title={k("add")}
          className={`rounded px-1.5 py-0.5 text-xs font-medium text-[#4338CA] hover:bg-[#EEF2FF] ${FOCUS}`}>+ {k("add")}</button>
      </span>
    );
  };

  if (state === "loading") return <Card><SkeletonRows rows={6} height="h-10" /></Card>;
  if (state === "error") return <Card><EmptyBlock icon={ExclamationCircleIcon} title={t("admin.table.errorTitle")} action={<button type="button" onClick={() => setReload((n) => n + 1)} className={BTN_SECONDARY}><ArrowPathIcon className="h-4 w-4" />{t("admin.table.retry")}</button>} /></Card>;
  if (!rows.length) return <Card><EmptyBlock title={t("admin.table.empty")} /></Card>;

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[#F1F5F9] text-xs font-medium uppercase tracking-wide text-[#64748B]">
              <th scope="col" className="px-4 py-3">{k("limit")}</th>
              {plans.map((p) => <th key={p.id} scope="col" className="px-4 py-3 text-center">{p.name}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9]">
            {rows.map(([key, byPlan]) => (
              <tr key={key} className="text-[#334155]">
                <th scope="row" className="px-4 py-2.5 font-medium text-[#0F172A]">
                  <span className="flex items-center gap-1.5">
                    {humanize(key)}
                    {defaults && !(key in defaults) && <span title={k("notEnforced")}><Badge tone="slate">{k("unused")}</Badge></span>}
                  </span>
                  <span className="block font-mono text-[11px] font-normal text-[#94A3B8]">{key}</span>
                </th>
                {plans.map((p) => {
                  const lim = byPlan[p.id];
                  return (
                    <td key={p.id} className="px-4 py-2.5 text-center">
                      {lim ? (
                        <button type="button" onClick={() => setEditing({ lim, planName: p.name })}
                          aria-label={`${k("edit")} ${humanize(key)} · ${p.name}`}
                          className={`cursor-pointer rounded-md px-2 py-1 hover:bg-[#EEF2FF] ${FOCUS}`}>
                          {hasValue(lim) ? <LimitValue lim={lim} /> : <Fallback k={key} p={p} />}
                        </button>
                      ) : emptyCell(key, byPlan, p)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && <EditLimit {...editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); setReload((n) => n + 1); }} />}
    </Card>
  );
}

export function GlobalPlanLimits() {
  const { t } = useLanguage();
  const k = (key, params) => t(`admin.pages.planLimits.${key}`, params);
  const [params, setParams] = useSearchParams();
  const view = params.get("view") === "list" ? "list" : "matrix";
  const setView = useCallback((v) => setParams((prev) => { const n = new URLSearchParams(prev); if (v === "list") n.set("view", "list"); else n.delete("view"); return n; }, { replace: true }), [setParams]);
  const tabs = <Segmented ariaLabel={k("view")} value={view} onChange={setView} items={[{ value: "matrix", label: k("matrix") }, { value: "list", label: k("list") }]} />;

  if (view === "matrix") {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-5 md:py-2">
        <PageHeader title={t("global.pages.plan-limits.title")} subtitle={k("subtitle")} actions={tabs} />
        <LimitsMatrix />
      </div>
    );
  }
  return (
    <GlobalCrudPage
      title={t("global.pages.plan-limits.title")}
      subtitle={k("subtitle")}
      resource="plan-limits"
      headerActions={tabs}
      searchable
      columns={[
        { header: k("plan"), cell: (l) => <EntityCell detail={l.plan_detail} id={l.plan} /> },
        { header: k("limit"), sortKey: "key", cell: (l) => <span><span className="text-[#0F172A]">{humanize(l.key)}</span><span className="block font-mono text-[11px] text-[#94A3B8]">{l.key}</span></span> },
        { header: k("type"), accessor: "value_type" },
        { header: k("value"), cell: (l) => <LimitValue lim={l} /> },
      ]}
      fields={[
        { name: "plan", label: k("plan"), type: "select-resource", resource: "plans", labelAccessor: "name", valueAccessor: "id", required: true },
        { name: "key", label: k("key"), type: "text", required: true },
        { name: "value_type", label: k("type"), type: "select", defaultValue: "int",
          options: [{ value: "int", label: k("typeInt") }, { value: "bool", label: k("typeBool") }, { value: "str", label: k("typeStr") }] },
        { name: "int_value", label: k("intValue"), type: "number" },
        { name: "bool_value", label: k("boolValue"), type: "boolean" },
        { name: "str_value", label: k("strValue"), type: "text" },
      ]}
      deleteConfirm={(l) => ({ entityName: `${humanize(l.key)} · ${l.plan_detail?.name || `#${l.plan}`}` })}
    />
  );
}

export default GlobalPlanLimits;
