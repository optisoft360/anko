import api, { setAuthToken } from "./api";

const BASE = "/auth/"; // Assuming DRF router registered AuthViewSet at /api/auth/

const authService = {
  async login({ username, password }) {
    try {
      const res = await api.post(`${BASE}login/`, { username, password });


      const { token, user } = res.data;

      if (token) setAuthToken(token);
      return { token, user };
    } catch (err) {
      throw err?.response?.data || { error: "Login failed" };
    }
  },

  async register(data) {
    try {
      // data should contain { username, email, password, first_name, last_name, ... }
      const res = await api.post(`${BASE}register/`, data);
      const { token, user } = res.data;
      if (token) setAuthToken(token);
      return res.data;
    } catch (err) {
      throw err?.response?.data || { error: "Register failed" };
    }
  },

  async me() {
    try {
      const res = await api.get(`${BASE}me/`);
      return res.data;
    } catch (err) {
      throw err?.response?.data || { error: "Unable to fetch user" };
    }
  },

  async updateProfile(data) {
    try {
      const res = await api.patch(`${BASE}me/`, data);
      return res.data;
    } catch (err) {
      throw err?.response?.data || { error: "Update profile failed" };
    }
  },

  async socialLogin(provider, accessToken) {
    try {
      const endpoint = `${BASE}${provider}/`; // e.g. /auth/google/ or /auth/facebook/

      const res = await api.post(endpoint, { access_token: accessToken });

      const { token, user } = res.data;
      if (token) setAuthToken(token);
      return { token, user };
    } catch (err) {
      console.error(`[AuthService] Error in socialLogin for ${provider}:`, err?.response?.status, err?.response?.data || err.message);
      throw err?.response?.data || { error: `Social login with ${provider} failed` };
    }
  },

  logout() {
    // C3: also delete the token on the server (best effort; never blocks signing out locally).
    if (localStorage.getItem("token")) api.post(`${BASE}logout/`).catch(() => {});
    setAuthToken(null);
  },

  async requestPasswordReset(email) {
    try {
      const res = await api.post(`${BASE}password-reset/`, { email });
      return res.data;
    } catch (err) {
      throw err?.response?.data || err;
    }
  },

  async confirmPasswordReset(data) {
    try {
      const res = await api.post(`${BASE}password-reset-confirm/`, data);
      return res.data;
    } catch (err) {
      throw err?.response?.data || { error: "Password reset confirmation failed" };
    }
  },

  async resendVerification(username) {
    try {
      const res = await api.post(`${BASE}resend-verification/`, { username });
      return res.data;
    } catch (err) {
      throw err?.response?.data || { error: "Failed to resend verification email" };
    }
  },

  async verifyEmail(token) {
    try {
      const res = await api.post(`${BASE}verify-email/`, { token });
      return res.data;
    } catch (err) {
      throw err?.response?.data || { error: "Verification failed" };
    }
  },

  async changePassword(data) {
    try {
      const res = await api.post(`${BASE}change-password/`, data);
      // C3: the API invalidates every token and returns a fresh one for this session.
      if (res.data?.token) setAuthToken(res.data.token);
      return res.data;
    } catch (err) {
      throw err?.response?.data || { error: "Password change failed" };
    }
  },

  async meContext() {
    try {
      const res = await api.get(`${BASE}me/context/`);
      return res.data;
    } catch (err) {
      throw err?.response?.data || { error: "Unable to fetch context" };
    }
  },

  async validateInvitation(token) {
    try {
      const res = await api.get(`/enterprise/invitations/validate/?token=${token}`);
      return res.data;
    } catch (err) {
      throw err?.response?.data || { error: "Invalid invitation" };
    }
  },

  async acceptInvitation(token) {
    try {
      const res = await api.post(`/enterprise/invitations/accept/`, { token });
      return res.data;
    } catch (err) {
      throw err?.response?.data || { error: "Failed to accept invitation" };
    }
  },
};

export default authService;
