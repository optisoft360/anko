// Mocked API data shared by the mobile-layout and desktop-baseline specs.
// Shapes follow what each page reads; values are QA-TEST data only.

export const COMPANY = [{ id: 1, name: "optisoft360", user_role: "owner" }];

const ks = (id, title, extra = {}) => ({
  id, title, status: "processed", process_type: "course", difficulty: "medium", source_type: "manual",
  description: "", documents: [], minimum_passing_score: 70,
  created_at: "2026-10-20T10:00:00Z", updated_at: "2026-10-20T10:00:00Z", ...extra,
});

export const PROCESSES = [
  ks(1, "QA-TEST Seguridad industrial y uso de EPP en planta"),
  ks(2, "QA-TEST Manual de calidad ISO 9001", { process_type: "tutorial", difficulty: "easy", status: "pending" }),
];

export const RESULTS = {
  run: { status: "completed" },
  summary: { topics: 2, decks: 2, batteries: 1, questions: 12, cards: 24, completion_percent: 40, completed_batteries: 0, passing_score: 70 },
  topics: [
    { id: "3", title: "Equipos de protección individual obligatorios", tags: ["casco", "guantes", "gafas"] },
    { id: "4", title: "Procedimiento de bloqueo y etiquetado", tags: ["loto"] },
  ],
  decks: [
    { id: 40, title: "Equipos de protección individual: casco, guantes y gafas de seguridad", tag_group_id: 3, cardsCount: 12 },
    { id: 41, title: "Bloqueo y etiquetado", tag_group_id: 4, cardsCount: 12 },
  ],
  batteries: [
    { id: 50, name: "Evaluación EPP", tag_group_id: 3, question_count: 12, best_attempt_percent: 40 },
  ],
};

export const DOCS_WITH_SECTIONS = {
  documents: [{ id: 5, filename: "QA-TEST-procedimiento-epp.pdf", sections: [{ id: 51, title: "EPP", order: 1 }] }],
};

export const PATH = {
  id: 7, name: "QA-TEST Ruta de incorporación de operarios de planta",
  description: "Formación obligatoria para operarios nuevos: seguridad, calidad y procedimientos.",
  status: "published",
  modules: [
    { id: 70, name: "Seguridad industrial", knowledge_source: 1, process_type: "course", is_required: true, estimated_duration_minutes: 30, order: 1 },
    { id: 71, name: "Calidad ISO 9001", knowledge_source: 2, process_type: "tutorial", is_required: true, estimated_duration_minutes: 20, order: 2 },
  ],
};

export const ASSIGNMENTS = [
  { id: 90, learning_path: 7, learning_path_name: "QA-TEST Ruta de incorporación de operarios de planta", assigned_by_username: "ana",
    user: 12, user_username: "leo.gomez", full_name: "Leo Gómez Martínez", status: "in_progress",
    progress: { percent_required: 50, completed_modules: 1, total_modules: 2 }, due_date: "2026-11-15" },
  { id: 91, learning_path: 7, learning_path_name: "QA-TEST Ruta de incorporación", team: 5, team_name: "Ventas Norte",
    status: "pending", progress: { percent_required: 0, completed_modules: 0, total_modules: 2 }, due_date: "2026-10-01", is_overdue: true },
];

export const GRAPH = {
  node_count: 3, edge_count: 2,
  nodes: [
    { id: 1, title: "QA-TEST Seguridad", node_type: "document", importance_score: "90.00", source_id: 1 },
    { id: 2, title: "EPP", node_type: "topic", importance_score: "70.00", source_id: 1, description: "casco, guantes" },
    { id: 3, title: "casco", node_type: "concept", importance_score: "50.00", source_id: 1 },
  ],
  relationships: [
    { id: 1, source_node_id: 1, target_node_id: 2, relationship_type: "related_to", strength: "0.900" },
    { id: 2, source_node_id: 2, target_node_id: 3, relationship_type: "related_to", strength: "0.600" },
  ],
};

export const PROGRAMS = [
  { id: 1, name: "QA-TEST Prevención de riesgos laborales anual", code: "PRL-2026", compliance_type: "safety", status: "active",
    frequency: "annual", is_mandatory: true, passing_score: 80, requires_score: true, requirement_count: 2, validity_days: 365,
    effective_date: "2026-01-01", expiry_date: "2026-12-31", description: "" },
];

export const TEMPLATES = [
  { id: 3, name: "QA-TEST Certificado de seguridad", code: "QA-1", template_type: "skill_mastery", is_active: true, issued_count: 4, minimum_score: 80, requires_score: true, validity_days: 365 },
];

export const TEAMS = [{ id: 1, name: "Ventas Norte" }, { id: 2, name: "Operaciones" }];

export const MEMBERS = [
  { id: 1, user: 11, full_name: "Ana Pérez", email: "ana@optisoft.test", role: "owner", employee_stage: "active_employee", status: "active" },
  { id: 2, user: 12, full_name: "Leo Gómez", email: "leo@optisoft.test", role: "manager", employee_stage: "onboarding", status: "active" },
];

/** Routes for setupApp(): a company owner with data on every page used by these specs. */
export const withCompany = {
  "GET /auth/me/$": () => ({ id: 1, username: "qa", first_name: "QA", email: "qa@test.com", is_staff: false }),
  "GET /enterprise/companies/$": () => COMPANY,
  "GET /enterprise/companies/1/$": () => ({ id: 1, name: "optisoft360", industry: "healthcare", company_size: "11_50" }),
  "GET /enterprise/companies/1/members/$": () => MEMBERS,
  "GET /enterprise/knowledge-sources/$": () => PROCESSES,
  "GET /enterprise/knowledge-sources/(1|2)/$": (req, url) => PROCESSES.find((p) => url.pathname.includes(`/knowledge-sources/${p.id}/`)),
  "GET /enterprise/knowledge-sources/(1|2)/results/$": () => RESULTS,
  "GET /enterprise/knowledge-sources/(1|2)/documents-with-sections/$": () => DOCS_WITH_SECTIONS,
  "GET /enterprise/learning-paths/$": () => [PATH],
  "GET /enterprise/learning-paths/7/$": () => PATH,
  "GET /enterprise/learning-assignments/$": () => ASSIGNMENTS,
  "GET /enterprise/learning-assignments/90/$": () => ASSIGNMENTS[0],
  "GET /enterprise/learning-assignments/90/progress/$": () => ({ completed_module_ids: [] }),
  "GET /enterprise/knowledge-graph/graph/$": () => GRAPH,
  "GET /enterprise/compliance-programs/$": () => PROGRAMS,
  "GET /enterprise/certificate-templates/$": () => TEMPLATES,
  "GET /enterprise/teams/$": () => TEAMS,
  "GET /enterprise/compliance-assignments/team-compliance/$": () => ({
    team_id: 1, member_count: 1, avg_compliance_rate: "50.00", compliant: 1, non_compliant: 1, pending: 0,
    members: [{ user_id: 5, user_name: "Ana QA", compliance_rate: "50.00", compliant: 1, non_compliant: 1, pending: 0 }],
  }),
  "GET /enterprise/retention/team-retention/$": () => ({
    team_id: 1, member_count: 1, members: [{ user_id: 5, name: "Ana QA", retention_score: "45.00", risk_score: "72.00", open_gaps: 2, last_assessment: null }],
  }),
};
