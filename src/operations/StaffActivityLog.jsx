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
import backendApi from '../lib/backendApi';

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
  const labels = {
    HT_BOOKING_CREATED:    'Reserva criada',
    HT_BOOKING_CONFIRMED:  'Reserva confirmada',
    HT_BOOKING_CANCELLED:  'Reserva cancelada',
    HT_BOOKING_CHECKED_IN: 'Check-In realizado',
    HT_BOOKING_CHECKED_OUT:'Check-Out realizado',
    HT_BOOKING_NO_SHOW:    'No-Show registado',
    HT_BOOKING_MODIFIED:   'Reserva modificada',
    HT_FOLIO_ITEM_ADDED:   'Item adicionado à conta',
    HT_FOLIO_ITEM_REMOVED: 'Item removido da conta',
    HT_PAYMENT_REGISTERED: 'Pagamento registado',
    HT_PAYMENT_REFUNDED:   'Reembolso registado',
    HT_ROOM_STATUS_CHANGED:'Estado do quarto alterado',
    HT_ROOM_ASSIGNED:      'Quarto atribuído',
    HT_ROOM_REASSIGNED:    'Quarto reatribuído',
    HT_GUEST_PROFILE_UPDATED: 'Perfil de hóspede atualizado',
    HT_RATE_CHANGED:       'Tarifa alterada',
    CORE_STAFF_ADDED:      'Funcionário adicionado',
    CORE_STAFF_REVOKED:    'Acesso revogado',
  };
  return labels[action] ?? action.replace(/_/g, ' ');
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

  const loadLogs = useCallback(async () => {
    if (!staff?.id || !businessId || !accessToken) return;
    setLoading(true);
    try {
      const { from, to } = getRangeFor(dateFilter);
      const res = await backendApi.htGetStaffActivity(staff.id, businessId, from, to, accessToken);
      setLogs(Array.isArray(res) ? res : []);
    } catch (e) {
      Alert.alert('Erro', e?.message || 'Não foi possível carregar o log.');
    } finally {
      setLoading(false);
    }
  }, [staff?.id, businessId, accessToken, dateFilter]);

  useEffect(() => {
    if (visible && staff) loadLogs();
  }, [visible, loadLogs]);

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
              <Text style={s.title}>Log de Atividade</Text>
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

          {/* CONTEÚDO */}
          {loading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} size="large" />
          ) : (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
              {logs.length === 0 ? (
                <View style={s.emptyBox}>
                  <Text style={s.emptyText}>Sem atividade neste período.</Text>
                </View>
              ) : (
                logs.map((log) => (
                  <View key={log.id} style={s.logItem}>
                    <View style={[s.dot, { backgroundColor: actionColor(log.action) }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.logAction}>{actionLabel(log.action)}</Text>
                      {log.note && <Text style={s.logNote}>{log.note}</Text>}
                      {log.resourceType && (
                        <Text style={s.logMeta}>
                          {log.resourceType} · {log.resourceId?.slice(0, 8)}…
                        </Text>
                      )}
                      <Text style={s.logDate}>{fmtDateTime(log.createdAt)}</Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          )}
        </View>
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
  dot:      { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  logAction: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  logNote:   { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  logMeta:   { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  logDate:   { fontSize: 11, color: COLORS.muted, marginTop: 4 },
});
