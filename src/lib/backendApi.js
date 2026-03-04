import { BACKEND_URL } from './runtimeConfig';

class ApiRequestError extends Error {
  constructor(message, { type = 'http', status = null, method, url, rawError } = {}) {
    super(message);
    this.name = 'ApiRequestError';
    this.type = type;
    this.status = status;
    this.method = method;
    this.url = url;
    this.rawError = rawError;
  }
}

function buildHeaders(accessToken, extraHeaders = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return headers;
}

export async function apiRequest(path, { method = 'GET', body, accessToken } = {}) {
  const url = `${BACKEND_URL}${path}`;

  if (!/^https?:\/\//i.test(BACKEND_URL)) {
    const error = new ApiRequestError('URL do backend inválida.', {
      type: 'url',
      method,
      url,
      rawError: `BACKEND_URL=${BACKEND_URL}`,
    });
    console.error('[API][URL_ERRADA]', {
      method,
      url,
      details: error.rawError,
    });
    throw error;
  }

  let response;
  try {
    response = await fetch(url, {
      method,
      headers: buildHeaders(accessToken),
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (networkError) {
    const rawMessage = networkError instanceof Error ? networkError.message : String(networkError);
    const type = /invalid url/i.test(rawMessage) ? 'url' : 'network';
    const error = new ApiRequestError('Falha de ligação à API.', {
      type,
      method,
      url,
      rawError: rawMessage,
    });

    console.error(type === 'url' ? '[API][URL_ERRADA]' : '[API][REDE]', {
      method,
      url,
      details: rawMessage,
    });

    throw error;
  }

  if (!response.ok) {
    const rawError = await response.text();
    const type = response.status === 401 || response.status === 403
      ? 'token'
      : response.status === 404
        ? 'url'
        : 'http';
    const message = rawError || `Erro HTTP ${response.status}`;
    const error = new ApiRequestError(message, {
      type,
      status: response.status,
      method,
      url,
      rawError,
    });

    if (type === 'token') {
      console.error('[API][TOKEN_EXPIRADO_OU_INVALIDO]', {
        method,
        url,
        status: response.status,
        details: rawError,
      });
    } else if (type === 'url') {
      console.error('[API][URL_ERRADA]', {
        method,
        url,
        status: response.status,
        details: rawError,
      });
    } else {
      console.error('[API][HTTP]', {
        method,
        url,
        status: response.status,
        details: rawError,
      });
    }

    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export const backendApi = {
  signIn: (payload) => apiRequest('/auth/signin', { method: 'POST', body: payload }),
  signUp: (payload) => apiRequest('/auth/signup', { method: 'POST', body: payload }),
  refresh: (payload) => apiRequest('/auth/refresh', { method: 'POST', body: payload }),
  getMe: (accessToken) => apiRequest('/auth/me', { accessToken }),
  getOwnerDashboard: (accessToken) => apiRequest('/analytics/owner/dashboard', { accessToken }),
  getBookings: (accessToken) => apiRequest('/bookings', { accessToken }),
  getNotifications: (accessToken) => apiRequest('/notifications', { accessToken }),
  markNotificationRead: (id, accessToken) =>
    apiRequest(`/notifications/${id}/read`, { method: 'PATCH', accessToken }),
  markAllNotificationsRead: (accessToken) =>
    apiRequest('/notifications/read-all', { method: 'PATCH', accessToken }),
};
