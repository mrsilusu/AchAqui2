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
  getBusinesses: () => apiRequest('/businesses'),
  signIn: (payload) => apiRequest('/auth/signin', { method: 'POST', body: payload }),
  signUp: (payload) => apiRequest('/auth/signup', { method: 'POST', body: payload }),
  refresh: (payload) => apiRequest('/auth/refresh', { method: 'POST', body: payload }),
  getMe: (accessToken) => apiRequest('/auth/me', { accessToken }),
  updateOwnerSettings: (payload, accessToken) =>
    apiRequest('/auth/settings', { method: 'PATCH', body: payload, accessToken }),
  getOwnerDashboard: (accessToken) => apiRequest('/analytics/owner/dashboard', { accessToken }),
  getBookings: (accessToken) => apiRequest('/bookings', { accessToken }),
  createBooking: (payload, accessToken) =>
    apiRequest('/bookings', { method: 'POST', body: payload, accessToken }),
  confirmBooking: (bookingId, payload, accessToken) =>
    apiRequest(`/bookings/${bookingId}/confirm`, { method: 'PATCH', body: payload, accessToken }),
  rejectBooking: (bookingId, payload, accessToken) =>
    apiRequest(`/bookings/${bookingId}/reject`, { method: 'PATCH', body: payload, accessToken }),
  updateBusinessStatus: (businessId, payload, accessToken) =>
    apiRequest(`/businesses/${businessId}/status`, { method: 'PATCH', body: payload, accessToken }),
  createBusiness: (payload, accessToken) =>
    apiRequest('/businesses', { method: 'POST', body: payload, accessToken }),
  updateBusiness: (businessId, payload, accessToken) =>
    apiRequest(`/businesses/${businessId}`, { method: 'PATCH', body: payload, accessToken }),
  updateBusinessInfo: (businessId, payload, accessToken) =>
    apiRequest(`/businesses/${businessId}/info`, { method: 'PATCH', body: payload, accessToken }),
  
  // ─── MENU ITEMS (Secção 2 — Menu Editor)
  getMenuItemsByBusiness: (businessId, accessToken) =>
    apiRequest(`/items/menu/by-business?businessId=${businessId}`, { accessToken }),
  createMenuItem: (payload, accessToken) =>
    apiRequest('/items/menu', { method: 'POST', body: payload, accessToken }),
  updateMenuItem: (itemId, payload, accessToken) =>
    apiRequest(`/items/menu/${itemId}`, { method: 'PATCH', body: payload, accessToken }),
  deleteMenuItem: (itemId, accessToken) =>
    apiRequest(`/items/menu/${itemId}`, { method: 'DELETE', accessToken }),

  // ─── INVENTORY ITEMS (Secção 5 — Inventory Editor)
  getInventoryItemsByBusiness: (businessId, accessToken) =>
    apiRequest(`/items/inventory/by-business?businessId=${businessId}`, { accessToken }),
  createInventoryItem: (payload, accessToken) =>
    apiRequest('/items/inventory', { method: 'POST', body: payload, accessToken }),
  updateInventoryItem: (itemId, payload, accessToken) =>
    apiRequest(`/items/inventory/${itemId}`, { method: 'PATCH', body: payload, accessToken }),
  deleteInventoryItem: (itemId, accessToken) =>
    apiRequest(`/items/inventory/${itemId}`, { method: 'DELETE', accessToken }),

  // ─── SERVICES (Secção 6 — Services Editor)
  getServicesByBusiness: (businessId, accessToken) =>
    apiRequest(`/items/services/by-business?businessId=${businessId}`, { accessToken }),
  createService: (payload, accessToken) =>
    apiRequest('/items/services', { method: 'POST', body: payload, accessToken }),
  updateService: (serviceId, payload, accessToken) =>
    apiRequest(`/items/services/${serviceId}`, { method: 'PATCH', body: payload, accessToken }),
  deleteService: (serviceId, accessToken) =>
    apiRequest(`/items/services/${serviceId}`, { method: 'DELETE', accessToken }),

  // ─── ROOMS (Secção 7 — Rooms Editor)
  getRoomsByBusiness: (businessId, accessToken) =>
    apiRequest(`/items/rooms/by-business?businessId=${businessId}`, { accessToken }),
  createRoom: (payload, accessToken) =>
    apiRequest('/items/rooms', { method: 'POST', body: payload, accessToken }),
  updateRoom: (roomId, payload, accessToken) =>
    apiRequest(`/items/rooms/${roomId}`, { method: 'PATCH', body: payload, accessToken }),
  deleteRoom: (roomId, accessToken) =>
    apiRequest(`/items/rooms/${roomId}`, { method: 'DELETE', accessToken }),
  
  // ─── PROMOTIONS (Secção 11 — Promo Manager)
  getPromosByBusiness: (businessId, accessToken) =>
    apiRequest(`/businesses/${businessId}/promos`, { accessToken }),
  createPromo: (businessId, payload, accessToken) =>
    apiRequest(`/businesses/${businessId}/promos`, { method: 'POST', body: payload, accessToken }),
  updatePromo: (promoId, payload, accessToken) =>
    apiRequest(`/businesses/promos/${promoId}`, { method: 'PATCH', body: payload, accessToken }),
  deletePromo: (promoId, accessToken) =>
    apiRequest(`/businesses/promos/${promoId}`, { method: 'DELETE', accessToken }),
  

  // ─── HT — Folio + Checkout Financeiro (Sprint 3)
  getHtFolio: (bookingId, accessToken) =>
    apiRequest(`/ht/bookings/${bookingId}/folio`, { accessToken }),

  addHtFolioItem: (bookingId, dto, accessToken) =>
    apiRequest(`/ht/bookings/${bookingId}/folio`, {
      method: 'POST', body: dto, accessToken,
    }),

  removeHtFolioItem: (bookingId, itemId, accessToken) =>
    apiRequest(`/ht/bookings/${bookingId}/folio/${itemId}`, {
      method: 'DELETE', accessToken,
    }),

  htFinancialCheckout: (bookingId, dto, accessToken) =>
    apiRequest(`/ht/bookings/${bookingId}/financial-checkout`, {
      method: 'POST', body: dto, accessToken,
    }),

  // ─── HT — Dashboard PMS (Sprint 2)
  getHtDashboard: (businessId, accessToken) =>
    apiRequest(`/ht/dashboard?businessId=${businessId}`, { accessToken }),

  // ─── HT — Quartos físicos ───────────────────────────────────────────────────
  getHtRooms: (businessId, accessToken) =>
    apiRequest(`/ht/rooms?businessId=${businessId}`, { accessToken }),
  checkRoomAvailability: (roomTypeId, checkIn, checkOut, businessId, accessToken) =>
    apiRequest(
      `/ht/rooms/availability?roomTypeId=${encodeURIComponent(roomTypeId)}&checkIn=${encodeURIComponent(checkIn)}&checkOut=${encodeURIComponent(checkOut)}&businessId=${encodeURIComponent(businessId)}`,
      { accessToken },
    ),
  createHtRoom: (payload, accessToken) =>
    apiRequest('/ht/rooms', { method: 'POST', body: payload, accessToken }),
  updateHtRoom: (roomId, payload, accessToken) =>
    apiRequest(`/ht/rooms/${roomId}`, { method: 'PATCH', body: payload, accessToken }),
  deleteHtRoom: (roomId, accessToken) =>
    apiRequest(`/ht/rooms/${roomId}`, { method: 'DELETE', accessToken }),

  // ─── HT — Receção / PMS (Sprint 1)
  getHtArrivals: (businessId, accessToken) =>
    apiRequest(`/ht/bookings/arrivals?businessId=${businessId}`, { accessToken }),
  getHtDepartures: (businessId, accessToken) =>
    apiRequest(`/ht/bookings/departures?businessId=${businessId}`, { accessToken }),
  getHtCurrentGuests: (businessId, accessToken) =>
    apiRequest(`/ht/bookings/guests?businessId=${businessId}`, { accessToken }),
  htCheckIn: (bookingId, payload, accessToken) =>
    apiRequest(`/ht/bookings/${bookingId}/checkin`, { method: 'PATCH', body: payload, accessToken }),
  htCheckOut: (bookingId, accessToken) =>
    apiRequest(`/ht/bookings/${bookingId}/checkout`, { method: 'PATCH', body: {}, accessToken }),
  htNoShow: (bookingId, accessToken) =>
    apiRequest(`/ht/bookings/${bookingId}/noshow`, { method: 'PATCH', body: {}, accessToken }),

  // ─── HT — Staff ────────────────────────────────────────────────────────────
  getHtStaff: (businessId, accessToken, includeInactive = false) =>
    apiRequest(`/ht/staff?businessId=${businessId}&includeInactive=${includeInactive}`, { accessToken }),
  htCreateStaff: (payload, accessToken) =>
    apiRequest('/ht/staff', { method: 'POST', body: payload, accessToken }),
  htUpdateStaff: (staffId, payload, accessToken) =>
    apiRequest(`/ht/staff/${staffId}`, { method: 'PATCH', body: payload, accessToken }),
  htSuspendStaff: (staffId, accessToken) =>
    apiRequest(`/ht/staff/${staffId}/suspend`, { method: 'PATCH', body: {}, accessToken }),
  htReactivateStaff: (staffId, accessToken) =>
    apiRequest(`/ht/staff/${staffId}/reactivate`, { method: 'PATCH', body: {}, accessToken }),

  // ─── Social — My Profile
  getMyStats: (accessToken) => apiRequest('/social/me/stats', { accessToken }),
  getMyReviews: (accessToken) => apiRequest('/social/me/reviews', { accessToken }),
  getMyCheckIns: (accessToken) => apiRequest('/social/me/checkins', { accessToken }),
  updateProfile: (payload, accessToken) =>
    apiRequest('/auth/profile', { method: 'PATCH', body: payload, accessToken }),

  getNotifications: (accessToken) => apiRequest('/notifications', { accessToken }),
  markNotificationRead: (id, accessToken) =>
    apiRequest(`/notifications/${id}/read`, { method: 'PATCH', accessToken }),
  markAllNotificationsRead: (accessToken) =>
    apiRequest('/notifications/read-all', { method: 'PATCH', accessToken }),
};