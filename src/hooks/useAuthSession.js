import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AUTH_SESSION_KEY } from '../lib/runtimeConfig';

function parseJwtPayload(token) {
  if (!token || typeof token !== 'string') return null;

  try {
    const payload = token.split('.')[1];
    if (!payload) return null;

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);

    if (!globalThis.atob) {
      return null;
    }

    const decoded = globalThis.atob(padded);

    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function useAuthSession() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadSession = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await AsyncStorage.getItem(AUTH_SESSION_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      setSession(parsed);
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const roleFromToken = useMemo(
    () => parseJwtPayload(session?.accessToken)?.role,
    [session?.accessToken],
  );

  const jwtPayload = useMemo(
    () => parseJwtPayload(session?.accessToken),
    [session?.accessToken],
  );

  const user = session?.user
    ? {
        ...session.user,
        role: session.user.role || roleFromToken || 'CLIENT',
      }
    : null;

  const effectiveRole = user?.role || roleFromToken;
  const primaryStaffRole = Array.isArray(user?.staffRoles)
    ? (user.staffRoles.find((r) => r?.module === 'HT' || r?.role?.startsWith?.('HT_')) || user.staffRoles[0])
    : null;

  const saveSession = useCallback(async (nextSession) => {
    setSession(nextSession);

    if (!nextSession) {
      await AsyncStorage.removeItem(AUTH_SESSION_KEY);
      return;
    }

    await AsyncStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(nextSession));
  }, []);

  return {
    session,
    user,
    accessToken: session?.accessToken || null,
    refreshToken: session?.refreshToken || null,
    isOwner: effectiveRole === 'OWNER',
    isAdmin: effectiveRole === 'ADMIN',
    isClient: effectiveRole === 'CLIENT',
    isStaff: effectiveRole === 'STAFF',
    staffRole: jwtPayload?.staffRole || primaryStaffRole?.role || null,
    staffBusinessId: jwtPayload?.businessId || primaryStaffRole?.businessId || null,
    staffId: jwtPayload?.staffId || null,
    loading,
    saveSession,
    reloadSession: loadSession,
  };
}
