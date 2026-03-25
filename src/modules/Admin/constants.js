export const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'home' },
  { id: 'claims', label: 'Claims', icon: 'checkCircle' },
  { id: 'businesses', label: 'Negocios', icon: 'briefcase' },
  { id: 'users', label: 'Utilizadores', icon: 'users' },
  { id: 'content', label: 'Conteudo', icon: 'star' },
  { id: 'analytics', label: 'Analytics', icon: 'checkCircle' },
  { id: 'audit', label: 'Auditoria', icon: 'shield' },
  { id: 'settings', label: 'Config', icon: 'power' },
];

export const CLAIM_STATUS = {
  PENDING: { label: 'Pendente', color: '#F59E0B', bg: '#FFFBEB' },
  APPROVED: { label: 'Aprovado', color: '#22A06B', bg: '#F0FDF4' },
  REJECTED: { label: 'Rejeitado', color: '#D32323', bg: '#FFF0F0' },
};

export const BIZ_FILTERS = [
  { id: 'all', label: 'Todos' },
  { id: 'claimed', label: 'Reclamado' },
  { id: 'unclaimed', label: 'Por reclamar' },
  { id: 'active', label: 'Publico' },
  { id: 'inactive', label: 'Oculto' },
  { id: 'premium', label: 'Premium' },
  { id: 'google', label: 'Google' },
  { id: 'manual', label: 'Manual' },
];

export const ROLE_CYCLE = { CLIENT: 'OWNER', OWNER: 'ADMIN', ADMIN: 'CLIENT' };

export const ROLE_BADGE = {
  ADMIN: { label: 'Admin', color: '#D32323', bg: '#FFF0F0' },
  OWNER: { label: 'Dono', color: '#0EA5E9', bg: '#F0F9FF' },
  CLIENT: { label: 'Cliente', color: '#22A06B', bg: '#F0FDF4' },
};
