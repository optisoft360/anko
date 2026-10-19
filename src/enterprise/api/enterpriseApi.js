import { isAuthFailure } from "@/utils/authErrors";
import axios from "axios";
import { API_BASE } from "@/services/api";

const enterpriseApi = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// Inject auth token + force English for enterprise calls
enterpriseApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers["Authorization"] = `Token ${token}`;
  config.headers["Accept-Language"] = "en";
  return config;
});

// 401 with an invalid/missing token → sign-in. Other errors never end the session (C3 / F-07).
enterpriseApi.interceptors.response.use(
  (res) => res,
  (err) => {
    if (isAuthFailure(err)) {
      localStorage.removeItem("token");
      window.location.href = "/auth/sign-in";
    }
    return Promise.reject(err?.response?.data || err);
  }
);

// Internal: returns a plain params object with company_id injected
function cp(params = {}) {
  const id = localStorage.getItem("enterprise_company_id");
  return id ? { ...params, company_id: id } : params;
}

// Exported: returns an axios-like wrapper with company_id auto-injected as query param
// Used by settings pages for ad-hoc requests
export function withCompany() {
  const inject = (cfg = {}) => ({ ...cfg, params: cp(cfg.params) });
  return {
    get: (url, cfg) => enterpriseApi.get(url, inject(cfg)),
    post: (url, data, cfg) => enterpriseApi.post(url, data, inject(cfg)),
    patch: (url, data, cfg) => enterpriseApi.patch(url, data, inject(cfg)),
    put: (url, data, cfg) => enterpriseApi.put(url, data, inject(cfg)),
    delete: (url, cfg) => enterpriseApi.delete(url, inject(cfg)),
  };
}

// ─── Companies & Memberships ──────────────────────────────────────────────────
export const companyApi = {
  myCompanies: () => enterpriseApi.get("/enterprise/companies/").then((r) => r.data),
  createCompany: (data) => enterpriseApi.post("/enterprise/companies/", data).then((r) => r.data),
  getCompany: (id) => enterpriseApi.get(`/enterprise/companies/${id}/`).then((r) => r.data),
  updateCompany: (id, data) => enterpriseApi.patch(`/enterprise/companies/${id}/`, data).then((r) => r.data),
  deleteCompany: (id) => enterpriseApi.delete(`/enterprise/companies/${id}/`).then((r) => r.data),

  getMembers: (id, params) => enterpriseApi.get(`/enterprise/companies/${id}/members/`, { params }).then((r) => r.data),
  addUser: (id, data) => enterpriseApi.post(`/enterprise/companies/${id}/add-user/`, data).then((r) => r.data),
  changeMemberRole: (id, data) => enterpriseApi.post(`/enterprise/companies/${id}/change-member-role/`, data).then((r) => r.data),
  removeMember: (id, data) => enterpriseApi.post(`/enterprise/companies/${id}/remove-member/`, data).then((r) => r.data),
  resendWelcome: (id, data) => enterpriseApi.post(`/enterprise/companies/${id}/resend-welcome/`, data).then((r) => r.data),
};

// ─── Business Units ───────────────────────────────────────────────────────────
export const businessUnitApi = {
  list: (p) => enterpriseApi.get("/enterprise/business-units/", { params: cp(p) }).then((r) => r.data),
  create: (data) => enterpriseApi.post("/enterprise/business-units/", data, { params: cp() }).then((r) => r.data),
  update: (id, data) => enterpriseApi.patch(`/enterprise/business-units/${id}/`, data, { params: cp() }).then((r) => r.data),
  remove: (id) => enterpriseApi.delete(`/enterprise/business-units/${id}/`, { params: cp() }).then((r) => r.data),
};

// ─── Teams ────────────────────────────────────────────────────────────────────
export const teamsApi = {
  list: (p) => enterpriseApi.get("/enterprise/teams/", { params: cp(p) }).then((r) => r.data),
  create: (data) => enterpriseApi.post("/enterprise/teams/", data, { params: cp() }).then((r) => r.data),
  update: (id, data) => enterpriseApi.patch(`/enterprise/teams/${id}/`, data, { params: cp() }).then((r) => r.data),
  remove: (id) => enterpriseApi.delete(`/enterprise/teams/${id}/`, { params: cp() }).then((r) => r.data),
  getMembers: (id) => enterpriseApi.get(`/enterprise/teams/${id}/members/`, { params: cp() }).then((r) => r.data),
  addMember: (id, data) => enterpriseApi.post(`/enterprise/teams/${id}/add-member/`, data, { params: cp() }).then((r) => r.data),
  removeMember: (id, data) => enterpriseApi.post(`/enterprise/teams/${id}/remove-member/`, data, { params: cp() }).then((r) => r.data),
};

// ─── Analytics ────────────────────────────────────────────────────────────────
export const analyticsApi = {
  employeeDashboard: (p) => enterpriseApi.get("/enterprise/analytics/employee-dashboard/", { params: cp(p) }).then((r) => r.data),
  managerDashboard: (p) => enterpriseApi.get("/enterprise/analytics/manager-dashboard/", { params: cp(p) }).then((r) => r.data),
  trainerDashboard: (p) => enterpriseApi.get("/enterprise/analytics/trainer-dashboard/", { params: cp(p) }).then((r) => r.data),
  auditorDashboard: (p) => enterpriseApi.get("/enterprise/analytics/auditor-dashboard/", { params: cp(p) }).then((r) => r.data),
  executiveDashboard: (p) => enterpriseApi.get("/enterprise/analytics/executive-dashboard/", { params: cp(p) }).then((r) => r.data),
  companyHealth: (p) => enterpriseApi.get("/enterprise/analytics/company-health/", { params: cp(p) }).then((r) => r.data),
  retentionTrends: (p) => enterpriseApi.get("/enterprise/analytics/retention-trends/", { params: cp(p) }).then((r) => r.data),
  complianceTrends: (p) => enterpriseApi.get("/enterprise/analytics/compliance-trends/", { params: cp(p) }).then((r) => r.data),
  learningTrends: (p) => enterpriseApi.get("/enterprise/analytics/learning-trends/", { params: cp(p) }).then((r) => r.data),
};

// ─── Learning ─────────────────────────────────────────────────────────────────
export const learningApi = {
  // Learning Paths
  getPaths: (p) => enterpriseApi.get("/enterprise/learning-paths/", { params: cp(p) }).then((r) => r.data),
  getLearningPath: (id) => enterpriseApi.get(`/enterprise/learning-paths/${id}/`, { params: cp() }).then((r) => r.data),
  createPath: (data) => enterpriseApi.post("/enterprise/learning-paths/", data, { params: cp() }).then((r) => r.data),
  updatePath: (id, data) => enterpriseApi.patch(`/enterprise/learning-paths/${id}/`, data, { params: cp() }).then((r) => r.data),
  deletePath: (id) => enterpriseApi.delete(`/enterprise/learning-paths/${id}/`, { params: cp() }).then((r) => r.data),
  publishPath: (id) => enterpriseApi.post(`/enterprise/learning-paths/${id}/publish/`, {}, { params: cp() }).then((r) => r.data),
  assignPathToUser: (id, data) => enterpriseApi.post(`/enterprise/learning-paths/${id}/assign-to-user/`, data, { params: cp() }).then((r) => r.data),
  assignPathToTeam: (id, data) => enterpriseApi.post(`/enterprise/learning-paths/${id}/assign-to-team/`, data, { params: cp() }).then((r) => r.data),
  getPathAnalytics: (id) => enterpriseApi.get(`/enterprise/learning-paths/${id}/analytics/`, { params: cp() }).then((r) => r.data),
  addModule: (id, data) => enterpriseApi.post(`/enterprise/learning-paths/${id}/add-module/`, data, { params: cp() }).then((r) => r.data),
  removeModule: (id, data) => enterpriseApi.post(`/enterprise/learning-paths/${id}/remove-module/`, data, { params: cp() }).then((r) => r.data),

  // Learning Modules (= Procesos)
  getModules: (p) => enterpriseApi.get("/enterprise/learning-modules/", { params: cp(p) }).then((r) => r.data),
  getModule: (id) => enterpriseApi.get(`/enterprise/learning-modules/${id}/`, { params: cp() }).then((r) => r.data),
  createModule: (data) => enterpriseApi.post("/enterprise/learning-modules/", data, { params: cp() }).then((r) => r.data),
  updateModule: (id, data) => enterpriseApi.patch(`/enterprise/learning-modules/${id}/`, data, { params: cp() }).then((r) => r.data),
  deleteModule: (id) => enterpriseApi.delete(`/enterprise/learning-modules/${id}/`, { params: cp() }).then((r) => r.data),
  assignModuleToUser: (id, data) => enterpriseApi.post(`/enterprise/learning-modules/${id}/assign-to-user/`, data, { params: cp() }).then((r) => r.data),
  assignModuleToTeam: (id, data) => enterpriseApi.post(`/enterprise/learning-modules/${id}/assign-to-team/`, data, { params: cp() }).then((r) => r.data),

  // Module Items
  getModuleItems: (p) => enterpriseApi.get("/enterprise/learning-module-items/", { params: cp(p) }).then((r) => r.data),
  createModuleItem: (data) => enterpriseApi.post("/enterprise/learning-module-items/", data, { params: cp() }).then((r) => r.data),
  updateModuleItem: (id, data) => enterpriseApi.patch(`/enterprise/learning-module-items/${id}/`, data, { params: cp() }).then((r) => r.data),
  deleteModuleItem: (id) => enterpriseApi.delete(`/enterprise/learning-module-items/${id}/`, { params: cp() }).then((r) => r.data),

  // Training Programs
  getPrograms: (p) => enterpriseApi.get("/enterprise/training-programs/", { params: cp(p) }).then((r) => r.data),
  getProgram: (id) => enterpriseApi.get(`/enterprise/training-programs/${id}/`, { params: cp() }).then((r) => r.data),
  createProgram: (data) => enterpriseApi.post("/enterprise/training-programs/", data, { params: cp() }).then((r) => r.data),
  updateProgram: (id, data) => enterpriseApi.patch(`/enterprise/training-programs/${id}/`, data, { params: cp() }).then((r) => r.data),
  publishProgram: (id, data) => enterpriseApi.post(`/enterprise/training-programs/${id}/publish/`, data, { params: cp() }).then((r) => r.data),
  getProgramVersions: (id) => enterpriseApi.get(`/enterprise/training-programs/${id}/versions/`, { params: cp() }).then((r) => r.data),

  // Assignments
  getAssignments: (p) => enterpriseApi.get("/enterprise/learning-assignments/", { params: cp(p) }).then((r) => r.data),
  getAssignment: (id) => enterpriseApi.get(`/enterprise/learning-assignments/${id}/`, { params: cp() }).then((r) => r.data),
  startAssignment: (id) => enterpriseApi.post(`/enterprise/learning-assignments/${id}/start/`, {}, { params: cp() }).then((r) => r.data),
  completeModule: (id, data) => enterpriseApi.post(`/enterprise/learning-assignments/${id}/complete-module/`, data, { params: cp() }).then((r) => r.data),
  getMyProgress: (id) => enterpriseApi.get(`/enterprise/learning-assignments/${id}/progress/`, { params: cp() }).then((r) => r.data),
  // UNUSED-CLEANUP (2026-10-11): 0 usos; /enterprise/learning-paths/{id}/my-progress/ no existe en el backend
  // getLearningPathProgress: (id) => enterpriseApi.get(`/enterprise/learning-paths/${id}/my-progress/`, { params: cp() }).then((r) => r.data),

  // Reviews and Gaps
  getDueReviews: (p) => enterpriseApi.get("/enterprise/review-schedules/my-due-reviews/", { params: cp(p) }).then((r) => r.data),
  getOverdueReviews: (p) => enterpriseApi.get("/enterprise/review-schedules/overdue/", { params: cp(p) }).then((r) => r.data),
  completeReview: (id, score) => enterpriseApi.post(`/enterprise/review-schedules/${id}/complete/`, cp({ score })).then((r) => r.data),
  getKnowledgeGaps: (p) => enterpriseApi.get("/enterprise/knowledge-gaps/", { params: cp(p) }).then((r) => r.data),
  acknowledgeGap: (id) => enterpriseApi.post(`/enterprise/knowledge-gaps/${id}/acknowledge/`, cp()).then((r) => r.data),
  resolveGap: (id) => enterpriseApi.post(`/enterprise/knowledge-gaps/${id}/resolve/`, cp()).then((r) => r.data),
};

// ─── Retention ────────────────────────────────────────────────────────────────
export const retentionApi = {
  myRetention: (p) => enterpriseApi.get("/enterprise/retention/my-retention/", { params: cp(p) }).then((r) => r.data),
  teamRetention: (p) => enterpriseApi.get("/enterprise/retention/team-retention/", { params: cp(p) }).then((r) => r.data),
  companyRetention: (p) => enterpriseApi.get("/enterprise/retention/company-retention/", { params: cp(p) }).then((r) => r.data),
  snapshots: (p) => enterpriseApi.get("/enterprise/retention-snapshots/", { params: cp(p) }).then((r) => r.data),
};

// ─── Compliance ───────────────────────────────────────────────────────────────
export const complianceApi = {
  getPrograms: (p) => enterpriseApi.get("/enterprise/compliance-programs/", { params: cp(p) }).then((r) => r.data),
  getProgram: (id) => enterpriseApi.get(`/enterprise/compliance-programs/${id}/`, { params: cp() }).then((r) => r.data),
  createProgram: (data) => enterpriseApi.post("/enterprise/compliance-programs/", data, { params: cp() }).then((r) => r.data),
  updateProgram: (id, data) => enterpriseApi.patch(`/enterprise/compliance-programs/${id}/`, data, { params: cp() }).then((r) => r.data),
  activateProgram: (id) => enterpriseApi.post(`/enterprise/compliance-programs/${id}/activate/`, cp()).then((r) => r.data),
  archiveProgram: (id) => enterpriseApi.post(`/enterprise/compliance-programs/${id}/archive/`, cp()).then((r) => r.data),
  assignToUser: (id, data) => enterpriseApi.post(`/enterprise/compliance-programs/${id}/assign-to-user/`, data, { params: cp() }).then((r) => r.data),
  assignToTeam: (id, data) => enterpriseApi.post(`/enterprise/compliance-programs/${id}/assign-to-team/`, data, { params: cp() }).then((r) => r.data),
  auditReport: (id) => enterpriseApi.get(`/enterprise/compliance-programs/${id}/audit-report/`, { params: cp() }).then((r) => r.data),

  createRequirement: (data) => enterpriseApi.post("/enterprise/compliance-requirements/", data, { params: cp() }).then((r) => r.data),
  updateRequirement: (id, data) => enterpriseApi.patch(`/enterprise/compliance-requirements/${id}/`, data, { params: cp() }).then((r) => r.data),
  deleteRequirement: (id) => enterpriseApi.delete(`/enterprise/compliance-requirements/${id}/`, { params: cp() }).then((r) => r.data),

  getAssignments: (p) => enterpriseApi.get("/enterprise/compliance-assignments/", { params: cp(p) }).then((r) => r.data),
  myCompliance: (p) => enterpriseApi.get("/enterprise/compliance-assignments/my-compliance/", { params: cp(p) }).then((r) => r.data),
  companyCompliance: (p) => enterpriseApi.get("/enterprise/compliance-assignments/company-compliance/", { params: cp(p) }).then((r) => r.data),
  teamCompliance: (p) => enterpriseApi.get("/enterprise/compliance-assignments/team-compliance/", { params: cp(p) }).then((r) => r.data),
  expiringAssignments: (p) => enterpriseApi.get("/enterprise/compliance-assignments/expiring/", { params: cp(p) }).then((r) => r.data),
  completeAssignment: (id, data = {}) => enterpriseApi.post(`/enterprise/compliance-assignments/${id}/complete/`, data, { params: cp() }).then((r) => r.data),
  renewAssignment: (id) => enterpriseApi.post(`/enterprise/compliance-assignments/${id}/renew/`, cp()).then((r) => r.data),
  allCertifications: (p) => enterpriseApi.get("/enterprise/certifications/", { params: cp(p) }).then((r) => r.data),
};

// ─── Certifications ───────────────────────────────────────────────────────────
// ─── Knowledge (Phase 7) ──────────────────────────────────────────────────────
export const knowledgeApi = {
  list: (p) => enterpriseApi.get("/enterprise/knowledge-sources/", { params: cp(p) }).then((r) => r.data),
  get: (id) => enterpriseApi.get(`/enterprise/knowledge-sources/${id}/`, { params: cp() }).then((r) => r.data),
  create: (data) => enterpriseApi.post("/enterprise/knowledge-sources/", data, { params: cp() }).then((r) => r.data),
  update: (id, data) => enterpriseApi.patch(`/enterprise/knowledge-sources/${id}/`, data, { params: cp() }).then((r) => r.data),
  remove: (id) => enterpriseApi.delete(`/enterprise/knowledge-sources/${id}/`, { params: cp() }).then((r) => r.data),
  process: (id) => enterpriseApi.post(`/enterprise/knowledge-sources/${id}/process/`, {}, { params: cp() }).then((r) => r.data),
  // F-09: topics created by hand inside a process.
  createTopic: (id, data) =>
    enterpriseApi.post(`/enterprise/knowledge-sources/${id}/topics/`, data, { params: cp() }).then((r) => r.data),
  updateTopic: (id, topicId, data) =>
    enterpriseApi.patch(`/enterprise/knowledge-sources/${id}/topics/${topicId}/`, data, { params: cp() }).then((r) => r.data),
  // F-08: manual deck inside a topic of the process.
  createTopicDeck: (id, topicId, data) =>
    enterpriseApi.post(`/enterprise/knowledge-sources/${id}/topics/${topicId}/decks/`, data, { params: cp() }).then((r) => r.data),
  status: (id) => enterpriseApi.get(`/enterprise/knowledge-sources/${id}/status/`, { params: cp() }).then((r) => r.data),
  generateTraining: (id) => enterpriseApi.post(`/enterprise/knowledge-sources/${id}/generate-training/`, {}, { params: cp() }).then((r) => r.data),
  detectChanges: (id) => enterpriseApi.post(`/enterprise/knowledge-sources/${id}/detect-changes/`, {}, { params: cp() }).then((r) => r.data),

  // Upload a file and link it to an existing KnowledgeSource.
  // Returns updated KnowledgeSource with the new document in its `documents` list.
  addDocument: (id, file, versionNote = "") => {
    const form = new FormData();
    form.append("file", file);
    if (versionNote) form.append("version_note", versionNote);
    return enterpriseApi.post(
      `/enterprise/knowledge-sources/${id}/add-document/`,
      form,
      { params: cp(), headers: { "Content-Type": "multipart/form-data" } }
    ).then((r) => r.data);
  },

  getProcedures: (p) => enterpriseApi.get("/enterprise/procedures/", { params: cp(p) }).then((r) => r.data),
  getProcedure: (id) => enterpriseApi.get(`/enterprise/procedures/${id}/`, { params: cp() }).then((r) => r.data),

  getChangeImpacts: (p) => enterpriseApi.get("/enterprise/change-impact/", { params: cp(p) }).then((r) => r.data),
  getChangeImpact: (id) => enterpriseApi.get(`/enterprise/change-impact/${id}/`, { params: cp() }).then((r) => r.data),
  analyzeImpact: (id) => enterpriseApi.post(`/enterprise/change-impact/${id}/analyze/`, {}, { params: cp() }).then((r) => r.data),
  applyImpact: (id) => enterpriseApi.post(`/enterprise/change-impact/${id}/apply/`, {}, { params: cp() }).then((r) => r.data),

  getGraph: (p) => enterpriseApi.get("/enterprise/knowledge-graph/graph/", { params: cp(p) }).then((r) => r.data),
  // F-13: rebuild the structure graph (process, topics, tags, procedures).
  rebuildGraph: (p) => enterpriseApi.post("/enterprise/knowledge-graph/rebuild/", {}, { params: cp(p) }).then((r) => r.data),
  getResults: (id) => enterpriseApi.get(`/enterprise/knowledge-sources/${id}/results/`, { params: cp() }).then((r) => r.data),
  // KnowledgeSource documents are linked via KnowledgeSourceDocument, not Document.project —
  // this must NOT be confused with projectService.getDocumentsWithSections (Project-scoped).
  getDocumentsWithSections: (id) => enterpriseApi.get(`/enterprise/knowledge-sources/${id}/documents-with-sections/`, { params: cp() }).then((r) => r.data),
  getNodes: (p) => enterpriseApi.get("/enterprise/knowledge-graph/nodes/", { params: cp(p) }).then((r) => r.data),
  getRelationships: (p) => enterpriseApi.get("/enterprise/knowledge-graph/relationships/", { params: cp(p) }).then((r) => r.data),
};

// ─── Certifications ───────────────────────────────────────────────────────────
export const certApi = {
  getTemplates: (p) => enterpriseApi.get("/enterprise/certificate-templates/", { params: cp(p) }).then((r) => r.data),
  getTemplate: (id) => enterpriseApi.get(`/enterprise/certificate-templates/${id}/`, { params: cp() }).then((r) => r.data),
  createTemplate: (data) => enterpriseApi.post("/enterprise/certificate-templates/", data, { params: cp() }).then((r) => r.data),
  updateTemplate: (id, data) => enterpriseApi.patch(`/enterprise/certificate-templates/${id}/`, data, { params: cp() }).then((r) => r.data),
  activateTemplate: (id) => enterpriseApi.post(`/enterprise/certificate-templates/${id}/activate/`, {}, { params: cp() }).then((r) => r.data),
  deactivateTemplate: (id) => enterpriseApi.post(`/enterprise/certificate-templates/${id}/deactivate/`, {}, { params: cp() }).then((r) => r.data),
  issueCert: (id, data) => enterpriseApi.post(`/enterprise/certificate-templates/${id}/issue/`, data, { params: cp() }).then((r) => r.data),
  checkEligibility: (id, userId) => enterpriseApi.get(`/enterprise/certificate-templates/${id}/check-eligibility/`, { params: cp({ user_id: userId }) }).then((r) => r.data),

  // Requirements — what a template needs auto-completed to auto-issue (see CertificationRequirement)
  getRequirements: (templateId) => enterpriseApi.get("/enterprise/certification-requirements/", { params: cp({ template_id: templateId }) }).then((r) => r.data),
  createRequirement: (data) => enterpriseApi.post("/enterprise/certification-requirements/", data, { params: cp() }).then((r) => r.data),
  updateRequirement: (id, data) => enterpriseApi.patch(`/enterprise/certification-requirements/${id}/`, data, { params: cp() }).then((r) => r.data),
  deleteRequirement: (id) => enterpriseApi.delete(`/enterprise/certification-requirements/${id}/`, { params: cp() }).then((r) => r.data),

  myCertifications: (p) => enterpriseApi.get("/enterprise/certifications/my-certifications/", { params: cp(p) }).then((r) => r.data),
  myStats: (p) => enterpriseApi.get("/enterprise/certifications/my-stats/", { params: cp(p) }).then((r) => r.data),
  companyStats: (p) => enterpriseApi.get("/enterprise/certifications/company-stats/", { params: cp(p) }).then((r) => r.data),
  allCertifications: (p) => enterpriseApi.get("/enterprise/certifications/", { params: cp(p) }).then((r) => r.data),
  expiring: (p) => enterpriseApi.get("/enterprise/certifications/expiring/", { params: cp(p) }).then((r) => r.data),
  getCertData: (id) => enterpriseApi.get(`/enterprise/certifications/${id}/certificate-data/`, { params: cp() }).then((r) => r.data),
  revoke: (id, reason) => enterpriseApi.post(`/enterprise/certifications/${id}/revoke/`, { reason }, { params: cp() }).then((r) => r.data),

  verifyPublic: (identifier) => axios.get(`${API_BASE}/enterprise/verify/${identifier}/`).then((r) => r.data),
};

// ─── Collections & TagGroups ──────────────────────────────────────────────────
// Collection == KnowledgeSource (same ID). Uses /api/ base (no /enterprise/ prefix).
export const collectionApi = {
  get: (id) => enterpriseApi.get(`/collections/${id}/`).then((r) => r.data),
  getTagGroups: (collectionId) =>
    enterpriseApi.get(`/tag-groups/`, { params: { collection: collectionId } }).then((r) => r.data),
  getTagGroupDecks: (tagGroupId) =>
    enterpriseApi.get(`/decks/`, { params: { tag_group: tagGroupId } }).then((r) => r.data),
  getTagGroupBatteries: (tagGroupId) =>
    enterpriseApi.get(`/batteries/`, { params: { tag_group: tagGroupId } }).then((r) => r.data),
  reorderDecks: (tagGroupId, orderedIds) =>
    enterpriseApi.post(`/decks/reorder/`, { tag_group_id: tagGroupId, ordered_ids: orderedIds }).then((r) => r.data),
  reorderBatteries: (tagGroupId, orderedIds) =>
    enterpriseApi.post(`/batteries/reorder/`, { tag_group_id: tagGroupId, ordered_ids: orderedIds }).then((r) => r.data),
  // Deletes the topic AND every deck/battery under it (cascade, backend-side).
  deleteTagGroup: (tagGroupId) =>
    enterpriseApi.delete(`/tag-groups/${tagGroupId}/`).then((r) => r.data),
};

export default enterpriseApi;
