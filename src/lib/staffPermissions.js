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
// Mapeamento departamento -> role (espelha mapDepartmentToRole do backend)
// ---------------------------------------------------------------------------
export const DEPT_TO_ROLE = {
  MANAGEMENT:   'HT_MANAGER',
  RECEPTION:    'HT_RECEPTIONIST',
  HOUSEKEEPING: 'HT_HOUSEKEEPER',
  MAINTENANCE:  'HT_HOUSEKEEPER',
  SECURITY:     'HT_HOUSEKEEPER',
  RESTAURANT:   'HT_HOUSEKEEPER',
};

// ---------------------------------------------------------------------------
// Labels legíveis por humano para cada role
// ---------------------------------------------------------------------------
export const ROLE_LABELS = {
  HT_MANAGER:      'Gerente',
  HT_RECEPTIONIST: 'Rececionista',
  HT_HOUSEKEEPER:  'Housekeeping',
  GENERAL_MANAGER: 'Director Geral',
};

// ---------------------------------------------------------------------------
// Cores de badge por role
// ---------------------------------------------------------------------------
export const ROLE_COLORS = {
  HT_MANAGER:      { bg: '#FEF3C7', text: '#92400E' },
  HT_RECEPTIONIST: { bg: '#DBEAFE', text: '#1E40AF' },
  HT_HOUSEKEEPER:  { bg: '#D1FAE5', text: '#065F46' },
  GENERAL_MANAGER: { bg: '#EDE9FE', text: '#5B21B6' },
};

// ---------------------------------------------------------------------------
// Catálogo de permissões operacionais (individualmente ativáveis/desativáveis)
// Reflete as colunas canCancelBookings, canApplyDiscounts, canViewFinancials
// da tabela ht_staff — sem necessidade de migração adicional.
// ---------------------------------------------------------------------------
export const PERMISSIONS_CATALOG = [
  {
    key: 'canCancelBookings',
    label: 'Cancelar reservas',
    description: 'Permite cancelar reservas de hóspedes',
    defaultByRole: {
      HT_MANAGER: true,
      HT_RECEPTIONIST: false,
      HT_HOUSEKEEPER: false,
      GENERAL_MANAGER: true,
    },
  },
  {
    key: 'canApplyDiscounts',
    label: 'Aplicar descontos',
    description: 'Permite aplicar descontos em reservas e no folio',
    defaultByRole: {
      HT_MANAGER: true,
      HT_RECEPTIONIST: false,
      HT_HOUSEKEEPER: false,
      GENERAL_MANAGER: true,
    },
  },
  {
    key: 'canViewFinancials',
    label: 'Ver dados financeiros',
    description: 'Acesso a relatórios de receita e dados financeiros',
    defaultByRole: {
      HT_MANAGER: true,
      HT_RECEPTIONIST: false,
      HT_HOUSEKEEPER: false,
      GENERAL_MANAGER: true,
    },
  },
];

// ---------------------------------------------------------------------------
// Labels das secções de acesso (para mostrar no perfil do staff)
// ---------------------------------------------------------------------------
export const SECTION_LABELS = {
  dashboard: 'Dashboard',
  reception: 'Receção',
  housekeeping: 'Housekeeping',
  bookingsManager: 'Reservas',
  staffManager: 'Gestão staff',
  financials: 'Financeiros',
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
  if (!payload) return null;

  if (payload.staffRole) return payload.staffRole;

  const roles = Array.isArray(payload.staffRoles) ? payload.staffRoles : [];
  const htRole = roles.find((r) => String(r?.module || '').toUpperCase() === 'HT')?.role;
  if (htRole) return htRole;

  const generalRole = roles[0]?.role;
  if (generalRole) return generalRole;

  const department = String(payload.department || '').toUpperCase();
  if (department === 'HOUSEKEEPING') return STAFF_ROLES.HT_HOUSEKEEPER;
  if (department === 'RECEPTION') return STAFF_ROLES.HT_RECEPTIONIST;
  if (department === 'MANAGEMENT') return STAFF_ROLES.HT_MANAGER;

  return null;
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

// ---------------------------------------------------------------------------
// getRoleFromDept(department) -> role string
// ---------------------------------------------------------------------------
export function getRoleFromDept(department) {
  return DEPT_TO_ROLE[department] ?? 'HT_HOUSEKEEPER';
}

// ---------------------------------------------------------------------------
// getRoleLabel(department) -> string legível ("Gerente", "Rececionista", …)
// ---------------------------------------------------------------------------
export function getRoleLabel(department) {
  const role = DEPT_TO_ROLE[department] ?? department;
  return ROLE_LABELS[role] ?? role;
}

// ---------------------------------------------------------------------------
// getRoleColor(department) -> { bg, text } para badge
// ---------------------------------------------------------------------------
export function getRoleColor(department) {
  const role = DEPT_TO_ROLE[department] ?? department;
  return ROLE_COLORS[role] ?? { bg: '#F1F5F9', text: '#475569' };
}

// ---------------------------------------------------------------------------
// getDefaultPermsForDept(department)
// -> { canCancelBookings, canApplyDiscounts, canViewFinancials }
// ---------------------------------------------------------------------------
export function getDefaultPermsForDept(department) {
  const role = getRoleFromDept(department);
  return Object.fromEntries(
    PERMISSIONS_CATALOG.map((p) => [p.key, p.defaultByRole[role] ?? false]),
  );
}

// ---------------------------------------------------------------------------
// getSectionAccessForDept(department) -> objeto com todas as secções
// ---------------------------------------------------------------------------
export function getSectionAccessForDept(department) {
  const role = getRoleFromDept(department);
  return SECTION_ACCESS[role] ?? null;
}

// ---------------------------------------------------------------------------
// SECTION_PERMISSIONS — catálogo granular por secção (para gestão de acessos)
// ---------------------------------------------------------------------------
export const SECTION_PERMISSIONS = {
  dashboard: [
    { key: 'canViewDashboard', label: 'Ver Dashboard', description: 'Acesso ao painel principal' },
    { key: 'canViewReports', label: 'Ver Relatórios', description: 'Acesso a relatórios gerais' },
    { key: 'canViewAnalytics', label: 'Ver Analíticas', description: 'Dados analíticos do negócio' },
  ],
  reception: [
    { key: 'canCheckIn', label: 'Fazer Check-in', description: 'Processar entradas de hóspedes' },
    { key: 'canCheckOut', label: 'Fazer Check-out', description: 'Processar saídas de hóspedes' },
    { key: 'canCreateBooking', label: 'Criar Reservas', description: 'Criar novas reservas' },
    { key: 'canEditBooking', label: 'Editar Reservas', description: 'Modificar reservas existentes' },
    { key: 'canCancelBookings', label: 'Cancelar Reservas', description: 'Cancelar reservas confirmadas' },
  ],
  housekeeping: [
    { key: 'canManageRooms', label: 'Gerir Quartos', description: 'Actualizar estado dos quartos' },
    { key: 'canAssignTasks', label: 'Atribuir Tarefas', description: 'Distribuir tarefas de limpeza' },
    { key: 'canViewRoomStatus', label: 'Ver Estado Quartos', description: 'Consultar estado de limpeza' },
  ],
  bookingsManager: [
    { key: 'canViewAllBookings', label: 'Ver Todas Reservas', description: 'Listar todas as reservas' },
    { key: 'canCancelBookings', label: 'Cancelar Reservas', description: 'Cancelar reservas confirmadas' },
    { key: 'canApplyDiscounts', label: 'Aplicar Descontos', description: 'Aplicar descontos em reservas' },
    { key: 'canModifyPrices', label: 'Alterar Preços', description: 'Modificar preços de reservas' },
  ],
  staffManager: [
    { key: 'canViewStaff', label: 'Ver Staff', description: 'Listar funcionários' },
    { key: 'canCreateStaff', label: 'Criar Staff', description: 'Adicionar novos funcionários' },
    { key: 'canEditStaff', label: 'Editar Staff', description: 'Modificar dados de funcionários' },
    { key: 'canSuspendStaff', label: 'Suspender Staff', description: 'Suspender e reativar funcionários' },
    { key: 'canViewAuditLog', label: 'Ver Auditoria', description: 'Acesso ao log de auditoria' },
  ],
  financials: [
    { key: 'canViewFinancials', label: 'Ver Financeiros', description: 'Acesso a dados financeiros' },
    { key: 'canExportReports', label: 'Exportar Relatórios', description: 'Exportar dados financeiros' },
    { key: 'canManagePayments', label: 'Gerir Pagamentos', description: 'Processar e anular pagamentos' },
  ],
};

// ---------------------------------------------------------------------------
// getSectionPerms(sectionKey) → array de { key, label, description }
// ---------------------------------------------------------------------------
export function getSectionPerms(sectionKey) {
  return SECTION_PERMISSIONS[sectionKey] ?? [];
}
