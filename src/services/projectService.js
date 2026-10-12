import api, { API_BASE } from "./api";
import { apiFetch } from "../crypto/encriptedApi";

export { API_BASE };

const BASE = "/projects/";
const BASE_FLASHCARDS = "/flashcards";

const projectService = {
  async createProject(projectData, logoFile = null, documentFiles = []) {
    try {
      // 1) Crear proyecto (multipart porque puede incluir logo)
      const formData = new FormData();

      const title = (projectData.title ?? projectData.name ?? "").trim();
      formData.append("title", title);
      formData.append("description", projectData.description?.trim() || "");
      if (logoFile) formData.append("logo", logoFile);

      const res = await api.post(`${BASE}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const project = res.data;
      const projectId = project?.id;

      // 2) Subir documentos si existen (requiere endpoint backend)
      if (projectId && documentFiles && documentFiles.length > 0) {
        await this.uploadDocuments(projectId, documentFiles);
      }

      return project;
    } catch (err) {
      throw err?.response?.data || { error: "Failed to create project" };
    }
  },

  async uploadDocuments(projectId, files) {
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));

      const res = await api.post(`/projects/${projectId}/documents/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      return res.data;
    } catch (err) {
      throw err?.response?.data || { error: "Failed to upload documents" };
    }
  },


  async getProjects(params = {}) {
    try {
      const token = localStorage.getItem("token");
      const queryString = new URLSearchParams(params).toString();
      const url = `${API_BASE}${BASE}${queryString ? `?${queryString}` : ""}`;

      const { ok, data, status } = await apiFetch(url, { token });

      if (!ok) {
        throw data || { error: "Failed to fetch projects" };
      }

      return data;
    } catch (err) {
      throw err?.response?.data || err || { error: "Failed to fetch projects" };
    }
  },

  async getProjectDetail(id) {
    try {
      const token = localStorage.getItem("token");
      const url = `${API_BASE}${BASE}${id}/`;

      const { ok, data } = await apiFetch(url, { token });

      if (!ok) {
        throw data || { error: "Failed to fetch project" };
      }

      return data;
    } catch (err) {
      throw err?.response?.data || err || { error: "Failed to fetch project" };
    }
  },

  async getProjectCounts(projectId) {
    try {
      const token = localStorage.getItem("token");
      const url = `${API_BASE}${BASE}${projectId}/counts/`;

      const { ok, data } = await apiFetch(url, { token });

      if (!ok) {
        throw data || { error: "Failed to fetch counts" };
      }

      return data;
    } catch (err) {
      throw err?.response?.data || err || { error: "Failed to fetch counts" };
    }
  },
  async getProjectDocuments(projectId, page = 1, pageSize = 1) {
    try {
      const token = localStorage.getItem("token");
      const url = `${API_BASE}/projects/${projectId}/documents/?page=${page}&page_size=${pageSize}`;

      const { ok, data } = await apiFetch(url, { token });

      if (!ok) {
        throw data || { error: "Failed to fetch documents" };
      }

      return data;
    } catch (err) {
      throw err?.response?.data || err || { error: "Failed to fetch documents" };
    }
  },

  async uploadProjectDocuments(projectId, files) {
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));

      const res = await api.post(`/projects/${projectId}/documents/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      return res.data;
    } catch (err) {
      throw err?.response?.data || { error: "Failed to upload documents" };
    }
  },

  async getDocumentsWithSections(projectId, documentId = null) {
    try {
      const token = localStorage.getItem("token");

      // Helper: extracts a document object from whatever shape the API returns
      const extractDocument = (data, targetId = null) => {
        // New format: { document: {...} }
        if (data?.document && typeof data.document === "object") return data.document;
        // Paginated format: { count, results: [...], projectId }
        if (Array.isArray(data?.results)) {
          const found = targetId ? data.results.find(d => String(d.id) === String(targetId)) : data.results[0];
          return found || null;
        }
        // Old/compat format: { documents: [...] }
        if (Array.isArray(data?.documents)) {
          const found = targetId ? data.documents.find(d => String(d.id) === String(targetId)) : data.documents[0];
          return found || null;
        }
        // Raw document: { id, sections, ... }
        if (data?.id && Array.isArray(data?.sections)) return data;
        // Array directly (no wrapper): [{id, sections}, ...]
        if (Array.isArray(data)) {
          const found = targetId ? data.find(d => String(d.id) === String(targetId)) : data[0];
          return found || null;
        }
        console.warn("[getDocumentsWithSections] extractDocument: unrecognized shape", data);
        return null;
      };

      if (documentId) {
        const url = `${API_BASE}/projects/${projectId}/documents-with-sections/?document_id=${documentId}`;
        const { ok, data } = await apiFetch(url, { token });
        if (!ok) throw data || { error: "Failed to fetch document sections" };
        const doc = extractDocument(data, documentId);
        return { projectId, document: doc };
      }

      // No documentId: first get all docs for the project, then fetch sections per-doc
      const docsData = await this.getProjectDocuments(projectId, 1, 200);
      const docs = Array.isArray(docsData) ? docsData : docsData?.results || [];

      const documentsWithSections = await Promise.all(
        docs.map(async (doc) => {
          try {
            const url = `${API_BASE}/projects/${projectId}/documents-with-sections/?document_id=${doc.id}`;
            const { ok, data } = await apiFetch(url, { token });
            if (!ok) return null;
            return extractDocument(data, doc.id);
          } catch {
            return null;
          }
        })
      );

      return {
        projectId,
        documents: documentsWithSections.filter(Boolean),
      };
    } catch (err) {
      throw err?.response?.data || err || { error: "Failed to fetch document sections" };
    }
  },

  async deleteDocument(documentId) {
    try {
      await api.delete(`/documents/${documentId}/`);
    } catch (err) {
      if (err?.response?.status === 502) {
        throw { error: "Storage error: could not delete the file from storage. Please try again.", status: 502 };
      }
      throw err?.response?.data || { error: "Failed to delete document" };
    }
  },

  async getDeckCards(deckId) {
    try {
      const token = localStorage.getItem("token");
      const url = `${API_BASE}/decks/${deckId}/cards/`;
      const { ok, data } = await apiFetch(url, { token });
      if (!ok) throw data || { error: "Failed to fetch deck cards" };
      return data;
    } catch (err) {
      throw err?.response?.data || err || { error: "Failed to fetch deck cards" };
    }
  },

  async getBatteryQuestions(batteryId) {
    try {
      const token = localStorage.getItem("token");
      const url = `${API_BASE}/batteries/${batteryId}/questions/`;
      const { ok, data } = await apiFetch(url, { token });
      if (!ok) throw data || { error: "Failed to fetch battery questions" };
      return data;
    } catch (err) {
      throw err?.response?.data || err || { error: "Failed to fetch battery questions" };
    }
  },
  async registerDocument(data) {
    try {
      const resp = await api.post("/documents/register/", data);
      return resp.data;
    } catch (err) {
      throw err?.response?.data || { error: "Failed to register document" };
    }
  },

  async getDocumentTags(documentId) {
    try {
      const token = localStorage.getItem("token");
      const url = `${API_BASE}/documents/${documentId}/tags/`;
      const { ok, data } = await apiFetch(url, { token });
      if (!ok) throw data || { error: "Failed to fetch document tags" };
      return data;
    } catch (err) {
      throw err?.response?.data || err || { error: "Failed to fetch document tags" };
    }
  },

  async getDocumentSummary(documentId) {
    try {
      const token = localStorage.getItem("token");
      const url = `${API_BASE}/documents/${documentId}/summary/`;
      const { ok, data } = await apiFetch(url, { token });
      if (!ok) throw data || { error: "Failed to fetch document summary" };
      return data;
    } catch (err) {
      throw err?.response?.data || err || { error: "Failed to fetch document summary" };
    }
  },

  async getDocumentRelatedLearning(documentId) {
    try {
      const token = localStorage.getItem("token");
      const url = `${API_BASE}/documents/${documentId}/related-learning/`;
      const { ok, data } = await apiFetch(url, { token });
      if (!ok) throw data || { error: "Failed to fetch document related entries" };
      return data;
    } catch (err) {
      throw err?.response?.data || err || { error: "Failed to fetch document related entries" };
    }
  },

  async getDocumentDownloadUrl(documentId, mode = 'view') {
    try {
      const token = localStorage.getItem("token");
      const url = `${API_BASE}/documents/${documentId}/download-url/?mode=${mode}`;
      const { ok, data } = await apiFetch(url, {
        token,
        headers: { "Accept-Language": "en" }
      });
      if (!ok) throw data || { error: "Failed to fetch download URL" };
      return data;
    } catch (err) {
      throw err?.response?.data || err || { error: "Failed to fetch download URL" };
    }
  },

  async fetchDocumentWithAuth(url) {
    try {
      const token = localStorage.getItem("token");
      const headers = {};
      if (token) {
        headers["Authorization"] = `Token ${token}`;
      }

      const response = await fetch(url, { headers });
      if (!response.ok) throw new Error(`Failed to fetch file from storage: ${response.statusText}`);
      const blob = await response.blob();
      return window.URL.createObjectURL(blob);
    } catch (err) {
      throw err?.response?.data || { error: "Failed to download document" };
    }
  },

  async getBatterySummary(batteryId, language = "en") {
    try {
      const token = localStorage.getItem("token");
      const url = `${API_BASE}/summary-jobs/by-battery/${batteryId}/?language=${language}`;
      const { ok, data } = await apiFetch(url, { token });
      if (!ok) throw data || { error: "Failed to fetch battery summary" };
      return data;
    } catch (err) {
      throw err?.response?.data || err || { error: "Failed to fetch battery summary" };
    }
  },

  async getDeckSummary(deckId, language = "en") {
    try {
      const token = localStorage.getItem("token");
      const url = `${API_BASE}/summary-jobs/by-deck/${deckId}/?language=${language}`;
      const { ok, data } = await apiFetch(url, { token });
      if (!ok) throw data || { error: "Failed to fetch deck summary" };
      return data;
    } catch (err) {
      throw err?.response?.data || err || { error: "Failed to fetch deck summary" };
    }
  },


  async updateProject(id, projectData) {
    try {
      const res = await api.patch(`${BASE}${id}/`, projectData);
      return res.data;
    } catch (err) {
      throw err?.response?.data || { error: "Failed to update project" };
    }
  },

  async deleteProject(id) {
    try {
      await api.delete(`${BASE}${id}/`);
    } catch (err) {
      throw err?.response?.data || { error: "Failed to delete project" };
    }
  },

  // -------- TOPICS --------
  async getProjectTopics(projectId, page = 1, pageSize = 1) {
    try {
      const token = localStorage.getItem("token");
      const url = `${API_BASE}/topics/?project=${projectId}&page=${page}&page_size=${pageSize}`;
      const { ok, data } = await apiFetch(url, { token });
      if (!ok) throw data || { error: "Failed to fetch project topics" };
      return data;
    } catch (err) {
      throw err?.response?.data || err || { error: "Failed to fetch project topics" };
    }
  },

  async createTopic(projectId, payload) {
    const res = await api.post("/topics/", {
      project: projectId,
      status: "active",
      ...payload,
    });
    return res.data;
  },

  async updateTopic(topicId, payload) {
    const res = await api.patch(`/topics/${topicId}/`, payload);
    return res.data;
  },

  async deleteTopic(topicId) {
    const res = await api.delete(`/topics/${topicId}/`);
    return res.data;
  },


  async getAllRules(page = 1, pageSize = 10) {
    try {
      const token = localStorage.getItem("token");
      const url = `${API_BASE}/rules/?page=${page}&page_size=${pageSize}`;
      const { ok, data } = await apiFetch(url, { token });
      if (!ok) throw data || { error: "Failed to fetch rules" };
      return data;
    } catch (err) {
      throw err?.response?.data || err || { error: "Failed to fetch rules" };
    }
  },

  async getMembershipStatus() {
    try {
      const token = localStorage.getItem("token");
      const url = `${API_BASE}/subscriptions/me/`;
      const { ok, data } = await apiFetch(url, { token });
      if (!ok) throw data || { error: "Failed to fetch membership status" };
      return data;
    } catch (err) {
      // Fallback if endpoint not ready
      console.warn("Membership endpoint not available, returning default Free tier");
      return {
        tier: "Free",
        limit: 2,
        usage: 0,
        remaining_days: 5
      };
    }
  },

  async getAllBatteries(page = 1, pageSize = 10) {
    try {
      const token = localStorage.getItem("token");
      const url = `${API_BASE}/batteries/?page=${page}&page_size=${pageSize}`;
      const { ok, data } = await apiFetch(url, { token });
      if (!ok) throw data || { error: "Failed to fetch batteries" };
      return data;
    } catch (err) {
      throw err?.response?.data || err || { error: "Failed to fetch batteries" };
    }
  },

  async archiveTopic(topicId) {
    const res = await api.patch(`/topics/${topicId}/`, {
      status: "archived",
    });
    return res.data;
  },

  async downloadDeckPdf(deckId, language = "en", printMode = "book") {
    const token = localStorage.getItem("token");
    const url = `${API_BASE}/decks/${deckId}/download-flashcards-pdf/?print_mode=${printMode}&disposition=attachment`;
    const res = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Token ${token}`, "Accept-Language": language },
    });
    if (!res.ok) throw new Error(`Download failed: ${res.status}`);
    const blob = await res.blob();
    const cd = res.headers.get("Content-Disposition") || "";
    const match = cd.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
    const filename = match ? decodeURIComponent(match[1].replace(/"/g, "")) : `deck_${deckId}_${language}.pdf`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  },

  async downloadBatteryPdf(batteryId, language = "en") {
    const token = localStorage.getItem("token");
    const url = `${API_BASE}/batteries/${batteryId}/download-questions-pdf/?disposition=attachment`;
    const res = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Token ${token}`, "Accept-Language": language },
    });
    if (!res.ok) throw new Error(`Download failed: ${res.status}`);
    const blob = await res.blob();
    const cd = res.headers.get("Content-Disposition") || "";
    const match = cd.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
    const filename = match ? decodeURIComponent(match[1].replace(/"/g, "")) : `battery_${batteryId}_${language}.pdf`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  },

  async getBattery(batteryId) {
    try {
      const token = localStorage.getItem("token");
      const url = `${API_BASE}/batteries/${batteryId}/`;
      const { ok, data } = await apiFetch(url, { token });
      if (!ok) throw data || { error: "Failed to fetch battery" };
      return data;
    } catch (err) {
      throw err?.response?.data || err || { error: "Failed to fetch battery" };
    }
  },

  async getProjectRules(projectId, page = 1, pageSize = 1) {
    try {
      const token = localStorage.getItem("token");
      const url = `${API_BASE}/rules/?project=${projectId}&page=${page}&page_size=${pageSize}`;
      const { ok, data } = await apiFetch(url, { token });
      if (!ok) throw data || { error: "Failed to fetch project rules" };
      return data;
    } catch (err) {
      throw err?.response?.data || err || { error: "Failed to fetch project rules" };
    }
  },

  async createRule(projectId, payload) {
    // payload debe incluir fields requeridos
    const res = await api.post(`/rules/`, {
      ...payload,
      project: projectId,
    });
    return res.data;
  },

  async updateRule(ruleId, payload) {
    const res = await api.patch(`/rules/${ruleId}/`, payload);
    return res.data;
  },

  async deleteRule(ruleId) {
    const res = await api.delete(`/rules/${ruleId}/`);
    return res.data;
  },


  // -------- BATTERIES --------
  async getProjectBatteries(projectId, page = 1, pageSize = 1) {
    try {
      const token = localStorage.getItem("token");
      const url = `${API_BASE}/batteries/?project=${projectId}&page=${page}&page_size=${pageSize}`;

      const { ok, data } = await apiFetch(url, { token });

      if (!ok) {
        throw data || { error: "Failed to fetch batteries" };
      }

      return data;
    } catch (err) {
      throw err?.response?.data || err || { error: "Failed to fetch batteries" };
    }
  },

  async getUserBatteries(page = 1, pageSize = 1) {
    try {
      const token = localStorage.getItem("token");
      const url = `${API_BASE}/batteries/my/?page=${page}&page_size=${pageSize}`;

      const { ok, data } = await apiFetch(url, { token });

      if (!ok) {
        throw { ...(typeof data === 'object' ? data : { error: data }), status };
      }

      return data;
    } catch (err) {
      throw err?.response?.data || err || { error: "Failed to fetch user batteries" };
    }
  },

  async createBattery(projectId, payload) {
    try {
      const res = await api.post("/batteries/", {
        project: projectId,
        status: "Draft",              // default
        questions: [],                // MVP
        ...payload,
      });
      return res.data;
    } catch (err) {
      throw err?.response?.data || { error: "Failed to create battery" };
    }
  },

  async updateBattery(batteryId, payload) {
    try {
      const res = await api.patch(`/batteries/${batteryId}/`, payload);
      return res.data;
    } catch (err) {
      throw err?.response?.data || { error: "Failed to update battery" };
    }
  },

  async deleteBattery(batteryId) {
    try {
      const res = await api.delete(`/batteries/${batteryId}/`);
      return res.data;
    } catch (err) {
      throw err?.response?.data || { error: "Failed to delete battery" };
    }
  },

  async markBatteryReady(batteryId) {
    try {
      // ✅ opción A: si hiciste el action mark_ready en backend
      const res = await api.post(`/batteries/${batteryId}/mark_ready/`);
      return res.data;

      // ✅ opción B (si NO hiciste action): usa updateBattery:
      // return await this.updateBattery(batteryId, { status: "Ready" });
    } catch (err) {
      throw err?.response?.data || { error: "Failed to mark battery as ready" };
    }
  },

  async markBatteryDraft(batteryId) {
    try {
      // ✅ opción A: si hiciste el action mark_draft en backend
      const res = await api.post(`/batteries/${batteryId}/mark_draft/`);
      return res.data;

      // ✅ opción B (si NO hiciste action): usa updateBattery:
      // return await this.updateBattery(batteryId, { status: "Draft" });
    } catch (err) {
      throw err?.response?.data || { error: "Failed to mark battery as draft" };
    }
  },

  async startGenerateBattery(payload) {
    try {
      const res = await api.post("/batteries/start-generate/", payload);
      return res.data;
    } catch (err) {
      throw err?.response?.data || { error: "Failed to start battery generation" };
    }
  },

  async saveQuestionsFromQa(batteryId) {
    try {
      const res = await api.post(`/batteries/${batteryId}/save-questions-from-qa/`);
      return res.data;
    } catch (err) {
      throw err?.response?.data || { error: "Failed to save questions from QA" };
    }
  },



  async getTopics(page = 1, pageSize = 10) {
    try {
      const token = localStorage.getItem("token");
      const url = `${API_BASE}/topics/?page=${page}&page_size=${pageSize}`;
      const { ok, data } = await apiFetch(url, { token });
      if (!ok) throw data || { error: "Failed to fetch topics" };
      return data;
    } catch (err) {
      throw err?.response?.data || err || { error: "Failed to fetch topics" };
    }
  },

  // -------- BATTERY ENCRYPTED ACTIONS --------
  async getBatteryAttempts(batteryId) {
    try {
      const token = localStorage.getItem("token");
      const url = `${API_BASE}/batteries/${batteryId}/attempts/`;

      const { ok, data } = await apiFetch(url, { token });

      if (!ok) {
        throw data || { error: "Failed to fetch battery attempts" };
      }

      return data;
    } catch (err) {
      throw err?.response?.data || err || { error: "Failed to fetch battery attempts" };
    }
  },

  // UNUSED-CLEANUP (2026-10-11): 0 usos; llama a /batteries/{id}/results/ que no existe en el backend
  // async getBatteryResults(batteryId) {
  //   try {
  //     const token = localStorage.getItem("token");
  //     const url = `${API_BASE}/batteries/${batteryId}/results/`;
  //
  //     const { ok, data } = await apiFetch(url, { token });
  //
  //     if (!ok) {
  //       throw data || { error: "Failed to fetch battery results" };
  //     }
  //
  //     return data;
  //   } catch (err) {
  //     throw err?.response?.data || err || { error: "Failed to fetch battery results" };
  //   }
  // },
  // END UNUSED-CLEANUP

  // UNUSED-CLEANUP (2026-10-11): 0 usos; llama a /batteries/{id}/stats/ que no existe en el backend
  // async getBatteryStats(batteryId) {
  //   try {
  //     const token = localStorage.getItem("token");
  //     const url = `${API_BASE}/batteries/${batteryId}/stats/`;
  //
  //     const { ok, data } = await apiFetch(url, { token });
  //
  //     if (!ok) {
  //       throw data || { error: "Failed to fetch battery stats" };
  //     }
  //
  //     return data;
  //   } catch (err) {
  //     throw err?.response?.data || err || { error: "Failed to fetch battery stats" };
  //   }
  // },
  // END UNUSED-CLEANUP

  // -------- BATTERY ATTEMPTS --------
  async startBatteryAttempt(batteryId) {
    try {
      const res = await api.post(`/batteries/${batteryId}/start_attempt/`);
      return res.data;
    } catch (err) {
      throw err?.response?.data || { error: "Failed to start attempt" };
    }
  },

  // UNUSED-CLEANUP (2026-10-11): 0 usos; llama a /batteries/{id}/submit_answers/ que no existe en el backend
  // async submitBatteryAnswers(batteryId, payload) {
  //   try {
  //     const res = await api.post(`/batteries/${batteryId}/submit_answers/`, payload);
  //     return res.data;
  //   } catch (err) {
  //     throw err?.response?.data || { error: "Failed to submit answers" };
  //   }
  // },
  // END UNUSED-CLEANUP

  async finishBatteryAttempt(batteryId, payload) {
    try {
      const res = await api.post(`/batteries/${batteryId}/finish_attempt/`, payload);
      return res.data;
    } catch (err) {
      throw err?.response?.data || { error: "Failed to finish attempt" };
    }
  },

  async answerBatteryQuestion(batteryId, payload) {
    try {
      const res = await api.post(`/batteries/${batteryId}/answer/`, payload);
      return res.data;
    } catch (err) {
      throw err?.response?.data || { error: "Failed to save answer" };
    }
  },

  // -------- SECTIONS (GLOBAL) --------
  async getAllSections() {
    try {
      const token = localStorage.getItem("token");
      const url = `${API_BASE}/sections/`;
      const { ok, data } = await apiFetch(url, { token });
      if (!ok) throw data || { error: "Failed to fetch sections" };
      return data;
    } catch (err) {
      throw err?.response?.data || err || { error: "Failed to fetch sections" };
    }
  },

  async deleteSection(sectionId) {
    const res = await api.delete(`/sections/${sectionId}/`);
    return res.data;
  },




  // -------- GENERIC CRUD (GLOBAL) --------
  async getList(resource, params = {}) {
    try {
      const token = localStorage.getItem("token");
      const queryString = new URLSearchParams(params).toString();
      const url = `${API_BASE}/${resource}/${queryString ? `?${queryString}` : ""}`;
      const { ok, data } = await apiFetch(url, { token });
      if (!ok) throw data || { error: `Failed to fetch ${resource}` };
      return data;
    } catch (err) {
      throw err?.response?.data || err || { error: `Failed to fetch ${resource}` };
    }
  },

  async createItem(resource, payload) {
    const res = await api.post(`/${resource}/`, payload);
    return res.data;
  },

  async updateItem(resource, id, payload) {
    const res = await api.patch(`/${resource}/${id}/`, payload);
    return res.data;
  },

  async deleteItem(resource, id) {
    const res = await api.delete(`/${resource}/${id}/`);
    return res.data;
  },

  // -------- DECKS --------
  async getProjectDecks(projectId, page = 1, pageSize = 1) {
    try {
      const token = localStorage.getItem("token");
      const url = `${API_BASE}/decks/?project=${projectId}&page=${page}&page_size=${pageSize}`;

      const { ok, data } = await apiFetch(url, { token });

      if (!ok) {
        throw data || { error: "Failed to fetch decks" };
      }

      return data;
    } catch (err) {
      throw err?.response?.data || err || { error: "Failed to fetch decks" };
    }
  },

  async getUserDecks(page = 1, pageSize = 1) {
    try {
      const token = localStorage.getItem("token");
      const url = `${API_BASE}/decks/my/?page=${page}&page_size=${pageSize}`;

      const { ok, data } = await apiFetch(url, { token });

      if (!ok) {
        throw { ...(typeof data === 'object' ? data : { error: data }), status };
      }

      return data;
    } catch (err) {
      throw err?.response?.data || err || { error: "Failed to fetch user decks" };
    }
  },

  async getPublicDecks(page = 1, pageSize = 1) {
    try {
      const token = localStorage.getItem("token");
      const url = `${API_BASE}/public/decks/?page=${page}&page_size=${pageSize}`;

      const { ok, data } = await apiFetch(url, { token });

      if (!ok) {
        throw data || { error: "Failed to fetch public decks" };
      }

      return data;
    } catch (err) {
      throw err?.response?.data || err || { error: "Failed to fetch public decks" };
    }
  },

  async getPublicBatteries(page = 1, pageSize = 1) {
    try {
      const token = localStorage.getItem("token");
      const url = `${API_BASE}/public/batteries/?page=${page}&page_size=${pageSize}`;

      const { ok, data } = await apiFetch(url, { token });

      if (!ok) {
        throw data || { error: "Failed to fetch public batteries" };
      }

      return data;
    } catch (err) {
      throw err?.response?.data || err || { error: "Failed to fetch public batteries" };
    }
  },

  async requestBatteryAccess(batteryId) {
    try {
      const res = await api.post(`/access-requests/`, {
        battery_id: batteryId,
        requested_access: "view"
      });
      return res.data;
    } catch (err) {
      throw err?.response?.data || { error: "Failed to request access" };
    }
  },

  async requestDeckAccess(deckId) {
    try {
      const res = await api.post(`/access-requests/`, {
        deck_id: deckId,
        requested_access: "view"
      });
      return res.data;
    } catch (err) {
      throw err?.response?.data || { error: "Failed to request access" };
    }
  },

  async approveAccessRequest(id) {
    try {
      const res = await api.post(`/access-requests/${id}/approve/`);
      return res.data;
    } catch (err) {
      throw err?.response?.data || { error: "Failed to approve access request" };
    }
  },

  async rejectAccessRequest(id) {
    try {
      const res = await api.post(`/access-requests/${id}/reject/`);
      return res.data;
    } catch (err) {
      throw err?.response?.data || { error: "Failed to reject access request" };
    }
  },

  async getUserStatistics(userId) {
    try {
      const token = localStorage.getItem("token");
      const params = userId ? { user_id: userId } : {};
      const queryString = new URLSearchParams(params).toString();
      const url = `${API_BASE}/statistics/${queryString ? `?${queryString}` : ""}`;
      const { ok, data } = await apiFetch(url, { token });
      if (!ok) throw data || { error: "Failed to fetch statistics" };
      return data;
    } catch (err) {
      throw err?.response?.data || err || { error: "Failed to fetch statistics" };
    }
  },

  async createDeck(projectId, payload) {
    try {
      const res = await api.post("/decks/", {
        project: projectId,
        ...payload,
      });
      return res.data;
    } catch (err) {
      throw err?.response?.data || { error: "Failed to create deck" };
    }
  },

  // Modern deck generation endpoint: project is optional (inferred from
  // document_ids/section_ids/tag_group_ids), and tag_group_ids is supported —
  // unlike the legacy create-with-cards endpoint below.
  async startGenerateDeck(payload) {
    try {
      const res = await api.post("/decks/start-generate/", payload);
      return res.data;
    } catch (err) {
      throw err?.response?.data || { error: "Failed to start deck generation" };
    }
  },

  async createDeckWithCards(payload) {
    try {
      const res = await api.post("/decks/create-with-cards/", payload);
      return res.data;
    } catch (err) {
      throw err?.response?.data || { error: "Failed to create deck with cards" };
    }
  },

  async createDeckManual(payload) {
    try {
      const res = await api.post("/decks/create-with-flashcards/", payload);
      return res.data;
    } catch (err) {
      throw err?.response?.data || { error: "Failed to create deck manually" };
    }
  },

  async getDeckFlashcards(deckId, jobId = null) {
    try {
      const token = localStorage.getItem("token");
      const params = { deck: deckId, page_size: 1000 };
      if (jobId) params.job_id = jobId;

      const queryString = new URLSearchParams(params).toString();
      let url = `${API_BASE}/flashcards/${queryString ? `?${queryString}` : ""}`;

      let allResults = [];
      let totalCount = 0;

      // Fetch all pages to get every card in the deck
      while (url) {
        const { ok, data } = await apiFetch(url, { token });
        if (!ok) throw data || { error: "Failed to fetch flashcards" };

        if (Array.isArray(data)) {
          allResults = allResults.concat(data);
          url = null;
        } else {
          allResults = allResults.concat(data.results || []);
          totalCount = data.count || allResults.length;
          url = data.next || null;
        }
      }

      return { count: totalCount || allResults.length, results: allResults, next: null, previous: null };
    } catch (err) {
      throw err?.response?.data || err || { error: "Failed to fetch flashcards" };
    }
  },

  async getFlashcardDetail(flashcardId) {
    try {
      const token = localStorage.getItem("token");
      const url = `${API_BASE}/flashcards/${flashcardId}/`;

      const { ok, data } = await apiFetch(url, { token });

      if (!ok) {
        throw data || { error: "Failed to fetch flashcard detail" };
      }

      return data;
    } catch (err) {
      throw err?.response?.data || err || { error: "Failed to fetch flashcard detail" };
    }
  },



  async syncFlashcardsFromJob(deckId, jobId) {
    try {
      const token = localStorage.getItem("token");
      // Backend expects query params: /flashcards/sync-from-job/?deck=...&job_id=...
      const url = `${API_BASE}/flashcards/sync-from-job/?deck=${deckId}&job_id=${jobId}`;

      const { ok, data } = await apiFetch(url, { method: "POST", token });

      if (!ok) {
        throw data || { error: "Failed to sync flashcards from job" };
      }

      return data;
    } catch (err) {
      throw err?.response?.data || err || { error: "Failed to sync flashcards from job" };
    }
  },

  async getRichCardConfig() {
    try {
      const res = await api.get("/decks/rich-card-config/");
      return res.data;
    } catch (err) {
      throw err?.response?.data || { error: "Failed to get rich card config" };
    }
  },

  async addRichCard(deckId, formData) {
    try {
      const res = await api.post(`/decks/${deckId}/add-rich-card/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    } catch (err) {
      throw err?.response?.data || { error: "Failed to add rich card" };
    }
  },

  async addFlashcards(payload) {
    try {
      const res = await api.post("/decks/add-flashcards/", payload);
      return res.data;
    } catch (err) {
      throw err?.response?.data || { error: "Failed to add flashcards" };
    }
  },

  async updateDeck(deckId, payload) {
    try {
      const res = await api.patch(`/decks/${deckId}/`, payload);
      return res.data;
    } catch (err) {
      throw err?.response?.data || { error: "Failed to update deck" };
    }
  },

  async deleteDeck(deckId) {
    try {
      const res = await api.delete(`/decks/${deckId}/`);
      return res.data;
    } catch (err) {
      throw err?.response?.data || { error: "Failed to delete deck" };
    }
  },

  async wsPullCard({ deckId, jobId, lastSeq = 0 }) {
    try {
      const token = localStorage.getItem("token");
      const url = `${API_BASE}${BASE_FLASHCARDS}/ws-pull-card/`;

      const { ok, data } = await apiFetch(url, {
        method: "POST",
        token,
        body: JSON.stringify({
          deck_id: deckId,
          job_id: jobId,
          last_seq: lastSeq,
        }),
      });

      if (!ok) {
        throw data || { error: "Failed to pull card" };
      }

      return data;
    } catch (err) {
      throw err?.response?.data || err || { error: "Failed to pull card" };
    }
  },

  async wsPushFeedback({ deckId, jobId, seq, cardId, rating, timeToAnswerMs = 500 }) {
    try {
      const res = await api.post(`${BASE_FLASHCARDS}/ws-push-feedback/`, {
        deck_id: deckId,
        job_id: jobId,
        seq,
        card_id: cardId,
        rating,
        time_to_answer_ms: timeToAnswerMs,
      });
      return res.data;
    } catch (err) {
      throw err?.response?.data || { error: "Failed to push feedback" };
    }
  },

  async shuffleDeckCards(deckId) {
    try {
      const res = await api.post(`${BASE_FLASHCARDS}/shuffle-deck-cards/`, {
        deck_id: deckId,
      });
      return res.data;
    } catch (err) {
      throw err?.response?.data || { error: "Failed to shuffle deck" };
    }
  },

  async askProject(payload) {
    try {
      const res = await api.post(`${BASE}ask/`, payload);
      return res.data;
    } catch (err) {
      throw err?.response?.data || { error: "Failed to get AI response" };
    }
  },

  async getChatSessionMessages(index = 1) {
    try {
      const token = localStorage.getItem("token");
      const url = `${API_BASE}${BASE}chat/session-messages/?index=${index}`;
      const { ok, data } = await apiFetch(url, { token });
      if (!ok) throw data || { error: "Failed to fetch session messages" };
      return data;
    } catch (err) {
      throw err?.response?.data || err || { error: "Failed to fetch session messages" };
    }
  },
};

export default projectService;
