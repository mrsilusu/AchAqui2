import { useCallback, useEffect, useMemo, useState } from 'react';
import { backendApi } from '../lib/backendApi';
import { getSupabaseClient } from '../lib/supabaseClient';

const BOOKING_TABLES = ['Booking', 'bookings'];
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
      console.error('[LiveSync][API_FAIL]', {
        reason: syncError?.type || 'unknown',
        status: syncError?.status || null,
        url: syncError?.url || null,
        message: syncError instanceof Error ? syncError.message : 'Falha na sincronização',
      });
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

  useEffect(() => {
    reloadAll();
  }, [reloadAll]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase || !isAuthenticated) return;

    const channel = supabase.channel(`realtime:${user.id}`);

    for (const table of BOOKING_TABLES) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => {
          loadBookings();
        },
      );
    }

    for (const table of NOTIFICATION_TABLES) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
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
      markNotificationRead,
      markAllNotificationsRead,
    }),
    [
      bookings,
      notifications,
      loading,
      error,
      reloadAll,
      markNotificationRead,
      markAllNotificationsRead,
    ],
  );
}
