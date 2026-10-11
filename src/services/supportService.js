import axios from "axios";
import api, { API_BASE } from "./api";

const BASE = "/support-requests/";

const supportService = {
    /**
     * Sends a support request to the backend.
     * @param {Object} data - The support request data.
     * @param {string} data.name - The name of the user.
     * @param {string} data.phone - The phone number of the user.
     * @param {string} data.message - The message.
     * @param {string} data.source - The source of the request (e.g., "dashboard_home", "contact_page").
     */
    async sendSupportRequest(data) {
        try {
            const res = await api.post(BASE, data);
            return res.data;
        } catch (err) {
            throw err?.response?.data || { error: "Failed to send support request" };
        }
    },

    /**
     * Sends a lead from the public landing page (demo / pilot requests).
     * Goes without the Authorization header so a stale token in localStorage
     * can't turn an anonymous submission into a 401.
     * @returns {Promise<Object>} the created request; on failure throws { status, data }.
     */
    async sendPublicLead(data, language = "en") {
        try {
            const res = await axios.post(`${API_BASE}${BASE}`, data, {
                headers: { "Content-Type": "application/json", "Accept-Language": language },
            });
            return res.data;
        } catch (err) {
            throw { status: err?.response?.status, data: err?.response?.data };
        }
    },
};

export default supportService;
