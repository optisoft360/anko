import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowPathIcon, BoltIcon, BookOpenIcon, BuildingOffice2Icon, ChatBubbleLeftRightIcon, CpuChipIcon,
  EnvelopeIcon, ExclamationCircleIcon, FolderIcon, RectangleStackIcon, Square2StackIcon, UsersIcon,
} from "@heroicons/react/24/outline";
import projectService from "@/services/projectService";
import { useLanguage } from "@/context/language-context";
import { BTN_SECONDARY, Card, CardHeader, EmptyBlock, FOCUS, PageHeader, SkeletonRows, TONE } from "@/enterprise/components/ui/kit";

function Stat({ icon: Icon, tone, label, value, hint, to }) {
  const body = (
    <Card className={`h-full p-4 sm:p-5 ${to ? "transition-colors hover:border-[#C7D2FE]" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-[#64748B]">{label}</span>
        <span className={`grid h-9 w-9 place-items-center rounded-lg ${TONE[tone].icon}`}><Icon className="h-4 w-4" /></span>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-[#0F172A]">{value ?? 0}</p>
      {hint && <p className="mt-0.5 text-xs text-[#64748B]">{hint}</p>}
    </Card>
  );
  return to ? <Link to={to} className={`block rounded-xl ${FOCUS}`}>{body}</Link> : body;
}

export default function PlatformAdminOverview() {
  const { t } = useLanguage();
  const k = (key, p) => t(`admin.pages.overview.${key}`, p);
  const [data, setData] = useState(null);
  const [state, setState] = useState("loading"); // loading | ready | missing | error
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    setState("loading");
    projectService.getList("admin/platform/stats")
      .then((d) => { if (alive) { setData(d); setState("ready"); } })
      .catch((err) => { if (alive) setState(err?.status === 404 || err?.detail === "Not found." ? "missing" : "error"); });
    return () => { alive = false; };
  }, [reload]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 md:py-2">
      <PageHeader title={k("title")} subtitle={k("subtitle")} />
      {state === "loading" ? (
        <Card><SkeletonRows rows={4} height="h-20" /></Card>
      ) : state === "missing" ? (
        <Card><EmptyBlock icon={CpuChipIcon} title={k("soon")} hint={k("soonHint")} /></Card>
      ) : state === "error" ? (
        <Card><EmptyBlock icon={ExclamationCircleIcon} title={t("admin.table.errorTitle")}
          action={<button type="button" onClick={() => setReload((n) => n + 1)} className={BTN_SECONDARY}><ArrowPathIcon className="h-4 w-4" /> {t("admin.table.retry")}</button>} /></Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat icon={BuildingOffice2Icon} tone="indigo" label={k("companies")} value={data.companies?.total} hint={k("active", { n: data.companies?.active ?? 0 })} to="/platform-admin/companies" />
            <Stat icon={UsersIcon} tone="sky" label={k("users")} value={data.users?.total} hint={k("usersHint", { active: data.users?.active ?? 0, staff: data.users?.staff ?? 0 })} to="/dashboard/users" />
            <Stat icon={UsersIcon} tone="emerald" label={k("newUsers")} value={data.users?.new_last_30d} hint={k("last30")} />
            <Stat icon={EnvelopeIcon} tone="amber" label={k("pendingInvites")} value={data.invitations?.pending} to="/platform-admin/invitations" />
          </div>

          <Card>
            <CardHeader title={k("content")} subtitle={k("contentHint")} />
            <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 sm:p-6 lg:grid-cols-6">
              <Stat icon={FolderIcon} tone="indigo" label={k("companyProcesses")} value={data.content?.processes} />
              <Stat icon={FolderIcon} tone="slate" label={k("personalProcesses")} value={data.content?.projects} to="/dashboard/global-projects" />
              <Stat icon={BookOpenIcon} tone="violet" label={k("learningPaths")} value={data.content?.learning_paths} to="/dashboard/global-learning-paths" />
              <Stat icon={RectangleStackIcon} tone="sky" label={k("decks")} value={data.content?.decks} to="/dashboard/decks" />
              <Stat icon={BoltIcon} tone="amber" label={k("batteries")} value={data.content?.batteries} to="/dashboard/admin-batteries" />
              <Stat icon={Square2StackIcon} tone="emerald" label={k("flashcards")} value={data.content?.flashcards} to="/dashboard/flashcards" />
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <Card>
              <CardHeader title={k("subscriptions")} />
              <ul className="divide-y divide-[#F1F5F9] px-4 sm:px-6">
                {(data.subscriptions?.by_plan || []).map((p) => (
                  <li key={p.plan} className="flex justify-between py-2.5 text-sm"><span className="text-[#334155]">{p.name || p.plan}</span><span className="font-semibold tabular-nums">{p.count}</span></li>
                ))}
                {!(data.subscriptions?.by_plan || []).length && <li className="py-4 text-sm text-[#64748B]">{t("admin.table.empty")}</li>}
              </ul>
            </Card>
            <Stat icon={ChatBubbleLeftRightIcon} tone={data.support?.open ? "rose" : "emerald"} label={k("openSupport")} value={data.support?.open} to="/dashboard/support-requests?status=new" />
            <Stat icon={CpuChipIcon} tone={data.generation_jobs?.failed ? "rose" : "sky"} label={k("jobs")} value={data.generation_jobs?.processing}
              hint={k("jobsHint", { n: data.generation_jobs?.failed ?? 0 })} />
          </div>
        </>
      )}
    </div>
  );
}
