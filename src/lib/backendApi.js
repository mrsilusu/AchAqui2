import { BACKEND_URL } from './runtimeConfig';

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
  const response = await fetch(`${BACKEND_URL}${path}`, {
    method,
    headers: buildHeaders(accessToken),
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const rawError = await response.text();
    throw new Error(rawError || `Erro HTTP ${response.status}`);
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
  getBookings: (accessToken) => apiRequest('/bookings', { accessToken }),
  getNotifications: (accessToken) => apiRequest('/notifications', { accessToken }),
  markNotificationRead: (id, accessToken) =>
    apiRequest(`/notifications/${id}/read`, { method: 'PATCH', accessToken }),
  markAllNotificationsRead: (accessToken) =>
    apiRequest('/notifications/read-all', { method: 'PATCH', accessToken }),
};
