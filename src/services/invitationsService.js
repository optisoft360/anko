import api from "./api";

// The axios client baseURL already ends in /api — paths must not repeat it.
const BASE = "/enterprise";

const invitationsService = {
  async listByCompany(companyId, params = {}) {
    const res = await api.get(`${BASE}/companies/${companyId}/invitations/`, { params });
    return res.data;
  },

  async resend(companyId, invitationId) {
    const res = await api.post(`${BASE}/companies/${companyId}/invitations/${invitationId}/resend/`);
    return res.data;
  },

  async cancel(companyId, invitationId) {
    await api.delete(`${BASE}/companies/${companyId}/invitations/${invitationId}/`);
  },

  async send(companyId, data) {
    const res = await api.post(`${BASE}/companies/${companyId}/invitations/`, data);
    return res.data;
  },

  async listGlobal(params = {}) {
    const res = await api.get(`${BASE}/invitations/global/`, { params });
    return res.data;
  },
};

export default invitationsService;
