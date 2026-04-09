/**
 * staffPermissions.js
 * Helper para tokens de staff (JWT de 8h emitidos por /auth/staff-pin-login).
 *
 * SEGURANÇA:
 *  - Nunca valida a assinatura aqui (não há secret no frontend).
 *  - Apenas faz decode do payload para leitura de UI.
 *  - A validação real é sempre feita no backend (guard JWT).
 */

// ---------------------------------------------------------------------------
// Constantes de role (espelham StaffRole do Prisma)
// ---------------------------------------------------------------------------
export const STAFF_ROLES = {
  HT_HOUSEKEEPER:  'HT_HOUSEKEEPER',
  HT_RECEPTIONIST: 'HT_RECEPTIONIST',
  HT_MANAGER:      'HT_MANAGER',
  GENERAL_MANAGER: 'GENERAL_MANAGER',
};

// ---------------------------------------------------------------------------
// Permissões de secção por role
// ---------------------------------------------------------------------------
const SECTION_ACCESS = {
  // Housekeeping pode ver apenas tarefas de limpeza
  [STAFF_ROLES.HT_HOUSEKEEPER]: {
    dashboard:       false,
    reception:       false,
    housekeeping:    true,
    bookingsManager: false,
    staffManager:    false,
    financials:      false,
  },
  // Recepcionista vê receção + dashboard (sem financeiros nem staff)
  [STAFF_ROLES.HT_RECEPTIONIST]: {
    dashboard:       true,
    reception:       true,
    housekeeping:    false,
    bookingsManager: true,
    staffManager:    false,
    financials:      false,
  },
  // Manager vê tudo menos gestão de outros managers
  [STAFF_ROLES.HT_MANAGER]: {
    dashboard:       true,
    reception:       true,
    housekeeping:    true,
    bookingsManager: true,
    staffManager:    true,  // pode ver staff, mas NÃO pode gerir managers
    financials:      true,
  },
  // General Manager = mesmas permissões que HT_MANAGER neste contexto
  [STAFF_ROLES.GENERAL_MANAGER]: {
    dashboard:       true,
    reception:       true,
    housekeeping:    true,
    bookingsManager: true,
    staffManager:    true,
    financials:      true,
  },
};

// ---------------------------------------------------------------------------
// decodeStaffToken(token) → payload | null
// ---------------------------------------------------------------------------
export function decodeStaffToken(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    // Base64url → JSON
    const raw = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = raw + '=='.slice(0, (4 - (raw.length % 4)) % 4);
    const json = atob(padded);
    const payload = JSON.parse(json);
    // Verificar expiração (exp é em segundos Unix)
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// getStaffRole(token) → StaffRole string | null
// ---------------------------------------------------------------------------
export function getStaffRole(token) {
  const payload = decodeStaffToken(token);
  return payload?.staffRole ?? null;
}

// ---------------------------------------------------------------------------
// getStaffId(token) → string | null
// ---------------------------------------------------------------------------
export function getStaffId(token) {
  const payload = decodeStaffToken(token);
  return payload?.staffId ?? null;
}

// ---------------------------------------------------------------------------
// getStaffBusinessId(token) → string | null
// ---------------------------------------------------------------------------
export function getStaffBusinessId(token) {
  const payload = decodeStaffToken(token);
  return payload?.businessId ?? null;
}

// ---------------------------------------------------------------------------
// isStaffTokenValid(token) → boolean
// ---------------------------------------------------------------------------
export function isStaffTokenValid(token) {
  return decodeStaffToken(token) !== null;
}

// ---------------------------------------------------------------------------
// canSeeSection(token, section) → boolean
// section: 'dashboard' | 'reception' | 'housekeeping' | 'bookingsManager' | 'staffManager' | 'financials'
// ---------------------------------------------------------------------------
export function canSeeSection(token, section) {
  const role = getStaffRole(token);
  if (!role) return false;
  const access = SECTION_ACCESS[role];
  if (!access) return false;
  return !!access[section];
}

// ---------------------------------------------------------------------------
// getSectionAccess(token) → objeto com todas as secções
// ---------------------------------------------------------------------------
export function getSectionAccess(token) {
  const role = getStaffRole(token);
  if (!role) return null;
  return SECTION_ACCESS[role] ?? null;
}
