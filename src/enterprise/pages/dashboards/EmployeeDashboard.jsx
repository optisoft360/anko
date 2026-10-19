import { formatDate } from "@/utils/calendarDate";
import React, { useEffect, useState } from "react";
import { Typography, Card, CardBody, Progress } from "@material-tailwind/react";
import {
  CpuChipIcon as BrainIcon, ShieldCheckIcon, AcademicCapIcon, ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";
import { CpuChipIcon as BrainSolid, ShieldCheckIcon as ShieldSolid } from "@heroicons/react/24/solid";
import { analyticsApi } from "../../api/enterpriseApi";
import { useLanguage } from "../../../context/language-context";
import { KPICard } from "../../components/KPICard";
import { RetentionScoreGauge } from "../../components/RetentionScoreGauge";
import { StatusBadge } from "../../components/StatusBadge";
import { EmptyState } from "../../components/EmptyState";
import { DashboardSkeleton } from "../../components/LoadingSkeleton";
import {
  AcademicCapIcon as AcademicOutline,
  ClipboardDocumentCheckIcon,
  BoltIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";

function useTimeAgo() {
  const { t, language } = useLanguage();
  return (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const diff = Math.floor((Date.now() - d) / 1000);
    if (diff < 60) return t("enterprise.dashboards.employee.timeAgo.justNow");
    if (diff < 3600) return t("enterprise.dashboards.employee.timeAgo.minutes", { n: Math.floor(diff / 60) });
    if (diff < 86400) return t("enterprise.dashboards.employee.timeAgo.hours", { n: Math.floor(diff / 3600) });
    return t("enterprise.dashboards.employee.timeAgo.days", { n: Math.floor(diff / 86400) });
  };
}

export function EmployeeDashboard() {
  const { t, language } = useLanguage();
  const timeAgo = useTimeAgo();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsApi.employeeDashboard()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardSkeleton />;
  if (!data) return <EmptyState title={t("enterprise.dashboards.employee.notLoaded")} message={t("enterprise.dashboards.employee.tryAgain")} />;

  const learning = data.learning_progress || {};
  const knowledge = data.knowledge_health || {};
  const compliance = data.compliance_status || {};
  const activity = data.recent_activity || [];

  const learningStats = [
    { label: t("enterprise.dashboards.employee.learning.completed"), value: learning.completed ?? 0, color: "green" },
    { label: t("enterprise.dashboards.employee.learning.inProgress"), value: learning.in_progress ?? 0, color: "blue" },
    { label: t("enterprise.dashboards.employee.learning.pending"), value: learning.pending ?? 0, color: "amber" },
    { label: t("enterprise.dashboards.employee.learning.overdue"), value: learning.overdue ?? 0, color: "red" },
  ];

  const complianceStats = [
    { label: t("enterprise.dashboards.employee.compliance.compliant"), value: compliance.compliant ?? 0, color: "text-green-600" },
    { label: t("enterprise.dashboards.employee.compliance.nonCompliant"), value: compliance.non_compliant ?? 0, color: "text-red-600" },
    { label: t("enterprise.dashboards.employee.compliance.pending"), value: compliance.pending ?? 0, color: "text-amber-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Typography variant="h5" className="font-extrabold text-zinc-900">{t("enterprise.dashboards.employee.title")}</Typography>
        <Typography variant="small" className="text-zinc-400">{t("enterprise.dashboards.employee.subtitle")}</Typography>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title={t("enterprise.dashboards.employee.kpi.retentionScore")}
          value={`${data.retention_score ?? 0}%`}
          subtitle={t("enterprise.dashboards.employee.kpi.knowledgeRetained")}
          color="indigo"
          icon={AcademicOutline}
        />
        <KPICard
          title={t("enterprise.dashboards.employee.kpi.complianceRate")}
          value={`${data.compliance_rate ?? 0}%`}
          subtitle={t("enterprise.dashboards.employee.kpi.programsCompleted")}
          color="green"
          icon={ClipboardDocumentCheckIcon}
        />
        <KPICard
          title={t("enterprise.dashboards.employee.kpi.activeCerts")}
          value={data.active_certifications ?? 0}
          subtitle={t("enterprise.dashboards.employee.kpi.validCertifications")}
          color="blue"
          icon={AcademicCapIcon}
        />
        <KPICard
          title={t("enterprise.dashboards.employee.kpi.reviewsDue")}
          value={data.reviews_due ?? 0}
          subtitle={data.overdue_reviews > 0 ? t("enterprise.dashboards.employee.kpi.overdueCount", { n: data.overdue_reviews }) : t("enterprise.dashboards.employee.kpi.stayOnTrack")}
          color={data.overdue_reviews > 0 ? "red" : "amber"}
          icon={CalendarDaysIcon}
          urgent={data.overdue_reviews > 0}
        />
      </div>

      {/* Middle Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Learning Progress */}
        <Card className="border border-zinc-200/60 shadow-sm">
          <CardBody className="p-5">
            <Typography variant="h6" className="font-bold text-zinc-900 mb-4">{t("enterprise.dashboards.employee.learning.title")}</Typography>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {learningStats.map((s) => (
                <div key={s.label} className="bg-zinc-50 rounded-xl p-3 text-center">
                  <div className={`text-xl font-extrabold text-${s.color}-600`}>{s.value}</div>
                  <div className="text-xs font-semibold text-zinc-500">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              {(learning.in_progress_paths || []).slice(0, 4).map((path) => (
                <div key={path.id} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-zinc-700">
                    <span className="truncate pr-2">{path.name}</span>
                    <span className="text-zinc-400 flex-shrink-0">{formatDate(path.due_date, language) || t("enterprise.dashboards.employee.learning.noDeadline")}</span>
                  </div>
                  <Progress value={path.progress ?? 0} size="sm" color="indigo" />
                </div>
              ))}
              {(learning.in_progress_paths || []).length === 0 && (
                <Typography variant="small" className="text-zinc-400 text-center py-2">{t("enterprise.dashboards.employee.learning.noActivePaths")}</Typography>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Knowledge Health */}
        <Card className="border border-zinc-200/60 shadow-sm">
          <CardBody className="p-5">
            <Typography variant="h6" className="font-bold text-zinc-900 mb-4">{t("enterprise.dashboards.employee.knowledgeHealth.title")}</Typography>
            <div className="flex justify-around mb-4">
              <RetentionScoreGauge score={knowledge.retention_score ?? 0} label={t("enterprise.dashboards.employee.knowledgeHealth.retention")} size="sm" />
              <RetentionScoreGauge score={100 - (knowledge.risk_score ?? 0)} label={t("enterprise.dashboards.employee.knowledgeHealth.lowRisk")} size="sm" />
            </div>
            <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl">
              <Typography variant="small" className="font-semibold text-zinc-700">{t("enterprise.dashboards.employee.knowledgeHealth.openGaps")}</Typography>
              <span className={`font-extrabold text-lg ${(knowledge.open_gaps ?? 0) > 0 ? "text-red-600" : "text-green-600"}`}>
                {knowledge.open_gaps ?? 0}
              </span>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Compliance Status */}
        <Card className="border border-zinc-200/60 shadow-sm">
          <CardBody className="p-5">
            <Typography variant="h6" className="font-bold text-zinc-900 mb-4">{t("enterprise.dashboards.employee.compliance.title")}</Typography>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {complianceStats.map((s) => (
                <div key={s.label} className="text-center">
                  <div className={`text-2xl font-extrabold ${s.color}`}>{s.value}</div>
                  <div className="text-xs font-semibold text-zinc-400">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {(compliance.expiring_items || []).slice(0, 4).map((item, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-amber-50 border border-amber-100">
                  <Typography variant="small" className="font-semibold text-amber-800 truncate pr-2">{item.name}</Typography>
                  <Typography variant="small" className="text-amber-600 flex-shrink-0 text-xs">{item.expires_at}</Typography>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Recent Activity */}
        <Card className="border border-zinc-200/60 shadow-sm">
          <CardBody className="p-5">
            <Typography variant="h6" className="font-bold text-zinc-900 mb-4">{t("enterprise.dashboards.employee.activity.title")}</Typography>
            <div className="space-y-3">
              {activity.slice(0, 10).map((event, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <BoltIcon className="h-3.5 w-3.5 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Typography variant="small" className="text-zinc-700 font-medium leading-tight">{event.description}</Typography>
                    <Typography variant="small" className="text-zinc-400 text-xs">{timeAgo(event.timestamp)}</Typography>
                  </div>
                </div>
              ))}
              {activity.length === 0 && (
                <Typography variant="small" className="text-zinc-400 text-center py-4">{t("enterprise.dashboards.employee.activity.empty")}</Typography>
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

export default EmployeeDashboard;
