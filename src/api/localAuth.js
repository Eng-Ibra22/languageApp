// src/api/localAuth.js
// Thin wrapper over our local Express auth server (http://localhost:5000)
// Used instead of base44.auth.* when running locally.

const BASE = import.meta.env.VITE_BASE44_APP_BASE_URL || '';

const TOKEN_KEY = 'lingua_local_token';

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.error || data.message || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }

  return data;
}

export const localAuth = {
  /** Register a new user. Returns { access_token, user }. */
  async register({ email, password, full_name = '' }) {
    const data = await request('POST', '/api/auth/register', { email, password, full_name });
    if (data.access_token) setToken(data.access_token);
    return data;
  },

  /** Log in with email + password. Sets token in localStorage. */
  async loginViaEmailPassword(email, password) {
    const data = await request('POST', '/api/auth/login', { email, password });
    if (data.access_token) setToken(data.access_token);
    return data;
  },

  /** Returns the current user profile from the server. */
  async me() {
    return request('GET', '/api/auth/me');
  },

  /** Verify OTP (auto-approved locally). */
  async verifyOtp({ email, otpCode }) {
    const data = await request('POST', '/api/auth/verify-otp', { email, otpCode });
    if (data.access_token) setToken(data.access_token);
    return data;
  },

  /** Request a password reset email (stubbed). */
  async sendPasswordResetEmail(email) {
    return request('POST', '/api/auth/forgot-password', { email });
  },

  async resetPassword(token, newPassword) {
    return request('POST', '/api/auth/reset-password', { token, newPassword });
  },

  /** Log out and clear token. */
  logout(redirectUrl = '/login') {
    clearToken();
    window.location.href = redirectUrl;
  },

  /** Redirect to login (alias for logout in local mode). */
  redirectToLogin() {
    clearToken();
    window.location.href = '/login';
  },

  /** Manually set the token (used after OTP verify). */
  setToken,
  getToken,

  /** Stub — Google OAuth won't work locally. */
  loginWithProvider(provider, redirectUrl) {
    alert(`⚠️  Social login (${provider}) is not available in local dev mode.\n\nPlease use email/password registration instead.`);
  },

  /** Stub — no OTP resend needed locally. */
  async resendOtp(email) {
    console.log(`[localAuth] resendOtp requested for ${email} — auto-approved locally`);
    return { message: 'OTP re-sent (auto-approved in local mode)' };
  },
};
