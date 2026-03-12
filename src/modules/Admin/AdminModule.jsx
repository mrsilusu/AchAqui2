/**
 * ============================================================================
 * ADMIN MODULE  (v1.0.0 — Fase 2: Painel do Administrador)
 * ============================================================================
 * Dashboard completo para o admin gerir a plataforma AcheiAqui.
 *
 * Tabs:
 *   • Dashboard — KPIs e actividade recente
 *   • Claims    — Pedidos de claim pendentes e histórico
 *   • Negócios  — Lista de todos os negócios
 *   • Utilizadores — Lista de utilizadores
 *
 * Props:
 *   accessToken  — string
 *   onExit       — () => void  [volta para home]
 *   insets       — SafeAreaInsets
 * ============================================================================
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, TextInput, Alert, RefreshControl,
} from 'react-native';
import { Icon, COLORS } from '../../core/AchAqui_Core';
import { apiRequest } from '../../lib/backendApi';
import { ImportModal } from './ImportModal';

// ─── Tabs ────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'dashboard',  label: 'Dashboard',    icon: 'home'        },
  { id: 'claims',     label: 'Claims',        icon: 'checkCircle' },
  { id: 'businesses', label: 'Negócios',      icon: 'briefcase'   },
  { id: 'users',      label: 'Utilizadores',  icon: 'users'       },
];

const CLAIM_STATUS = {
  PENDING:  { label: 'Pendente',  color: '#F59E0B', bg: '#FFFBEB' },
  APPROVED: { label: 'Aprovado',  color: '#22A06B', bg: '#F0FDF4' },
  REJECTED: { label: 'Rejeitado', color: '#D32323', bg: '#FFF0F0' },
};

// ─── Componente Principal ─────────────────────────────────────────────────────

export function AdminModule({ accessToken, onExit, insets }) {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <View style={[s.container, { paddingBottom: insets?.bottom || 0 }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: (insets?.top || 0) + 8 }]}>
        <TouchableOpacity style={s.exitBtn} onPress={onExit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icon name="arrowLeft" size={20} color={COLORS.white} strokeWidth={2} />
        </TouchableOpacity>
        <View style={s.headerBrand}>
          <Text style={s.headerTitle}>AcheiAqui</Text>
          <Text style={s.headerSub}>Painel Admin</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* Tab Bar */}
      <View style={s.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[s.tabItem, activeTab === tab.id && s.tabItemActive]}
            onPress={() => setActiveTab(tab.id)}
            activeOpacity={0.7}
          >
            <Icon
              name={tab.icon}
              size={18}
              color={activeTab === tab.id ? COLORS.red : COLORS.grayText}
              strokeWidth={2}
            />
            <Text style={[s.tabLabel, activeTab === tab.id && s.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        {activeTab === 'dashboard'  && <DashboardTab accessToken={accessToken} />}
        {activeTab === 'claims'     && <ClaimsTab    accessToken={accessToken} />}
        {activeTab === 'businesses' && <BusinessesTab accessToken={accessToken} />}
        {activeTab === 'users'      && <UsersTab     accessToken={accessToken} />}
      </View>
    </View>
  );
}

// ─── Tab: Dashboard ──────────────────────────────────────────────────────────

function DashboardTab({ accessToken }) {
  const [stats, setStats]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await apiRequest('/admin/stats', { accessToken });
      setStats(data);
    } catch (err) {
      Alert.alert('Erro', err?.message || 'Não foi possível carregar estatísticas.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Loader />;

  return (
    <ScrollView
      style={{ flex: 1 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={COLORS.red} />}
    >
      <View style={s.section}>
        <Text style={s.sectionTitle}>Visão Geral</Text>

        <View style={s.kpiGrid}>
          <KpiCard label="Utilizadores"  value={stats?.users?.total ?? '—'}          icon="👥" color="#3B82F6" />
          <KpiCard label="Negócios"      value={stats?.businesses?.total ?? '—'}      icon="🏢" color="#10B981" />
          <KpiCard label="Reclamados"    value={`${stats?.businesses?.claimedPercent ?? 0}%`} icon="✅" color="#22A06B" />
          <KpiCard label="Claims pend."  value={stats?.claims?.pending ?? '—'}        icon="⏳" color="#F59E0B" />
        </View>
      </View>

      <View style={s.divider} />

      <View style={s.section}>
        <Text style={s.sectionTitle}>Negócios</Text>
        <StatsRow label="Total"            value={stats?.businesses?.total} />
        <StatsRow label="Reclamados"       value={stats?.businesses?.claimed} accent={COLORS.green} />
        <StatsRow label="Por reclamar"     value={stats?.businesses?.unclaimed} />
        <StatsRow label="Do Google"        value={stats?.businesses?.fromGoogle} accent="#4285F4" />
        <StatsRow label="Criados manual."  value={stats?.businesses?.manual} />
      </View>

      <View style={s.divider} />

      <View style={s.section}>
        <Text style={s.sectionTitle}>Claims</Text>
        <StatsRow label="Pendentes"  value={stats?.claims?.pending}  accent="#F59E0B" />
        <StatsRow label="Aprovados"  value={stats?.claims?.approved} accent={COLORS.green} />
        <StatsRow label="Rejeitados" value={stats?.claims?.rejected} accent={COLORS.red} />
        <StatsRow label="Total"      value={stats?.claims?.total} />
      </View>
    </ScrollView>
  );
}

// ─── Tab: Claims ─────────────────────────────────────────────────────────────

function ClaimsTab({ accessToken }) {
  const [claims, setClaims]     = useState([]);
  const [filter, setFilter]     = useState('PENDING');
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reviewing, setReviewing]   = useState(null); // claimId being reviewed
  const [noteModal, setNoteModal]   = useState(null); // { claimId, decision }
  const [adminNote, setAdminNote]   = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await apiRequest(`/admin/claims?status=${filter}`, { accessToken });
      setClaims(Array.isArray(data) ? data : []);
    } catch (err) {
      Alert.alert('Erro', err?.message || 'Não foi possível carregar claims.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, filter]);

  useEffect(() => { load(); }, [load]);

  async function handleReview(claimId, decision) {
    setNoteModal({ claimId, decision });
    setAdminNote('');
  }

  async function confirmReview() {
    if (!noteModal) return;
    setReviewing(noteModal.claimId);
    try {
      await apiRequest(`/admin/claims/${noteModal.claimId}/review`, {
        method: 'PATCH',
        body: { decision: noteModal.decision, adminNote: adminNote.trim() || undefined },
        accessToken,
      });
      setNoteModal(null);
      await load();
      Alert.alert(
        noteModal.decision === 'APPROVED' ? '✅ Aprovado' : '❌ Rejeitado',
        noteModal.decision === 'APPROVED'
          ? 'O dono agora tem acesso ao negócio.'
          : 'O pedido foi rejeitado.',
      );
    } catch (err) {
      Alert.alert('Erro', err?.message || 'Não foi possível rever o claim.');
    } finally {
      setReviewing(null);
    }
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Filter Tabs */}
      <View style={s.filterRow}>
        {['PENDING', 'APPROVED', 'REJECTED'].map((st) => (
          <TouchableOpacity
            key={st}
            style={[s.filterChip, filter === st && s.filterChipActive]}
            onPress={() => setFilter(st)}
          >
            <Text style={[s.filterChipText, filter === st && s.filterChipTextActive]}>
              {CLAIM_STATUS[st].label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? <Loader /> : (
        <ScrollView
          style={{ flex: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={COLORS.red} />}
        >
          {claims.length === 0 ? (
            <EmptyState
              emoji={filter === 'PENDING' ? '🎉' : '📋'}
              title={filter === 'PENDING' ? 'Sem claims pendentes' : 'Sem registos'}
              text={filter === 'PENDING' ? 'Todos os pedidos foram revistos.' : `Não há claims com estado "${CLAIM_STATUS[filter].label}".`}
            />
          ) : (
            <View style={s.section}>
              {claims.map((claim) => (
                <AdminClaimCard
                  key={claim.id}
                  claim={claim}
                  onApprove={() => handleReview(claim.id, 'APPROVED')}
                  onReject={() => handleReview(claim.id, 'REJECTED')}
                  isReviewing={reviewing === claim.id}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* Note Modal */}
      {noteModal && (
        <View style={s.noteModalOverlay}>
          <View style={s.noteModal}>
            <Text style={s.noteModalTitle}>
              {noteModal.decision === 'APPROVED' ? '✅ Aprovar claim' : '❌ Rejeitar claim'}
            </Text>
            <Text style={s.noteModalSub}>Nota para o dono (opcional)</Text>
            <TextInput
              style={s.noteInput}
              placeholder="Ex: Documentação verificada com sucesso / NIF inválido..."
              placeholderTextColor={COLORS.grayText}
              value={adminNote}
              onChangeText={setAdminNote}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                style={s.noteModalCancelBtn}
                onPress={() => setNoteModal(null)}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.darkText }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  s.noteModalConfirmBtn,
                  { backgroundColor: noteModal.decision === 'APPROVED' ? COLORS.green : COLORS.red },
                ]}
                onPress={confirmReview}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.white }}>
                  {noteModal.decision === 'APPROVED' ? 'Aprovar' : 'Rejeitar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Tab: Businesses ─────────────────────────────────────────────────────────

function BusinessesTab({ accessToken }) {
  const [businesses, setBusinesses] = useState([]);
  const [meta, setMeta]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage]     = useState(1);
  const [showImport, setShowImport] = useState(false);
  const debounceRef = React.useRef(null);

  const load = useCallback(async (pg = 1, q = search, isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else if (pg === 1) setLoading(true);
    try {
      const params = new URLSearchParams({ page: pg, limit: 20 });
      if (q.trim()) params.append('search', q.trim());
      const data = await apiRequest(`/admin/businesses?${params}`, { accessToken });
      if (pg === 1) {
        setBusinesses(data.data || []);
      } else {
        setBusinesses((prev) => [...prev, ...(data.data || [])]);
      }
      setMeta(data.meta);
      setPage(pg);
    } catch (err) {
      Alert.alert('Erro', err?.message || 'Não foi possível carregar negócios.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, search]);

  useEffect(() => { load(1, '', false); }, []);

  function handleSearch(text) {
    setSearch(text);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(1, text), 400);
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 8 }}>
        <View style={[s.searchBoxInTab, { flex: 1 }]}>
        <Icon name="search" size={16} color={COLORS.grayText} strokeWidth={2} />
        <TextInput
          style={s.searchInputInTab}
          placeholder="Pesquisar negócio..."
          placeholderTextColor={COLORS.grayText}
          value={search}
          onChangeText={handleSearch}
        />
        </View>
        <TouchableOpacity
          style={s.importBtn}
          onPress={() => setShowImport(true)}
          activeOpacity={0.7}
        >
          <Icon name="upload" size={18} color={COLORS.white} strokeWidth={2} />
        </TouchableOpacity>
      </View>
      <ImportModal
        visible={showImport}
        onClose={() => { setShowImport(false); load(1, search, true); }}
        accessToken={accessToken}
      />

      {loading ? <Loader /> : (
        <ScrollView
          style={{ flex: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(1, search, true)} tintColor={COLORS.red} />}
        >
          {meta && (
            <Text style={s.metaText}>{meta.total} negócios</Text>
          )}
          {businesses.map((biz) => (
            <View key={biz.id} style={s.bizRow}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={s.bizRowName}>{biz.name}</Text>
                  {biz.isClaimed && (
                    <View style={s.claimedDot} />
                  )}
                </View>
                <Text style={s.bizRowSub}>
                  {biz.category}
                  {biz.owner ? ` · ${biz.owner.name || biz.owner.email}` : ' · Sem dono'}
                </Text>
                <Text style={s.bizRowMeta}>
                  {biz.source === 'GOOGLE' ? '🔵 Google' : '⚪ Manual'}
                  {biz.isClaimed ? ' · ✅ Reclamado' : ' · 📋 Por reclamar'}
                </Text>
              </View>
            </View>
          ))}
          {meta && page < meta.totalPages && (
            <TouchableOpacity style={s.loadMoreBtn} onPress={() => load(page + 1)}>
              <Text style={s.loadMoreText}>Carregar mais</Text>
            </TouchableOpacity>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

// ─── Tab: Users ──────────────────────────────────────────────────────────────

function UsersTab({ accessToken }) {
  const [users, setUsers]       = useState([]);
  const [meta, setMeta]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage]         = useState(1);

  const load = useCallback(async (pg = 1, isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else if (pg === 1) setLoading(true);
    try {
      const data = await apiRequest(`/admin/users?page=${pg}&limit=20`, { accessToken });
      if (pg === 1) {
        setUsers(data.data || []);
      } else {
        setUsers((prev) => [...prev, ...(data.data || [])]);
      }
      setMeta(data.meta);
      setPage(pg);
    } catch (err) {
      Alert.alert('Erro', err?.message || 'Não foi possível carregar utilizadores.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken]);

  useEffect(() => { load(); }, [load]);

  const ROLE_BADGE = {
    ADMIN:  { label: 'Admin',   color: COLORS.red,   bg: '#FFF0F0' },
    OWNER:  { label: 'Dono',    color: '#0EA5E9',    bg: '#F0F9FF' },
    CLIENT: { label: 'Cliente', color: COLORS.green, bg: '#F0FDF4' },
  };

  return (
    <View style={{ flex: 1 }}>
      {loading ? <Loader /> : (
        <ScrollView
          style={{ flex: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(1, true)} tintColor={COLORS.red} />}
        >
          {meta && <Text style={s.metaText}>{meta.total} utilizadores</Text>}
          {users.map((user) => {
            const rb = ROLE_BADGE[user.role] || ROLE_BADGE.CLIENT;
            return (
              <View key={user.id} style={s.bizRow}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={s.bizRowName}>{user.name || 'Sem nome'}</Text>
                    <View style={[s.roleBadge, { backgroundColor: rb.bg }]}>
                      <Text style={[s.roleBadgeText, { color: rb.color }]}>{rb.label}</Text>
                    </View>
                  </View>
                  <Text style={s.bizRowSub}>{user.email}</Text>
                  <Text style={s.bizRowMeta}>
                    {user._count?.businesses ?? 0} negócios · {user._count?.claimRequests ?? 0} claims
                  </Text>
                </View>
              </View>
            );
          })}
          {meta && page < meta.totalPages && (
            <TouchableOpacity style={s.loadMoreBtn} onPress={() => load(page + 1)}>
              <Text style={s.loadMoreText}>Carregar mais</Text>
            </TouchableOpacity>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function KpiCard({ label, value, icon, color }) {
  return (
    <View style={[s.kpiCard, { borderLeftColor: color }]}>
      <Text style={s.kpiIcon}>{icon}</Text>
      <Text style={[s.kpiValue, { color }]}>{value}</Text>
      <Text style={s.kpiLabel}>{label}</Text>
    </View>
  );
}

function StatsRow({ label, value, accent }) {
  return (
    <View style={s.statsRow}>
      <Text style={s.statsRowLabel}>{label}</Text>
      <Text style={[s.statsRowValue, accent && { color: accent }]}>{value ?? '—'}</Text>
    </View>
  );
}

function AdminClaimCard({ claim, onApprove, onReject, isReviewing }) {
  const st = CLAIM_STATUS[claim.status] || CLAIM_STATUS.PENDING;

  return (
    <View style={s.adminClaimCard}>
      <View style={s.adminClaimTop}>
        <View style={{ flex: 1 }}>
          <Text style={s.adminClaimBizName}>{claim.business?.name || 'Negócio'}</Text>
          <Text style={s.adminClaimSub}>{claim.business?.category}</Text>
        </View>
        <View style={[s.statusBadge, { backgroundColor: st.bg }]}>
          <Text style={[s.statusBadgeText, { color: st.color }]}>{st.label}</Text>
        </View>
      </View>

      <View style={s.adminClaimUser}>
        <Icon name="user" size={14} color={COLORS.grayText} strokeWidth={2} />
        <Text style={s.adminClaimUserText}>
          {claim.user?.name || claim.user?.email || 'Utilizador'}
          {claim.user?.email && claim.user?.name ? ` (${claim.user.email})` : ''}
        </Text>
      </View>

      {claim.evidence && (
        <Text style={s.adminClaimEvidence} numberOfLines={3}>
          "{claim.evidence}"
        </Text>
      )}

      {claim.adminNote && (
        <View style={s.adminNoteBox}>
          <Text style={s.adminNoteLabel}>Nota: {claim.adminNote}</Text>
        </View>
      )}

      {claim.status === 'PENDING' && (
        <View style={s.adminClaimActions}>
          <TouchableOpacity
            style={[s.adminActionBtn, s.rejectBtn]}
            onPress={onReject}
            disabled={isReviewing}
            activeOpacity={0.7}
          >
            {isReviewing ? (
              <ActivityIndicator size="small" color={COLORS.red} />
            ) : (
              <Text style={s.rejectBtnText}>❌ Rejeitar</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.adminActionBtn, s.approveBtn]}
            onPress={onApprove}
            disabled={isReviewing}
            activeOpacity={0.7}
          >
            {isReviewing ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={s.approveBtnText}>✅ Aprovar</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function EmptyState({ emoji, title, text }) {
  return (
    <View style={s.emptyState}>
      <Text style={{ fontSize: 48, marginBottom: 12 }}>{emoji}</Text>
      <Text style={s.emptyTitle}>{title}</Text>
      {text && <Text style={s.emptyText}>{text}</Text>}
    </View>
  );
}

function Loader() {
  return (
    <View style={s.emptyState}>
      <ActivityIndicator size="large" color={COLORS.red} />
    </View>
  );
}

// ─── Estilos ─────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },

  // Header
  header: {
    backgroundColor: COLORS.red,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 14,
  },
  exitBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerBrand: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.white, letterSpacing: -0.5 },
  headerSub:   { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.75)', letterSpacing: 1, textTransform: 'uppercase' },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1, borderBottomColor: COLORS.grayLine,
    backgroundColor: COLORS.white,
  },
  tabItem: {
    flex: 1, alignItems: 'center', paddingVertical: 10, gap: 3,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabItemActive: { borderBottomColor: COLORS.red },
  tabLabel:      { fontSize: 10, fontWeight: '500', color: COLORS.grayText },
  tabLabelActive: { color: COLORS.red, fontWeight: '700' },

  // Filter row
  filterRow: {
    flexDirection: 'row', gap: 8, padding: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.grayLine,
  },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, backgroundColor: COLORS.grayBg,
  },
  filterChipActive:     { backgroundColor: COLORS.red },
  filterChipText:       { fontSize: 13, fontWeight: '600', color: COLORS.grayText },
  filterChipTextActive: { color: COLORS.white },

  // Sections
  section: { paddingHorizontal: 16, paddingVertical: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.darkText, marginBottom: 14 },
  divider: { height: 8, backgroundColor: COLORS.grayBg },

  // KPI Grid
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCard: {
    flex: 1, minWidth: '45%',
    backgroundColor: COLORS.grayBg, borderRadius: 12,
    padding: 14, borderLeftWidth: 4,
  },
  kpiIcon:  { fontSize: 24, marginBottom: 6 },
  kpiValue: { fontSize: 26, fontWeight: '800', letterSpacing: -1, marginBottom: 2 },
  kpiLabel: { fontSize: 12, color: COLORS.grayText, fontWeight: '500' },

  // Stats row
  statsRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.grayLine,
  },
  statsRowLabel: { fontSize: 14, color: COLORS.darkText },
  statsRowValue: { fontSize: 16, fontWeight: '700', color: COLORS.darkText },

  // Admin Claim Card
  adminClaimCard: {
    backgroundColor: COLORS.grayBg, borderRadius: 12,
    padding: 14, marginBottom: 10,
  },
  adminClaimTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  adminClaimBizName: { fontSize: 15, fontWeight: '700', color: COLORS.darkText, marginBottom: 2 },
  adminClaimSub: { fontSize: 12, color: COLORS.grayText },
  adminClaimUser: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  adminClaimUserText: { fontSize: 13, color: COLORS.grayText },
  adminClaimEvidence: { fontSize: 12, color: COLORS.grayText, fontStyle: 'italic', lineHeight: 17, marginBottom: 8 },
  adminClaimActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  adminActionBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  rejectBtn:     { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.red },
  approveBtn:    { backgroundColor: COLORS.green },
  rejectBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.red },
  approveBtnText:{ fontSize: 13, fontWeight: '700', color: COLORS.white },

  // Status badge
  statusBadge:     { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  statusBadgeText: { fontSize: 12, fontWeight: '700' },

  // Admin note
  adminNoteBox: { padding: 8, backgroundColor: '#FFF7ED', borderRadius: 8, marginBottom: 6 },
  adminNoteLabel: { fontSize: 12, color: '#92400E' },

  // Note modal
  noteModalOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center',
    alignItems: 'center', padding: 20,
  },
  noteModal: {
    backgroundColor: COLORS.white, borderRadius: 16, padding: 20, width: '100%',
  },
  noteModalTitle: { fontSize: 17, fontWeight: '700', color: COLORS.darkText, marginBottom: 4 },
  noteModalSub:   { fontSize: 13, color: COLORS.grayText, marginBottom: 10 },
  noteInput: {
    backgroundColor: COLORS.grayBg, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: COLORS.darkText, minHeight: 80,
  },
  noteModalCancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    backgroundColor: COLORS.grayBg, alignItems: 'center',
  },
  noteModalConfirmBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center',
  },

  // Business/User rows
  bizRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.grayLine,
  },
  bizRowName: { fontSize: 14, fontWeight: '600', color: COLORS.darkText, marginBottom: 2 },
  bizRowSub:  { fontSize: 12, color: COLORS.grayText, marginBottom: 2 },
  bizRowMeta: { fontSize: 11, color: COLORS.grayText },
  claimedDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.green },
  metaText: { fontSize: 12, color: COLORS.grayText, paddingHorizontal: 16, paddingVertical: 8 },

  // Role badge
  roleBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  roleBadgeText: { fontSize: 11, fontWeight: '700' },

  // Load more
  loadMoreBtn: {
    margin: 16, paddingVertical: 12, borderRadius: 10,
    backgroundColor: COLORS.grayBg, alignItems: 'center',
  },
  loadMoreText: { fontSize: 14, fontWeight: '600', color: COLORS.darkText },

  // Search in tab
  searchBoxInTab: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginVertical: 10,
    backgroundColor: COLORS.grayBg, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  searchInputInTab: { flex: 1, fontSize: 14, color: COLORS.darkText },
  importBtn: { width: 44, height: 44, borderRadius: 10, backgroundColor: COLORS.red, alignItems: 'center', justifyContent: 'center', marginVertical: 10 },

  // Empty
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.darkText, marginBottom: 8, textAlign: 'center' },
  emptyText:  { fontSize: 14, color: COLORS.grayText, textAlign: 'center', lineHeight: 20 },
});
