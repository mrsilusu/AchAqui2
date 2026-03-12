import { useCallback, useEffect, useMemo, useState } from 'react';
import { backendApi } from '../lib/backendApi';
import { getSupabaseClient } from '../lib/supabaseClient';

const BOOKING_TABLES = ['Booking', 'bookings', 'table_bookings', 'room_bookings'];
const NOTIFICATION_TABLES = ['Notification', 'notifications'];

export function useLiveSync({ user, accessToken }) {
  const [bookings, setBookings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isAuthenticated = Boolean(accessToken && user?.id);

  const loadBookings = useCallback(async () => {
    if (!isAuthenticated) {
      setBookings([]);
      return;
    }

    const response = await backendApi.getBookings(accessToken);
    setBookings(Array.isArray(response) ? response : []);
  }, [accessToken, isAuthenticated]);

  const loadNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      setNotifications([]);
      return;
    }

    const response = await backendApi.getNotifications(accessToken);
    const normalized = (Array.isArray(response) ? response : []).map((item) => ({
      ...item,
      read: item.read ?? item.isRead ?? false,
      message: item.message || '',
      time:
        item.time ||
        (item.createdAt
          ? new Date(item.createdAt).toLocaleString('pt-PT')
          : ''),
    }));

    setNotifications(normalized);
  }, [accessToken, isAuthenticated]);

  const reloadAll = useCallback(async () => {
    if (!isAuthenticated) {
      setBookings([]);
      setNotifications([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await Promise.all([loadBookings(), loadNotifications()]);
    } catch (syncError) {
      // SEGURANÇA: Logs sanitizados — a URL completa não é registada em produção
      // para evitar vazar tokens de acesso que possam estar embutidos no URL
      // (ex: Supabase anon keys, iCal export tokens).
      if (__DEV__) {
        console.error('[LiveSync][API_FAIL]', {
          reason: syncError?.type || 'unknown',
          status: syncError?.status || null,
          url: syncError?.url || null,
          message: syncError instanceof Error ? syncError.message : 'Falha na sincronização',
        });
      } else {
        console.error('[LiveSync][API_FAIL]', {
          reason: syncError?.type || 'unknown',
          status: syncError?.status || null,
          // URL omitido em produção — pode conter tokens sensíveis
          message: syncError instanceof Error ? syncError.message : 'Falha na sincronização',
        });
      }
      setError(syncError instanceof Error ? syncError.message : 'Falha na sincronização');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, loadBookings, loadNotifications]);

  const markNotificationRead = useCallback(
    async (notificationId) => {
      if (!notificationId || !accessToken) return;
      await backendApi.markNotificationRead(notificationId, accessToken);
      await loadNotifications();
    },
    [accessToken, loadNotifications],
  );

  const markAllNotificationsRead = useCallback(async () => {
    if (!accessToken) return;
    await backendApi.markAllNotificationsRead(accessToken);
    await loadNotifications();
  }, [accessToken, loadNotifications]);

  /**
   * createBooking — cliente cria reserva via API (POST /bookings).
   *
   * Fluxo completo com Supabase Realtime:
   *   1. Frontend chama createBooking({ businessId, startDate, endDate })
   *   2. NestJS persiste Booking + 2 Notifications no Supabase/Postgres
   *   3. Supabase Realtime deteta os INSERTs e emite eventos nos canais
   *      subscritos por useLiveSync tanto do cliente como do dono
   *   4. loadBookings() e loadNotifications() são chamados automaticamente
   *      nos dois lados — sem polling, em tempo real
   *
   * @param {{ businessId: string, startDate: string, endDate: string }} payload
   * @returns {Promise<object>} booking criado
   */
  const createBooking = useCallback(
    async (payload) => {
      if (!accessToken) throw new Error('Sem sessão activa. Faz login para reservar.');
      const booking = await backendApi.createBooking(payload, accessToken);
      // Reload imediato no cliente (o Realtime actualizará o dono)
      await loadBookings();
      return booking;
    },
    [accessToken, loadBookings],
  );

  // ── Carga inicial ──────────────────────────────────────────────────────────
  useEffect(() => {
    reloadAll();
  }, [reloadAll]);

  // ── Supabase Realtime — subscrição filtrada por utilizador ───────────────
  // filter: `userId=eq.${user.id}` garante que só recebemos eventos das
  // nossas próprias linhas — sem fuga de dados entre utilizadores.
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase || !isAuthenticated) return;

    const channel = supabase.channel(`realtime:${user.id}`);

    for (const table of BOOKING_TABLES) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `userId=eq.${user.id}` },
        () => {
          loadBookings();
        },
      );
    }

    for (const table of NOTIFICATION_TABLES) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `userId=eq.${user.id}` },
        () => {
          loadNotifications();
        },
      );
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, loadBookings, loadNotifications, user?.id]);

  return useMemo(
    () => ({
      bookings,
      notifications,
      loading,
      error,
      reloadAll,
      createBooking,
      markNotificationRead,
      markAllNotificationsRead,
    }),
    [
      bookings,
      notifications,
      loading,
      error,
      reloadAll,
      createBooking,
      markNotificationRead,
      markAllNotificationsRead,
    ],
  );
}