/**
 * StaffActivityLog
 * Mostra o log de atividade de um funcionário (CoreAuditLog filtrado por actorId).
 *
 * Props:
 *   visible       boolean
 *   staff         object | null
 *   businessId    string
 *   accessToken   string
 *   onClose       () => void
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert,
} from 'react-native';
import { backendApi } from '../lib/backendApi';

const COLORS = {
  primary: '#1565C0', bg: '#F8FAFC', card: '#FFFFFF',
  border: '#E2E8F0', text: '#1E293B', muted: '#64748B', white: '#FFFFFF',
  success: '#22A06B', warning: '#D97706', danger: '#DC2626',
};

const DATE_FILTERS = [
  { key: 'today', label: 'Hoje' },
  { key: 'week',  label: 'Semana' },
  { key: 'month', label: 'Mês' },
  { key: 'all',   label: 'Tudo' },
];

const LOG_FILTER_CATEGORIES = [
  { id: 'all',          label: 'Todos' },
  { id: 'bookings',     label: 'Reservas' },
  { id: 'checkins',     label: 'Check-in/out' },
  { id: 'folio',        label: 'Folio' },
  { id: 'rooms',        label: 'Quartos' },
  { id: 'housekeeping', label: 'Limpeza' },
  { id: 'guests',       label: 'Hospedes' },
  { id: 'staff',        label: 'Staff' },
  { id: 'auth',         label: 'Acessos' },
];

const LOG_ICONS = {
  HT_BOOKING_CREATED:          { icon: 'BOOK', color: '#2563eb', label: 'Reserva criada' },
  HT_BOOKING_CONFIRMED:        { icon: 'OK', color: '#16a34a', label: 'Reserva confirmada' },
  HT_BOOKING_CANCELLED:        { icon: 'X', color: '#dc2626', label: 'Reserva cancelada' },
  HT_BOOKING_MODIFIED:         { icon: 'EDIT', color: '#d97706', label: 'Reserva modificada' },
  HT_BOOKING_CHECKED_IN:       { icon: 'IN', color: '#16a34a', label: 'Check-in efectuado' },
  HT_BOOKING_CHECKED_OUT:      { icon: 'OUT', color: '#2563eb', label: 'Check-out efectuado' },
  HT_BOOKING_NO_SHOW:          { icon: 'WARN', color: '#dc2626', label: 'No-Show marcado' },
  HT_BOOKING_NO_SHOW_REVERTED: { icon: 'UNDO', color: '#d97706', label: 'No-Show revertido' },
  HT_BOOKING_EXTENDED:         { icon: 'DATE', color: '#7c3aed', label: 'Estadia estendida' },
  HT_FOLIO_ITEM_ADDED:         { icon: '+', color: '#2563eb', label: 'Lancamento no folio' },
  HT_FOLIO_ITEM_REMOVED:       { icon: '-', color: '#dc2626', label: 'Item removido do folio' },
  HT_PAYMENT_REGISTERED:       { icon: 'PAY', color: '#16a34a', label: 'Pagamento registado' },
  HT_PAYMENT_REFUNDED:         { icon: 'REF', color: '#d97706', label: 'Reembolso processado' },
  HT_DISCOUNT_APPLIED:         { icon: 'DISC', color: '#7c3aed', label: 'Desconto aplicado' },
  HT_INVOICE_ISSUED:           { icon: 'INV', color: '#2563eb', label: 'Fatura emitida' },
  HT_SHIFT_CLOSED:             { icon: 'LOCK', color: '#374151', label: 'Caixa do turno fechada' },
  HT_ROOM_STATUS_CHANGED:      { icon: 'ROOM', color: '#2563eb', label: 'Estado do quarto alterado' },
  HT_ROOM_BLOCKED:             { icon: 'BLOCK', color: '#dc2626', label: 'Quarto bloqueado' },
  HT_ROOM_ISSUE_REPORTED:      { icon: 'WARN', color: '#d97706', label: 'Problema reportado' },
  HT_HK_TASK_COMPLETED:        { icon: 'HK', color: '#16a34a', label: 'Limpeza concluida' },
  HT_HOUSEKEEPING_COMPLETED:   { icon: 'HK', color: '#16a34a', label: 'Limpeza concluida' },
  HT_GUEST_CREATED:            { icon: 'G', color: '#2563eb', label: 'Hospede criado' },
  HT_GUEST_BLACKLISTED:        { icon: 'BAN', color: '#dc2626', label: 'Hospede blacklistado' },
  HT_GUEST_VIP_MARKED:         { icon: 'VIP', color: '#d97706', label: 'Hospede marcado VIP' },
  CORE_STAFF_ADDED:            { icon: 'S+', color: '#16a34a', label: 'Funcionario adicionado' },
  CORE_STAFF_REVOKED:          { icon: 'S-', color: '#dc2626', label: 'Funcionario suspenso' },
  CORE_STAFF_REACTIVATED:      { icon: 'SR', color: '#16a34a', label: 'Funcionario reactivado' },
  CORE_STAFF_LOGIN:            { icon: 'LOG', color: '#2563eb', label: 'Login efectuado' },
  HT_STAFF_LOGIN:              { icon: 'LOG', color: '#2563eb', label: 'Login efectuado' },
  CORE_STAFF_LOGIN_FAILED:     { icon: 'FAIL', color: '#dc2626', label: 'Login falhado' },
};

function getRangeFor(key) {
  const now = new Date();
  const to = now.toISOString();
  if (key === 'all') return { from: undefined, to: undefined };
  if (key === 'today') {
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    return { from, to };
  }
  if (key === 'week') {
    const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    return { from, to };
  }
  // month
  const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  return { from, to };
}

function actionLabel(action) {
  return LOG_ICONS[action]?.label || action.replace(/_/g, ' ');
}

function actionColor(action) {
  if (action?.includes('CANCEL') || action?.includes('REVOKED')) return COLORS.danger;
  if (action?.includes('CHECKED_IN') || action?.includes('CONFIRMED') || action?.includes('PAYMENT')) return COLORS.success;
  if (action?.includes('NO_SHOW') || action?.includes('MODIFIED')) return COLORS.warning;
  return COLORS.primary;
}

export default function StaffActivityLog({ visible, staff, businessId, accessToken, onClose }) {
  const [logs, setLogs]           = useState([]);
  const [loading, setLoading]     = useState(false);
  const [dateFilter, setDateFilter] = useState('week');
  const [category, setCategory]   = useState('all');
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedActor, setSelectedActor] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const getCategoryFromAction = (action) => {
    if (!action) return 'all';
    if (action.includes('BOOKING')) return action.includes('CHECKED_') || action.includes('CHECKOUT') || action.includes('CHECKIN') ? 'checkins' : 'bookings';
    if (action.includes('FOLIO') || action.includes('PAYMENT') || action.includes('INVOICE') || action.includes('DISCOUNT')) return 'folio';
    if (action.includes('ROOM')) return 'rooms';
    if (action.includes('HK_') || action.includes('HOUSEKEEPING')) return 'housekeeping';
    if (action.includes('GUEST')) return 'guests';
    if (action.includes('STAFF')) return action.includes('LOGIN') || action.includes('SESSION') ? 'auth' : 'staff';
    return 'all';
  };

  const actionOptions = Array.from(new Set(logs.map((l) => l.action).filter(Boolean))).sort();
  const actorOptions = Array.from(
    new Map(
      logs
        .filter((l) => l?.actor?.id)
        .map((l) => [l.actor.id, { id: l.actor.id, name: l.actor.name || l.actor.email || l.actor.id }]),
    ).values(),
  );

  const filteredLogs = logs.filter((log) => {
    if (category !== 'all' && getCategoryFromAction(log.action) !== category) return false;
    if (selectedAction && log.action !== selectedAction) return false;
    if (selectedActor && log?.actor?.id !== selectedActor) return false;
    return true;
  });

  const loadLogs = useCallback(async (nextPage = 1, append = false) => {
    if (!businessId || !accessToken) return;
    setLoading(true);
    try {
      const { from, to } = getRangeFor(dateFilter);
      const actorId = staff?.userId || selectedActor || undefined;
      const res = await backendApi.htGetAuditLog(businessId, {
        from,
        to,
        actorId,
        page: nextPage,
      }, accessToken);
      const items = Array.isArray(res?.items) ? res.items : [];
      setLogs((prev) => (append ? [...prev, ...items] : items));
      setPage(Number(res?.page || nextPage));
      setHasMore(Number(res?.page || nextPage) < Number(res?.totalPages || 1));
    } catch (e) {
      Alert.alert('Erro', e?.message || 'Não foi possível carregar o log.');
    } finally {
      setLoading(false);
    }
  }, [staff?.userId, selectedActor, businessId, accessToken, dateFilter]);

  useEffect(() => {
    if (visible) loadLogs(1, false);
  }, [visible, loadLogs]);

  useEffect(() => {
    if (visible) loadLogs(1, false);
  }, [dateFilter, visible, staff?.id, selectedActor, loadLogs]);

  const fmtDateTime = (v) => {
    if (!v) return '—';
    try {
      const d = new Date(v);
      return `${d.toLocaleDateString('pt-PT')} ${d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`;
    } catch { return String(v); }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          {/* HEADER */}
          <View style={s.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>Registo de Atividade</Text>
              {staff && <Text style={s.subtitle}>{staff.fullName}</Text>}
            </View>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Text style={s.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* FILTROS DE DATA */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterBar}>
            {DATE_FILTERS.map((f) => (
              <TouchableOpacity
                key={f.key}
                style={[s.filterChip, dateFilter === f.key && s.filterChipActive]}
                onPress={() => setDateFilter(f.key)}
              >
                <Text style={[s.filterChipText, dateFilter === f.key && s.filterChipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterBar}>
            {LOG_FILTER_CATEGORIES.map((f) => (
              <TouchableOpacity
                key={f.id}
                style={[s.filterChip, category === f.id && s.filterChipActive]}
                onPress={() => setCategory(f.id)}
              >
                <Text style={[s.filterChipText, category === f.id && s.filterChipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterBar}>
            <TouchableOpacity
              style={[s.filterChip, !selectedAction && s.filterChipActive]}
              onPress={() => setSelectedAction('')}
            >
              <Text style={[s.filterChipText, !selectedAction && s.filterChipTextActive]}>Todas as accoes</Text>
            </TouchableOpacity>
            {actionOptions.map((action) => (
              <TouchableOpacity
                key={action}
                style={[s.filterChip, selectedAction === action && s.filterChipActive]}
                onPress={() => setSelectedAction(action)}
              >
                <Text style={[s.filterChipText, selectedAction === action && s.filterChipTextActive]}>
                  {actionLabel(action)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {!staff && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterBar}>
              <TouchableOpacity
                style={[s.filterChip, !selectedActor && s.filterChipActive]}
                onPress={() => setSelectedActor('')}
              >
                <Text style={[s.filterChipText, !selectedActor && s.filterChipTextActive]}>Todos os funcionarios</Text>
              </TouchableOpacity>
              {actorOptions.map((actor) => (
                <TouchableOpacity
                  key={actor.id}
                  style={[s.filterChip, selectedActor === actor.id && s.filterChipActive]}
                  onPress={() => setSelectedActor(actor.id)}
                >
                  <Text style={[s.filterChipText, selectedActor === actor.id && s.filterChipTextActive]}>
                    {actor.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* CONTEÚDO */}
          {loading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} size="large" />
          ) : (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
              {filteredLogs.length === 0 ? (
                <View style={s.emptyBox}>
                  <Text style={s.emptyText}>Sem atividade neste período.</Text>
                </View>
              ) : (
                filteredLogs.map((log) => (
                  <TouchableOpacity key={log.id} style={s.logItem} activeOpacity={0.85} onPress={() => setSelectedLog(log)}>
                    <View style={[s.dot, { backgroundColor: actionColor(log.action) }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.logAction}>{actionLabel(log.action)}</Text>
                      <Text style={s.logNote} numberOfLines={2}>
                        {log?.newData?._meta?.resourceName || log.note || 'Sem nota adicional'}
                      </Text>
                      <Text style={s.logMeta}>
                        Por: {log?.actor?.name || log?.newData?._meta?.actorName || 'Sistema'}
                      </Text>
                      <Text style={s.logMeta}>
                        {log.resourceType} · {log.resourceId?.slice(0, 8)}...
                      </Text>
                      <Text style={s.logDate}>{fmtDateTime(log.createdAt)}</Text>
                    </View>
                    <Text style={s.logSee}>Ver</Text>
                  </TouchableOpacity>
                ))
              )}

              {hasMore && (
                <TouchableOpacity
                  style={s.loadMoreBtn}
                  onPress={() => loadLogs(page + 1, true)}
                >
                  <Text style={s.loadMoreText}>Carregar mais</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          )}
        </View>

        <Modal visible={!!selectedLog} transparent animationType="fade" onRequestClose={() => setSelectedLog(null)}>
          <View style={s.detailOverlay}>
            <View style={s.detailCard}>
              <View style={s.detailHeader}>
                <Text style={s.detailTitle}>{actionLabel(selectedLog?.action)}</Text>
                <TouchableOpacity onPress={() => setSelectedLog(null)} style={s.closeBtn}>
                  <Text style={s.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
                <Text style={s.detailDate}>{fmtDateTime(selectedLog?.createdAt)}</Text>

                <Text style={s.sectionTitle}>Quem fez</Text>
                <Text style={s.detailLine}>Nome: {selectedLog?.actor?.name || selectedLog?.newData?._meta?.actorName || 'Sistema'}</Text>
                <Text style={s.detailLine}>Cargo: {selectedLog?.newData?._meta?.actorRole || '-'}</Text>
                <Text style={s.detailLine}>Email: {selectedLog?.actor?.email || selectedLog?.newData?._meta?.actorEmail || '-'}</Text>

                <Text style={s.sectionTitle}>O que fez</Text>
                <Text style={s.detailLine}>{actionLabel(selectedLog?.action)}</Text>

                <Text style={s.sectionTitle}>Onde</Text>
                <Text style={s.detailLine}>Recurso: {selectedLog?.resourceType}</Text>
                <Text style={s.detailLine}>ID: {selectedLog?.resourceId}</Text>
                <Text style={s.detailLine}>Nome legivel: {selectedLog?.newData?._meta?.resourceName || '-'}</Text>

                <Text style={s.sectionTitle}>Como estava</Text>
                <Text style={s.detailJson}>{JSON.stringify(selectedLog?.previousData || {}, null, 2)}</Text>

                <Text style={s.sectionTitle}>Como ficou</Text>
                <Text style={s.detailJson}>{JSON.stringify(selectedLog?.newData || {}, null, 2)}</Text>

                <Text style={s.sectionTitle}>Porque</Text>
                <Text style={s.detailLine}>{selectedLog?.note || selectedLog?.newData?._meta?.note || '-'}</Text>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '90%', flex: 1,
  },
  headerRow: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  title:        { fontSize: 18, fontWeight: '700', color: COLORS.text },
  subtitle:     { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  closeBtn:     { padding: 6 },
  closeBtnText: { fontSize: 18, color: COLORS.muted },

  filterBar: { paddingHorizontal: 16, paddingVertical: 10, flexGrow: 0 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    marginRight: 8,
  },
  filterChipActive:    { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipText:      { fontSize: 13, color: COLORS.muted },
  filterChipTextActive: { color: COLORS.white, fontWeight: '600' },

  emptyBox:  { alignItems: 'center', marginTop: 48 },
  emptyText: { fontSize: 15, color: COLORS.muted },

  logItem: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: COLORS.card, borderRadius: 10, padding: 12,
    marginBottom: 8, borderWidth: 1, borderColor: COLORS.border,
  },
  logSee: { fontSize: 12, color: COLORS.primary, fontWeight: '700', marginTop: 2 },
  dot:      { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  logAction: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  logNote:   { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  logMeta:   { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  logDate:   { fontSize: 11, color: COLORS.muted, marginTop: 4 },
  loadMoreBtn: {
    marginTop: 8,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: COLORS.card,
  },
  loadMoreText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },

  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 14,
  },
  detailCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    maxHeight: '88%',
    padding: 14,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  detailTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, flex: 1 },
  detailDate: { fontSize: 12, color: COLORS.muted, marginBottom: 10 },
  sectionTitle: { fontSize: 12, color: COLORS.primary, fontWeight: '800', marginTop: 10, marginBottom: 4 },
  detailLine: { fontSize: 12, color: COLORS.text, marginBottom: 2 },
  detailJson: {
    fontSize: 11,
    color: '#334155',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 8,
  },
});
