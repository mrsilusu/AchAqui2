import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = 'ach_staff_section_access_v1';

const SECTION_KEYS = [
  'dashboard',
  'reception',
  'housekeeping',
  'bookingsManager',
  'staffManager',
  'financials',
];

function normalizeSections(input) {
  const out = {};
  SECTION_KEYS.forEach((k) => {
    out[k] = !!input?.[k];
  });
  return out;
}

function normalizeActions(input) {
  if (!input || typeof input !== 'object') return {};
  const out = {};
  Object.entries(input).forEach(([section, actions]) => {
    if (!actions || typeof actions !== 'object') return;
    out[section] = {};
    Object.entries(actions).forEach(([actionKey, allowed]) => {
      out[section][actionKey] = !!allowed;
    });
  });
  return out;
}

function storageKey(businessId) {
  return `${KEY_PREFIX}:${String(businessId || '')}`;
}

export async function getSectionAccessOverridesForBusiness(businessId) {
  if (!businessId) return {};
  try {
    const raw = await AsyncStorage.getItem(storageKey(businessId));
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export async function getSectionAccessForStaff(businessId, staffId) {
  if (!businessId || !staffId) return null;
  const all = await getSectionAccessOverridesForBusiness(businessId);
  const row = all?.[staffId];
  if (!row || typeof row !== 'object') return null;
  return {
    sections: normalizeSections(row.sections || row),
    actions: normalizeActions(row.actions),
  };
}

export async function setSectionAccessForStaff(businessId, staffId, nextValue) {
  if (!businessId || !staffId) return;
  const all = await getSectionAccessOverridesForBusiness(businessId);
  all[staffId] = {
    sections: normalizeSections(nextValue?.sections || {}),
    actions: normalizeActions(nextValue?.actions || {}),
  };
  await AsyncStorage.setItem(storageKey(businessId), JSON.stringify(all));
}
