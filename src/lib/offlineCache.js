import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'offline_cache:';
const QUEUE_KEY = 'offline_queue:v1';

export async function getCachedJson(key, maxAgeMs = 5 * 60 * 1000) {
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (Date.now() - Number(parsed.timestamp || 0) > maxAgeMs) return null;
    return parsed.data ?? null;
  } catch {
    return null;
  }
}

export async function setCachedJson(key, data) {
  try {
    await AsyncStorage.setItem(
      CACHE_PREFIX + key,
      JSON.stringify({ timestamp: Date.now(), data }),
    );
  } catch {
    // ignore cache persistence errors
  }
}

export async function enqueueOfflineMutation(entry) {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    const queue = raw ? JSON.parse(raw) : [];
    queue.push({ ...entry, queuedAt: Date.now() });
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-100)));
    return queue.length;
  } catch {
    return 0;
  }
}

export async function drainOfflineQueue(apiRequestFn, accessToken) {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    const queue = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(queue) || queue.length === 0) return { processed: 0 };

    let processed = 0;
    const remaining = [];

    for (const item of queue) {
      try {
        await apiRequestFn(item.path, {
          method: item.method,
          body: item.body,
          accessToken,
          skipOfflineQueue: true,
        });
        processed += 1;
      } catch {
        remaining.push(item);
      }
    }

    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
    return { processed, remaining: remaining.length };
  } catch {
    return { processed: 0 };
  }
}
