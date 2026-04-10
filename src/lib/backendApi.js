import { BACKEND_URL } from './runtimeConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AUTH_SESSION_KEY } from './runtimeConfig';
import {
  drainOfflineQueue,
  enqueueOfflineMutation,
  getCachedJson,
  setCachedJson,
} from './offlineCache';

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

function shouldCacheGet(pathname) {
  return (
    pathname === '/businesses' ||
    pathname.startsWith('/businesses/') ||
    pathname.startsWith('/analytics/owner') ||
    pathname.startsWith('/notifications')
  );
}

function shouldQueueMutation(pathname) {
  return (
    pathname.includes('/bookmark') ||
    pathname.includes('/checkin') ||
    pathname.includes('/feed') ||
    pathname.includes('/loyalty/redeem')
  );
}

export async function apiRequest(path, { method = 'GET', body, accessToken, skipOfflineQueue = false } = {}) {
  const url = `${BACKEND_URL}${path}`;
  const pathname = path.split('?')[0];

  const isAuthPath =
    pathname.startsWith('/auth/signin') ||
    pathname.startsWith('/auth/signup') ||
    pathname.startsWith('/auth/refresh') ||
    pathname.startsWith('/auth/staff-pin-login');

  const tryRefreshSession = async () => {
    try {
      const raw = await AsyncStorage.getItem(AUTH_SESSION_KEY);
      if (!raw) return null;
      const current = JSON.parse(raw);
      const currentRefreshToken = current?.refreshToken;
      if (!currentRefreshToken) return null;

      const refreshRes = await fetch(`${BACKEND_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: currentRefreshToken }),
      });
      if (!refreshRes.ok) return null;

      const refreshed = await refreshRes.json();
      if (!refreshed?.accessToken) return null;

      const nextSession = {
        ...(current || {}),
        ...refreshed,
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken || currentRefreshToken,
      };
      await AsyncStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(nextSession));
      return nextSession.accessToken;
    } catch {
      return null;
    }
  };

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
    if (method === 'GET') {
      const cached = await getCachedJson(path, 10 * 60 * 1000);
      if (cached) return cached;
    }

    if (!skipOfflineQueue && method !== 'GET' && shouldQueueMutation(pathname)) {
      await enqueueOfflineMutation({ path, method, body });
      return {
        queuedOffline: true,
        method,
        path,
      };
    }

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
    if (response.status === 401 && !isAuthPath) {
      const refreshedAccessToken = await tryRefreshSession();
      if (refreshedAccessToken) {
        const retryResponse = await fetch(url, {
          method,
          headers: buildHeaders(refreshedAccessToken),
          body: body ? JSON.stringify(body) : undefined,
        });
        if (retryResponse.ok) {
          if (retryResponse.status === 204) return null;
          const retryData = await retryResponse.json();
          if (method === 'GET' && shouldCacheGet(pathname)) {
            await setCachedJson(path, retryData);
          }
          return retryData;
        }
      }
    }

    const rawError = await response.text();
    const type = response.status === 401 || response.status === 403
      ? 'token'
      : response.status === 404
        ? 'url'
        : 'http';
    // NestJS devolve JSON: { statusCode, message, error } — extrair campo legível
    let message = rawError || `Erro HTTP ${response.status}`;
    try {
      const parsed = JSON.parse(rawError);
      if (parsed?.message) {
        message = Array.isArray(parsed.message)
          ? parsed.message.join('; ')
          : String(parsed.message);
      }
    } catch { /* não é JSON — usar texto bruto */ }
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

  const data = await response.json();
  if (method === 'GET' && shouldCacheGet(pathname)) {
    await setCachedJson(path, data);
  }
  return data;
}

export const backendApi = {
  getBusinesses: () => apiRequest('/businesses'),
  getHybridHomeFeed: ({ lat, lng, radiusKm = 20, limit = 15 } = {}) => {
    const qs = new URLSearchParams({
      lat: String(lat),
      lng: String(lng),
      radiusKm: String(radiusKm),
      limit: String(limit),
    });
    return apiRequest(`/businesses/home-feed?${qs.toString()}`);
  },
  signIn: (payload) => apiRequest('/auth/signin', { method: 'POST', body: payload }),
  htStaffPinLogin: (businessId, pin) =>
    apiRequest('/auth/staff-pin-login', { method: 'POST', body: { businessId, pin } }),
  signUp: (payload) => apiRequest('/auth/signup', { method: 'POST', body: payload }),
  forgotPassword: (email) => apiRequest('/auth/forgot-password', { method: 'POST', body: { email } }),
  refresh: (payload) => apiRequest('/auth/refresh', { method: 'POST', body: payload }),
  getMe: (accessToken) => apiRequest('/auth/me', { accessToken }),
  updateOwnerSettings: (payload, accessToken) =>
    apiRequest('/auth/settings', { method: 'PATCH', body: payload, accessToken }),
  getOwnerDashboard: (accessToken) => apiRequest('/analytics/owner/dashboard', { accessToken }),
  getOwnerAdvancedAnalytics: (days, accessToken) =>
    apiRequest(`/analytics/owner/advanced?days=${encodeURIComponent(days || 30)}`, { accessToken }),
  getBookings: (accessToken) => apiRequest('/bookings', { accessToken }),
  createBooking: (payload, accessToken) =>
    apiRequest('/bookings', { method: 'POST', body: payload, accessToken }),
  updateBooking: (bookingId, payload, accessToken) =>
    apiRequest(`/bookings/${bookingId}`, { method: 'PATCH', body: payload, accessToken }),
  confirmBooking: (bookingId, payload, accessToken) =>
    apiRequest(`/bookings/${bookingId}/confirm`, { method: 'PATCH', body: payload, accessToken }),
  rejectBooking: (bookingId, payload, accessToken) =>
    apiRequest(`/bookings/${bookingId}/reject`, { method: 'PATCH', body: payload, accessToken }),
  updateBusinessStatus: (businessId, payload, accessToken) =>
    apiRequest(`/businesses/${businessId}/status`, { method: 'PATCH', body: payload, accessToken }),
  createBusiness: (payload, accessToken) =>
    apiRequest('/businesses', { method: 'POST', body: payload, accessToken }),
  getBusiness: (businessId, accessToken) =>
    apiRequest(`/businesses/${businessId}`, { accessToken }),
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
  

  // ─── DISPONIBILIDADE PÚBLICA (sem auth) ──────────────────────────────────────
  // Verifica quartos disponíveis para um tipo de quarto nas datas pedidas.
  // Retorna: { available, physicalRooms, occupied, nextAvailableDate }
  getAvailability: (businessId, roomTypeId, startDate, endDate) =>
    apiRequest(
      `/bookings/availability?businessId=${encodeURIComponent(businessId)}&roomTypeId=${encodeURIComponent(roomTypeId)}&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
    ),

  checkRoomAvailability: (roomTypeId, checkIn, checkOut, businessId) => {
    const toIso = (v) => {
      const s = String(v || '').trim();
      if (!s) return '';
      if (s.includes('/')) {
        const [d, m, y] = s.split('/').map(Number);
        return new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).toISOString();
      }
      const dt = new Date(s);
      return Number.isNaN(dt.getTime()) ? s : dt.toISOString();
    };

    return apiRequest(
      `/bookings/availability?businessId=${encodeURIComponent(businessId)}&roomTypeId=${encodeURIComponent(roomTypeId)}&startDate=${encodeURIComponent(toIso(checkIn))}&endDate=${encodeURIComponent(toIso(checkOut))}`,
    );
  },

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
  createHtRoom: (payload, accessToken) =>
    apiRequest('/ht/rooms', { method: 'POST', body: payload, accessToken }),
  updateHtRoom: (roomId, payload, accessToken) =>
    apiRequest(`/ht/rooms/${roomId}`, { method: 'PATCH', body: payload, accessToken }),
  deleteHtRoom: (roomId, accessToken) =>
    apiRequest(`/ht/rooms/${roomId}`, { method: 'DELETE', accessToken }),

  // ─── HT — Mapa de Reservas
  getHtMap: (businessId, from, to, accessToken) => {
    const params = new URLSearchParams({ businessId });
    if (from) params.append('from', from instanceof Date ? from.toISOString() : String(from));
    if (to)   params.append('to', to instanceof Date ? to.toISOString() : String(to));
    return apiRequest(`/ht/map?${params}`, { accessToken });
  },

  // ─── HT — iCal Sync (servidor)
  syncHtIcal: (businessId, accessToken) =>
    apiRequest(`/ht/ical/sync?businessId=${encodeURIComponent(businessId)}`, { method: 'POST', accessToken }),

  // ─── HT — Staff / Funcionários
  getHtStaff: (businessId, accessToken) =>
    apiRequest(`/ht/staff?businessId=${encodeURIComponent(businessId)}`, { accessToken }),
  htCreateStaff: (payload, accessToken) =>
    apiRequest('/ht/staff', { method: 'POST', body: payload, accessToken }),
  addHtStaff: (payload, accessToken) =>
    apiRequest('/ht/staff', { method: 'POST', body: payload, accessToken }),
  htUpdateStaff: (staffId, businessId, payload, accessToken) =>
    apiRequest(`/ht/staff/${staffId}?businessId=${encodeURIComponent(businessId)}`, { method: 'PATCH', body: payload, accessToken }),
  htSuspendStaff: (staffId, businessId, reason, accessToken) =>
    apiRequest(`/ht/staff/${staffId}/suspend?businessId=${encodeURIComponent(businessId)}`, { method: 'PATCH', body: { reason }, accessToken }),
  htReactivateStaff: (staffId, businessId, accessToken) =>
    apiRequest(`/ht/staff/${staffId}/reactivate?businessId=${encodeURIComponent(businessId)}`, { method: 'PATCH', body: {}, accessToken }),
  htGetStaffActivity: (staffId, businessId, from, to, accessToken) => {
    const params = new URLSearchParams({ businessId });
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    return apiRequest(`/ht/staff/${staffId}/activity?${params.toString()}`, { accessToken });
  },
  htGetAuditLog: (businessId, filters = {}, accessToken) => {
    const params = new URLSearchParams({ businessId });
    Object.entries(filters || {}).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') return;
      params.append(k, String(v));
    });
    return apiRequest(`/ht/audit-log?${params.toString()}`, { accessToken });
  },
  removeHtStaff: (staffId, businessId, accessToken) =>
    apiRequest(`/ht/staff/${staffId}/suspend?businessId=${encodeURIComponent(businessId)}`, { method: 'PATCH', body: { reason: 'Suspenso pelo owner' }, accessToken }),
  assignHtTask: (taskId, staffId, businessId, accessToken) =>
    apiRequest(`/ht/staff/tasks/${taskId}/assign`, { method: 'PATCH', body: { staffId, businessId }, accessToken }),
  htCreateStaffAccount: (staffId, businessId, payload, accessToken) =>
    apiRequest(`/ht/staff/${staffId}/create-account?businessId=${encodeURIComponent(businessId)}`, { method: 'POST', body: payload || {}, accessToken }),

  // ─── HT — Perfil de Hóspede (Sprint 4)
  getHtGuests: (businessId, accessToken, search = '') =>
    apiRequest(`/ht/guests?businessId=${encodeURIComponent(businessId)}&search=${encodeURIComponent(search)}`, { accessToken }),
  getHtGuest: (guestId, businessId, accessToken) =>
    apiRequest(`/ht/guests/${guestId}?businessId=${encodeURIComponent(businessId)}`, { accessToken }),
  createHtGuest: (payload, accessToken) =>
    apiRequest('/ht/guests', { method: 'POST', body: payload, accessToken }),
  updateHtGuest: (guestId, businessId, payload, accessToken) =>
    apiRequest(`/ht/guests/${guestId}?businessId=${encodeURIComponent(businessId)}`, { method: 'PATCH', body: payload, accessToken }),
  linkHtGuestToBooking: (guestId, bookingId, businessId, accessToken) =>
    apiRequest(`/ht/guests/${guestId}/link-booking`, { method: 'POST', body: { bookingId, businessId }, accessToken }),

  // ─── HT — Prolongar estadia / Alterar quarto (Sprint 6)
  htExtendStay: (bookingId, newEndDate, accessToken) =>
    apiRequest(`/ht/bookings/${bookingId}/extend`, { method: 'PATCH', body: { newEndDate }, accessToken }),
  htExtendExpiredStay: (bookingId, payload, accessToken) =>
    apiRequest(`/ht/bookings/${bookingId}/extend-expired`, { method: 'PATCH', body: payload, accessToken }),
  htGetExpiredStays: (businessId, accessToken) =>
    apiRequest(`/ht/bookings/expired?businessId=${encodeURIComponent(businessId)}`, { accessToken }),
  htRetroactiveCheckout: (bookingId, payload, accessToken) =>
    apiRequest(`/ht/bookings/${bookingId}/retroactive-checkout`, { method: 'PATCH', body: payload, accessToken }),
  htForceCheckout: (bookingId, accessToken) =>
    apiRequest(`/ht/bookings/${bookingId}/force-checkout`, { method: 'PATCH', body: {}, accessToken }),
  htUnconfirmedCheckout: (bookingId, accessToken) =>
    apiRequest(`/ht/bookings/${bookingId}/unconfirmed-checkout`, { method: 'PATCH', body: {}, accessToken }),
  htChangeRoom: (bookingId, newRoomId, accessToken) =>
    apiRequest(`/ht/bookings/${bookingId}/change-room`, { method: 'PATCH', body: { newRoomId }, accessToken }),

  // ─── HT — Housekeeping
  completeHousekeepingTask: (taskId, accessToken) =>
    apiRequest(`/ht/housekeeping/${taskId}/complete`, { method: 'PATCH', body: {}, accessToken }),
  approveHousekeepingInspection: (roomId, accessToken) =>
    apiRequest(`/ht/housekeeping/rooms/${roomId}/approve`, { method: 'PATCH', body: {}, accessToken }),

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
  htPostponeBooking: (bookingId, accessToken) =>
    apiRequest(`/ht/bookings/${bookingId}/postpone`, { method: 'PATCH', body: {}, accessToken }),
  htRevertNoShow: (bookingId, body, accessToken) =>
    apiRequest(`/ht/bookings/${bookingId}/revert-noshow`, { method: 'POST', body, accessToken }),
  cancelBooking: (bookingId, payload, accessToken) =>
    apiRequest(`/ht/bookings/${bookingId}/cancel`, { method: 'PATCH', body: payload, accessToken }),

    htConfirmBooking: (bookingId, accessToken) =>
      apiRequest(`/ht/bookings/${bookingId}/confirm`, { method: 'PATCH', body: {}, accessToken }),
    htCreateBooking: (payload, accessToken) =>
      apiRequest('/ht/bookings', { method: 'POST', body: payload, accessToken }),
    htUpdatePmsConfig: (businessId, payload, accessToken) =>
      apiRequest(`/ht/config?businessId=${businessId}`, { method: 'PATCH', body: payload, accessToken }),

  // ─── SPRINT A — Interacções sociais ─────────────────────────────────────
  getSocialState: (businessId, accessToken) =>
    apiRequest(`/businesses/${businessId}/social-state`, { accessToken }),
  toggleBookmark: (businessId, accessToken) =>
    apiRequest(`/businesses/${businessId}/bookmark`, { method: 'POST', accessToken }),
  checkIn: (businessId, accessToken) =>
    apiRequest(`/businesses/${businessId}/checkin`, { method: 'POST', accessToken }),

  // ─── SPRINT B — Follow ────────────────────────────────────────────────────
  toggleFollow: (businessId, accessToken) =>
    apiRequest(`/businesses/${businessId}/follow`, { method: 'POST', accessToken }),

  // ─── SPRINT B — Reviews ───────────────────────────────────────────────────
  getReviews: (businessId) =>
    apiRequest(`/businesses/${businessId}/reviews`),
  createReview: (businessId, payload, accessToken) =>
    apiRequest(`/businesses/${businessId}/reviews`, { method: 'POST', body: payload, accessToken }),
  toggleReviewHelpful: (reviewId, accessToken) =>
    apiRequest(`/businesses/reviews/${reviewId}/helpful`, { method: 'POST', accessToken }),
  addOwnerReply: (reviewId, reply, accessToken) =>
    apiRequest(`/businesses/reviews/${reviewId}/reply`, { method: 'POST', body: { reply }, accessToken }),

  // ─── SPRINT B/C — Q&A ────────────────────────────────────────────────────
  getQuestions: (businessId) =>
    apiRequest(`/businesses/${businessId}/questions`),
  askQuestion: (businessId, question, accessToken) =>
    apiRequest(`/businesses/${businessId}/questions`, { method: 'POST', body: { question }, accessToken }),
  answerQuestion: (questionId, answer, accessToken) =>
    apiRequest(`/businesses/questions/${questionId}/answer`, { method: 'POST', body: { answer }, accessToken }),
  toggleQuestionHelpful: (questionId, accessToken) =>
    apiRequest(`/businesses/questions/${questionId}/helpful`, { method: 'POST', accessToken }),

  getBusinessFeed: async (businessId, limit = 20, accessToken) => {
    try {
      return await apiRequest(`/businesses/${businessId}/feed?limit=${encodeURIComponent(limit)}`, { accessToken });
    } catch (error) {
      // Backward compatibility for backends exposing only /business/:id/feed
      if (!(error instanceof ApiRequestError) || (error.status !== 404 && error.status !== 500)) {
        throw error;
      }
      return apiRequest(`/business/${businessId}/feed?limit=${encodeURIComponent(limit)}`, { accessToken });
    }
  },
  createBusinessFeedPost: async (businessId, payload, accessToken) => {
    try {
      return await apiRequest(`/businesses/${businessId}/feed`, { method: 'POST', body: payload, accessToken });
    } catch (error) {
      if (!(error instanceof ApiRequestError) || (error.status !== 404 && error.status !== 500)) {
        throw error;
      }
      return apiRequest(`/business/${businessId}/feed`, { method: 'POST', body: payload, accessToken });
    }
  },
  getLoyaltyState: (businessId, accessToken) =>
    apiRequest(`/businesses/${businessId}/loyalty-state`, { accessToken }),
  redeemLoyalty: (businessId, payload, accessToken) =>
    apiRequest(`/businesses/${businessId}/loyalty/redeem`, { method: 'POST', body: payload, accessToken }),
  getRecommendations: (limit = 20, accessToken) =>
    apiRequest(`/businesses/recommendations/me?limit=${encodeURIComponent(limit)}`, { accessToken }),

  getNotifications: async (accessToken) => {
    if (!accessToken) return [];
    try {
      return await apiRequest('/notifications', { accessToken });
    } catch (error) {
      if (error instanceof ApiRequestError && error.type === 'token') {
        // Token expirado: evita quebrar o UI e usa cache local quando disponível.
        const cached = await getCachedJson('/notifications', 60 * 60 * 1000);
        return Array.isArray(cached) ? cached : [];
      }
      throw error;
    }
  },
  markNotificationRead: (id, accessToken) =>
    apiRequest(`/notifications/${id}/read`, { method: 'PATCH', accessToken }),
  markAllNotificationsRead: (accessToken) =>
    apiRequest('/notifications/read-all', { method: 'PATCH', accessToken }),
  registerDeviceToken: (payload, accessToken) =>
    apiRequest('/notifications/device-token', { method: 'POST', body: payload, accessToken }),
  adminImpersonateOwner: (businessId, payload, accessToken) =>
    apiRequest(`/admin/businesses/${businessId}/impersonate-owner`, {
      method: 'POST',
      body: payload || {},
      accessToken,
    }),
  syncOfflineMutations: (accessToken) =>
    drainOfflineQueue(apiRequest, accessToken),

  // ─── PERFIL DO UTILIZADOR ─────────────────────────────────────────────────
  getMyStats: (accessToken) => apiRequest('/social/me/stats', { accessToken }),
  getMyReviews: (accessToken) => apiRequest('/social/me/reviews', { accessToken }),
  getMyCheckIns: (accessToken) => apiRequest('/social/me/checkins', { accessToken }),
  updateProfile: (payload, accessToken) =>
    apiRequest('/auth/profile', { method: 'PATCH', body: payload, accessToken }),
};